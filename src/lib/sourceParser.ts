import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorker

export interface ParsedSection {
  id: string
  anchor: string
  text: string
  summary?: string
}

export interface ParsedSource {
  text: string
  sectionCount: number
  sections: ParsedSection[]
  warnings: string[]
}

function normalizeInline(text: string) {
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function withSummaries(sections: ParsedSection[]) {
  return sections.map((section) => {
    const firstSentence = normalizeInline(section.text).match(/^.{1,180}?(?:[.!?](?:\s|$)|$)/)?.[0]?.trim()
    return { ...section, summary: firstSentence || normalizeInline(section.text).slice(0, 180) }
  })
}

function paragraphSections(text: string, prefix = 'Lines') {
  const lines = text.split(/\r?\n/)
  const sections: ParsedSection[] = []
  let start = 0
  let buffer: string[] = []
  const flush = (end: number) => {
    const sectionText = buffer.join('\n').trim()
    if (sectionText) {
      const from = start + 1
      const to = Math.max(from, end)
      sections.push({ id: `section-${sections.length + 1}`, anchor: from === to ? `${prefix} ${from}` : `${prefix} ${from}–${to}`, text: sectionText })
    }
    buffer = []
  }
  lines.forEach((line, index) => {
    if (!line.trim()) { flush(index); start = index + 1; return }
    if (!buffer.length) start = index
    buffer.push(line)
  })
  flush(lines.length)
  return sections.length ? sections : [{ id: 'section-1', anchor: `${prefix} 1`, text: text.trim() }]
}

function markdownSections(text: string) {
  const lines = text.split(/\r?\n/)
  const sections: ParsedSection[] = []
  let heading = ''
  let start = 0
  let buffer: string[] = []
  const flush = (end: number) => {
    const sectionText = buffer.join('\n').trim()
    if (sectionText) {
      sections.push({
        id: `section-${sections.length + 1}`,
        anchor: heading || (start + 1 === end ? `Line ${start + 1}` : `Lines ${start + 1}–${end}`),
        text: sectionText,
      })
    }
    buffer = []
  }
  lines.forEach((line, index) => {
    const match = line.match(/^#{1,6}\s+(.+)$/)
    if (match) {
      flush(index)
      heading = match[1].trim()
      start = index + 1
      return
    }
    if (!buffer.length && line.trim()) start = index
    buffer.push(line)
  })
  flush(lines.length)
  return sections.length ? sections : paragraphSections(text)
}

function transcriptSections(raw: string) {
  const clean = raw.replace(/^WEBVTT[^\n]*\n/i, '').trim()
  const sections = clean.split(/\r?\n\s*\r?\n/).flatMap((block) => {
    const lines = block.split(/\r?\n/).filter(Boolean)
    const timingIndex = lines.findIndex((line) => line.includes('-->'))
    if (timingIndex < 0) return []
    const anchor = lines[timingIndex].replace(/\s+/g, ' ').trim()
    const text = normalizeInline(lines.slice(timingIndex + 1).join(' '))
    return text ? [{ id: `cue-${anchor}`, anchor, text }] : []
  })
  if (!sections.length) throw new Error('This caption file does not contain readable timestamped cues.')
  return sections.map((section, index) => ({ ...section, id: `cue-${index + 1}` }))
}

export async function parseSourceFile(file: File): Promise<ParsedSource> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'pdf' || file.type === 'application/pdf') {
    try {
      const pdf = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
      const sections: ParsedSection[] = []
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber)
        const content = await page.getTextContent()
        const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ').replace(/\s+/g, ' ').trim()
        sections.push({ id: `page-${pageNumber}`, anchor: `Page ${pageNumber}`, text: pageText })
      }
      const text = sections.map((section) => `[${section.anchor}]\n${section.text}`).join('\n\n')
      if (text.replace(/\s/g, '').length < Math.max(80, pdf.numPages * 25)) {
        throw new Error('This PDF appears to be scanned or has no usable text layer. OCR is not included in this release.')
      }
      const summarized = withSummaries(sections)
      return { text, sectionCount: summarized.length, sections: summarized, warnings: [] }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The PDF could not be read.'
      if (/password|encrypted/i.test(message)) throw new Error('This PDF is encrypted. Remove its password and try again.', { cause: error })
      throw new Error(message, { cause: error })
    }
  }
  if (!['txt', 'md', 'markdown', 'srt', 'vtt'].includes(extension ?? '')) {
    throw new Error('Use a text PDF, TXT, Markdown, SRT, or VTT file.')
  }
  const raw = await file.text()
  if (!raw.trim()) throw new Error('This file does not contain readable text.')
  const sections = extension === 'srt' || extension === 'vtt'
    ? transcriptSections(raw)
    : extension === 'md' || extension === 'markdown'
      ? markdownSections(raw.trim())
      : paragraphSections(raw.trim())
  const text = extension === 'srt' || extension === 'vtt'
    ? sections.map((section) => `[${section.anchor}]\n${section.text}`).join('\n\n')
    : raw.trim()
  const summarized = withSummaries(sections)
  return { text, sectionCount: summarized.length, sections: summarized, warnings: [] }
}

export function parsePastedText(text: string): ParsedSource {
  const clean = text.trim()
  if (!clean) throw new Error('Paste some source text first.')
  const sections = withSummaries(paragraphSections(clean, 'Pasted lines'))
  return { text: clean, sectionCount: sections.length, sections, warnings: [] }
}
