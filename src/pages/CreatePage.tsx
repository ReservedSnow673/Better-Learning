import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, FileText, ImagePlus, LoaderCircle, Plus, ShieldCheck, Sparkles, Upload, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buildCustomCourse, extractCorpusKeywords, proposeOutline } from '../lib/courseBuilder'
import { db, type SourceDocumentRecord } from '../lib/db'
import { parsePastedText, parseSourceFile } from '../lib/sourceParser'

const steps = ['Teacher', 'Sources', 'Objective', 'Outline']

export function CreatePage() {
  const [step, setStep] = useState(0)
  const [teacherName, setTeacherName] = useState('')
  const [teacherRole, setTeacherRole] = useState('')
  const [teacherLife, setTeacherLife] = useState('')
  const [portrait, setPortrait] = useState('')
  const [sources, setSources] = useState<SourceDocumentRecord[]>([])
  const [pasted, setPasted] = useState('')
  const [objective, setObjective] = useState('')
  const [lessonCount, setLessonCount] = useState(8)
  const [outline, setOutline] = useState<string[]>([])
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [createdId, setCreatedId] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const keywords = useMemo(() => extractCorpusKeywords(sources, 6), [sources])

  const readPortrait = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 5_000_000) { setError('Choose a portrait image smaller than 5 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => setPortrait(String(reader.result))
    reader.readAsDataURL(file)
  }

  const addFiles = async (files: File[]) => {
    setWorking(true); setError('')
    try {
      const parsed: SourceDocumentRecord[] = []
      for (const file of files) {
        if (file.size > 20_000_000) throw new Error(`${file.name} is larger than the 20 MB local parsing limit.`)
        const result = await parseSourceFile(file)
        parsed.push({ id: crypto.randomUUID(), name: file.name, mimeType: file.type || 'text/plain', text: result.text, sections: result.sections, size: file.size, sectionCount: result.sectionCount, createdAt: new Date().toISOString() })
      }
      setSources((current) => [...current, ...parsed])
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The source could not be read.') }
    finally { setWorking(false) }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); void addFiles(Array.from(event.dataTransfer.files)) }
  const addPasted = () => {
    try {
      const result = parsePastedText(pasted)
      setSources((current) => [...current, { id: crypto.randomUUID(), name: `Pasted source ${current.length + 1}`, mimeType: 'text/plain', text: result.text, sections: result.sections, size: new Blob([result.text]).size, sectionCount: result.sectionCount, createdAt: new Date().toISOString() }])
      setPasted(''); setError('')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The pasted source could not be read.') }
  }

  const continueForward = () => {
    setError('')
    if (step === 0 && !teacherName.trim()) { setError('Give this teacher a name.'); return }
    if (step === 1 && !sources.length) { setError('Add at least one source before continuing.'); return }
    if (step === 2) {
      if (objective.trim().length < 12) { setError('Describe the learning objective in a little more detail.'); return }
      setOutline(proposeOutline(objective, sources, lessonCount)); setStep(3); return
    }
    setStep((current) => Math.min(3, current + 1))
  }

  const saveCourse = async () => {
    if (outline.some((title) => !title.trim())) { setError('Every lesson needs a title.'); return }
    setWorking(true); setError('')
    try {
      const course = buildCustomCourse({ teacherName, teacherRole, teacherLife, portrait, objective, outline, sources })
      const storedSources = sources.map((source) => ({ ...source, courseId: course.id }))
      const passages = storedSources.flatMap((source) => (source.sections ?? [{ id: 'section-1', anchor: 'Complete source', text: source.text }]).map((section, index) => ({
        id: `${source.id}:${section.id}`,
        sourceId: source.id,
        courseId: course.id,
        anchor: section.anchor,
        text: section.text,
        summary: section.summary,
        position: index,
      })))
      await db.transaction('rw', [db.sources, db.passages, db.customCourses], async () => {
        await db.sources.bulkPut(storedSources)
        await db.passages.bulkPut(passages)
        await db.customCourses.put(course)
      })
      setCreatedId(course.id)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The course could not be saved.') }
    finally { setWorking(false) }
  }

  if (createdId) return (
    <div className="page creation-success">
      <span className="success-seal"><Check size={28} /></span><p className="eyebrow">Saved on this device</p><h1>Your course is ready to review.</h1>
      <p>Every draft lesson points back to an exact passage. Read the surrounding source and edit interpretations before sharing them.</p>
      <div><Link className="primary-button" to={`/course/${createdId}/lesson/lesson-1`}>Open first lesson <ArrowRight size={17} /></Link><Link className="ghost-button" to="/">Return to library</Link></div>
    </div>
  )

  return (
    <div className="page create-page">
      <header className="page-heading create-heading"><div><p className="eyebrow">Create a course</p><h1>Build from the source up.</h1></div><p>Your documents stay in this browser. Review every interpretation before you share it.</p></header>
      <ol className="creation-steps" aria-label="Course creation progress">{steps.map((label, index) => <li key={label} className={index === step ? 'is-active' : index < step ? 'is-complete' : ''}><span>{index < step ? <Check size={13} /> : index + 1}</span><strong>{label}</strong></li>)}</ol>

      <div className="creation-card">
        <aside className="creation-preview">
          <div className="creation-preview__image">{portrait ? <img src={portrait} alt="Teacher portrait preview" /> : <div><ImagePlus size={30} /><span>Portrait preview</span></div>}</div>
          <p>{teacherName || 'Your teacher'}</p><span>{teacherRole || 'Role or field of work'}</span>
          {objective && <blockquote>“{objective}”</blockquote>}
          {!!sources.length && <div className="corpus-mini"><FileText size={15} /><span><strong>{sources.length} source{sources.length === 1 ? '' : 's'}</strong><small>{sources.reduce((sum, source) => sum + source.sectionCount, 0)} indexed sections</small></span></div>}
        </aside>

        <section className="creation-form" aria-live="polite">
          {step === 0 && <div className="form-step"><p className="form-step__number">Step one</p><h2>Who is teaching?</h2><p>Use a historical thinker, expert, or a source-based voice you can responsibly review.</p>
            <label>Name<input value={teacherName} onChange={(event) => setTeacherName(event.target.value)} placeholder="e.g. Mary Wollstonecraft" autoFocus /></label>
            <div className="field-row"><label>Life or period<input value={teacherLife} onChange={(event) => setTeacherLife(event.target.value)} placeholder="1759–1797" /></label><label>Role<input value={teacherRole} onChange={(event) => setTeacherRole(event.target.value)} placeholder="Writer and philosopher" /></label></div>
            <label className="portrait-input">Portrait image<span><Upload size={16} /> {portrait ? 'Choose a different image' : 'Choose an image'}<input type="file" accept="image/*" onChange={readPortrait} /></span><small>Use an image you have the right to reuse. A monogram is made if you skip this.</small></label>
          </div>}

          {step === 1 && <div className="form-step"><p className="form-step__number">Step two</p><h2>Add the evidence.</h2><p>Use multiple sources when you want the course to compare periods, works, or viewpoints.</p>
            <div className="source-drop" onDragOver={(event) => event.preventDefault()} onDrop={onDrop} onClick={() => fileInput.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') fileInput.current?.click() }}><input ref={fileInput} type="file" multiple accept=".pdf,.txt,.md,.markdown,.srt,.vtt,application/pdf,text/plain,text/markdown" onChange={(event) => void addFiles(Array.from(event.target.files ?? []))} /><Upload size={24} /><strong>{working ? 'Reading source…' : 'Drop source files here'}</strong><span>Text PDF, TXT, Markdown, SRT, or VTT · up to 20 MB each</span></div>
            {!!sources.length && <div className="source-list">{sources.map((source) => <div key={source.id}><FileText size={17} /><span><strong>{source.name}</strong><small>{source.sectionCount} sections · {(source.size / 1024).toFixed(0)} KB</small></span><button onClick={() => setSources((current) => current.filter((item) => item.id !== source.id))} aria-label={`Remove ${source.name}`}><X size={15} /></button></div>)}</div>}
            <div className="paste-source"><label htmlFor="pasted-source">Or paste text</label><textarea id="pasted-source" rows={4} value={pasted} onChange={(event) => setPasted(event.target.value)} placeholder="Paste an essay, transcript, or selected passages…" /><button className="secondary-button" onClick={addPasted} disabled={!pasted.trim()}><Plus size={15} /> Add pasted source</button></div>
          </div>}

          {step === 2 && <div className="form-step"><p className="form-step__number">Step three</p><h2>What should the learner be able to do?</h2><p>A specific objective gives the outline a standard to organize around.</p>
            <label>Learning objective<textarea rows={4} value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="e.g. Make clearer moral arguments by separating claims, evidence, and assumptions." autoFocus /></label>
            <label className="range-field"><span><strong>Number of lessons</strong><b>{lessonCount}</b></span><input type="range" min="6" max="10" value={lessonCount} onChange={(event) => setLessonCount(Number(event.target.value))} /></label>
            <div className="corpus-readout"><ShieldCheck size={20} /><div><strong>Complete local corpus indexed</strong><span>{sources.reduce((sum, source) => sum + source.text.length, 0).toLocaleString()} characters across {sources.length} source{sources.length === 1 ? '' : 's'}.</span>{!!keywords.length && <small>Frequent terms: {keywords.join(', ')}</small>}</div></div>
          </div>}

          {step === 3 && <div className="form-step outline-step"><p className="form-step__number">Step four</p><h2>Shape the outline.</h2><p>The draft retrieves distinct evidence across the supplied corpus. Edit the sequence before generating the course.</p>
            <div className="pipeline-status"><span className="is-done"><Check /> Parse</span><i /><span className="is-done"><Check /> Index</span><i /><span className="is-done"><Check /> Summarize</span><i /><span className="is-done"><Check /> Outline</span><i /><span><Sparkles /> Retrieve & validate</span></div>
            <div className="outline-editor">{outline.map((title, index) => <label key={index}><span>{String(index + 1).padStart(2, '0')}</span><input value={title} onChange={(event) => setOutline((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} aria-label={`Lesson ${index + 1} title`} /></label>)}</div>
            <p className="review-notice"><ShieldCheck size={16} /> Quotes are checked against stored passages. Explanations remain editable interpretations.</p>
          </div>}

          {error && <p className="form-error" role="alert">{error}</p>}
          <footer className="creation-actions">{step > 0 ? <button className="ghost-button" onClick={() => { setError(''); setStep((current) => current - 1) }}><ArrowLeft size={16} /> Back</button> : <Link className="ghost-button" to="/"><ArrowLeft size={16} /> Cancel</Link>} {step < 3 ? <button className="dark-button" onClick={continueForward} disabled={working}>{working ? <LoaderCircle className="spin" size={16} /> : null} Continue <ArrowRight size={16} /></button> : <button className="dark-button" onClick={saveCourse} disabled={working}>{working ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />} Build course</button>}</footer>
        </section>
      </div>
    </div>
  )
}
