import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Captions, Check, ExternalLink, Film, Headphones, LoaderCircle, Play, Settings2, Sparkles, Volume2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Citation, MediaJobContract } from '../contracts'
import { useProvider } from '../context/ProviderContext'
import { db } from '../lib/db'
import { createAvatarJob, createCaptionJob, createNarrationJob, splitScriptIntoScenes } from '../lib/media'
import { Dialog } from './Dialog'

interface MediaExperienceProps {
  courseId: string
  lessonId: string
  targetId: string
  scope: 'lesson' | 'office-hours' | 'debate'
  script: string
  portrait: string
  teacherName: string
  citations?: Citation[]
  compact?: boolean
}

function jobOrder(job: MediaJobContract) { return job.sceneIndex ?? 0 }

export function MediaExperience(props: MediaExperienceProps) {
  const { falKey } = useProvider()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'audio' | 'avatar'>('audio')
  const [status, setStatus] = useState('')
  const launching = useRef(new Set<string>())
  const scenes = useMemo(() => splitScriptIntoScenes(props.script), [props.script])
  const jobs = useLiveQuery(() => db.mediaJobs.where('targetId').equals(props.targetId).toArray(), [props.targetId]) ?? []
  const audioJobs = jobs.filter((job) => job.kind === 'audio').sort((a, b) => jobOrder(a) - jobOrder(b))
  const waiting = jobs.some((job) => ['queued', 'running'].includes(job.status))
  const failures = jobs.filter((job) => ['failed', 'refused'].includes(job.status))

  useEffect(() => {
    if (!falKey) return
    for (const audio of audioJobs.filter((job) => job.status === 'complete' && job.outputUrl)) {
      const common = {
        scope: props.scope, targetId: props.targetId, parentJobId: audio.id, sceneIndex: audio.sceneIndex,
        sceneCount: audio.sceneCount, sourceCitationIds: audio.sourceCitationIds,
      } as const
      if (audio.requestedOutputs?.includes('captions') && !jobs.some((job) => job.kind === 'captions' && job.parentJobId === audio.id)) {
        const key = `captions:${audio.id}`
        if (!launching.current.has(key)) {
          launching.current.add(key)
          void createCaptionJob(falKey, props.courseId, props.lessonId, audio.script, audio.outputUrl!, common)
            .catch((error) => setStatus(error instanceof Error ? error.message : 'Caption generation failed.'))
            .finally(() => launching.current.delete(key))
        }
      }
      if (audio.requestedOutputs?.includes('avatar') && !jobs.some((job) => job.kind === 'avatar' && job.parentJobId === audio.id)) {
        const key = `avatar:${audio.id}`
        if (!launching.current.has(key)) {
          launching.current.add(key)
          void createAvatarJob(falKey, props.courseId, props.lessonId, audio.script, props.portrait, audio.outputUrl!, common)
            .catch((error) => setStatus(error instanceof Error ? error.message : 'Avatar generation failed.'))
            .finally(() => launching.current.delete(key))
        }
      }
    }
  }, [audioJobs, falKey, jobs, props.courseId, props.lessonId, props.portrait, props.scope, props.targetId])

  const submit = async () => {
    if (!falKey) { setStatus('Add a fal.ai key in Settings before submitting paid media jobs.'); return }
    if (!scenes.length) { setStatus('There is no validated script to generate.'); return }
    setStatus(`Submitting ${scenes.length} narration scene${scenes.length === 1 ? '' : 's'}…`)
    try {
      for (let index = 0; index < scenes.length; index += 1) {
        await createNarrationJob(falKey, props.courseId, props.lessonId, scenes[index], {
          scope: props.scope,
          targetId: props.targetId,
          sceneIndex: index,
          sceneCount: scenes.length,
          sourceCitationIds: props.citations?.map((citation) => citation.id),
          requestedOutputs: mode === 'avatar' ? ['captions', 'avatar'] : ['captions'],
        })
      }
      setStatus('Jobs submitted. They will keep polling when this view is open and resume after reload.')
      window.setTimeout(() => setOpen(false), 1300)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'The media sequence could not be submitted.')
    }
  }

  const hasPlayable = audioJobs.some((job) => job.status === 'complete' && job.outputUrl)
  return <>
    {hasPlayable ? <MediaSequence jobs={jobs} citations={props.citations ?? []} /> : <button className={props.compact ? 'media-mini-button' : 'listen-button'} onClick={() => setOpen(true)}>
      {waiting ? <LoaderCircle className="spin" size={15} /> : <Headphones size={15} />}{waiting ? 'Media processing' : props.compact ? 'Listen or watch' : 'Listen or watch'}
    </button>}
    {!!failures.length && <button className="media-failure" onClick={() => setOpen(true)}>{failures.at(-1)?.status === 'refused' ? 'Provider refused media' : 'Media job failed'} · Review</button>}
    <Dialog open={open} onClose={() => setOpen(false)} title="Generate narrated scenes" footer={<><button className="ghost-button" onClick={() => setOpen(false)}>Cancel</button><button className="dark-button" onClick={() => void submit()} disabled={status.startsWith('Submitting')}>
      {status.startsWith('Submitting') ? <LoaderCircle className="spin" size={16} /> : <Play size={16} />} Generate {scenes.length} scene{scenes.length === 1 ? '' : 's'}
    </button></>}>
      <div className="media-confirmation">
        <div className="media-scope"><Headphones size={23} /><div><strong>{props.scope === 'lesson' ? 'Lesson' : props.scope === 'office-hours' ? 'Office-hours answer' : 'Debate turn'}</strong><span>{scenes.length} short scene{scenes.length === 1 ? '' : 's'} · about {Math.max(1, Math.round(props.script.split(/\s+/).length / 140))} minute</span></div></div>
        <div className="media-choice" role="radiogroup" aria-label="Media output">
          <button role="radio" aria-checked={mode === 'audio'} onClick={() => setMode('audio')}><Volume2 size={18} /><span><strong>Narration + captions</strong><small>Kokoro voice, then Whisper timing</small></span>{mode === 'audio' && <Check size={15} />}</button>
          <button role="radio" aria-checked={mode === 'avatar'} onClick={() => setMode('avatar')}><Film size={18} /><span><strong>Avatar + captions</strong><small>Kokoro, Kling, and Whisper per scene</small></span>{mode === 'avatar' && <Check size={15} />}</button>
        </div>
        <p>{mode === 'avatar' ? `The script, synthetic narration, and ${props.teacherName} portrait will be sent to fal.ai.` : 'The script and generated narration will be sent to fal.ai for voice and caption timing.'} Each provider job may incur a charge.</p>
        <a className="pricing-link" href="https://fal.ai/pricing" target="_blank" rel="noreferrer">Review current fal.ai pricing <ExternalLink size={12} /></a>
        <label>Validated script sent to the provider</label><div className="script-preview">{props.script}</div>
        <p className="media-disclosure"><Sparkles size={13} /> The voice and moving portrait are synthetic AI interpretations. Matching completed renders are reused.</p>
        {status && <p className="form-status" role="status">{status} {!falKey && <Link to="/settings"><Settings2 size={13} /> Open Settings</Link>}</p>}
      </div>
    </Dialog>
  </>
}

function MediaSequence({ jobs, citations }: { jobs: MediaJobContract[]; citations: Citation[] }) {
  const audioJobs = jobs.filter((job) => job.kind === 'audio' && job.status === 'complete' && job.outputUrl).sort((a, b) => jobOrder(a) - jobOrder(b))
  const playable = audioJobs.map((audio) => jobs.find((job) => job.kind === 'avatar' && job.parentJobId === audio.id && job.status === 'complete' && job.outputUrl) ?? audio)
  const [index, setIndex] = useState(0)
  useEffect(() => { if (index >= playable.length) setIndex(Math.max(0, playable.length - 1)) }, [index, playable.length])
  const selected = playable[index]
  const audio = selected?.kind === 'audio' ? selected : audioJobs.find((job) => job.sceneIndex === selected?.sceneIndex)
  const captionJob = jobs.find((job) => job.kind === 'captions' && job.parentJobId === audio?.id && job.status === 'complete')
  if (!selected) return null
  return <div className="media-sequence">
    <div className="media-sequence__top"><span>{selected.kind === 'avatar' ? <Film size={13} /> : <Headphones size={13} />} Synthetic {selected.kind === 'avatar' ? 'avatar' : 'narration'}</span><strong>Scene {index + 1} of {playable.length}</strong></div>
    <PlayableScene job={selected} captions={captionJob?.captions ?? []} onEnded={() => setIndex((current) => Math.min(playable.length - 1, current + 1))} />
    <div className="scene-pagination"><button onClick={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0}>Previous</button><div>{playable.map((job, dot) => <button key={job.id} aria-label={`Play scene ${dot + 1}`} aria-current={dot === index} onClick={() => setIndex(dot)} />)}</div><button onClick={() => setIndex((current) => Math.min(playable.length - 1, current + 1))} disabled={index === playable.length - 1}>Next</button></div>
    <details className="media-transcript"><summary><Captions size={14} /> Transcript and sources</summary><p>{captionJob?.transcript || selected.script}</p>{!!citations.length && <div>{citations.map((citation) => citation.sourceUrl.startsWith('http') ? <a key={citation.id} href={citation.sourceUrl} target="_blank" rel="noreferrer">{citation.anchor}</a> : <a key={citation.id} href={`#citation-${citation.id}`}>{citation.anchor}</a>)}</div>}</details>
  </div>
}

function toVtt(captions: Array<{ start: number; end: number; text: string }>) {
  const stamp = (seconds: number) => new Date(Math.max(0, seconds) * 1000).toISOString().slice(11, 23)
  return `WEBVTT\n\n${captions.map((cue, index) => `${index + 1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}`).join('\n\n')}`
}

function PlayableScene({ job, captions, onEnded }: { job: MediaJobContract; captions: Array<{ start: number; end: number; text: string }>; onEnded: () => void }) {
  const asset = useLiveQuery(() => db.mediaAssets.where('jobId').equals(job.id).first(), [job.id])
  const [assetUrl, setAssetUrl] = useState('')
  const [trackUrl, setTrackUrl] = useState('')
  const [activeCaption, setActiveCaption] = useState('')
  useEffect(() => {
    if (!asset) { setAssetUrl(''); return }
    const url = URL.createObjectURL(new Blob([asset.bytes as BlobPart], { type: asset.mimeType })); setAssetUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [asset])
  useEffect(() => {
    if (!captions.length) { setTrackUrl(''); return }
    const url = URL.createObjectURL(new Blob([toVtt(captions)], { type: 'text/vtt' })); setTrackUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [captions])
  const src = assetUrl || job.outputUrl
  const timeUpdate = (time: number) => setActiveCaption(captions.find((cue) => time >= cue.start && time <= cue.end)?.text ?? '')
  if (job.kind === 'avatar') return <div className="playable-scene"><video key={src} controls playsInline src={src} onEnded={onEnded} onTimeUpdate={(event) => timeUpdate(event.currentTarget.currentTime)}>{trackUrl && <track default kind="captions" srcLang="en" label="English" src={trackUrl} />}</video>{activeCaption && <p className="active-caption">{activeCaption}</p>}</div>
  return <div className="playable-scene is-audio"><audio key={src} controls src={src} onEnded={onEnded} onTimeUpdate={(event) => timeUpdate(event.currentTarget.currentTime)}>{trackUrl && <track default kind="captions" srcLang="en" label="English" src={trackUrl} />}</audio>{activeCaption && <p className="active-caption">{activeCaption}</p>}</div>
}
