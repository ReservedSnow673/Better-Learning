import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ExternalLink, FileText, Plus, Save } from 'lucide-react'
import type { CoursePack, Lesson } from '../contracts'
import { db, saveLessonNote } from '../lib/db'

export function SourcesPanel({ course, lesson }: { course: CoursePack; lesson: Lesson }) {
  const localSourceId = lesson.citations.find((citation) => citation.localPath.startsWith('indexeddb:'))?.documentId
  const localSource = useLiveQuery(() => localSourceId ? db.sources.get(localSourceId) : undefined, [localSourceId])
  const [localSourceUrl, setLocalSourceUrl] = useState('')

  useEffect(() => {
    if (!localSource) { setLocalSourceUrl(''); return }
    const url = URL.createObjectURL(new Blob([localSource.text], { type: 'text/plain;charset=utf-8' }))
    setLocalSourceUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [localSource])

  return (
    <div className="sources-panel">
      <div className="source-coverage">
        <span>{course.source.coverage}</span>
        <strong>{lesson.citations.length} cited passage{lesson.citations.length === 1 ? '' : 's'}</strong>
      </div>
      {lesson.citations.map((item) => (
        <article className="citation-card" id={`citation-${item.id}`} key={item.id}>
          <div className="citation-card__top"><span><FileText size={14} /> Original source</span><span>{item.attribution}</span></div>
          <blockquote>{item.quote}</blockquote>
          <p>{item.documentTitle}</p>
          <strong>{item.anchor}</strong>
        </article>
      ))}
      <div className="source-actions">
        {localSourceId ? localSourceUrl && <a href={localSourceUrl} download={localSource?.name ?? 'source.txt'}><FileText size={15} /> Download stored source</a> : <>
          <a href={course.source.localPath} target="_blank" rel="noreferrer"><FileText size={15} /> Open bundled text</a>
          <a href={course.source.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> View edition</a>
        </>}
      </div>
      <p className="source-attribution">{localSourceId ? 'This learner-supplied source stays in this browser and is included in local backups.' : 'Starter texts are public-domain editions from Project Gutenberg. Translator and editor commentary remains part of the edition and is labeled when cited.'}</p>
    </div>
  )
}

export function NotesPanel({ course, lesson }: { course: CoursePack; lesson: Lesson }) {
  const notes = useLiveQuery(() => db.notes.where({ courseId: course.id, lessonId: lesson.id }).reverse().sortBy('updatedAt'), [course.id, lesson.id]) ?? []
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState<string | undefined>()
  const [saved, setSaved] = useState(false)

  useEffect(() => { setBody(''); setEditingId(undefined); setSaved(false) }, [course.id, lesson.id])

  const save = async () => {
    if (!body.trim()) return
    const id = await saveLessonNote(course.id, lesson.id, body.trim(), editingId)
    setEditingId(id)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="notes-panel">
      <label htmlFor="lesson-note">Private note</label>
      <textarea id="lesson-note" rows={8} value={body} onChange={(event) => { setBody(event.target.value); setSaved(false) }} placeholder="What do you want to remember?" />
      <button className="secondary-button full-button" onClick={save} disabled={!body.trim()}>{saved ? <Check size={15} /> : <Save size={15} />}{saved ? 'Saved on this device' : 'Save note'}</button>
      {!!notes.length && (
        <div className="past-notes">
          <div className="past-notes__title"><strong>From this lesson</strong><span>{notes.length}</span></div>
          {notes.map((note) => (
            <button key={note.id} onClick={() => { setBody(note.body); setEditingId(note.id) }}>
              <span>{note.body}</span><small>{new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small>
            </button>
          ))}
        </div>
      )}
      <button className="new-note-button" onClick={() => { setBody(''); setEditingId(undefined) }}><Plus size={14} /> Start a new note</button>
    </div>
  )
}
