import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CoursePackSchema } from '../contracts'
import { starterCourses } from '../data/courses'
import { buildCustomCourse } from '../lib/courseBuilder'
import type { SourceDocumentRecord } from '../lib/db'

const sourceFiles: Record<string, string> = {
  marcus: 'public/sources/meditations.txt',
  leonardo: 'public/sources/leonardo-notebooks.txt',
  sun: 'public/sources/art-of-war.txt',
}

const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

describe('starter course packs', () => {
  it('ships three valid eight-lesson courses', () => {
    expect(starterCourses).toHaveLength(3)
    starterCourses.forEach((course) => {
      expect(() => CoursePackSchema.parse(course)).not.toThrow()
      expect(course.lessons).toHaveLength(8)
      expect(new Set(course.lessons.map((lesson) => lesson.title)).size).toBe(8)
    })
  })

  it('keeps every cited quote in its bundled source document', () => {
    const cache = new Map<string, string>()
    for (const course of starterCourses) {
      for (const lesson of course.lessons) {
        for (const citation of lesson.citations) {
          const source = cache.get(citation.documentId) ?? normalize(readFileSync(sourceFiles[citation.documentId], 'utf8'))
          cache.set(citation.documentId, source)
          expect(source, `${course.title}, lesson ${lesson.number}: ${citation.quote}`).toContain(normalize(citation.quote).replace(/…$/, ''))
        }
      }
    }
  })

  it('rejects executable source and portrait locations in imported course data', () => {
    const unsafe = structuredClone(starterCourses[0])
    unsafe.source.url = 'javascript:alert(1)'
    unsafe.teacher.portrait = 'javascript:alert(2)'
    expect(() => CoursePackSchema.parse(unsafe)).toThrow()
  })
})

describe('custom course citation validation', () => {
  it('retrieves distinct exact passages with preserved anchors', () => {
    const sections = Array.from({ length: 6 }, (_, index) => ({
      id: `section-${index + 1}`,
      anchor: `Chapter ${index + 1}`,
      text: `Evidence topic ${index + 1} begins from a recorded observation. It explains how careful attention, revision, and practical judgment change the result while preserving the original claim for later inspection.`,
      summary: `Evidence topic ${index + 1} begins from a recorded observation.`,
    }))
    const source: SourceDocumentRecord = { id: 'source', name: 'Evidence.txt', mimeType: 'text/plain', text: sections.map((section) => section.text).join('\n\n'), sections, size: 1200, sectionCount: 6, createdAt: new Date().toISOString() }
    const course = buildCustomCourse({ teacherName: 'Observer', teacherRole: 'Researcher', teacherLife: 'Contemporary', objective: 'Use evidence to revise practical judgments.', outline: sections.map((_, index) => `Evidence topic ${index + 1}`), sources: [source] })
    expect(new Set(course.lessons.map((lesson) => lesson.citations[0].anchor)).size).toBe(6)
    for (const lesson of course.lessons) expect(source.text).toContain(lesson.citations[0].quote)
  })
})
