import { ChevronRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Badge, Button, Logo } from '../../components/ui'
import { api, ApiError } from '../../lib'
import { useSessionStore } from '../../stores'
import type { User } from '../../types'

const authSchema = z.object({
  name: z.string().min(2, 'Enter your name'),
  email: z.email('Enter a valid email'),
  password: z.string().min(10, 'Use at least 10 characters'),
})

export function AuthPage({ navigate }: { navigate: (path: string) => void }) {
  const [registering, setRegistering] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resetToken, setResetToken] = useState('')
  const signIn = useSessionStore((state) => state.signIn)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    if (resetMode) {
      setSubmitting(true)
      setError('')
      setInfo('')
      try {
        if (resetToken) {
          await api('/auth/password-reset/confirm', {
            method: 'POST',
            body: { token: resetToken, password: String(data.password) },
          })
          setInfo('Password updated. You can sign in now.')
          setResetMode(false)
          setResetToken('')
        } else {
          const response = await api<{ ok: true; resetToken?: string }>('/auth/password-reset/request', {
            method: 'POST',
            body: { email: String(data.email) },
          })
          if (response.resetToken) setResetToken(response.resetToken)
          setInfo(response.resetToken
            ? 'Dev reset token ready — enter a new password below.'
            : 'If that email exists, a reset link was issued.')
        }
      } catch (requestError) {
        setError(requestError instanceof ApiError ? requestError.message : 'Unable to reset password')
      } finally {
        setSubmitting(false)
      }
      return
    }

    const result = authSchema.safeParse({ ...data, name: registering ? data.name : 'Cambridge Parent' })
    if (!result.success) return setError(result.error.issues[0]?.message ?? 'Check your details')
    setSubmitting(true)
    setError('')
    try {
      const response = await api<{ user: User }>(registering ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: registering ? result.data : { email: result.data.email, password: result.data.password },
      })
      signIn(response.user)
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
        <Badge>{resetMode ? 'RESET PASSWORD' : registering ? 'CREATE YOUR FAMILY ACCOUNT' : 'WELCOME BACK, EXPLORER'}</Badge>
        <h2>{resetMode ? 'Recover access' : registering ? 'Begin your word quest' : 'Sign in to continue'}</h2>
        <p>{resetMode ? 'Request a reset, then choose a new password.' : registering ? 'One adult account can support multiple learners.' : 'Your learning universe is waiting.'}</p>
        <form onSubmit={submit} noValidate>
          {registering && !resetMode && <label>Your name<input name="name" autoComplete="name" placeholder="Jamie Cambridge" /></label>}
          <label>Email address<input name="email" type="email" autoComplete="email" placeholder="parent@example.com" /></label>
          {(!resetMode || resetToken) && (
            <label>Password<input name="password" type="password" autoComplete={registering || resetMode ? 'new-password' : 'current-password'} placeholder="At least 10 characters" /></label>
          )}
          {error && <div className="form-error" role="alert">{error}</div>}
          {info && <div className="save-success" role="status">{info}</div>}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Connecting…' : resetMode ? (resetToken ? 'Save new password' : 'Send reset') : registering ? 'Create free account' : 'Enter Vocab Quest'}
            <ChevronRight size={18} />
          </Button>
        </form>
        <button className="text-link" onClick={() => { setRegistering(!registering); setResetMode(false); setError(''); setInfo('') }}>
          {registering ? 'Already have an account? Sign in' : 'New here? Create a family account'}
        </button>
        <button className="text-link" onClick={() => { setResetMode(!resetMode); setError(''); setInfo(''); setResetToken('') }}>
          {resetMode ? 'Back to sign in' : 'Forgot password?'}
        </button>
        <small>By continuing, you agree to our child-safe privacy standards.</small>
      </main>
    </div>
  )
}
