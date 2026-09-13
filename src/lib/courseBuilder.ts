import { CoursePackSchema, type Citation, type CoursePack, type Lesson } from '../contracts'
import type { SourceDocumentRecord } from './db'
import { bm25, tokenize } from './retrieval'

const discarded = new Set(['project', 'gutenberg', 'ebook', 'copyright', 'chapter', 'source', 'text', 'would', 'could', 'should', 'there', 'their', 'about', 'which', 'these', 'those'])

export function extractCorpusKeywords(sources: SourceDocumentRecord[], limit = 8) {
  const frequency = new Map<string, number>()
  for (const source of sources) {
    tokenize(source.text.slice(0, 180_000)).forEach((token) => {
      if (token.length < 4 || discarded.has(token)) return
      frequency.set(token, (frequency.get(token) ?? 0) + 1)
    })
  }
  return [...frequency.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([term]) => term)
}

export function proposeOutline(objective: string, sources: SourceDocumentRecord[], count: number) {
  const keywords = extractCorpusKeywords(sources, count)
  const patterns = [
    (term: string) => `Begin with ${term}`,
    (term: string) => `Look closely at ${term}`,
    (term: string) => `Question the familiar: ${term}`,
    (term: string) => `${term[0].toUpperCase()}${term.slice(1)} in practice`,
    (term: string) => `The limits of ${term}`,
    (term: string) => `Connecting ${term} to experience`,
    (term: string) => `A disciplined view of ${term}`,
    (term: string) => `Make ${term} useful`,
    (term: string) => `${term[0].toUpperCase()}${term.slice(1)} and judgment`,
    (term: string) => `Return to ${term}`,
  ]
  const fallback = tokenize(objective).filter((term) => term.length > 3)
  return Array.from({ length: count }, (_, index) => {
    const term = keywords[index] ?? fallback[index % Math.max(1, fallback.length)] ?? 'the central idea'
    return patterns[index](term)
  })
}

function passageChunks(text: string) {
  return text.split(/\n\s*\n/).flatMap((paragraph) => {
    const chunks: string[] = []
    let remaining = paragraph.trim()
    while (remaining.length > 1100) {
      const window = remaining.slice(0, 1100)
      const punctuation = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '))
      const boundary = punctuation >= 500 ? punctuation + 1 : Math.max(500, window.lastIndexOf(' '))
      chunks.push(remaining.slice(0, boundary).trimEnd())
      remaining = remaining.slice(boundary).trimStart()
    }
    if (remaining) chunks.push(remaining)
    return chunks
  })
}

function usefulPassages(source: SourceDocumentRecord) {
  const sections = source.sections ?? [{ id: 'section-1', anchor: 'Complete source', text: source.text }]
  return sections.flatMap((section) => passageChunks(section.text).map((part) => ({
    source,
    sectionId: section.id,
    anchor: section.anchor,
    summary: section.summary,
    text: part.trim(),
  })))
    .filter((part) => part.text.length >= 120)
    .filter((part) => !/project gutenberg|copyright|ebook|www\.|produced by/i.test(part.text))
}

function passageExcerpt(paragraph: string) {
  const clean = paragraph.trim()
  if (clean.length <= 420) return clean
  const window = clean.slice(0, 420)
  const boundary = Math.max(window.lastIndexOf('.'), window.lastIndexOf('!'), window.lastIndexOf('?'))
  return window.slice(0, boundary >= 120 ? boundary + 1 : 420).trimEnd()
}

function fallbackPortrait(name: string) {
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="#ccd7b9"/><circle cx="400" cy="430" r="225" fill="#f7f3e8" opacity=".75"/><text x="400" y="500" text-anchor="middle" font-family="Georgia,serif" font-size="180" fill="#1b1d18">${initials}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function buildCustomCourse(input: {
  teacherName: string
  teacherRole: string
  teacherLife: string
  portrait?: string
  objective: string
  outline: string[]
  sources: SourceDocumentRecord[]
}): CoursePack {
  const courseId = `course-${crypto.randomUUID()}`
  const paragraphs = input.sources.flatMap(usefulPassages)
  if (paragraphs.length < input.outline.length) throw new Error('The supplied sources do not contain enough substantial text for this outline.')
  const candidateById = new Map(paragraphs.map((candidate, index) => [`candidate-${index}`, candidate]))
  const searchDocuments = paragraphs.map((candidate, index) => ({
    id: `candidate-${index}`,
    text: `${candidate.summary ?? ''} ${candidate.text}`,
    citation: {
      id: `candidate-${index}`, documentId: candidate.source.id, documentTitle: candidate.source.name, anchor: candidate.anchor,
      quote: candidate.text, sourceUrl: `indexeddb:${candidate.source.id}`, localPath: `indexeddb:${candidate.source.id}`, attribution: 'author' as const,
    },
  }))
  const used = new Set<string>()

  const lessons: Lesson[] = input.outline.map((title, index) => {
    const ranked = bm25(`${title} ${input.objective}`, searchDocuments, searchDocuments.length)
    const rankedId = ranked.find((match) => !used.has(match.id))?.id
    const fallbackIndex = Math.floor((index / input.outline.length) * paragraphs.length)
    const fallbackId = `candidate-${fallbackIndex}`
    const selectedId = rankedId ?? (!used.has(fallbackId) ? fallbackId : searchDocuments.find((document) => !used.has(document.id))?.id)
    const selected = selectedId ? candidateById.get(selectedId) : undefined
    if (!selected || !selectedId) throw new Error('The course builder could not retrieve distinct evidence for every lesson.')
    used.add(selectedId)
    const quote = passageExcerpt(selected.text)
    if (!selected.source.text.includes(quote)) throw new Error(`Citation validation failed for ${selected.source.name}.`)
    const citation: Citation = {
      id: `${selected.source.id}-${selected.sectionId}-passage-${index + 1}`,
      documentId: selected.source.id,
      documentTitle: selected.source.name,
      anchor: selected.anchor,
      quote,
      sourceUrl: `indexeddb:${selected.source.id}`,
      localPath: `indexeddb:${selected.source.id}`,
      attribution: 'author',
    }
    return {
      id: `lesson-${index + 1}`,
      number: index + 1,
      title: title.trim(),
      eyebrow: index === 0 ? 'Begin with the evidence' : 'Follow the source closely',
      durationMinutes: 15,
      objective: `Use the supplied passage to examine ${title.toLowerCase()} in relation to ${input.objective.toLowerCase()}.`,
      passage: `“${quote}”`,
      explanation: `This editable draft begins with the wording of the supplied passage. It treats the passage as evidence, keeps its interpretation provisional, and asks how the idea changes when placed beside your learning objective. Review this explanation against the complete source before sharing the course.`,
      application: {
        title: 'From passage to practice',
        scenario: `A present-day situation asks you to apply the source’s view of ${title.toLowerCase()}.`,
        steps: ['Restate the passage without adding a new claim.', 'Name the present condition that makes the idea relevant.', 'Try one action, then compare the result with the original wording.'],
      },
      exercise: {
        prompt: `Where does this passage sharpen—or challenge—your current view of ${title.toLowerCase()}?`,
        guidance: 'Point to a phrase in the passage, state your interpretation separately, and name one piece of evidence that could change your view.',
        reflection: 'What remains uncertain after reading the complete surrounding section?',
      },
      citations: [citation],
    }
  })

  const primary = input.sources[0]
  return CoursePackSchema.parse({
    schemaVersion: 1,
    id: courseId,
    title: input.objective.length > 48 ? `${input.teacherName}: A source-led course` : input.objective,
    teacher: {
      id: `teacher-${crypto.randomUUID()}`,
      name: input.teacherName.trim(),
      life: input.teacherLife.trim() || 'Dates not supplied',
      role: input.teacherRole.trim() || 'Teacher assembled from supplied sources',
      portrait: input.portrait || fallbackPortrait(input.teacherName),
      portraitAlt: input.portrait ? `Portrait supplied for ${input.teacherName}` : `Monogram for ${input.teacherName}`,
    },
    summary: `An editable ${lessons.length}-lesson course grounded in ${input.sources.length} locally stored source${input.sources.length === 1 ? '' : 's'}.`,
    promise: input.objective,
    theme: 'sage',
    source: {
      id: primary.id,
      title: primary.name,
      edition: 'Learner-supplied source stored on this device',
      url: `indexeddb:${primary.id}`,
      localPath: `indexeddb:${primary.id}`,
      coverage: `${input.sources.length} supplied document${input.sources.length === 1 ? '' : 's'} indexed in full; lesson evidence is sampled across the corpus.`,
    },
    lessons,
  })
}
