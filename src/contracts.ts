import { z } from 'zod'

const isHttpUrl = (value: string) => { try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false } }
const SourceLocatorSchema = z.string().refine((value) => value.startsWith('indexeddb:') || isHttpUrl(value), { message: 'Use an HTTP source URL or a local IndexedDB locator.' })
const LocalPathSchema = z.string().refine((value) => value.startsWith('/') || value.startsWith('indexeddb:'), { message: 'Use a bundled path or local IndexedDB locator.' })
const PortraitSchema = z.string().refine((value) => value.startsWith('/') || value.startsWith('data:image/') || isHttpUrl(value), { message: 'Use a safe portrait image location.' })
const HttpUrlSchema = z.string().refine(isHttpUrl, { message: 'Use an HTTP or HTTPS URL.' })

export const CitationSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  documentTitle: z.string(),
  anchor: z.string(),
  quote: z.string(),
  sourceUrl: SourceLocatorSchema,
  localPath: LocalPathSchema,
  attribution: z.enum(['author', 'translator', 'editor']),
})

export const LessonSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  title: z.string(),
  eyebrow: z.string(),
  durationMinutes: z.number().int().positive(),
  objective: z.string(),
  passage: z.string(),
  explanation: z.string(),
  application: z.object({ title: z.string(), scenario: z.string(), steps: z.array(z.string()) }),
  exercise: z.object({ prompt: z.string(), guidance: z.string(), reflection: z.string() }),
  citations: z.array(CitationSchema).min(1),
})

export const CoursePackSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  title: z.string(),
  teacher: z.object({
    id: z.string(),
    name: z.string(),
    life: z.string(),
    role: z.string(),
    portrait: PortraitSchema,
    portraitAlt: z.string(),
  }),
  summary: z.string(),
  promise: z.string(),
  theme: z.enum(['sage', 'apricot', 'parchment']),
  source: z.object({
    id: z.string(),
    title: z.string(),
    edition: z.string(),
    url: SourceLocatorSchema,
    localPath: LocalPathSchema,
    coverage: z.string(),
  }),
  lessons: z.array(LessonSchema).min(1).max(10),
})

export const ProviderResponseSchema = z.object({
  schemaVersion: z.literal(1),
  provider: z.string(),
  model: z.string(),
  text: z.string(),
  citations: z.array(CitationSchema),
  usage: z.object({ inputTokens: z.number().optional(), outputTokens: z.number().optional() }).optional(),
  refusal: z.string().optional(),
})

export const CaptionCueSchema = z.object({
  start: z.number().nonnegative(),
  end: z.number().positive(),
  text: z.string().min(1),
}).refine((cue) => cue.end >= cue.start, { message: 'Caption end must follow its start.' })

export const MediaJobSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  fingerprint: z.string(),
  kind: z.enum(['audio', 'avatar', 'captions']),
  status: z.enum(['draft', 'queued', 'running', 'complete', 'failed', 'refused']),
  providerJobId: z.string().optional(),
  providerModel: z.string().optional(),
  courseId: z.string(),
  lessonId: z.string(),
  scope: z.enum(['lesson', 'office-hours', 'debate']).optional(),
  targetId: z.string().optional(),
  parentJobId: z.string().optional(),
  sceneIndex: z.number().int().nonnegative().optional(),
  sceneCount: z.number().int().positive().optional(),
  sourceCitationIds: z.array(z.string()).optional(),
  requestedOutputs: z.array(z.enum(['avatar', 'captions'])).optional(),
  script: z.string(),
  outputUrl: HttpUrlSchema.optional(),
  outputMimeType: z.string().optional(),
  durationSeconds: z.number().nonnegative().optional(),
  captions: z.array(CaptionCueSchema).optional(),
  transcript: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const BackupCountsV1Schema = z.object({
  courses: z.number().int().nonnegative(),
  notes: z.number().int().nonnegative(),
  progress: z.number().int().nonnegative(),
  conversations: z.number().int().nonnegative(),
  sources: z.number().int().nonnegative(),
  mediaJobs: z.number().int().nonnegative(),
})

const BackupManifestV1Schema = z.object({
  schemaVersion: z.literal(1),
  app: z.literal('better-learning'),
  exportedAt: z.string(),
  includesMedia: z.boolean(),
  counts: BackupCountsV1Schema,
})

const BackupManifestV2Schema = z.object({
  schemaVersion: z.literal(2),
  app: z.literal('better-learning'),
  exportedAt: z.string(),
  includesMedia: z.boolean(),
  counts: BackupCountsV1Schema.extend({
    passages: z.number().int().nonnegative(),
    mediaAssets: z.number().int().nonnegative(),
  }),
})

export const BackupManifestSchema = z.discriminatedUnion('schemaVersion', [BackupManifestV1Schema, BackupManifestV2Schema])

export type Citation = z.infer<typeof CitationSchema>
export type Lesson = z.infer<typeof LessonSchema>
export type CoursePack = z.infer<typeof CoursePackSchema>
export type ProviderResponse = z.infer<typeof ProviderResponseSchema>
export type MediaJobContract = z.infer<typeof MediaJobSchema>
export type CaptionCue = z.infer<typeof CaptionCueSchema>
export type BackupManifest = z.infer<typeof BackupManifestSchema>
