import { fal } from '@fal-ai/client'
import { MediaJobSchema, type CaptionCue, type MediaJobContract } from '../contracts'
import { db } from './db'

export const MEDIA_ENDPOINTS = {
  audio: 'fal-ai/kokoro/american-english',
  avatar: 'fal-ai/kling-video/v1/standard/ai-avatar',
  captions: 'fal-ai/whisper',
} as const

export interface MediaJobOptions {
  scope?: 'lesson' | 'office-hours' | 'debate'
  targetId?: string
  parentJobId?: string
  sceneIndex?: number
  sceneCount?: number
  sourceCitationIds?: string[]
  requestedOutputs?: Array<'avatar' | 'captions'>
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function safeMessage(error: unknown, falKey: string) {
  const message = error instanceof Error ? error.message : 'fal.ai rejected the media request.'
  return falKey ? message.replaceAll(falKey, '[redacted]').slice(0, 240) : message.slice(0, 240)
}

function failedStatus(error: unknown): 'failed' | 'refused' {
  return /refus|moderation|safety|policy/i.test(error instanceof Error ? error.message : String(error)) ? 'refused' : 'failed'
}

function targetFor(courseId: string, lessonId: string, options: MediaJobOptions) {
  return options.targetId ?? `lesson:${courseId}:${lessonId}`
}

async function submitMediaJob(args: {
  falKey: string
  kind: MediaJobContract['kind']
  courseId: string
  lessonId: string
  script: string
  input: Record<string, unknown>
  fingerprintInput: string
  options?: MediaJobOptions
}) {
  const { falKey, kind, courseId, lessonId, script, input } = args
  const options = args.options ?? {}
  if (!falKey) throw new Error('Add a fal.ai key in Settings before generating media.')
  const targetId = targetFor(courseId, lessonId, options)
  const fingerprint = await digest(`${kind}:${targetId}:${args.fingerprintInput}`)
  const existing = await db.mediaJobs.where('fingerprint').equals(fingerprint).filter((job) =>
    (job.status === 'complete' && (job.kind === 'captions' ? !!job.transcript : !!job.outputUrl))
    || (['queued', 'running'].includes(job.status) && !!job.providerJobId),
  ).first()
  if (existing) return existing

  const now = new Date().toISOString()
  const job = MediaJobSchema.parse({
    schemaVersion: 1, id: crypto.randomUUID(), fingerprint, kind, status: 'queued', providerModel: MEDIA_ENDPOINTS[kind],
    courseId, lessonId, scope: options.scope ?? 'lesson', targetId, parentJobId: options.parentJobId,
    sceneIndex: options.sceneIndex, sceneCount: options.sceneCount, sourceCitationIds: options.sourceCitationIds,
    requestedOutputs: options.requestedOutputs, script, createdAt: now, updatedAt: now,
  })
  await db.mediaJobs.put(job)

  try {
    fal.config({ credentials: falKey })
    const submitted = await fal.queue.submit(MEDIA_ENDPOINTS[kind], { input })
    const updated = MediaJobSchema.parse({ ...job, status: 'running', providerJobId: submitted.request_id, updatedAt: new Date().toISOString() })
    await db.mediaJobs.put(updated)
    return updated
  } catch (error) {
    const failed = MediaJobSchema.parse({ ...job, status: failedStatus(error), error: safeMessage(error, falKey), updatedAt: new Date().toISOString() })
    await db.mediaJobs.put(failed)
    throw new Error(failed.error, { cause: error })
  }
}

export function splitScriptIntoScenes(script: string, targetWords = 65) {
  const clean = script.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const sentences = clean.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [clean]
  const scenes: string[] = []
  let current: string[] = []
  let words = 0
  for (const sentence of sentences) {
    const sentenceParts = sentence.split(/\s+/)
    if (sentenceParts.length > targetWords * 1.35) {
      if (current.length) { scenes.push(current.join(' ')); current = []; words = 0 }
      for (let offset = 0; offset < sentenceParts.length; offset += targetWords) scenes.push(sentenceParts.slice(offset, offset + targetWords).join(' '))
      continue
    }
    const sentenceWords = sentenceParts.length
    if (current.length && words + sentenceWords > targetWords) {
      scenes.push(current.join(' ')); current = []; words = 0
    }
    current.push(sentence); words += sentenceWords
  }
  if (current.length) scenes.push(current.join(' '))
  return scenes
}

export async function createNarrationJob(falKey: string, courseId: string, lessonId: string, script: string, options: MediaJobOptions = {}) {
  return submitMediaJob({
    falKey, kind: 'audio', courseId, lessonId, script, options,
    fingerprintInput: `am_michael:0.96:${script}`,
    input: { prompt: script, voice: 'am_michael', speed: 0.96 },
  })
}

export async function createCaptionJob(falKey: string, courseId: string, lessonId: string, script: string, audioUrl: string, options: MediaJobOptions = {}) {
  return submitMediaJob({
    falKey, kind: 'captions', courseId, lessonId, script, options,
    fingerprintInput: `${audioUrl}:segment`,
    input: { audio_url: audioUrl, task: 'transcribe', language: 'en', diarize: false, chunk_level: 'segment' },
  })
}

async function portraitInput(portraitUrl: string) {
  if (portraitUrl.startsWith('data:')) return portraitUrl
  if (/^https?:\/\//.test(portraitUrl) && typeof location !== 'undefined') {
    const url = new URL(portraitUrl, location.href)
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return url.href
  }
  const response = await fetch(portraitUrl)
  if (!response.ok) throw new Error('The teacher portrait could not be prepared for avatar generation.')
  const blob = await response.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('The teacher portrait could not be read.'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(blob)
  })
}

export async function createAvatarJob(falKey: string, courseId: string, lessonId: string, script: string, portraitUrl: string, audioUrl: string, options: MediaJobOptions = {}) {
  const imageUrl = await portraitInput(portraitUrl)
  return submitMediaJob({
    falKey, kind: 'avatar', courseId, lessonId, script, options,
    fingerprintInput: `${imageUrl}:${audioUrl}`,
    input: { image_url: imageUrl, audio_url: audioUrl, prompt: 'A calm teacher speaking naturally to the learner.' },
  })
}

function outputFor(job: MediaJobContract, data: Record<string, unknown>) {
  if (job.kind === 'audio') {
    const audio = data.audio as { url?: string; content_type?: string } | undefined
    if (!audio?.url) throw new Error('fal.ai completed the request without an audio file.')
    return { outputUrl: audio.url, outputMimeType: audio.content_type ?? 'audio/wav' }
  }
  if (job.kind === 'avatar') {
    const video = data.video as { url?: string; content_type?: string } | undefined
    if (!video?.url) throw new Error('fal.ai completed the request without an avatar video.')
    return { outputUrl: video.url, outputMimeType: video.content_type ?? 'video/mp4', durationSeconds: typeof data.duration === 'number' ? data.duration : undefined }
  }
  const rawChunks = Array.isArray(data.chunks) ? data.chunks : []
  const captions: CaptionCue[] = rawChunks.flatMap((chunk) => {
    if (!chunk || typeof chunk !== 'object') return []
    const value = chunk as { timestamp?: unknown; text?: unknown }
    if (!Array.isArray(value.timestamp) || value.timestamp.length < 2 || typeof value.text !== 'string' || !value.text.trim()) return []
    const start = Number(value.timestamp[0]); const end = Number(value.timestamp[1])
    return Number.isFinite(start) && Number.isFinite(end) && end >= start ? [{ start, end, text: value.text.trim() }] : []
  })
  const transcript = typeof data.text === 'string' ? data.text.trim() : captions.map((cue) => cue.text).join(' ')
  if (!transcript) throw new Error('fal.ai completed the request without a readable transcript.')
  return { captions, transcript }
}

export async function cacheMediaAsset(job: MediaJobContract) {
  if (!job.outputUrl || job.kind === 'captions') return
  try {
    const response = await fetch(job.outputUrl)
    if (!response.ok) return
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (!bytes.byteLength) return
    const extension = job.kind === 'avatar' ? 'mp4' : job.outputMimeType?.includes('mpeg') ? 'mp3' : 'wav'
    await db.mediaAssets.put({
      id: `asset:${job.id}`, jobId: job.id, bytes, mimeType: response.headers.get('content-type') || job.outputMimeType || 'application/octet-stream',
      fileName: `${job.kind}-scene-${(job.sceneIndex ?? 0) + 1}.${extension}`, createdAt: new Date().toISOString(),
    })
  } catch {
    // A provider URL can disallow browser downloads; playback can still use the saved remote URL.
  }
}

export async function pollMediaJob(falKey: string, job: MediaJobContract) {
  if (!job.providerJobId || !falKey || ['complete', 'failed', 'refused'].includes(job.status)) return job
  fal.config({ credentials: falKey })
  try {
    const endpoint = (job.providerModel || MEDIA_ENDPOINTS[job.kind]) as typeof MEDIA_ENDPOINTS[keyof typeof MEDIA_ENDPOINTS]
    const status = await fal.queue.status(endpoint, { requestId: job.providerJobId, logs: false })
    if (status.status !== 'COMPLETED') {
      const running = MediaJobSchema.parse({ ...job, status: status.status === 'IN_QUEUE' ? 'queued' : 'running', updatedAt: new Date().toISOString() })
      await db.mediaJobs.put(running)
      return running
    }
    const result = await fal.queue.result(endpoint, { requestId: job.providerJobId })
    const fields = outputFor(job, result.data as Record<string, unknown>)
    const complete = MediaJobSchema.parse({ ...job, ...fields, status: 'complete', updatedAt: new Date().toISOString() })
    await db.mediaJobs.put(complete)
    void cacheMediaAsset(complete)
    return complete
  } catch (error) {
    const failed = MediaJobSchema.parse({ ...job, status: failedStatus(error), error: safeMessage(error, falKey), updatedAt: new Date().toISOString() })
    await db.mediaJobs.put(failed)
    return failed
  }
}

export const pollNarrationJob = pollMediaJob
