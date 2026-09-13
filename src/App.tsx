import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { useWebMcp } from './hooks/useWebMcp'
import { MediaRecovery } from './components/MediaRecovery'

const LibraryPage = lazy(() => import('./pages/LibraryPage').then((module) => ({ default: module.LibraryPage })))
const LessonPage = lazy(() => import('./pages/LessonPage').then((module) => ({ default: module.LessonPage })))
const CreatePage = lazy(() => import('./pages/CreatePage').then((module) => ({ default: module.CreatePage })))
const DebatesPage = lazy(() => import('./pages/DebatesPage').then((module) => ({ default: module.DebatesPage })))
const NotebookPage = lazy(() => import('./pages/NotebookPage').then((module) => ({ default: module.NotebookPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))

function RouteFallback() {
  return <div className="route-fallback" role="status"><span /><p>Opening your library…</p></div>
}

export default function App() {
  useWebMcp()
  return (
    <><MediaRecovery /><Routes>
      <Route element={<AppShell />}>
        <Route index element={<Suspense fallback={<RouteFallback />}><LibraryPage /></Suspense>} />
        <Route path="course/:courseId/lesson/:lessonId" element={<Suspense fallback={<RouteFallback />}><LessonPage /></Suspense>} />
        <Route path="create" element={<Suspense fallback={<RouteFallback />}><CreatePage /></Suspense>} />
        <Route path="debates" element={<Suspense fallback={<RouteFallback />}><DebatesPage /></Suspense>} />
        <Route path="notebook" element={<Suspense fallback={<RouteFallback />}><NotebookPage /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<RouteFallback />}><SettingsPage /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></>
  )
}
