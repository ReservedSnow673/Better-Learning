import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { starterCourses } from '../data/courses'
import { createBackup, importBackup } from '../lib/backup'
import { db } from '../lib/db'

describe('portable backups', () => {
  beforeEach(async () => { await db.delete(); await db.open() })
  afterEach(async () => { await db.delete() })

  it('round-trips validated user data and excludes credentials', async () => {
    const now = new Date().toISOString()
    const courseId = starterCourses[0].id
    await db.notes.put({ id: 'note-1', courseId, lessonId: 'lesson-1', body: 'Attention is a practice.', createdAt: now, updatedAt: now })
    await db.progress.put({ id: `${courseId}:lesson-1`, courseId, lessonId: 'lesson-1', completed: true, position: 1, updatedAt: now })
    await db.sources.put({ id: 'source-1', courseId, name: 'source.txt', mimeType: 'text/plain', text: 'A complete source passage.', sections: [{ id: 's1', anchor: 'Line 1', text: 'A complete source passage.', summary: 'A complete source passage.' }], size: 27, sectionCount: 1, createdAt: now })
    await db.passages.put({ id: 'source-1:s1', sourceId: 'source-1', courseId, anchor: 'Line 1', text: 'A complete source passage.', summary: 'A complete source passage.', position: 0 })
    await db.preferences.put({ key: 'encrypted-provider-credentials', value: { ciphertext: 'SUPER_SECRET_KEY' }, updatedAt: now })

    const backup = await createBackup(false)
    const archive = unzipSync(new Uint8Array(await backup.arrayBuffer()))
    expect(Object.keys(archive)).not.toContain('data/preferences.json')
    expect(Object.values(archive).map((bytes) => strFromU8(bytes)).join('\n')).not.toContain('SUPER_SECRET_KEY')

    await db.notes.clear(); await db.progress.clear(); await db.sources.clear(); await db.passages.clear()
    const manifest = await importBackup(new File([backup], 'backup.zip', { type: 'application/zip' }))
    expect(manifest.schemaVersion).toBe(2)
    expect(await db.notes.get('note-1')).toMatchObject({ body: 'Attention is a practice.' })
    expect(await db.progress.toArray()).toHaveLength(1)
    expect(await db.passages.get('source-1:s1')).toMatchObject({ anchor: 'Line 1' })
  })

  it('includes cached media bytes only when requested', async () => {
    const now = new Date().toISOString()
    await db.mediaJobs.put({ schemaVersion: 1, id: 'job-1', fingerprint: 'fingerprint', kind: 'audio', status: 'complete', courseId: 'course', lessonId: 'lesson', script: 'Audio script.', outputUrl: 'https://fal.media/audio.wav', createdAt: now, updatedAt: now })
    await db.mediaAssets.put({ id: 'asset:job-1', jobId: 'job-1', bytes: new TextEncoder().encode('audio bytes'), mimeType: 'audio/wav', fileName: 'audio.wav', createdAt: now })
    const withoutMedia = unzipSync(new Uint8Array(await (await createBackup(false)).arrayBuffer()))
    const withMedia = unzipSync(new Uint8Array(await (await createBackup(true)).arrayBuffer()))
    expect(Object.keys(withoutMedia).some((path) => path.startsWith('media/'))).toBe(false)
    expect(strFromU8(withoutMedia['data/media-assets.json'])).toBe('[]')
    expect(JSON.parse(strFromU8(withoutMedia['data/media-jobs.json']))[0]).toMatchObject({ status: 'failed', error: expect.stringContaining('not included') })
    expect(strFromU8(withMedia['media/asset:job-1'])).toBe('audio bytes')
  })

  it('validates the full archive before changing existing data', async () => {
    const now = new Date().toISOString()
    await db.notes.put({ id: 'keep-me', courseId: 'course', lessonId: 'lesson', body: 'Do not replace me.', createdAt: now, updatedAt: now })
    const backup = await createBackup(false)
    const archive = unzipSync(new Uint8Array(await backup.arrayBuffer()))
    const manifest = JSON.parse(strFromU8(archive['manifest.json'])) as { counts: { notes: number } }
    manifest.counts.notes = 99
    archive['manifest.json'] = strToU8(JSON.stringify(manifest))
    const invalid = new File([zipSync(archive) as BlobPart], 'invalid.zip', { type: 'application/zip' })
    await expect(importBackup(invalid)).rejects.toThrow('manifest')
    expect(await db.notes.get('keep-me')).toMatchObject({ body: 'Do not replace me.' })
  })

  it('opens the current storage schema with passages and recoverable media tables', () => {
    expect(db.verno).toBe(3)
    expect(db.tables.map((table) => table.name)).toEqual(expect.arrayContaining(['passages', 'mediaJobs', 'mediaAssets', 'preferences']))
  })
})
