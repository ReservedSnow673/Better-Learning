import Dexie, { type EntityTable } from 'dexie'
import type { CoursePack, MediaJobContract } from '../contracts'

export interface NoteRecord {
  id: string
  courseId: string
  lessonId: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface ProgressRecord {
  id: string
  courseId: string
  lessonId: string
  completed: boolean
  position: number
  updatedAt: string
}

export interface ConversationRecord {
  id: string
  kind: 'office-hours' | 'debate'
  courseId?: string
  lessonId?: string
  title: string
  messages: Array<{ id: string; role: 'user' | 'assistant'; text: string; createdAt: string; citationIds?: string[] }>
  createdAt: string
  updatedAt: string
}

export interface SourceDocumentRecord {
  id: string
  courseId?: string
  name: string
  mimeType: string
  text: string
  sections?: Array<{ id: string; anchor: string; text: string; summary?: string }>
  size: number
  sectionCount: number
  createdAt: string
}

export interface PassageRecord {
  id: string
  sourceId: string
  courseId: string
  anchor: string
  text: string
  summary?: string
  position: number
}

export interface MediaAssetRecord {
  id: string
  jobId: string
  bytes: Uint8Array
  mimeType: string
  fileName: string
  createdAt: string
}

export interface PreferenceRecord {
  key: string
  value: unknown
  updatedAt: string
}

export interface EncryptedCredentialRecord {
  key: 'encrypted-provider-credentials'
  value: { version: 1; salt: string; iv: string; ciphertext: string }
  updatedAt: string
}

class BetterLearningDatabase extends Dexie {
  notes!: EntityTable<NoteRecord, 'id'>
  progress!: EntityTable<ProgressRecord, 'id'>
  conversations!: EntityTable<ConversationRecord, 'id'>
  customCourses!: EntityTable<CoursePack, 'id'>
  sources!: EntityTable<SourceDocumentRecord, 'id'>
  passages!: EntityTable<PassageRecord, 'id'>
  mediaJobs!: EntityTable<MediaJobContract, 'id'>
  mediaAssets!: EntityTable<MediaAssetRecord, 'id'>
  preferences!: EntityTable<PreferenceRecord | EncryptedCredentialRecord, 'key'>

  constructor() {
    super('better-learning')
    this.version(1).stores({
      notes: 'id, courseId, lessonId, updatedAt',
      progress: 'id, courseId, lessonId, completed, updatedAt',
      conversations: 'id, kind, courseId, lessonId, updatedAt',
      customCourses: 'id, title',
      sources: 'id, courseId, name, createdAt',
    })
    this.version(2).stores({
      notes: 'id, courseId, lessonId, updatedAt',
      progress: 'id, courseId, lessonId, completed, updatedAt',
      conversations: 'id, kind, courseId, lessonId, updatedAt',
      customCourses: 'id, title',
      sources: 'id, courseId, name, createdAt',
      mediaJobs: 'id, fingerprint, status, courseId, lessonId, updatedAt',
      preferences: 'key, updatedAt',
    })
    this.version(3).stores({
      notes: 'id, courseId, lessonId, updatedAt',
      progress: 'id, courseId, lessonId, completed, updatedAt',
      conversations: 'id, kind, courseId, lessonId, updatedAt',
      customCourses: 'id, title',
      sources: 'id, courseId, name, createdAt',
      passages: 'id, sourceId, courseId, [courseId+sourceId], position',
      mediaJobs: 'id, fingerprint, status, courseId, lessonId, targetId, [targetId+kind], updatedAt',
      mediaAssets: 'id, jobId, createdAt',
      preferences: 'key, updatedAt',
    })
  }
}

export const db = new BetterLearningDatabase()

export const progressId = (courseId: string, lessonId: string) => `${courseId}:${lessonId}`

export async function toggleLessonComplete(courseId: string, lessonId: string, completed: boolean) {
  const id = progressId(courseId, lessonId)
  await db.progress.put({ id, courseId, lessonId, completed, position: completed ? 1 : 0, updatedAt: new Date().toISOString() })
}

export async function saveLessonNote(courseId: string, lessonId: string, body: string, id?: string) {
  const now = new Date().toISOString()
  const recordId = id ?? crypto.randomUUID()
  const existing = id ? await db.notes.get(id) : undefined
  await db.notes.put({ id: recordId, courseId, lessonId, body, createdAt: existing?.createdAt ?? now, updatedAt: now })
  return recordId
}

export async function saveConversation(record: ConversationRecord) {
  await db.conversations.put(record)
}
