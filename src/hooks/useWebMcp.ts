import { useEffect } from 'react'
import { z } from 'zod'
import { saveLessonNote, toggleLessonComplete } from '../lib/db'

interface ModelContext {
  registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void>
}

declare global {
  interface Document { modelContext?: ModelContext }
}

const completeInput = z.object({ courseId: z.string(), lessonId: z.string(), completed: z.boolean() })
const noteInput = z.object({ courseId: z.string(), lessonId: z.string(), body: z.string().min(1).max(20_000) })

export function useWebMcp() {
  useEffect(() => {
    const context = document.modelContext
    if (!context?.registerTool) return
    const lifecycle = new AbortController()
    const register = async () => {
      await context.registerTool({
        name: 'set_lesson_completion',
        title: 'Set lesson completion',
        description: 'Mark one Better Learning lesson complete or incomplete and update visible course progress.',
        inputSchema: { type: 'object', properties: { courseId: { type: 'string' }, lessonId: { type: 'string' }, completed: { type: 'boolean' } }, required: ['courseId', 'lessonId', 'completed'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input: unknown) {
          const value = completeInput.parse(input)
          await toggleLessonComplete(value.courseId, value.lessonId, value.completed)
          return { lessonId: value.lessonId, completed: value.completed }
        },
      }, { signal: lifecycle.signal })
      await context.registerTool({
        name: 'save_lesson_note',
        title: 'Save lesson note',
        description: 'Save a private note for a Better Learning lesson on this device.',
        inputSchema: { type: 'object', properties: { courseId: { type: 'string' }, lessonId: { type: 'string' }, body: { type: 'string', minLength: 1, maxLength: 20000 } }, required: ['courseId', 'lessonId', 'body'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input: unknown) {
          const value = noteInput.parse(input)
          const id = await saveLessonNote(value.courseId, value.lessonId, value.body)
          return { id, lessonId: value.lessonId, saved: true }
        },
      }, { signal: lifecycle.signal })
    }
    void register().catch(() => undefined)
    return () => lifecycle.abort()
  }, [])
}
