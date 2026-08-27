import { LogOut, Plus, Rocket, Sparkles, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { MAX_LEARNERS_PER_PARENT } from '../../../shared/schemas'
import { Badge, Button, Logo } from '../../components/ui'
import { api, ApiError } from '../../lib'
import { useSessionStore } from '../../stores'
import type { CambridgeLevel, Learner } from '../../types'

export function ProfilesPage({ navigate, onSignOut }: { navigate: (path: string) => void; onSignOut: () => void }) {
  const { learners, addLearner, selectLearner } = useSessionStore()
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Learner | null>(null)
  const [pinError, setPinError] = useState('')

  const choose = (learner: Learner) => {
    if (learner.hasPin) setSelected(learner)
    else void select(learner)
  }
  const select = async (learner: Learner, pin?: string) => {
    try {
      await api('/learners/select', { method: 'POST', body: { learnerId: learner.id, pin } })
      selectLearner(learner.id)
      setSelected(null)
      navigate('/home')
    } catch (requestError) {
      setPinError(requestError instanceof ApiError ? requestError.message : 'Could not select this learner')
    }
  }
  const verifyPin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const pin = String(new FormData(event.currentTarget).get('pin'))
    if (selected) void select(selected, pin)
  }
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name')).trim()
    if (name.length < 2) return
    try {
      const response = await api<{ learner: Learner }>('/learners', {
        method: 'POST',
        body: {
          name,
          avatar: String(data.get('avatar')),
          level: String(data.get('level')) as CambridgeLevel,
          pin: String(data.get('pin') || '') || undefined,
        },
      })
      addLearner(response.learner)
      setCreating(false)
    } catch (requestError) {
      setPinError(requestError instanceof ApiError ? requestError.message : 'Could not create learner')
    }
  }

  return (
    <div className="profile-page">
      <Logo />
      <main className="profile-panel">
        <Badge tone="lime">WHO IS LEARNING?</Badge>
        <h1>Choose your explorer</h1>
        <p>Every learner gets their own quests, rewards, and progress.</p>
        <div className="profile-grid">
          {learners.map((learner) => (
            <button className="learner-card" key={learner.id} onClick={() => choose(learner)}>
              <span>{learner.avatar}</span><strong>{learner.name}</strong><small>Level {learner.level} • {learner.gems} gems</small>
            </button>
          ))}
          {learners.length < MAX_LEARNERS_PER_PARENT && (
            <button className="learner-card add-card" onClick={() => setCreating(true)}><Plus /><strong>Add learner</strong><small>Create a new journey</small></button>
          )}
        </div>
        {learners.length >= MAX_LEARNERS_PER_PARENT && (
          <p className="profile-limit-note">You can have up to {MAX_LEARNERS_PER_PARENT} learners.</p>
        )}
        <button type="button" className="profile-sign-out" onClick={onSignOut}>
          <LogOut size={16} /> Sign out
        </button>
      </main>
      {(creating || selected) && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button className="modal-close" onClick={() => { setCreating(false); setSelected(null) }} aria-label="Close"><X /></button>
            {selected ? (
              <>
                <span className="modal-emoji">{selected.avatar}</span><h2 id="modal-title">Hi, {selected.name}!</h2><p>Enter your 4-digit learner PIN.</p>
                <form onSubmit={verifyPin}><input className="pin-input" name="pin" inputMode="numeric" maxLength={4} autoFocus aria-label="Learner PIN" placeholder="••••" />{pinError && <div className="form-error">{pinError}</div>}<Button type="submit">Let’s explore <Rocket size={18} /></Button></form>
              </>
            ) : (
              <>
                <h2 id="modal-title">Create a learner</h2><p>Set up their personalised learning path.</p>
                <form onSubmit={create}>
                  <label>Display name<input name="name" placeholder="Learner name" autoFocus /></label>
                  <label>Avatar<select name="avatar"><option>🚀</option><option>🦊</option><option>🐼</option><option>🦄</option><option>🤖</option></select></label>
                  <label>Cambridge level<select name="level"><option>Starters</option><option>Movers</option><option>Flyers</option><option>Preliminary</option></select></label>
                  <label>Optional 4-digit PIN<input name="pin" inputMode="numeric" maxLength={4} placeholder="1234" /></label>
                  {pinError && <div className="form-error" role="alert">{pinError}</div>}
                  <Button type="submit">Create explorer <Sparkles size={18} /></Button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
