import {
  BookOpen, Clock3, Download, Gift, LockKeyhole, Plus, Search,
  Settings, ShieldCheck, Target, UserRound, X, Check,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Badge, Button, Progress } from '../../components/ui'
import { api, ApiError, downloadFromApi } from '../../lib'
import { useSessionStore } from '../../stores'
import type {
  CambridgeLevel, GiftDefinition, GiftRedemption, Learner, LearnerSettings, WordHealth,
} from '../../types'

interface DashboardSummary {
  activity: number[]
  masteredThisWeek: number
  masteryByLevel: Array<{ label: string; value: number; count: number }>
  learners: Array<Learner & { totalAnswers: number; accuracy: number; atRiskWords: number; settings?: LearnerSettings }>
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

function newGiftDraft(): GiftDefinition {
  return { id: crypto.randomUUID(), name: '', costGems: 100 }
}

export function SettingsModal({
  onClose,
  initial,
}: {
  onClose: () => void
  initial?: LearnerSettings | null
}) {
  const [saved, setSaved] = useState(false)
  const [catalogSaved, setCatalogSaved] = useState(false)
  const [error, setError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [settings, setSettings] = useState<LearnerSettings | null>(initial ?? null)
  const [catalog, setCatalog] = useState<GiftDefinition[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)

  useEffect(() => {
    if (initial) {
      setSettings(initial)
      return
    }
    api<{ settings: LearnerSettings }>('/settings')
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
  }, [initial])

  useEffect(() => {
    api<{ catalog: GiftDefinition[] }>('/parent/gifts')
      .then((response) => setCatalog(response.catalog))
      .catch(() => setCatalog([]))
      .finally(() => setCatalogLoading(false))
  }, [])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    try {
      const response = await api<{ settings: LearnerSettings }>('/settings', {
        method: 'PATCH',
        body: {
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

  if (!settings) {
    return <div className="modal-backdrop"><section className="modal settings-modal"><p>Loading settings…</p></section></div>
  }

  return (
    <div className="modal-backdrop">
      <section className="modal settings-modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close settings"><X /></button>
        <h2>Parent control center</h2>
        <p>Manage the selected learner’s experience.</p>
        <form onSubmit={save}>
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
          <Button type="submit">Save settings</Button>
        </form>

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
  const [assignments, setAssignments] = useState<Array<{ id: string; level: CambridgeLevel; categories: string[] }>>([])
  const [pendingItems, setPendingItems] = useState<GiftRedemption[]>([])
  const healthRows = summary?.wordHealth ?? []
  const visibleWords = useMemo(
    () => healthRows.filter((word) => word.word.toLowerCase().includes(query.toLowerCase()) && (health === 'All' || word.health === health)),
    [healthRows, query, health],
  )
  const pageCount = Math.max(1, Math.ceil(visibleWords.length / 5))
  const pagedWords = visibleWords.slice(page * 5, page * 5 + 5)
  const chartData = summary?.activity.length ? summary.activity : [0, 0, 0, 0, 0, 0, 0]
  const chartPoints = chartData.map((value, index) => `${index * (100 / Math.max(1, chartData.length - 1))},${100 - value}`).join(' ')
  const trackedLearner = summary?.learners[0]
  const academicYear = `${new Date().getFullYear() - 1}–${String(new Date().getFullYear()).slice(2)}`
  const pendingCount = pendingItems.length

  useEffect(() => {
    setSettingsOpen(openSettings)
  }, [openSettings])

  useEffect(() => {
    if (!adultUnlocked) return
    Promise.all([
      api<DashboardSummary>('/parent/dashboard'),
      api<{ assignments: Array<{ id: string; level: CambridgeLevel; categories: string[] }> }>('/curriculum/assignments'),
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
    if (!trackedLearner) return
    try {
      const response = await api<{ assignment: { id: string; level: CambridgeLevel; categories: string[] } }>('/curriculum/assignments', {
        method: 'POST',
        body: { learnerId: trackedLearner.id, level: trackedLearner.level, categories: ['nature', 'space'] },
      })
      setAssignments((current) => [...current, response.assignment])
      setAssignStatus('Review task assigned')
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
          <p>
            {trackedLearner
              ? `${trackedLearner.name} has practised ${summary?.masteredThisWeek ?? 0} Cambridge English words this week. Check the Health Matrix below to see which areas need review.`
              : 'Unlock learner activity to see weekly progress.'}
          </p>
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
      <div className="metrics">
        {[
          { icon: BookOpen, label: 'Words Practised', value: String(trackedLearner?.totalAnswers ?? 0), delta: '+ live' },
          { icon: Clock3, label: 'Learning Streak', value: `${trackedLearner?.streak ?? 0}d`, delta: 'current' },
          { icon: Target, label: 'Quiz Accuracy', value: `${trackedLearner?.accuracy ?? 0}%`, delta: 'all time' },
          { icon: UserRound, label: 'Words At Risk', value: String(trackedLearner?.atRiskWords ?? 0), delta: 'review' },
        ].map(({ icon: Icon, label, value, delta }) => (
          <article className="card" key={label}><span><Icon /></span><Badge tone="lime">{delta}</Badge><small>{label}</small><strong>{value}</strong></article>
        ))}
      </div>
      <div className="charts">
        <section className="card activity-chart">
          <div className="section-heading">
            <div><h2>Learning Activity</h2><p>Daily vocabulary engagement over the last 7 days</p></div>
            <span><i className="cyan-dot" /> Reviewed &nbsp; <i className="violet-dot" /> New Words</span>
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Learning activity trending upward">
            <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#00dcff" stopOpacity=".65" /><stop offset="1" stopColor="#00dcff" stopOpacity="0" /></linearGradient></defs>
            <polygon points={`0,100 ${chartPoints} 100,100`} fill="url(#area)" />
            <polyline points={chartPoints} fill="none" stroke="#00dcff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
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
            <div key={item.label}><span>{item.label} ({item.count})</span><i style={{ width: `${item.value}%` }} /></div>
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
              ? assignments.map((assignment) => (
                <article className="card" key={assignment.id}>
                  <Badge>ACTIVE</Badge>
                  <h3>{assignment.categories.join(' & ') || 'General vocabulary review'}</h3>
                  <small>{assignment.level}</small>
                  <span>Mastery Progress <b>{trackedLearner?.accuracy ?? 0}%</b></span>
                  <Progress value={trackedLearner?.accuracy ?? 0} />
                  <p>👨‍🚀 {trackedLearner?.name ?? 'Learner'}</p>
                </article>
              ))
              : <p className="no-results">No assignments yet. Create a review task to guide the next quiz.</p>}
          </div>
        </section>
        <aside className="card quick-controls">
          <h2>Quick Controls</h2>
          <button type="button" onClick={() => setSettingsOpen(true)}>
            <span><Settings /></span>
            <strong>Daily Limit<small>{trackedLearner?.settings?.dailyLimitMinutes ?? 45}m / day</small></strong>
            <b>Edit</b>
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)}>
            <span><Settings /></span>
            <strong>Focus Mode<small>{trackedLearner?.settings?.focusMode ? 'On' : 'Off'}</small></strong>
            <b>Edit</b>
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)}>
            <span><Gift /></span>
            <strong>Gift catalog<small>Real-world rewards</small></strong>
            <b>Edit</b>
          </button>
          <Button onClick={() => setSettingsOpen(true)}>Open Parent Control Center</Button>
        </aside>
      </div>
      {settingsOpen && <SettingsModal initial={trackedLearner?.settings} onClose={() => { setSettingsOpen(false); if (openSettings) navigate('/dashboard') }} />}
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
