import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, ArrowRight, BookMarked, Check, CheckCircle2, ChevronLeft, ChevronRight, FileText, MessageCircle, NotebookPen, Play, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { CoursePack } from '../contracts'
import { getCourse, getLesson } from '../data/courses'
import { db, progressId, toggleLessonComplete } from '../lib/db'
import { OfficeHours } from '../components/OfficeHours'
import { NotesPanel, SourcesPanel } from '../components/LessonPanels'
import { MediaExperience } from '../components/MediaExperience'

type UtilityTab = 'office' | 'sources' | 'notes'
type MobileView = 'outline' | 'lesson' | UtilityTab

export function LessonPage() {
  const { courseId, lessonId } = useParams()
  const staticCourse = getCourse(courseId)
  const customCourse = useLiveQuery(() => courseId ? db.customCourses.get(courseId) : undefined, [courseId])
  const course = staticCourse ?? customCourse
  if (!course) return <CourseMissing />
  return <LessonWorkspace course={course} lessonId={lessonId} />
}

function CourseMissing() {
  return <div className="page empty-page"><p className="eyebrow">Course unavailable</p><h1>We couldn’t find that course.</h1><Link className="primary-button" to="/"><ArrowLeft size={16} /> Return to library</Link></div>
}

function LessonWorkspace({ course, lessonId }: { course: CoursePack; lessonId?: string }) {
  const lesson = getLesson(course, lessonId)
  const [utilityTab, setUtilityTab] = useState<UtilityTab>('office')
  const [mobileView, setMobileView] = useState<MobileView>('lesson')
  const previousLessonId = useRef(lesson.id)
  const completion = useLiveQuery(() => db.progress.get(progressId(course.id, lesson.id)), [course.id, lesson.id])
  const allProgress = useLiveQuery(() => db.progress.where('courseId').equals(course.id).toArray(), [course.id]) ?? []
  const completedIds = new Set(allProgress.filter((item) => item.completed).map((item) => item.lessonId))
  const index = course.lessons.findIndex((item) => item.id === lesson.id)
  const previous = course.lessons[index - 1]
  const next = course.lessons[index + 1]
  const courseProgress = (completedIds.size / course.lessons.length) * 100
  const narrationScript = useMemo(() => `${lesson.title}. ${lesson.objective} ${lesson.explanation} ${lesson.application.scenario} ${lesson.application.steps.join(' ')}`, [lesson])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (previousLessonId.current !== lesson.id) setMobileView('lesson')
    previousLessonId.current = lesson.id
  }, [lesson.id])

  const setComplete = async () => {
    await toggleLessonComplete(course.id, lesson.id, !completion?.completed)
  }

  const selectUtility = (tab: UtilityTab) => { setUtilityTab(tab); setMobileView(tab) }

  return (
    <div className={`lesson-page theme-${course.theme}`}>
      <header className="lesson-topbar">
        <Link to="/" className="lesson-back"><ChevronLeft size={17} /><span>Library</span></Link>
        <div className="lesson-course-name"><span>{course.teacher.name}</span><strong>{course.title}</strong></div>
        <div className="lesson-course-progress"><span>{completedIds.size} of {course.lessons.length}</span><div><i style={{ width: `${courseProgress}%` }} /></div></div>
      </header>

      <div className="mobile-workspace-tabs" role="tablist" aria-label="Lesson workspace">
        {([
          ['outline', BookMarked, 'Outline'], ['lesson', Play, 'Lesson'], ['office', MessageCircle, 'Ask'], ['sources', FileText, 'Sources'], ['notes', NotebookPen, 'Notes'],
        ] as const).map(([id, Icon, label]) => <button key={id} role="tab" aria-selected={mobileView === id} onClick={() => id === 'office' || id === 'sources' || id === 'notes' ? selectUtility(id) : setMobileView(id)}><Icon size={17} /><span>{label}</span></button>)}
      </div>

      <div className="lesson-layout">
        <aside className={`lesson-outline mobile-panel${mobileView === 'outline' ? ' is-mobile-active' : ''}`} aria-label="Course outline">
          <div className="outline-teacher">
            <img src={course.teacher.portrait} alt="" />
            <div><p>{course.teacher.name}</p><span>{course.teacher.role}</span></div>
          </div>
          <p className="outline-label">Course outline</p>
          <nav>
            {course.lessons.map((item) => {
              const active = item.id === lesson.id
              return <Link key={item.id} to={`/course/${course.id}/lesson/${item.id}`} className={active ? 'is-active' : ''}><span className="lesson-number">{completedIds.has(item.id) ? <Check size={13} /> : String(item.number).padStart(2, '0')}</span><span><strong>{item.title}</strong><small>{item.durationMinutes} min</small></span></Link>
            })}
          </nav>
          <div className="outline-source"><FileText size={16} /><span><strong>Primary source</strong><small>{course.source.title}</small></span></div>
        </aside>

        <main className={`lesson-content mobile-panel${mobileView === 'lesson' ? ' is-mobile-active' : ''}`}>
          <div className="lesson-hero">
            <img src={course.teacher.portrait} alt={course.teacher.portraitAlt} />
            <div className="lesson-hero__shade" />
            <span className="lesson-count">Lesson {String(lesson.number).padStart(2, '0')}</span>
            <span className="ai-label"><Sparkles size={13} /> AI interpretation</span>
            <div className="lesson-hero__copy"><p>{lesson.eyebrow}</p><h1>{lesson.title}</h1></div>
            <MediaExperience courseId={course.id} lessonId={lesson.id} targetId={`lesson:${course.id}:${lesson.id}`} scope="lesson" script={narrationScript} portrait={course.teacher.portrait} teacherName={course.teacher.name} citations={lesson.citations} />
          </div>

          <article className="lesson-article">
            <section className="objective-card"><span>Learning objective</span><p>{lesson.objective}</p></section>
            <section className="lesson-section passage-section">
              <div className="lesson-section__label"><span>01</span><div><strong>Original passage</strong><small>{lesson.citations[0].documentTitle} · {lesson.citations[0].anchor}</small></div></div>
              <blockquote>{lesson.passage}</blockquote>
              <a href="#lesson-sources" onClick={() => selectUtility('sources')}>View source evidence <ArrowRight size={14} /></a>
            </section>
            <section className="lesson-section">
              <div className="lesson-section__label"><span>02</span><div><strong>Interpretation</strong><small>AI explanation grounded in the passage</small></div></div>
              <p className="explanation-copy">{lesson.explanation}</p>
            </section>
            <section className="lesson-section application-section">
              <div className="lesson-section__label"><span>03</span><div><strong>Worked application</strong><small>{lesson.application.title}</small></div></div>
              <h2>{lesson.application.scenario}</h2>
              <ol>{lesson.application.steps.map((step, stepIndex) => <li key={step}><span>{stepIndex + 1}</span><p>{step}</p></li>)}</ol>
              <p className="application-note"><Sparkles size={15} /> Modern application — this example is an interpretation, not a historical claim.</p>
            </section>
            <section className="lesson-section exercise-section">
              <div className="lesson-section__label"><span>04</span><div><strong>Your turn</strong><small>Apply the idea</small></div></div>
              <h2>{lesson.exercise.prompt}</h2>
              <details><summary>Show answer guidance</summary><p>{lesson.exercise.guidance}</p></details>
              <div className="reflection-prompt"><span>Reflect</span><p>{lesson.exercise.reflection}</p><button onClick={() => selectUtility('notes')}>Write in notes <NotebookPen size={14} /></button></div>
            </section>

            <div className="lesson-completion">
              <div><span>{completion?.completed ? 'Lesson complete' : 'When you’re ready'}</span><strong>{completion?.completed ? 'A useful idea, made your own.' : 'Mark this lesson complete.'}</strong></div>
              <button className={completion?.completed ? 'complete-button is-complete' : 'complete-button'} onClick={setComplete}>{completion?.completed ? <CheckCircle2 size={18} /> : <Check size={18} />}{completion?.completed ? 'Completed' : 'Mark complete'}</button>
            </div>

            <nav className="lesson-pagination" aria-label="Lesson navigation">
              {previous ? <Link to={`/course/${course.id}/lesson/${previous.id}`}><ChevronLeft size={18} /><span><small>Previous</small>{previous.title}</span></Link> : <span />}
              {next ? <Link to={`/course/${course.id}/lesson/${next.id}`}><span><small>Next lesson</small>{next.title}</span><ChevronRight size={18} /></Link> : <Link to="/"><span><small>Course complete</small>Return to library</span><ChevronRight size={18} /></Link>}
            </nav>
          </article>
        </main>

        <aside id="lesson-sources" className={`lesson-utility mobile-panel${['office','sources','notes'].includes(mobileView) ? ' is-mobile-active' : ''}`}>
          <div className="utility-tabs" role="tablist" aria-label="Lesson tools">
            <button role="tab" aria-selected={utilityTab === 'office'} onClick={() => selectUtility('office')}>Office hours</button>
            <button role="tab" aria-selected={utilityTab === 'sources'} onClick={() => selectUtility('sources')}>Sources</button>
            <button role="tab" aria-selected={utilityTab === 'notes'} onClick={() => selectUtility('notes')}>Notes</button>
          </div>
          <div className="utility-panel" role="tabpanel">
            {utilityTab === 'office' && <OfficeHours course={course} lesson={lesson} />}
            {utilityTab === 'sources' && <SourcesPanel course={course} lesson={lesson} />}
            {utilityTab === 'notes' && <NotesPanel course={course} lesson={lesson} />}
          </div>
        </aside>
      </div>

    </div>
  )
}
