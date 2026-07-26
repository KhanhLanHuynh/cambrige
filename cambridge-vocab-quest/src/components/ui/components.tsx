import { BarChart3, BookOpen, ChevronDown, Home, LogOut, Menu, Settings, UserRound, X } from 'lucide-react'
import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import type { Learner } from '../../types'
import { VocabularySearch } from './VocabularySearch'

export function Logo() {
  return <div className="logo" aria-label="Cambridge Vocab Quest"><span className="logo-mark">🎓</span><span><strong>Cambridge</strong><small>VOCAB QUEST</small></span></div>
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'lime' | 'ghost' }

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button className={`button button-${variant} ${className}`} {...props} />
}

export function Progress({ value, label }: { value: number; label?: string }) {
  return <div className="progress-wrap" aria-label={label ?? `${value}% complete`}><span className="progress-bar" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
}

export function Badge({ children, tone = 'cyan' }: { children: ReactNode; tone?: 'cyan' | 'lime' | 'rose' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

interface AppShellProps {
  children: ReactNode
  path: string
  learner: Learner
  navigate: (path: string) => void
  onSignOut: () => void
}

export function AppShell({ children, path, learner, navigate, onSignOut }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const links = [
    { path: '/home', label: 'Home Hub', icon: Home },
    { path: '/explore', label: 'Word Explorer', icon: BookOpen },
    { path: '/dashboard', label: 'Analytics', icon: BarChart3 },
  ]
  const go = (next: string) => {
    setMenuOpen(false)
    navigate(next)
  }

  return (
    <div className="app-shell">
      <header className="mobile-head">
        <div className="mobile-head-row">
          <Logo />
          <button className="icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        <VocabularySearch navigate={navigate} className="mobile-search" />
      </header>
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <Logo />
        <nav aria-label="Main navigation">
          {links.map(({ path: href, label, icon: Icon }) => (
            <button key={href} className={path === href || (href === '/dashboard' && path === '/settings') ? 'active' : ''} onClick={() => go(href)}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-profile">
          <div className="profile-row"><span className="avatar">{learner.avatar}</span><span><strong>{learner.name} Student</strong><small>Level {learner.level} Learner</small></span></div>
          <button onClick={() => go('/profiles')}><UserRound size={16} /> Switch learner</button>
          <button onClick={() => go('/settings')}><Settings size={16} /> Settings</button>
          <button className="danger" onClick={onSignOut}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <VocabularySearch navigate={navigate} />
          <div className="top-actions">
            <button className="profile-menu" type="button" onClick={() => go('/profiles')} title="Switch learner">
              <span>{learner.avatar}</span><strong>{learner.name} Student</strong><ChevronDown size={15} />
            </button>
          </div>
        </header>
        <main className="page">{children}</main>
      </div>
    </div>
  )
}
