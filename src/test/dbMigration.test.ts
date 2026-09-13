import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../lib/db'

describe('IndexedDB migrations', () => {
  beforeEach(async () => { db.close(); await db.delete() })
  afterEach(async () => { db.close(); await db.delete() })

  it('upgrades a version-one library without losing learner progress', async () => {
    const legacy = new Dexie('better-learning')
    legacy.version(1).stores({
      notes: 'id, courseId, lessonId, updatedAt', progress: 'id, courseId, lessonId, completed, updatedAt',
      conversations: 'id, kind, courseId, lessonId, updatedAt', customCourses: 'id, title', sources: 'id, courseId, name, createdAt',
    })
    await legacy.open()
    await legacy.table('progress').put({ id: 'course:lesson', courseId: 'course', lessonId: 'lesson', completed: true, position: 1, updatedAt: new Date().toISOString() })
    legacy.close()

    await db.open()
    expect(await db.progress.get('course:lesson')).toMatchObject({ completed: true })
    expect(db.tables.map((table) => table.name)).toEqual(expect.arrayContaining(['passages', 'mediaJobs', 'mediaAssets', 'preferences']))
  })
})
