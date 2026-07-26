import { useEffect } from 'react'
import { AppShell, Badge } from './components/ui'
import { AuthPage } from './features/auth/AuthPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { SpeedMatchPage } from './features/games/SpeedMatchPage'
import { FillBlankPage } from './features/games/FillBlankPage'
import { HomePage } from './features/learning/HomePage'
import { QuizPage } from './features/learning/QuizPage'
import { ProfilesPage } from './features/learner-profiles/ProfilesPage'
import { flushQueue } from './db'
import { useRouter } from './hooks'
import { api } from './lib'
import { useSessionStore } from './stores'
import type { Learner, User } from './types'

function App() {
  const { path, navigate } = useRouter()
  const {
    user, learners, activeLearnerId, hydrated,
    signIn, signOut, setLearners, setHydrated,
  } = useSessionStore()
  const learner = learners.find((item) => item.id === activeLearnerId)

  useEffect(() => {
    let active = true
    api<{ authenticated: boolean; user?: User; selectedLearnerId?: string | null }>('/auth/session')
      .then(async (session) => {
        if (!active) return
        if (!session.authenticated || !session.user) {
          signOut()
          return
        }
        signIn(session.user)
        const profiles = await api<{ learners: Learner[]; selectedLearnerId: string | null }>('/learners')
        if (active) setLearners(profiles.learners, profiles.selectedLearnerId)
      })
      .catch(() => { if (active) signOut() })
      .finally(() => { if (active) setHydrated() })
    return () => { active = false }
  }, [setHydrated, setLearners, signIn, signOut])

  useEffect(() => {
    const sync = () => {
      void flushQueue(async (mutation) => {
        await api(mutation.url, { method: mutation.method, body: mutation.body })
      })
    }
    window.addEventListener('online', sync)
    if (navigator.onLine) sync()
    return () => window.removeEventListener('online', sync)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!user && path !== '/auth') navigate('/auth', true)
    else if (user && !learner && path !== '/profiles') navigate('/profiles', true)
    else if (user && learner && ['/', '/auth', '/profiles'].includes(path)) navigate('/home', true)
  }, [hydrated, user, learner, path, navigate])

  if (!hydrated) {
    return (
      <main className="gate-page">
        <section className="card gate"><Badge>LOADING</Badge><h1>Preparing your learning universe…</h1></section>
      </main>
    )
  }
  if (!user) return <AuthPage navigate={navigate} />
  if (!learner) return <ProfilesPage navigate={navigate} />

  let page
  if (path === '/explore') page = <QuizPage learner={learner} navigate={navigate} />
  else if (path === '/games/fill-blank') page = <FillBlankPage learner={learner} navigate={navigate} />
  else if (path === '/games/speed-match') page = <SpeedMatchPage learner={learner} navigate={navigate} />
  else if (path === '/dashboard' || path === '/settings') {
    page = <DashboardPage navigate={navigate} openSettings={path === '/settings'} />
  } else page = <HomePage learner={learner} navigate={navigate} />

  return (
    <AppShell
      path={path}
      learner={learner}
      navigate={navigate}
      onSignOut={() => {
        void api('/auth/logout', { method: 'POST' }).finally(() => {
          signOut()
          navigate('/auth')
        })
      }}
    >
      {page}
    </AppShell>
  )
}

export default App
