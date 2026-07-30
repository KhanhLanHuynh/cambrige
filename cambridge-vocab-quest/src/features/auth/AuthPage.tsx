import { ChevronRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Badge, Button, Logo } from '../../components/ui'
import { api, ApiError } from '../../lib'
import { useSessionStore } from '../../stores'
import type { Learner, User } from '../../types'

const authSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(10, 'Use at least 10 characters'),
})

export function AuthPage({ navigate }: { navigate: (path: string) => void }) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const signIn = useSessionStore((state) => state.signIn)
  const setLearners = useSessionStore((state) => state.setLearners)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    const result = authSchema.safeParse(data)
    if (!result.success) return setError(result.error.issues[0]?.message ?? 'Check your details')
    setSubmitting(true)
    setError('')
    try {
      const response = await api<{ user: User }>('/auth/login', {
        method: 'POST',
        body: { email: result.data.email, password: result.data.password },
      })
      signIn(response.user)
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
        <Badge>WELCOME BACK, EXPLORER</Badge>
        <h2>Sign in to continue</h2>
        <p>Your learning universe is waiting.</p>
        <form onSubmit={submit} noValidate>
          <label>Email address<input name="email" type="email" autoComplete="email" placeholder="parent@example.com" /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="At least 10 characters" /></label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Connecting…' : 'Enter Vocab Quest'}
            <ChevronRight size={18} />
          </Button>
        </form>
        <small>By continuing, you agree to our child-safe privacy standards.</small>
      </main>
    </div>
  )
}
