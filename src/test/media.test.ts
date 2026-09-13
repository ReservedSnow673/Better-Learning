import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const falMocks = vi.hoisted(() => ({ config: vi.fn(), submit: vi.fn(), status: vi.fn(), result: vi.fn() }))

vi.mock('@fal-ai/client', () => ({
  fal: { config: falMocks.config, queue: { submit: falMocks.submit, status: falMocks.status, result: falMocks.result } },
}))

import { db } from '../lib/db'
import { cacheMediaAsset, createAvatarJob, createCaptionJob, createNarrationJob, pollMediaJob, splitScriptIntoScenes } from '../lib/media'

describe('media generation and recovery', () => {
  beforeEach(async () => {
    await db.delete(); await db.open()
    falMocks.submit.mockReset().mockResolvedValue({ request_id: 'provider-job-1' })
    falMocks.status.mockReset().mockResolvedValue({ status: 'COMPLETED' })
    falMocks.result.mockReset().mockResolvedValue({ data: { audio: { url: 'https://fal.media/narration.wav', content_type: 'audio/wav' } } })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('media', { status: 200, headers: { 'content-type': 'audio/wav' } }))
  })
  afterEach(async () => { vi.restoreAllMocks(); await db.delete() })

  it('splits a validated script into roughly 30-second scenes without losing text', () => {
    const script = Array.from({ length: 12 }, (_, index) => `Sentence ${index + 1} contains several carefully chosen words for a calm teaching scene.`).join(' ')
    const scenes = splitScriptIntoScenes(script, 30)
    expect(scenes.length).toBeGreaterThan(2)
    expect(scenes.join(' ')).toBe(script)
    expect(scenes.every((scene) => scene.split(/\s+/).length <= 36)).toBe(true)
  })

  it('reuses matching submissions, recovers output, and caches downloaded media', async () => {
    const options = { targetId: 'lesson:course-1:lesson-1', sceneIndex: 0, sceneCount: 1, requestedOutputs: ['captions'] as const }
    const first = await createNarrationJob('fal-key', 'course-1', 'lesson-1', 'A short lesson script.', options)
    const duplicate = await createNarrationJob('fal-key', 'course-1', 'lesson-1', 'A short lesson script.', options)
    expect(duplicate.id).toBe(first.id)
    expect(falMocks.submit).toHaveBeenCalledTimes(1)

    const complete = await pollMediaJob('fal-key', first)
    expect(complete).toMatchObject({ status: 'complete', outputUrl: 'https://fal.media/narration.wav' })
    await cacheMediaAsset(complete)
    expect(await db.mediaAssets.where('jobId').equals(first.id).first()).toMatchObject({ mimeType: 'audio/wav' })
  })

  it('submits Kling avatar and Whisper caption jobs with recoverable parent links', async () => {
    falMocks.submit.mockResolvedValueOnce({ request_id: 'avatar-1' }).mockResolvedValueOnce({ request_id: 'caption-1' })
    const avatar = await createAvatarJob('fal-key', 'course-1', 'lesson-1', 'Speak clearly.', 'data:image/png;base64,AAAA', 'https://fal.media/audio.wav', { targetId: 'turn-1', parentJobId: 'audio-1', sceneIndex: 0, sceneCount: 1 })
    const captions = await createCaptionJob('fal-key', 'course-1', 'lesson-1', 'Speak clearly.', 'https://fal.media/audio.wav', { targetId: 'turn-1', parentJobId: 'audio-1', sceneIndex: 0, sceneCount: 1 })
    expect(avatar).toMatchObject({ kind: 'avatar', parentJobId: 'audio-1', providerJobId: 'avatar-1' })
    expect(captions).toMatchObject({ kind: 'captions', parentJobId: 'audio-1', providerJobId: 'caption-1' })
    expect(falMocks.submit.mock.calls[0][0]).toContain('ai-avatar')
    expect(falMocks.submit.mock.calls[1][0]).toBe('fal-ai/whisper')

    falMocks.result.mockResolvedValueOnce({ data: { text: 'Speak clearly.', chunks: [{ timestamp: [0, 1.2], text: 'Speak clearly.' }] } })
    const completeCaptions = await pollMediaJob('fal-key', captions)
    expect(completeCaptions).toMatchObject({ status: 'complete', transcript: 'Speak clearly.', captions: [{ start: 0, end: 1.2, text: 'Speak clearly.' }] })
  })

  it('surfaces provider refusals and never resubmits them automatically', async () => {
    const job = await createNarrationJob('fal-key', 'course-1', 'lesson-1', 'A refused script.')
    falMocks.status.mockRejectedValueOnce(new Error('Safety policy refusal'))
    const refused = await pollMediaJob('fal-key', job)
    expect(refused).toMatchObject({ status: 'refused' })
    expect(falMocks.submit).toHaveBeenCalledTimes(1)
  })
})
