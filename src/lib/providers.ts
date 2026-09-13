import { z } from 'zod'

export type ProviderId = 'demo' | 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'custom'

export interface ProviderConfig {
  provider: ProviderId
  apiKey: string
  model: string
  endpoint?: string
}

export interface StructuredOutput<T> {
  name: string
  schema: z.ZodType<T>
  description?: string
}

export interface CompletionRequest<T = never> {
  system: string
  prompt: string
  signal?: AbortSignal
  onToken?: (token: string) => void
  structured?: StructuredOutput<T>
}

export interface CompletionResult<T = never> {
  text: string
  model: string
  provider: ProviderId
  usage?: { inputTokens?: number; outputTokens?: number }
  structured?: T
}

export const providerDetails: Record<ProviderId, { label: string; defaultModel: string; hint: string }> = {
  demo: { label: 'Keyless local mode', defaultModel: 'local-retrieval', hint: 'Reading, exercises, retrieval, notes, and progress stay available.' },
  openai: { label: 'OpenAI', defaultModel: 'gpt-5-mini', hint: 'Uses the Responses API with storage disabled.' },
  anthropic: { label: 'Anthropic', defaultModel: 'claude-sonnet-4-5', hint: 'Uses the Messages API from your browser.' },
  gemini: { label: 'Google Gemini', defaultModel: 'gemini-2.5-flash', hint: 'Uses GenerateContent with your key in a request header.' },
  openrouter: { label: 'OpenRouter', defaultModel: 'openai/gpt-5-mini', hint: 'Routes to the model you name.' },
  custom: { label: 'Custom endpoint', defaultModel: 'local-model', hint: 'Uses an OpenAI-compatible chat completions endpoint; a key is optional.' },
}

export class ProviderError extends Error {
  constructor(public kind: 'key' | 'quota' | 'model' | 'browser' | 'refusal' | 'cancelled' | 'malformed' | 'unknown', message: string) {
    super(message)
  }
}

const CompletionResultSchema = z.object({
  text: z.string().min(1), model: z.string().min(1), provider: z.enum(['openai', 'anthropic', 'gemini', 'openrouter', 'custom']),
  usage: z.object({ inputTokens: z.number().nonnegative().optional(), outputTokens: z.number().nonnegative().optional() }).optional(),
})

function explainHttpError(status: number, raw: string) {
  const lower = raw.toLowerCase()
  if (status === 401 || status === 403) return new ProviderError('key', 'The provider rejected this key. Check that it is active and allowed to use this model.')
  if (status === 429 || lower.includes('quota') || lower.includes('credit')) return new ProviderError('quota', 'The provider reports exhausted credits or a rate limit. Check billing, then try again.')
  if (status === 404 || lower.includes('model_not_found')) return new ProviderError('model', 'That model is unavailable for this key. Choose a model your account can access.')
  return new ProviderError('unknown', `The provider returned ${status}. ${raw.slice(0, 180)}`)
}

async function post(url: string, headers: Record<string, string>, body: unknown, signal?: AbortSignal) {
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal })
    if (!response.ok) throw explainHttpError(response.status, await response.text())
    return response
  } catch (error) {
    if (error instanceof ProviderError) throw error
    if ((error instanceof DOMException && error.name === 'AbortError') || signal?.aborted) throw new ProviderError('cancelled', 'The request was stopped.')
    throw new ProviderError('browser', 'The browser could not reach this provider. Check CORS settings, network access, or run the app locally for a local endpoint.')
  }
}

async function postJson(url: string, headers: Record<string, string>, body: unknown, signal?: AbortSignal) {
  const response = await post(url, headers, body, signal)
  try { return JSON.parse(await response.text()) as Record<string, unknown> }
  catch { throw new ProviderError('malformed', 'The provider returned malformed JSON.') }
}

function openAIText(data: Record<string, unknown>) {
  if (typeof data.output_text === 'string') return data.output_text
  const output = Array.isArray(data.output) ? data.output : []
  const content = output.flatMap((item) => item && typeof item === 'object' && Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : [])
  const refusal = content.find((part) => part && typeof part === 'object' && (part as { type?: string }).type === 'refusal') as { refusal?: string } | undefined
  if (refusal) throw new ProviderError('refusal', refusal.refusal || 'The model refused this request.')
  return content.map((part) => part && typeof part === 'object' && 'text' in part ? String((part as { text: unknown }).text) : '').join('')
}

function structuredInstruction<T>(request: CompletionRequest<T>) {
  return request.structured ? `\nReturn only JSON matching the requested “${request.structured.name}” structure. ${request.structured.description ?? ''}` : ''
}

function jsonSchema<T>(request: CompletionRequest<T>) {
  if (!request.structured) return undefined
  const schema = z.toJSONSchema(request.structured.schema) as Record<string, unknown>
  delete schema.$schema
  return schema
}

function finish<T>(config: ProviderConfig, request: CompletionRequest<T>, text: string, usage?: { inputTokens?: number; outputTokens?: number }): CompletionResult<T> {
  const validated = CompletionResultSchema.safeParse({ text: text.trim(), model: config.model, provider: config.provider, usage })
  if (!validated.success) throw new ProviderError('malformed', 'The provider completed without a valid text response.')
  let structured: T | undefined
  if (request.structured) {
    try {
      const raw = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      structured = request.structured.schema.parse(JSON.parse(raw))
    } catch { throw new ProviderError('malformed', 'The provider returned structured output that did not match the required schema.') }
  }
  return { ...validated.data, structured }
}

async function readSse(response: Response, onEvent: (data: Record<string, unknown>) => void) {
  if (!response.body) throw new ProviderError('malformed', 'The provider returned an empty stream.')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() ?? ''
    for (const block of blocks) {
      const payload = block.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n')
      if (!payload || payload === '[DONE]') continue
      try { onEvent(JSON.parse(payload) as Record<string, unknown>) }
      catch { throw new ProviderError('malformed', 'The provider returned a malformed streaming event.') }
    }
    if (done) break
  }
}

async function requestStream<T>(config: ProviderConfig, request: CompletionRequest<T>) {
  const schema = jsonSchema(request)
  let url: string
  let headers: Record<string, string>
  let body: Record<string, unknown>
  if (config.provider === 'openai') {
    url = 'https://api.openai.com/v1/responses'; headers = { authorization: `Bearer ${config.apiKey}` }
    body = { model: config.model, store: false, stream: true, input: [{ role: 'system', content: request.system }, { role: 'user', content: request.prompt }], ...(schema ? { text: { format: { type: 'json_schema', name: request.structured!.name, strict: true, schema } } } : {}) }
  } else if (config.provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages'; headers = { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
    body = { model: config.model, max_tokens: 1200, stream: true, system: request.system + structuredInstruction(request), messages: [{ role: 'user', content: request.prompt }] }
  } else if (config.provider === 'gemini') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:streamGenerateContent?alt=sse`; headers = { 'x-goog-api-key': config.apiKey }
    body = { systemInstruction: { parts: [{ text: request.system }] }, contents: [{ role: 'user', parts: [{ text: request.prompt }] }], generationConfig: { maxOutputTokens: 1200, ...(schema ? { responseMimeType: 'application/json', responseJsonSchema: schema } : {}) } }
  } else {
    url = completionEndpoint(config); headers = config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}
    body = { model: config.model, messages: [{ role: 'system', content: request.system }, { role: 'user', content: request.prompt }], stream: true, ...(schema ? { response_format: { type: 'json_schema', json_schema: { name: request.structured!.name, strict: true, schema } } } : {}) }
  }
  const response = await post(url, headers, body, request.signal)
  let text = ''
  let usage: { inputTokens?: number; outputTokens?: number } | undefined
  try { await readSse(response, (event) => {
    let delta = ''
    if (config.provider === 'openai') {
      if (event.type === 'response.refusal.delta') throw new ProviderError('refusal', String(event.delta || 'The model refused this request.'))
      if (event.type === 'response.output_text.delta') delta = String(event.delta ?? '')
      const responseData = event.response as { usage?: { input_tokens?: number; output_tokens?: number } } | undefined
      if (responseData?.usage) usage = { inputTokens: responseData.usage.input_tokens, outputTokens: responseData.usage.output_tokens }
    } else if (config.provider === 'anthropic') {
      const value = event.delta as { type?: string; text?: string } | undefined
      if (value?.type === 'text_delta') delta = value.text ?? ''
      const eventUsage = event.usage as { input_tokens?: number; output_tokens?: number } | undefined
      if (eventUsage) usage = { inputTokens: eventUsage.input_tokens ?? usage?.inputTokens, outputTokens: eventUsage.output_tokens ?? usage?.outputTokens }
    } else if (config.provider === 'gemini') {
      const first = (Array.isArray(event.candidates) ? event.candidates[0] : undefined) as { content?: { parts?: Array<{ text?: string }> }; finishReason?: string } | undefined
      if (first?.finishReason && /safety|block/i.test(first.finishReason)) throw new ProviderError('refusal', 'Gemini blocked this request under its safety policy.')
      delta = first?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
      const eventUsage = event.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number } | undefined
      if (eventUsage) usage = { inputTokens: eventUsage.promptTokenCount, outputTokens: eventUsage.candidatesTokenCount }
    } else {
      const first = (Array.isArray(event.choices) ? event.choices[0] : undefined) as { delta?: { content?: string; refusal?: string } } | undefined
      if (first?.delta?.refusal) throw new ProviderError('refusal', first.delta.refusal)
      delta = first?.delta?.content ?? ''
      const eventUsage = event.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined
      if (eventUsage) usage = { inputTokens: eventUsage.prompt_tokens, outputTokens: eventUsage.completion_tokens }
    }
    if (delta) { text += delta; request.onToken?.(delta) }
  }) } catch (error) {
    if (error instanceof ProviderError) throw error
    if ((error instanceof DOMException && error.name === 'AbortError') || request.signal?.aborted) throw new ProviderError('cancelled', 'The request was stopped.')
    throw new ProviderError('malformed', 'The provider stream ended unexpectedly.')
  }
  return finish(config, request, text, usage)
}

function completionEndpoint(config: ProviderConfig) {
  if (config.provider === 'openrouter') return 'https://openrouter.ai/api/v1/chat/completions'
  const raw = (config.endpoint ?? '').replace(/\/$/, '')
  try {
    const parsed = new URL(raw)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
  } catch { throw new ProviderError('browser', 'Enter a complete HTTP or HTTPS endpoint for the custom provider.') }
  return raw.endsWith('/chat/completions') ? raw : `${raw}/chat/completions`
}

export async function requestCompletion<T = never>(config: ProviderConfig, request: CompletionRequest<T>): Promise<CompletionResult<T>> {
  if (config.provider === 'demo') throw new ProviderError('key', 'Choose an AI provider in Settings to generate new answers.')
  if (!config.apiKey && config.provider !== 'custom') throw new ProviderError('key', `Add your ${providerDetails[config.provider].label} key in Settings.`)
  if (request.onToken) return requestStream(config, request)
  const schema = jsonSchema(request)

  if (config.provider === 'openai') {
    const data = await postJson('https://api.openai.com/v1/responses', { authorization: `Bearer ${config.apiKey}` }, {
      model: config.model, store: false,
      input: [{ role: 'system', content: request.system }, { role: 'user', content: request.prompt }],
      ...(schema ? { text: { format: { type: 'json_schema', name: request.structured!.name, strict: true, schema } } } : {}),
    }, request.signal)
    const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined
    return finish(config, request, openAIText(data), { inputTokens: usage?.input_tokens, outputTokens: usage?.output_tokens })
  }

  if (config.provider === 'anthropic') {
    const data = await postJson('https://api.anthropic.com/v1/messages', {
      'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true',
    }, { model: config.model, max_tokens: 1200, system: request.system + structuredInstruction(request), messages: [{ role: 'user', content: request.prompt }] }, request.signal)
    const content = Array.isArray(data.content) ? data.content : []
    const text = content.map((item) => item && typeof item === 'object' && 'text' in item ? String((item as { text: unknown }).text) : '').join('')
    const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined
    return finish(config, request, text, { inputTokens: usage?.input_tokens, outputTokens: usage?.output_tokens })
  }

  if (config.provider === 'gemini') {
    const data = await postJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, { 'x-goog-api-key': config.apiKey }, {
      systemInstruction: { parts: [{ text: request.system }] }, contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      generationConfig: { maxOutputTokens: 1200, ...(schema ? { responseMimeType: 'application/json', responseJsonSchema: schema } : {}) },
    }, request.signal)
    const first = (Array.isArray(data.candidates) ? data.candidates[0] : undefined) as { content?: { parts?: Array<{ text?: string }> }; finishReason?: string } | undefined
    const text = first?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
    if (!text && (data.promptFeedback || first?.finishReason)) throw new ProviderError('refusal', 'Gemini did not return an answer, usually because the request was blocked.')
    const usage = data.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number } | undefined
    return finish(config, request, text, { inputTokens: usage?.promptTokenCount, outputTokens: usage?.candidatesTokenCount })
  }

  const data = await postJson(completionEndpoint(config), config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}, {
    model: config.model, messages: [{ role: 'system', content: request.system }, { role: 'user', content: request.prompt }], stream: false,
    ...(schema ? { response_format: { type: 'json_schema', json_schema: { name: request.structured!.name, strict: true, schema } } } : {}),
  }, request.signal)
  const first = (Array.isArray(data.choices) ? data.choices[0] : undefined) as { message?: { content?: string; refusal?: string } } | undefined
  if (first?.message?.refusal) throw new ProviderError('refusal', first.message.refusal)
  const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined
  return finish(config, request, first?.message?.content ?? '', { inputTokens: usage?.prompt_tokens, outputTokens: usage?.completion_tokens })
}

export async function checkConnection(config: ProviderConfig, signal?: AbortSignal) {
  const result = await requestCompletion(config, { system: 'Reply with exactly: connected', prompt: 'Connection check.', signal })
  return result.text.trim()
}
