import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ProviderError, requestCompletion, type ProviderConfig } from '../lib/providers'

const cases: Array<[ProviderConfig, Record<string, unknown>, string]> = [
  [{ provider: 'openai', apiKey: 'key', model: 'model' }, { output_text: 'OpenAI answer' }, 'OpenAI answer'],
  [{ provider: 'anthropic', apiKey: 'key', model: 'model' }, { content: [{ type: 'text', text: 'Anthropic answer' }] }, 'Anthropic answer'],
  [{ provider: 'gemini', apiKey: 'key', model: 'model' }, { candidates: [{ content: { parts: [{ text: 'Gemini answer' }] } }] }, 'Gemini answer'],
  [{ provider: 'openrouter', apiKey: 'key', model: 'model' }, { choices: [{ message: { content: 'OpenRouter answer' } }] }, 'OpenRouter answer'],
  [{ provider: 'custom', apiKey: 'key', model: 'model', endpoint: 'http://localhost:11434/v1' }, { choices: [{ message: { content: 'Local answer' } }] }, 'Local answer'],
]

afterEach(() => vi.restoreAllMocks())

describe('provider adapters', () => {
  it.each(cases)('normalizes %s responses', async (config, response, expected) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }))
    const result = await requestCompletion(config, { system: 'system', prompt: 'prompt' })
    expect(result.text).toBe(expected)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).not.toContain('key')
    expect(String(init?.body)).not.toContain('key')
    if (config.provider === 'openai') expect(JSON.parse(String(init?.body))).toMatchObject({ store: false })
  })

  it('streams normalized deltas and reports usage', async () => {
    const events = [
      { type: 'response.output_text.delta', delta: 'Read ' },
      { type: 'response.output_text.delta', delta: 'closely.' },
      { type: 'response.completed', response: { usage: { input_tokens: 9, output_tokens: 3 } } },
    ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join('') + 'data: [DONE]\n\n'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(events, { status: 200, headers: { 'content-type': 'text/event-stream' } }))
    const tokens: string[] = []
    const result = await requestCompletion({ provider: 'openai', apiKey: 'key', model: 'model' }, { system: 'system', prompt: 'prompt', onToken: (token) => tokens.push(token) })
    expect(tokens).toEqual(['Read ', 'closely.'])
    expect(result).toMatchObject({ text: 'Read closely.', usage: { inputTokens: 9, outputTokens: 3 } })
  })

  it.each([
    [{ provider: 'anthropic', apiKey: 'key', model: 'model' } as ProviderConfig, [{ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Anthropic stream' } }]],
    [{ provider: 'gemini', apiKey: 'key', model: 'model' } as ProviderConfig, [{ candidates: [{ content: { parts: [{ text: 'Gemini stream' }] } }] }]],
    [{ provider: 'openrouter', apiKey: 'key', model: 'model' } as ProviderConfig, [{ choices: [{ delta: { content: 'OpenRouter stream' } }] }]],
    [{ provider: 'custom', apiKey: '', model: 'model', endpoint: 'http://localhost:11434/v1' } as ProviderConfig, [{ choices: [{ delta: { content: 'Custom stream' } }] }]],
  ])('normalizes streaming events from $provider', async (config, eventPayloads) => {
    const stream = eventPayloads.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('') + 'data: [DONE]\n\n'
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }))
    const tokens: string[] = []
    const result = await requestCompletion(config, { system: 'system', prompt: 'prompt', onToken: (token) => tokens.push(token) })
    expect(result.text).toBe(tokens.join(''))
    expect(result.text).toContain('stream')
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('key')
  })

  it('requests and validates structured output where supported', async () => {
    const response = { output_text: JSON.stringify({ answer: 'Grounded', citationIds: ['c1'] }) }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }))
    const schema = z.object({ answer: z.string(), citationIds: z.array(z.string()) })
    const result = await requestCompletion({ provider: 'openai', apiKey: 'key', model: 'model' }, { system: 'system', prompt: 'prompt', structured: { name: 'grounded_answer', schema } })
    expect(result.structured).toEqual({ answer: 'Grounded', citationIds: ['c1'] })
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ text: { format: { type: 'json_schema', name: 'grounded_answer', strict: true } } })
  })

  it('rejects structured output that does not match its schema', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ output_text: '{"answer":2}' }), { status: 200 }))
    await expect(requestCompletion({ provider: 'openai', apiKey: 'key', model: 'model' }, { system: 'system', prompt: 'prompt', structured: { name: 'answer', schema: z.object({ answer: z.string() }) } }))
      .rejects.toMatchObject<Partial<ProviderError>>({ kind: 'malformed' })
  })

  it('normalizes refusal, quota, malformed JSON, and interruption errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ output: [{ content: [{ type: 'refusal', refusal: 'Cannot answer.' }] }] }), { status: 200 }))
    await expect(requestCompletion({ provider: 'openai', apiKey: 'key', model: 'model' }, { system: 'system', prompt: 'prompt' })).rejects.toMatchObject({ kind: 'refusal' })

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response('{"error":"quota exceeded"}', { status: 429 }))
    await expect(requestCompletion({ provider: 'openai', apiKey: 'top-secret', model: 'model' }, { system: 'system', prompt: 'prompt' })).rejects.toMatchObject({ kind: 'quota' })

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response('{not-json', { status: 200 }))
    await expect(requestCompletion({ provider: 'openai', apiKey: 'key', model: 'model' }, { system: 'system', prompt: 'prompt' })).rejects.toMatchObject({ kind: 'malformed' })

    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new DOMException('Stopped', 'AbortError'))
    await expect(requestCompletion({ provider: 'openai', apiKey: 'key', model: 'model' }, { system: 'system', prompt: 'prompt' })).rejects.toMatchObject({ kind: 'cancelled' })
  })

  it('supports a keyless local OpenAI-compatible endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'Local answer' } }] }), { status: 200 }))
    await expect(requestCompletion({ provider: 'custom', apiKey: '', model: 'local', endpoint: 'http://localhost:11434/v1' }, { system: 'system', prompt: 'prompt' })).resolves.toMatchObject({ text: 'Local answer' })
    expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty('authorization')
  })
})
