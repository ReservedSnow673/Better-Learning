import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Download, MessageCircle, NotebookPen, Search, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Dialog } from '../components/Dialog'
import { starterCourses } from '../data/courses'
import { db, type ConversationRecord, type NoteRecord } from '../lib/db'
import { downloadBlob } from '../lib/backup'

type NotebookTab = 'notes' | 'conversations'

export function NotebookPage() {
  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), []) ?? []
  const conversations = useLiveQuery(() => db.conversations.orderBy('updatedAt').reverse().toArray(), []) ?? []
  const customCourses = useLiveQuery(() => db.customCourses.toArray(), []) ?? []
  const [tab, setTab] = useState<NotebookTab>('notes')
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ type: NotebookTab; id: string } | null>(null)
  const courses = [...starterCourses, ...customCourses]
  const courseMap = new Map(courses.map((course) => [course.id, course]))
  const filteredNotes = notes.filter((note) => {
    const course = courseMap.get(note.courseId)
    const lesson = course?.lessons.find((item) => item.id === note.lessonId)
    return `${note.body} ${course?.title ?? ''} ${lesson?.title ?? ''}`.toLowerCase().includes(query.toLowerCase())
  })
  const filteredConversations = conversations.filter((item) => `${item.title} ${item.messages.map((message) => message.text).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  const words = useMemo(() => notes.reduce((sum, note) => sum + note.body.trim().split(/\s+/).filter(Boolean).length, 0), [notes])
  const notedCourses = new Set(notes.map((note) => note.courseId)).size

  const exportNotes = () => {
    const markdown = notes.map((note) => {
      const course = courseMap.get(note.courseId)
      const lesson = course?.lessons.find((item) => item.id === note.lessonId)
      return `## ${course?.title ?? 'Course'} — ${lesson?.title ?? 'Lesson'}\n\n${note.body}\n\n_Saved ${new Date(note.updatedAt).toLocaleString()}_`
    }).join('\n\n---\n\n')
    downloadBlob(new Blob([`# Better Learning notebook\n\n${markdown}\n`], { type: 'text/markdown' }), 'better-learning-notes.md')
  }

  const removeTarget = async () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'notes') await db.notes.delete(deleteTarget.id)
    else await db.conversations.delete(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div className="page notebook-page">
      <header className="page-heading notebook-heading"><div><p className="eyebrow">Notebook</p><h1>Your thinking, gathered.</h1></div><button className="ghost-button" onClick={exportNotes} disabled={!notes.length}><Download size={15} /> Export Markdown</button></header>
      <section className="notebook-stats" aria-label="Notebook overview"><div><strong>{notes.length}</strong><span>notes</span></div><div><strong>{notedCourses}</strong><span>courses</span></div><div><strong>{words.toLocaleString()}</strong><span>words</span></div><p>Everything here stays on this device until you export a backup.</p></section>
      <div className="notebook-toolbar">
        <div className="notebook-tabs" role="tablist"><button role="tab" aria-selected={tab === 'notes'} onClick={() => setTab('notes')}><NotebookPen size={16} /> Notes <span>{notes.length}</span></button><button role="tab" aria-selected={tab === 'conversations'} onClick={() => setTab('conversations')}><MessageCircle size={16} /> Conversations <span>{conversations.length}</span></button></div>
        <label className="search-field"><Search size={16} /><span className="sr-only">Search notebook</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your notebook" /></label>
      </div>

      {tab === 'notes' && (filteredNotes.length ? <div className="notes-grid">{filteredNotes.map((note) => <NoteCard key={note.id} note={note} courseMap={courseMap} onDelete={() => setDeleteTarget({ type: 'notes', id: note.id })} />)}</div> : <NotebookEmpty search={query} kind="notes" />)}
      {tab === 'conversations' && (filteredConversations.length ? <div className="conversation-list">{filteredConversations.map((item) => <ConversationCard key={item.id} conversation={item} onDelete={() => setDeleteTarget({ type: 'conversations', id: item.id })} />)}</div> : <NotebookEmpty search={query} kind="conversations" />)}

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={`Delete this ${deleteTarget?.type === 'notes' ? 'note' : 'conversation'}?`} footer={<><button className="ghost-button" onClick={() => setDeleteTarget(null)}>Keep it</button><button className="danger-button" onClick={() => void removeTarget()}><Trash2 size={15} /> Delete</button></>}><p className="dialog-copy">This removes it from this browser. A previous ZIP backup can still contain a copy.</p></Dialog>
    </div>
  )
}

function NoteCard({ note, courseMap, onDelete }: { note: NoteRecord; courseMap: Map<string, (typeof starterCourses)[number]>; onDelete: () => void }) {
  const course = courseMap.get(note.courseId)
  const lesson = course?.lessons.find((item) => item.id === note.lessonId)
  return <article className="note-card"><div className="note-card__meta"><span>{course?.teacher.name ?? 'Custom course'}</span><time>{new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time></div><h2>{lesson?.title ?? 'Lesson note'}</h2><p>{note.body}</p><footer>{course ? <Link to={`/course/${course.id}/lesson/${note.lessonId}`}><BookOpen size={14} /> Open lesson</Link> : <span />}<button onClick={onDelete} aria-label="Delete note"><Trash2 size={14} /></button></footer></article>
}

function ConversationCard({ conversation, onDelete }: { conversation: ConversationRecord; onDelete: () => void }) {
  const last = conversation.messages.at(-1)
  return <article className="conversation-card"><div className={`conversation-kind ${conversation.kind}`}><MessageCircle size={18} /></div><div><span>{conversation.kind === 'debate' ? 'Debate' : 'Office hours'} · {conversation.messages.length} turns</span><h2>{conversation.title}</h2><p>{last?.text}</p></div><time>{new Date(conversation.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time><button onClick={onDelete} aria-label="Delete conversation"><Trash2 size={14} /></button></article>
}

function NotebookEmpty({ search, kind }: { search: string; kind: NotebookTab }) {
  return <section className="notebook-empty"><div>{kind === 'notes' ? <NotebookPen size={25} /> : <MessageCircle size={25} />}</div><h2>{search ? 'Nothing matches that search.' : kind === 'notes' ? 'Your first note starts in a lesson.' : 'Your saved conversations will appear here.'}</h2><p>{search ? 'Try a teacher, lesson title, or phrase you remember.' : kind === 'notes' ? 'Capture a reflection, question, or application while you read.' : 'Ask during office hours or stage a debate to keep the exchange.'}</p>{!search && <Link className="primary-button" to={kind === 'notes' ? '/course/marcus-aurelius-meditations/lesson/lesson-1' : '/debates'}>{kind === 'notes' ? 'Open a lesson' : 'Stage a debate'}</Link>}</section>
}
