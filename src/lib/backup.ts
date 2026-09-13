import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { z } from 'zod'
import { BackupManifestSchema, CoursePackSchema, MediaJobSchema } from '../contracts'
import { db, type MediaAssetRecord, type PassageRecord, type SourceDocumentRecord } from './db'

const encodeJson = (value: unknown) => strToU8(JSON.stringify(value, null, 2))
const IsoString = z.string().min(1)
const SourceSectionSchema = z.object({ id: z.string(), anchor: z.string(), text: z.string(), summary: z.string().optional() })
const SourceMetadataSchema = z.object({
  id: z.string(), courseId: z.string().optional(), name: z.string(), mimeType: z.string(),
  sections: z.array(SourceSectionSchema).optional(), size: z.number().nonnegative(), sectionCount: z.number().int().nonnegative(), createdAt: IsoString,
})
const PassageRecordSchema = z.object({ id: z.string(), sourceId: z.string(), courseId: z.string(), anchor: z.string(), text: z.string(), summary: z.string().optional(), position: z.number().int().nonnegative() })
const NoteRecordSchema = z.object({ id: z.string(), courseId: z.string(), lessonId: z.string(), body: z.string(), createdAt: IsoString, updatedAt: IsoString })
const ProgressRecordSchema = z.object({ id: z.string(), courseId: z.string(), lessonId: z.string(), completed: z.boolean(), position: z.number(), updatedAt: IsoString })
const ConversationRecordSchema = z.object({
  id: z.string(), kind: z.enum(['office-hours', 'debate']), courseId: z.string().optional(), lessonId: z.string().optional(), title: z.string(),
  messages: z.array(z.object({ id: z.string(), role: z.enum(['user', 'assistant']), text: z.string(), createdAt: IsoString, citationIds: z.array(z.string()).optional() })),
  createdAt: IsoString, updatedAt: IsoString,
})
const MediaAssetMetadataSchema = z.object({ id: z.string(), jobId: z.string(), mimeType: z.string(), fileName: z.string(), createdAt: IsoString })

function parseArray<T>(archive: ReturnType<typeof unzipSync>, path: string, schema: z.ZodType<T>) {
  const value = readJson<unknown>(archive, path, [])
  return z.array(schema).parse(value)
}

export async function createBackup(includeMedia = false) {
  const [courses, notes, progress, conversations, sources, passages, allMediaJobs, storedAssets] = await Promise.all([
    db.customCourses.toArray(), db.notes.toArray(), db.progress.toArray(), db.conversations.toArray(),
    db.sources.toArray(), db.passages.toArray(), db.mediaJobs.toArray(), includeMedia ? db.mediaAssets.toArray() : Promise.resolve([]),
  ])
  const mediaJobs = includeMedia ? allMediaJobs : allMediaJobs.map(({ outputUrl: _outputUrl, ...job }) => job.status === 'complete'
    ? { ...job, status: 'failed' as const, error: 'The completed media file was not included in this backup.' }
    : job)
  const manifest = {
    schemaVersion: 2 as const,
    app: 'better-learning' as const,
    exportedAt: new Date().toISOString(),
    includesMedia: includeMedia,
    counts: {
      courses: courses.length, notes: notes.length, progress: progress.length, conversations: conversations.length,
      sources: sources.length, passages: passages.length, mediaJobs: mediaJobs.length, mediaAssets: storedAssets.length,
    },
  }

  const files: Record<string, Uint8Array> = {
    'manifest.json': encodeJson(manifest),
    'data/courses.json': encodeJson(courses),
    'data/notes.json': encodeJson(notes),
    'data/progress.json': encodeJson(progress),
    'data/conversations.json': encodeJson(conversations),
    'data/passages.json': encodeJson(passages),
    'data/media-jobs.json': encodeJson(mediaJobs),
    'data/sources.json': encodeJson(sources.map(({ text: _text, ...source }) => source)),
    'data/media-assets.json': encodeJson(storedAssets.map(({ bytes: _bytes, ...asset }) => asset)),
  }
  for (const source of sources) files[`sources/${source.id}.txt`] = strToU8(source.text)
  for (const asset of storedAssets) files[`media/${asset.id}`] = asset.bytes
  return new Blob([zipSync(files, { level: 6 }) as BlobPart], { type: 'application/zip' })
}

function readJson<T>(files: ReturnType<typeof unzipSync>, path: string, fallback: T): T {
  const bytes = files[path]
  if (!bytes) return fallback
  try { return JSON.parse(strFromU8(bytes)) as T }
  catch { throw new Error(`Backup contains invalid JSON at ${path}.`) }
}

function derivePassages(sources: SourceDocumentRecord[]) {
  return sources.flatMap((source) => source.courseId ? (source.sections ?? [{ id: 'section-1', anchor: 'Complete source', text: source.text }]).map((section, index) => ({
    id: `${source.id}:${section.id}`, sourceId: source.id, courseId: source.courseId!, anchor: section.anchor, text: section.text, summary: section.summary, position: index,
  })) : [])
}

export async function importBackup(file: File) {
  if (file.size > 500_000_000) throw new Error('This backup is larger than the 500 MB import limit.')
  let archive: ReturnType<typeof unzipSync>
  try { archive = unzipSync(new Uint8Array(await file.arrayBuffer())) }
  catch { throw new Error('This file is not a readable Better Learning ZIP backup.') }
  const manifest = BackupManifestSchema.parse(readJson(archive, 'manifest.json', null))
  const courses = parseArray(archive, 'data/courses.json', CoursePackSchema)
  const notes = parseArray(archive, 'data/notes.json', NoteRecordSchema)
  const progress = parseArray(archive, 'data/progress.json', ProgressRecordSchema)
  const conversations = parseArray(archive, 'data/conversations.json', ConversationRecordSchema)
  const mediaJobs = parseArray(archive, 'data/media-jobs.json', MediaJobSchema)
  const sourceMetadata = parseArray(archive, 'data/sources.json', SourceMetadataSchema)
  const sources: SourceDocumentRecord[] = sourceMetadata.map((source) => {
    const bytes = archive[`sources/${source.id}.txt`]
    if (!bytes) throw new Error(`Backup is missing source file: ${source.name}`)
    return { ...source, text: strFromU8(bytes) }
  })
  const passages: PassageRecord[] = manifest.schemaVersion === 2
    ? parseArray(archive, 'data/passages.json', PassageRecordSchema)
    : derivePassages(sources)
  const assetMetadata = manifest.schemaVersion === 2 ? parseArray(archive, 'data/media-assets.json', MediaAssetMetadataSchema) : []
  const mediaAssets: MediaAssetRecord[] = assetMetadata.map((asset) => {
    const bytes = archive[`media/${asset.id}`]
    if (!bytes) throw new Error(`Backup is missing media file: ${asset.fileName}`)
    return { ...asset, bytes: new Uint8Array(bytes) }
  })

  const expected = manifest.counts
  const actual = { courses: courses.length, notes: notes.length, progress: progress.length, conversations: conversations.length, sources: sources.length, mediaJobs: mediaJobs.length }
  if (Object.entries(actual).some(([key, value]) => expected[key as keyof typeof actual] !== value)) throw new Error('Backup contents do not match its manifest.')
  if (manifest.schemaVersion === 2 && (manifest.counts.passages !== passages.length || manifest.counts.mediaAssets !== mediaAssets.length)) throw new Error('Backup contents do not match its manifest.')

  await db.transaction('rw', [db.customCourses, db.notes, db.progress, db.conversations, db.sources, db.passages, db.mediaJobs, db.mediaAssets], async () => {
    await Promise.all([
      db.customCourses.bulkPut(courses), db.notes.bulkPut(notes), db.progress.bulkPut(progress), db.conversations.bulkPut(conversations),
      db.sources.bulkPut(sources), db.passages.bulkPut(passages), db.mediaJobs.bulkPut(mediaJobs), db.mediaAssets.bulkPut(mediaAssets),
    ])
  })
  return manifest
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
