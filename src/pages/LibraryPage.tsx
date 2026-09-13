import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, BookOpen, Clock3, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CoursePack } from '../contracts'
import { starterCourses } from '../data/courses'
import { db } from '../lib/db'
import { ProgressRing } from '../components/ProgressRing'

function completedCount(course: CoursePack, completedIds: Set<string>) {
  return course.lessons.filter((item) => completedIds.has(`${course.id}:${item.id}`)).length
}

function CourseCard({ course, completedIds }: { course: CoursePack; completedIds: Set<string> }) {
  const completed = completedCount(course, completedIds)
  const progress = (completed / course.lessons.length) * 100
  const nextLesson = course.lessons[Math.min(completed, course.lessons.length - 1)]
  return (
    <article className={`course-card theme-${course.theme}`}>
      <div className="course-card__image-wrap">
        <img className="course-card__image" src={course.teacher.portrait} alt={course.teacher.portraitAlt} />
        <span className="interpretation-badge">AI interpretation</span>
      </div>
      <div className="course-card__body">
        <div className="course-card__meta"><span>{course.teacher.name}</span><span>{course.lessons.length} lessons</span></div>
        <h3>{course.title}</h3>
        <p>{course.summary}</p>
        <div className="course-card__footer">
          <div className="course-progress-copy">
            <ProgressRing value={progress} />
            <span>{completed ? `${completed} of ${course.lessons.length} complete` : 'Ready to begin'}</span>
          </div>
          <Link className="circle-link" to={`/course/${course.id}/lesson/${nextLesson.id}`} aria-label={`${completed ? 'Continue' : 'Begin'} ${course.title}`}>
            <ArrowRight size={19} />
          </Link>
        </div>
      </div>
    </article>
  )
}

export function LibraryPage() {
  const progressRecords = useLiveQuery(() => db.progress.where('completed').equals(1).toArray(), []) ?? []
  const customCourses = useLiveQuery(() => db.customCourses.toArray(), []) ?? []
  const completedIds = new Set(progressRecords.map((record) => record.id))
  const allCourses = [...starterCourses, ...customCourses]
  const focus = allCourses[0]
  const focusCompleted = completedCount(focus, completedIds)
  const nextFocusLesson = focus.lessons[Math.min(focusCompleted, focus.lessons.length - 1)]

  return (
    <div className="page library-page">
      <header className="page-heading library-heading">
        <div>
          <p className="eyebrow">Your library</p>
          <h1>What will you learn today?</h1>
        </div>
        <Link className="quiet-profile" to="/settings" aria-label="Open settings">
          <span className="profile-dot" aria-hidden="true">YL</span>
          <span><strong>Your learning</strong><small>Stored on this device</small></span>
        </Link>
      </header>

      <section className="continue-panel" aria-labelledby="continue-title">
        <div className="continue-panel__copy">
          <div className="section-kicker"><span><Sparkles size={14} /> Continue learning</span><span>{focusCompleted} / {focus.lessons.length} lessons</span></div>
          <p className="continue-panel__teacher">With {focus.teacher.name}</p>
          <h2 id="continue-title">{nextFocusLesson.number}. {nextFocusLesson.title}</h2>
          <p>{nextFocusLesson.objective}</p>
          <div className="lesson-facts">
            <span><Clock3 size={15} /> {nextFocusLesson.durationMinutes} min</span>
            <span><BookOpen size={15} /> Source passage + practice</span>
          </div>
          <Link className="primary-button" to={`/course/${focus.id}/lesson/${nextFocusLesson.id}`}>
            {focusCompleted ? 'Continue lesson' : 'Begin course'} <ArrowRight size={17} />
          </Link>
        </div>
        <div className="continue-panel__portrait">
          <div className="portrait-arch">
            <img src={focus.teacher.portrait} alt={focus.teacher.portraitAlt} />
          </div>
          <span className="portrait-caption">A source-grounded<br />AI interpretation</span>
        </div>
      </section>

      <section className="library-section" aria-labelledby="courses-title">
        <div className="section-heading-row">
          <div><p className="eyebrow">Thoughtful guides</p><h2 id="courses-title">Courses in your library</h2></div>
          <Link to="/create" className="text-link">Create your own <ArrowRight size={15} /></Link>
        </div>
        <div className="course-grid">
          {allCourses.map((course) => <CourseCard key={course.id} course={course} completedIds={completedIds} />)}
        </div>
      </section>
    </div>
  )
}
