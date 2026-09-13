import { describe, expect, it } from 'vitest'
import { starterCourses } from '../data/courses'
import { bm25, lessonDocuments, localOfficeHoursAnswer } from '../lib/retrieval'

describe('local retrieval', () => {
  const lesson = starterCourses[0].lessons[2]

  it('ranks a relevant cited passage', () => {
    const results = bm25('How do I work with difficult people?', lessonDocuments(lesson))
    expect(results[0]?.citation.anchor).toBe('Book II, §1')
  })

  it('acknowledges insufficient evidence instead of inventing an answer', () => {
    const result = localOfficeHoursAnswer('What did Marcus think about quantum chromodynamics?', lesson)
    expect(result.insufficientEvidence).toBe(true)
    expect(result.text).toMatch(/enough evidence/i)
    expect(result.citations).toHaveLength(0)
  })
})
