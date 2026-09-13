import { BookOpen, Library, MessageSquareQuote, NotebookPen, Plus, Settings } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Library', icon: Library, end: true },
  { to: '/create', label: 'Create', icon: Plus },
  { to: '/debates', label: 'Debates', icon: MessageSquareQuote },
  { to: '/notebook', label: 'Notebook', icon: NotebookPen },
]

export function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span className="brand-mark__b">b</span>
      <span className="brand-mark__l">l</span>
    </div>
  )
}

export function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="side-rail" aria-label="Primary navigation">
        <NavLink to="/" className="brand-link" aria-label="Better Learning library">
          <BrandMark />
        </NavLink>
        <nav className="rail-nav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `rail-link${isActive ? ' is-active' : ''}`} aria-label={label} title={label}>
              <Icon size={20} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <NavLink to="/settings" className={({ isActive }) => `rail-link rail-settings${isActive ? ' is-active' : ''}`} aria-label="Settings" title="Settings">
          <Settings size={20} strokeWidth={1.8} />
          <span>Settings</span>
        </NavLink>
      </aside>

      <header className="mobile-header">
        <NavLink to="/" className="mobile-brand"><BrandMark /><span>Better Learning</span></NavLink>
        <NavLink to="/settings" className="icon-button" aria-label="Settings"><Settings size={20} /></NavLink>
      </header>

      <main id="main-content" className="app-main" tabIndex={-1}>
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `bottom-link${isActive ? ' is-active' : ''}`}>
            <Icon size={20} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="reading-corner" aria-hidden="true"><BookOpen size={15} /></div>
    </div>
  )
}
