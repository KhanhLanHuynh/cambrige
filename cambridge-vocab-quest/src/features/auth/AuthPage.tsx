import { ChevronRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Badge, Button, Logo } from '../../components/ui'
import { api, ApiError } from '../../lib'
import { useSessionStore } from '../../stores'
import type { Learner, User } from '../../types'

const signInSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(10, 'Use at least 10 characters'),
})

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(80, 'Use 80 characters or fewer'),
  email: z.email('Enter a valid email'),
  password: z.string().min(10, 'Use at least 10 characters'),
})

export function AuthPage({ navigate }: { navigate: (path: string) => void }) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const signIn = useSessionStore((state) => state.signIn)
  const setLearners = useSessionStore((state) => state.setLearners)
  const registering = mode === 'register'

  const switchMode = (next: 'signin' | 'register') => {
    setMode(next)
    setError('')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    const result = registering ? registerSchema.safeParse(data) : signInSchema.safeParse(data)
    if (!result.success) return setError(result.error.issues[0]?.message ?? 'Check your details')
    setSubmitting(true)
    setError('')
    try {
      const response = await api<{ user: User }>(registering ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: result.data,
      })
      signIn(response.user)
      if (response.user.role === 'superadmin') {
        navigate('/admin')
        return
      }
      const profiles = await api<{ learners: Learner[]; selectedLearnerId: string | null }>('/learners')
      setLearners(profiles.learners, profiles.selectedLearnerId)
      navigate('/profiles')
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to connect to the learning server')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-story">
        <Logo />
        <div>
          <Badge tone="lime">LEARN • PLAY • GROW</Badge>
          <h1>Every new word unlocks a new world.</h1>
          <p>Build confident learners with playful Cambridge-aligned vocabulary quests and clear progress for adults.</p>
          <div className="story-orbit" aria-hidden="true"><span>🚀</span><i>ABC</i><b>⭐</b></div>
        </div>
        <small>Designed for curious minds aged 7–14.</small>
      </section>
      <main className="auth-card">
        <div className="auth-mobile-logo"><Logo /></div>
        <Badge>{registering ? 'CREATE PARENT ACCOUNT' : 'WELCOME BACK, EXPLORER'}</Badge>
        <h2>{registering ? 'Set up your household' : 'Sign in to continue'}</h2>
        <p>{registering ? 'Create an adult account to add learners and track progress.' : 'Your learning universe is waiting.'}</p>
        <form onSubmit={submit} noValidate>
          {registering && (
            <label>Name<input name="name" type="text" autoComplete="name" placeholder="Jamie" /></label>
          )}
          <label>Email address<input name="email" type="email" autoComplete="email" placeholder="parent@example.com" /></label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={registering ? 'new-password' : 'current-password'}
              placeholder="At least 10 characters"
            />
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Connecting…' : registering ? 'Create account' : 'Enter Vocab Quest'}
            <ChevronRight size={18} />
          </Button>
        </form>
        <button
          type="button"
          className="text-link"
          onClick={() => switchMode(registering ? 'signin' : 'register')}
        >
          {registering ? 'Already have an account? Sign in' : 'Need an account? Create one'}
        </button>
        <small>By continuing, you agree to our child-safe privacy standards.</small>
      </main>
    </div>
  )
}
