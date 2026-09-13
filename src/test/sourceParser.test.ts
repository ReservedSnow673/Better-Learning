import { describe, expect, it } from 'vitest'
import { parsePastedText, parseSourceFile } from '../lib/sourceParser'

describe('source extraction', () => {
  it('preserves sections in pasted text', () => {
    const parsed = parsePastedText('First section.\n\nSecond section.')
    expect(parsed.sectionCount).toBe(2)
    expect(parsed.text).toContain('Second section')
    expect(parsed.sections[1]).toMatchObject({ anchor: 'Pasted lines 3', text: 'Second section.', summary: 'Second section.' })
  })

  it('keeps subtitle timing as citation anchors while extracting spoken text', async () => {
    const file = new File(['1\n00:00:01,000 --> 00:00:03,000\nObserve closely.\n\n2\n00:00:04,000 --> 00:00:06,000\nTest the idea.'], 'lesson.srt', { type: 'application/x-subrip' })
    const parsed = await parseSourceFile(file)
    expect(parsed.text).toContain('Observe closely.')
    expect(parsed.sections).toEqual([
      expect.objectContaining({ anchor: '00:00:01,000 --> 00:00:03,000', text: 'Observe closely.' }),
      expect.objectContaining({ anchor: '00:00:04,000 --> 00:00:06,000', text: 'Test the idea.' }),
    ])
  })

  it('uses Markdown headings as stable source anchors', async () => {
    const file = new File(['# Attention\nObserve the event before judging it.\n\n## Revision\nChange the claim when evidence changes.'], 'notes.md', { type: 'text/markdown' })
    const parsed = await parseSourceFile(file)
    expect(parsed.sections.map((section) => section.anchor)).toEqual(['Attention', 'Revision'])
  })
})
