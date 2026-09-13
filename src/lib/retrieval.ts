import type { Citation, Lesson } from '../contracts'

const stopWords = new Set('a an and are as at be by for from has have he her his i in is it its of on or our she that the their them they this to was we were what when where which who will with you your'.split(' '))

export function tokenize(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !stopWords.has(token))
}

export interface SearchDocument {
  id: string
  text: string
  citation: Citation
}

export function bm25(query: string, documents: SearchDocument[], limit = 4) {
  const queryTerms = [...new Set(tokenize(query))]
  if (!queryTerms.length || !documents.length) return []
  const tokenized = documents.map((document) => tokenize(document.text))
  const averageLength = tokenized.reduce((sum, terms) => sum + terms.length, 0) / tokenized.length
  const k1 = 1.5
  const b = 0.75

  return documents
    .map((document, index) => {
      const terms = tokenized[index]
      const frequencies = new Map<string, number>()
      terms.forEach((term) => frequencies.set(term, (frequencies.get(term) ?? 0) + 1))
      const score = queryTerms.reduce((total, term) => {
        const frequency = frequencies.get(term) ?? 0
        if (!frequency) return total
        const documentFrequency = tokenized.filter((tokens) => tokens.includes(term)).length
        const inverseFrequency = Math.log(1 + (documents.length - documentFrequency + 0.5) / (documentFrequency + 0.5))
        return total + inverseFrequency * ((frequency * (k1 + 1)) / (frequency + k1 * (1 - b + b * (terms.length / averageLength))))
      }, 0)
      return { ...document, score }
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function lessonDocuments(lesson: Lesson): SearchDocument[] {
  return lesson.citations.map((item) => ({
    id: item.id,
    citation: item,
    text: `${item.quote} ${lesson.objective} ${lesson.explanation} ${lesson.application.scenario}`,
  }))
}

export function localOfficeHoursAnswer(question: string, lesson: Lesson) {
  const matches = bm25(question, lessonDocuments(lesson), 2)
  const queryTerms = [...new Set(tokenize(question))]
  const evidenceTerms = new Set(tokenize(lessonDocuments(lesson).map((document) => document.text).join(' ')))
  const overlap = queryTerms.filter((term) => evidenceTerms.has(term))
  const minimumOverlap = Math.min(2, queryTerms.length)
  if (!matches.length || overlap.length < minimumOverlap) {
    return {
      text: `I do not have enough evidence in this lesson’s supplied passages to answer that faithfully. Try asking how the idea connects to “${lesson.title},” or add a source that addresses your question.`,
      citations: [] as Citation[],
      insufficientEvidence: true,
    }
  }
  const keyIdea = lesson.explanation.split('. ')[0]
  return {
    text: `I would begin with the distinction in this lesson: ${keyIdea.toLowerCase()}. In your situation, first describe what is actually happening, then choose one response that expresses the lesson’s principle. This is an AI interpretation of the supplied passage, not the author’s own words.`,
    citations: matches.map((match) => match.citation),
    insufficientEvidence: false,
  }
}
