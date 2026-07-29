import {
  Download, Gift, LockKeyhole, Plus, Search,
  ShieldCheck, X, Check,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Badge, Button, Progress } from '../../components/ui'
import { api, ApiError, downloadFromApi } from '../../lib'
import { useSessionStore } from '../../stores'
import type {
  CambridgeLevel, GiftDefinition, GiftRedemption, Learner, LearnerSettings, WordHealth,
} from '../../types'

interface DashboardSummary {
  activity: Array<{ learnerId: string; name: string; values: number[] }>
  masteredThisWeek: number
  masteryByLevel: Array<{ label: string; value: number; count: number }>
  learners: Array<Learner & { totalAnswers: number; accuracy: number; atRiskWords: number; masteredThisWeek: number; settings?: LearnerSettings }>
  wordHealth: Array<{
    id: string
    word: string
    partOfSpeech: string
    category: string
    health: WordHealth
    accuracy: number
    quizzes: number
    lastActivity: string | null
    lastActivityLabel: string
  }>
  pendingRedemptions?: {
    count: number
    items: GiftRedemption[]
  }
}

const ACTIVITY_COLORS = ['#00dcff', '#8b50e6', '#86ff3a', '#ff477e', '#ffb020', '#5eead4']

function activityPoints(values: number[]) {
  const last = Math.max(1, values.length - 1)
  return values.map((value, index) => `${index * (100 / last)},${100 - value}`).join(' ')
}

function newGiftDraft(): GiftDefinition {
  return { id: crypto.randomUUID(), name: '', costGems: 100 }
}

export function SettingsModal({
  onClose,
  initialByLearner,
  onLearnersChanged,
}: {
  onClose: () => void
  initialByLearner?: Record<string, LearnerSettings>
  onLearnersChanged?: () => void
}) {
  const learners = useSessionStore((state) => state.learners)
  const removeLearner = useSessionStore((state) => state.removeLearner)
  const updateLearner = useSessionStore((state) => state.updateLearner)
  const [settingsTargetId, setSettingsTargetId] = useState(learners[0]?.id ?? '')
  const [saved, setSaved] = useState(false)
  const [catalogSaved, setCatalogSaved] = useState(false)
  const [error, setError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [settings, setSettings] = useState<LearnerSettings | null>(
    settingsTargetId ? (initialByLearner?.[settingsTargetId] ?? null) : null,
  )
  const [catalog, setCatalog] = useState<GiftDefinition[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<Learner | null>(null)
  const [confirmName, setConfirmName] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [editing, setEditing] = useState<Learner | null>(null)
  const [editName, setEditName] = useState('')
  const [editAvatar, setEditAvatar] = useState('🚀')
  const [editLevel, setEditLevel] = useState<CambridgeLevel>('Starters')
  const [editPin, setEditPin] = useState('')
  const [clearPin, setClearPin] = useState(false)
  const [editError, setEditError] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [editSaved, setEditSaved] = useState(false)

  useEffect(() => {
    if (!learners.length) {
      setSettingsTargetId('')
      return
    }
    if (!learners.some((entry) => entry.id === settingsTargetId)) {
      setSettingsTargetId(learners[0].id)
    }
  }, [learners, settingsTargetId])

  useEffect(() => {
    if (!settingsTargetId) {
      setSettings({
        dailyGoal: 10,
        dailyLimitMinutes: 45,
        reviewMix: 25,
        timedModesEnabled: true,
        focusMode: false,
        soundEnabled: true,
        hintsEnabled: true,
      })
      return
    }
    const seeded = initialByLearner?.[settingsTargetId]
    if (seeded) {
      setSettings(seeded)
      return
    }
    setSettings(null)
    api<{ settings: LearnerSettings }>(`/settings?learnerId=${encodeURIComponent(settingsTargetId)}`)
      .then((response) => setSettings(response.settings))
      .catch(() => setSettings({
        dailyGoal: 10,
        dailyLimitMinutes: 45,
        reviewMix: 25,
        timedModesEnabled: true,
        focusMode: false,
        soundEnabled: true,
        hintsEnabled: true,
      }))
  }, [settingsTargetId, initialByLearner])

  useEffect(() => {
    api<{ catalog: GiftDefinition[] }>('/parent/gifts')
      .then((response) => setCatalog(response.catalog))
      .catch(() => setCatalog([]))
      .finally(() => setCatalogLoading(false))
  }, [])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!settingsTargetId) {
      setError('Add a learner before saving experience settings')
      return
    }
    const data = new FormData(event.currentTarget)
    try {
      const response = await api<{ settings: LearnerSettings }>('/settings', {
        method: 'PATCH',
        body: {
          learnerId: settingsTargetId,
          dailyLimitMinutes: Number(data.get('dailyLimitMinutes')),
          reviewMix: Number(data.get('reviewMix')),
          focusMode: data.get('focusMode') === 'on',
          timedModesEnabled: data.get('timedModesEnabled') === 'on',
          soundEnabled: data.get('soundEnabled') === 'on',
          hintsEnabled: data.get('hintsEnabled') === 'on',
        },
      })
      setSettings(response.settings)
      setSaved(true)
      setError('')
      onLearnersChanged?.()
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Could not save settings')
    }
  }

  const saveCatalog = async () => {
    if (catalog.some((gift) => !gift.name.trim())) {
      setCatalogError('Give every gift a name, or remove empty rows')
      return
    }
    const cleaned = catalog.map((gift) => ({ ...gift, name: gift.name.trim() }))
    try {
      const response = await api<{ catalog: GiftDefinition[] }>('/parent/gifts', {
        method: 'PUT',
        body: { gifts: cleaned },
      })
      setCatalog(response.catalog)
      setCatalogSaved(true)
      setCatalogError('')
    } catch (requestError) {
      setCatalogError(requestError instanceof ApiError ? requestError.message : 'Could not save gift catalog')
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    if (confirmName.trim() !== pendingDelete.name) {
      setDeleteError('Type the learner’s name exactly to confirm')
      return
    }
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await api(`/learners/${pendingDelete.id}`, { method: 'DELETE' })
      removeLearner(pendingDelete.id)
      setPendingDelete(null)
      setConfirmName('')
      onLearnersChanged?.()
    } catch (requestError) {
      setDeleteError(requestError instanceof ApiError ? requestError.message : 'Could not delete learner')
    } finally {
      setDeleteBusy(false)
    }
  }

  const openEdit = (entry: Learner) => {
    setEditing(entry)
    setEditName(entry.name)
    setEditAvatar(entry.avatar || '🚀')
    setEditLevel(entry.level)
    setEditPin('')
    setClearPin(false)
    setEditError('')
    setEditSaved(false)
    setPendingDelete(null)
    setConfirmName('')
    setDeleteError('')
  }

  const saveEdit = async () => {
    if (!editing) return
    const name = editName.trim()
    if (name.length < 1) {
      setEditError('Enter a display name')
      return
    }
    if (editPin && !/^\d{4,6}$/.test(editPin)) {
      setEditError('PIN must be 4–6 digits')
      return
    }
    if (clearPin && editPin) {
      setEditError('Provide a new PIN or clear the PIN, not both')
      return
    }

    const body: {
      name: string
      avatar: string
      level: CambridgeLevel
      pin?: string
      clearPin?: boolean
    } = {
      name,
      avatar: editAvatar,
      level: editLevel,
    }
    if (clearPin) body.clearPin = true
    else if (editPin) body.pin = editPin

    setEditBusy(true)
    setEditError('')
    try {
      const response = await api<{ learner: Learner }>(`/learners/${editing.id}`, {
        method: 'PATCH',
        body,
      })
      updateLearner(response.learner)
      setEditing(response.learner)
      setEditPin('')
      setClearPin(false)
      setEditSaved(true)
      onLearnersChanged?.()
    } catch (requestError) {
      setEditError(requestError instanceof ApiError ? requestError.message : 'Could not update learner')
    } finally {
      setEditBusy(false)
    }
  }

  if (!settings) {
    return <div className="modal-backdrop"><section className="modal settings-modal"><p>Loading settings…</p></section></div>
  }

  return (
    <div className="modal-backdrop">
      <section className="modal settings-modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close settings"><X /></button>
        <h2>Parent control center</h2>
        <p>Manage experience settings and profiles for every learner on this account.</p>
        {learners.length > 0 && (
          <label className="settings-learner-picker">
            Experience settings for
            <select
              value={settingsTargetId}
              aria-label="Learner for experience settings"
              onChange={(event) => {
                setSettingsTargetId(event.target.value)
                setSaved(false)
                setError('')
              }}
            >
              {learners.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.avatar} {entry.name}</option>
              ))}
            </select>
          </label>
        )}
        <form key={settingsTargetId} onSubmit={save}>
          <label>
            Daily learning limit
            <select name="dailyLimitMinutes" defaultValue={String(settings.dailyLimitMinutes)}>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </label>
          <label>
            Review mix
            <select name="reviewMix" defaultValue={String(settings.reviewMix)}>
              <option value="10">10% review</option>
              <option value="25">25% review</option>
              <option value="40">40% review</option>
            </select>
          </label>
          <label className="toggle-row">
            <span><strong>Focus mode</strong><small>Games unlock after daily quiz</small></span>
            <input name="focusMode" type="checkbox" defaultChecked={settings.focusMode} />
          </label>
          <label className="toggle-row">
            <span><strong>Timed modes</strong><small>Allow speed-based games</small></span>
            <input name="timedModesEnabled" type="checkbox" defaultChecked={settings.timedModesEnabled} />
          </label>
          <label className="toggle-row">
            <span><strong>Sound</strong><small>Pronunciation and effects</small></span>
            <input name="soundEnabled" type="checkbox" defaultChecked={settings.soundEnabled} />
          </label>
          <label className="toggle-row">
            <span><strong>Hints</strong><small>Show hint button in quizzes</small></span>
            <input name="hintsEnabled" type="checkbox" defaultChecked={settings.hintsEnabled} />
          </label>
          {error && <div className="form-error">{error}</div>}
          {saved && <div className="save-success"><Check /> Settings saved</div>}
          <Button type="submit" disabled={!settingsTargetId}>Save settings</Button>
        </form>

        <div className="learners-manager">
          <h3>Learners</h3>
          <p>Edit or remove learner profiles. Deleting permanently removes progress, quizzes, and gift requests.</p>
          <ul className="learners-manager-list">
            {learners.map((entry) => (
              <li key={entry.id}>
                <span className="learners-manager-avatar" aria-hidden="true">{entry.avatar}</span>
                <span>
                  <strong>{entry.name}</strong>
                  <small>{entry.gems ?? 0} gems · Level {entry.level}{entry.hasPin ? ' · PIN' : ''}</small>
                </span>
                <span className="learners-manager-actions">
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => openEdit(entry)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-link danger-link"
                    onClick={() => {
                      setPendingDelete(entry)
                      setConfirmName('')
                      setDeleteError('')
                      setEditing(null)
                      setEditError('')
                      setEditSaved(false)
                    }}
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {!learners.length && <p className="no-results">No learners on this account.</p>}
          {editing && (
            <div className="edit-learner-form">
              <strong>Edit {editing.name}</strong>
              <label>
                Display name
                <input
                  aria-label="Learner display name"
                  value={editName}
                  maxLength={40}
                  autoFocus
                  onChange={(event) => {
                    setEditName(event.target.value)
                    setEditSaved(false)
                  }}
                />
              </label>
              <label>
                Avatar
                <select
                  aria-label="Learner avatar"
                  value={editAvatar}
                  onChange={(event) => {
                    setEditAvatar(event.target.value)
                    setEditSaved(false)
                  }}
                >
                  {!['🚀', '🦊', '🐼', '🦄', '🤖'].includes(editAvatar) && (
                    <option value={editAvatar}>{editAvatar}</option>
                  )}
                  <option>🚀</option>
                  <option>🦊</option>
                  <option>🐼</option>
                  <option>🦄</option>
                  <option>🤖</option>
                </select>
              </label>
              <label>
                Cambridge level
                <select
                  aria-label="Learner Cambridge level"
                  value={editLevel}
                  onChange={(event) => {
                    setEditLevel(event.target.value as CambridgeLevel)
                    setEditSaved(false)
                  }}
                >
                  <option>Starters</option>
                  <option>Movers</option>
                  <option>Flyers</option>
                  <option>Preliminary</option>
                </select>
              </label>
              <label>
                New PIN (optional)
                <input
                  aria-label="New learner PIN"
                  inputMode="numeric"
                  maxLength={6}
                  value={editPin}
                  placeholder={editing.hasPin ? 'Leave blank to keep current PIN' : 'Optional 4–6 digits'}
                  disabled={clearPin}
                  onChange={(event) => {
                    setEditPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                    setEditSaved(false)
                  }}
                />
              </label>
              {editing.hasPin && (
                <label className="toggle-row">
                  <span><strong>Remove PIN</strong><small>Allow open access without a PIN</small></span>
                  <input
                    type="checkbox"
                    checked={clearPin}
                    onChange={(event) => {
                      setClearPin(event.target.checked)
                      if (event.target.checked) setEditPin('')
                      setEditSaved(false)
                    }}
                  />
                </label>
              )}
              {editError && <div className="form-error">{editError}</div>}
              {editSaved && <div className="save-success"><Check /> Learner updated</div>}
              <div className="gift-editor-actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={editBusy}
                  onClick={() => {
                    setEditing(null)
                    setEditError('')
                    setEditSaved(false)
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" disabled={editBusy} onClick={() => void saveEdit()}>
                  Save learner
                </Button>
              </div>
            </div>
          )}
          {pendingDelete && (
            <div className="delete-learner-confirm">
              <strong>Delete {pendingDelete.name}?</strong>
              <p>This cannot be undone. Type <b>{pendingDelete.name}</b> to confirm.</p>
              <input
                aria-label="Type learner name to confirm delete"
                value={confirmName}
                placeholder={pendingDelete.name}
                autoFocus
                onChange={(event) => setConfirmName(event.target.value)}
              />
              {deleteError && <div className="form-error">{deleteError}</div>}
              <div className="gift-editor-actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={deleteBusy}
                  onClick={() => {
                    setPendingDelete(null)
                    setConfirmName('')
                    setDeleteError('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={deleteBusy || confirmName.trim() !== pendingDelete.name}
                  onClick={() => void confirmDelete()}
                >
                  Delete forever
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="gift-catalog-editor">
          <h3>Real-world gifts</h3>
          <p>Define gifts learners can request with gems. You confirm each request in Analytics.</p>
          {catalogLoading
            ? <p>Loading gift catalog…</p>
            : (
              <>
                <ul className="gift-editor-list">
                  {catalog.map((gift, index) => (
                    <li key={gift.id}>
                      <input
                        aria-label={`Gift ${index + 1} name`}
                        value={gift.name}
                        placeholder="Gift name"
                        maxLength={60}
                        onChange={(event) => {
                          const name = event.target.value
                          setCatalog((current) => current.map((item) => (item.id === gift.id ? { ...item, name } : item)))
                          setCatalogSaved(false)
                        }}
                      />
                      <input
                        aria-label={`Gift ${index + 1} cost`}
                        type="number"
                        min={10}
                        max={5000}
                        value={gift.costGems}
                        onChange={(event) => {
                          const costGems = Number(event.target.value) || 10
                          setCatalog((current) => current.map((item) => (item.id === gift.id ? { ...item, costGems } : item)))
                          setCatalogSaved(false)
                        }}
                      />
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => {
                          setCatalog((current) => current.filter((item) => item.id !== gift.id))
                          setCatalogSaved(false)
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                {!catalog.length && <p className="no-results">No gifts yet. Add a real-world reward.</p>}
                <div className="gift-editor-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={catalog.length >= 12}
                    onClick={() => {
                      setCatalog((current) => [...current, newGiftDraft()])
                      setCatalogSaved(false)
                    }}
                  >
                    <Plus /> Add gift
                  </Button>
                  <Button type="button" onClick={() => void saveCatalog()}>Save gift catalog</Button>
                </div>
                {catalogError && <div className="form-error">{catalogError}</div>}
                {catalogSaved && <div className="save-success"><Check /> Gift catalog saved</div>}
              </>
            )}
        </div>
      </section>
    </div>
  )
}

function RedeemModal({
  onClose,
  initialPending,
  onResolved,
}: {
  onClose: () => void
  initialPending: GiftRedemption[]
  onResolved: (remaining: GiftRedemption[]) => void
}) {
  const [pending, setPending] = useState(initialPending)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api<{ pendingRedemptions: GiftRedemption[] }>('/parent/gifts')
      .then((response) => {
        if (cancelled) return
        setPending(response.pendingRedemptions)
        onResolved(response.pendingRedemptions)
      })
      .catch((requestError) => {
        if (cancelled) return
        setError(requestError instanceof ApiError ? requestError.message : 'Could not load gift requests')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
    // Load once when the modal opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resolve = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id)
    setError('')
    try {
      await api(`/parent/redemptions/${id}/${action}`, { method: 'POST' })
      const remaining = pending.filter((item) => item.id !== id)
      setPending(remaining)
      onResolved(remaining)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : `Could not ${action} request`)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal settings-modal redeem-modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close redeem"><X /></button>
        <h2>Redeem gifts</h2>
        <p>Approve a request when you hand over the real-world gift. Gems are deducted only on approval.</p>
        {loading && <p>Loading requests…</p>}
        {!loading && !pending.length && <p className="no-results">No pending gift requests.</p>}
        <ul className="redeem-list">
          {pending.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.giftName}</strong>
                <small>
                  {item.learnerName ?? 'Learner'} · {item.costGems} gems
                  {typeof item.learnerGems === 'number' ? ` · ${item.learnerGems} on hand` : ''}
                </small>
              </div>
              <div className="redeem-actions">
                <Button
                  variant="secondary"
                  disabled={busyId === item.id}
                  onClick={() => void resolve(item.id, 'reject')}
                >
                  Reject
                </Button>
                <Button
                  disabled={busyId === item.id || (item.learnerGems ?? 0) < item.costGems}
                  onClick={() => void resolve(item.id, 'approve')}
                >
                  Approve
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {error && <div className="form-error">{error}</div>}
      </section>
    </div>
  )
}

export function DashboardPage({
  navigate,
  openSettings = false,
}: {
  navigate: (path: string) => void
  openSettings?: boolean
}) {
  const adultUnlocked = useSessionStore((state) => state.adultUnlocked)
  const unlockAdult = useSessionStore((state) => state.unlockAdult)
  const lockAdult = useSessionStore((state) => state.lockAdult)
  const [gateError, setGateError] = useState('')
  const [query, setQuery] = useState('')
  const [health, setHealth] = useState<'All' | WordHealth>('All')
  const [page, setPage] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(openSettings)
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [assignStatus, setAssignStatus] = useState('')
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [assignments, setAssignments] = useState<Array<{ id: string; learnerId: string; level: CambridgeLevel; categories: string[] }>>([])
  const [pendingItems, setPendingItems] = useState<GiftRedemption[]>([])
  const healthRows = summary?.wordHealth ?? []
  const visibleWords = useMemo(
    () => healthRows.filter((word) => word.word.toLowerCase().includes(query.toLowerCase()) && (health === 'All' || word.health === health)),
    [healthRows, query, health],
  )
  const pageCount = Math.max(1, Math.ceil(visibleWords.length / 5))
  const pagedWords = visibleWords.slice(page * 5, page * 5 + 5)
  const activitySeries = summary?.activity ?? []
  const householdLearners = summary?.learners ?? []
  const settingsByLearner = useMemo(() => {
    const map: Record<string, LearnerSettings> = {}
    for (const learner of householdLearners) {
      if (learner.settings) map[learner.id] = learner.settings
    }
    return map
  }, [householdLearners])
  const academicYear = `${new Date().getFullYear() - 1}–${String(new Date().getFullYear()).slice(2)}`
  const pendingCount = pendingItems.length

  useEffect(() => {
    setSettingsOpen(openSettings)
  }, [openSettings])

  useEffect(() => {
    if (!adultUnlocked) return
    Promise.all([
      api<DashboardSummary>('/parent/dashboard'),
      api<{ assignments: Array<{ id: string; learnerId: string; level: CambridgeLevel; categories: string[] }> }>('/curriculum/assignments'),
    ])
      .then(([dashboard, curriculum]) => {
        setSummary(dashboard)
        setAssignments(curriculum.assignments)
        setPendingItems(dashboard.pendingRedemptions?.items ?? [])
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 403) {
          lockAdult()
          return
        }
        setGateError(error instanceof ApiError ? error.message : 'Could not load dashboard data')
      })
  }, [adultUnlocked, lockAdult])

  useEffect(() => setPage(0), [query, health])

  const assignReview = async () => {
    if (!householdLearners.length) {
      setAssignStatus('Add a learner before assigning review tasks')
      return
    }
    try {
      const created = await Promise.all(
        householdLearners.map((learner) =>
          api<{ assignment: { id: string; learnerId: string; level: CambridgeLevel; categories: string[] } }>('/curriculum/assignments', {
            method: 'POST',
            body: { learnerId: learner.id, level: learner.level, categories: ['nature', 'space'] },
          }).then((response) => response.assignment),
        ),
      )
      setAssignments((current) => [...current, ...created])
      setAssignStatus(
        created.length === 1
          ? 'Review task assigned'
          : `Review tasks assigned to ${created.length} learners`,
      )
    } catch (error) {
      setAssignStatus(error instanceof ApiError ? error.message : 'Could not assign task')
    }
  }

  if (!adultUnlocked) {
    return (
      <div className="gate-page">
        <section className="card gate">
          <span><LockKeyhole /></span>
          <Badge tone="lime">GROWN-UPS ONLY</Badge>
          <h1>Parent & teacher dashboard</h1>
          <p>Enter the adult account password to access learner progress and controls.</p>
          <form onSubmit={(event) => {
            event.preventDefault()
            const password = String(new FormData(event.currentTarget).get('password'))
            void api('/auth/parent-gate', { method: 'POST', body: { password } })
              .then(unlockAdult)
              .catch((error) => setGateError(error instanceof ApiError ? error.message : 'Could not verify the adult account'))
          }}
          >
            <label>Adult password<input name="password" type="password" autoComplete="current-password" autoFocus /></label>
            {gateError && <div className="form-error">{gateError}</div>}
            <Button type="submit">Unlock dashboard <ShieldCheck /></Button>
          </form>
          <button className="text-link" onClick={() => navigate('/home')}>Return to learner home</button>
        </section>
      </div>
    )
  }

  return (
    <>
      <section className="dashboard-hero card">
        <div>
          <Badge tone="lime">ACADEMIC YEAR {academicYear}</Badge>
          <h1>Welcome Back, Educator</h1>
          {summary?.learners.length
            ? (
              <>
                <ul className="hero-learner-summary">
                  {summary.learners.map((learner) => (
                    <li key={learner.id}>
                      {learner.name} has practised {learner.masteredThisWeek} Cambridge English words this week.
                    </li>
                  ))}
                </ul>
                <p>Check the Health Matrix below to see which areas need review.</p>
              </>
            )
            : <p>Unlock learner activity to see weekly progress.</p>}
          <div className="dashboard-hero-actions">
            <Button variant="secondary" onClick={() => void downloadFromApi('/parent/weekly-report.csv', 'weekly-report.csv')}><Download /> Weekly Report</Button>
            <Button variant="secondary" onClick={() => setSettingsOpen(true)}>Curriculum Settings</Button>
            <Button variant="secondary" onClick={() => setRedeemOpen(true)}>
              <Gift /> Redeem{pendingCount ? ` (${pendingCount})` : ''}
            </Button>
          </div>
        </div>
        <div className="hero-visual">📚<span>📈</span></div>
      </section>
      <div className="learner-metrics-grid">
        {householdLearners.length
          ? (
            <div className="table-scroll card">
              <table className="learner-metrics-table">
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>Level</th>
                    <th>Words Practised</th>
                    <th>Learning Streak</th>
                    <th>Quiz Accuracy</th>
                    <th>Words At Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {householdLearners.map((learner) => (
                    <tr key={learner.id}>
                      <td>
                        <span className="learner-metrics-name">
                          <span aria-hidden="true">{learner.avatar}</span>
                          {learner.name}
                        </span>
                      </td>
                      <td>{learner.level}</td>
                      <td>{learner.totalAnswers ?? 0}</td>
                      <td>{learner.streak ?? 0}d</td>
                      <td>{learner.accuracy ?? 0}%</td>
                      <td>{learner.atRiskWords ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
          : <p className="no-results">No learners yet. Add profiles to see practise metrics.</p>}
      </div>
      <div className="charts">
        <section className="card activity-chart">
          <div className="section-heading">
            <div><h2>Learning Activity</h2><p>Daily vocabulary engagement over the last 7 days</p></div>
            <span className="activity-legend">
              {activitySeries.length
                ? activitySeries.map((series, index) => (
                  <span key={series.learnerId}>
                    <i className="legend-dot" style={{ background: ACTIVITY_COLORS[index % ACTIVITY_COLORS.length] }} />
                    {series.name}
                  </span>
                ))
                : 'No learners yet'}
            </span>
          </div>
          <div className="activity-plot">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Learning activity by learner over the last 7 days">
              {activitySeries.map((series, index) => (
                <polyline
                  key={series.learnerId}
                  points={activityPoints(series.values.length ? series.values : [0, 0, 0, 0, 0, 0, 0])}
                  fill="none"
                  stroke={ACTIVITY_COLORS[index % ACTIVITY_COLORS.length]}
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </div>
          <div className="chart-labels"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div>
        </section>
        <section className="card mastery-chart">
          <h2>Vocabulary Mastery</h2>
          <p>Cambridge Level Distribution</p>
          {(summary?.masteryByLevel ?? [
            { label: 'Starters', value: 0, count: 0 },
            { label: 'Movers', value: 0, count: 0 },
            { label: 'Flyers', value: 0, count: 0 },
            { label: 'Preliminary', value: 0, count: 0 },
          ]).map((item) => (
            <div key={item.label}>
              <span>{item.label} ({item.count})</span>
              <div className="mastery-bar-track">
                <i style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </section>
      </div>
      <section className="health-section">
        <div className="section-heading">
          <div><h2>Word Health Matrix</h2><p>Identify vocabulary gaps and retention strengths.</p></div>
          <div className="table-actions">
            <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter words..." /></label>
            <select value={health} onChange={(event) => setHealth(event.target.value as typeof health)} aria-label="Health status">
              <option>All</option><option>Healthy</option><option>At risk</option><option>Warming</option><option>New</option>
            </select>
            <Button variant="secondary" onClick={() => void downloadFromApi('/parent/word-health.csv', 'word-health.csv')}><Download /> Export CSV</Button>
          </div>
        </div>
        <div className="table-scroll card">
          <table>
            <thead>
              <tr>
                <th>Vocabulary Word</th><th>Category</th><th>Health Status</th><th>Accuracy</th><th>Total Quizzes</th><th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {pagedWords.map((word) => (
                <tr key={word.id}>
                  <td>{word.word}</td>
                  <td>{word.partOfSpeech}</td>
                  <td><Badge tone={word.health === 'Healthy' ? 'lime' : word.health === 'At risk' ? 'rose' : 'cyan'}>{word.health}</Badge></td>
                  <td><Progress value={word.accuracy} /><b>{word.accuracy}%</b></td>
                  <td>{word.quizzes}</td>
                  <td>{word.lastActivityLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleWords.length
            ? <p className="no-results">No practised words yet. Learners unlock the matrix after their first quiz answers.</p>
            : (
              <div className="table-pagination">
                <span>Page {page + 1} of {pageCount}</span>
                <Button variant="secondary" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</Button>
                <Button variant="secondary" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button>
              </div>
            )}
        </div>
      </section>
      <div className="dashboard-bottom">
        <section>
          <div className="section-heading">
            <div><h2>Assigned Curriculum</h2>{assignStatus && <p aria-live="polite">{assignStatus}</p>}</div>
            <Button variant="secondary" onClick={() => void assignReview()}><Plus /> Assign Review Task</Button>
          </div>
          <div className="curriculum-grid">
            {assignments.length
              ? assignments.map((assignment) => {
                const assignee = householdLearners.find((learner) => learner.id === assignment.learnerId)
                return (
                  <article className="card" key={assignment.id}>
                    <Badge>ACTIVE</Badge>
                    <h3>{assignment.categories.join(' & ') || 'General vocabulary review'}</h3>
                    <small>{assignment.level}</small>
                    <span>Mastery Progress <b>{assignee?.accuracy ?? 0}%</b></span>
                    <Progress value={assignee?.accuracy ?? 0} />
                    <p>{assignee ? `${assignee.avatar} ${assignee.name}` : 'Learner'}</p>
                  </article>
                )
              })
              : <p className="no-results">No assignments yet. Create a review task to guide the next quiz.</p>}
          </div>
        </section>
      </div>
      {settingsOpen && (
        <SettingsModal
          initialByLearner={settingsByLearner}
          onLearnersChanged={() => {
            void api<DashboardSummary>('/parent/dashboard')
              .then((dashboard) => {
                setSummary(dashboard)
                setPendingItems(dashboard.pendingRedemptions?.items ?? [])
              })
              .catch(() => undefined)
          }}
          onClose={() => { setSettingsOpen(false); if (openSettings) navigate('/dashboard') }}
        />
      )}
      {redeemOpen && (
        <RedeemModal
          initialPending={pendingItems}
          onClose={() => setRedeemOpen(false)}
          onResolved={setPendingItems}
        />
      )}
    </>
  )
}
