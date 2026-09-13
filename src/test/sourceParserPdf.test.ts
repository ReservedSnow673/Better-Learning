import { beforeEach, describe, expect, it, vi } from 'vitest'

const pdfMocks = vi.hoisted(() => ({ getDocument: vi.fn() }))
vi.mock('pdfjs-dist', () => ({ getDocument: pdfMocks.getDocument, GlobalWorkerOptions: {} }))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/pdf-worker.js' }))

import { parseSourceFile } from '../lib/sourceParser'

const pdfFile = { name: 'source.pdf', type: 'application/pdf', arrayBuffer: async () => new ArrayBuffer(8) } as File

describe('PDF source extraction', () => {
  beforeEach(() => pdfMocks.getDocument.mockReset())

  it('keeps page numbers as citation anchors', async () => {
    pdfMocks.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 2, getPage: async (page: number) => ({ getTextContent: async () => ({ items: [{ str: `Page ${page} contains enough selectable source text for a precise, reviewable citation anchor and a complete extraction test.` }] }) }) }) })
    const parsed = await parseSourceFile(pdfFile)
    expect(parsed.sections.map((section) => section.anchor)).toEqual(['Page 1', 'Page 2'])
    expect(parsed.text).toContain('[Page 2]')
  })

  it('explains scanned and encrypted extraction failures', async () => {
    pdfMocks.getDocument.mockReturnValueOnce({ promise: Promise.resolve({ numPages: 1, getPage: async () => ({ getTextContent: async () => ({ items: [] }) }) }) })
    await expect(parseSourceFile(pdfFile)).rejects.toThrow('scanned')
    pdfMocks.getDocument.mockReturnValueOnce({ promise: Promise.reject(new Error('PasswordException: encrypted document')) })
    await expect(parseSourceFile(pdfFile)).rejects.toThrow('encrypted')
  })
})
