import {
  BookOpen, Check, ChevronDown, Gem, Gift, Home, LayoutDashboard, LogOut, Menu, Target, Trophy, UserRound, X,
} from 'lucide-react'
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { api, ApiError } from '../../lib'
import { useSessionStore } from '../../stores'
import type { Achievement, GiftDefinition, GiftRedemption, HubQuest, Learner } from '../../types'
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

type GiftsData = {
  gems: number
  catalog: GiftDefinition[]
  pending: GiftRedemption | null
}

function sortByGems(learners: Learner[]) {
  return [...learners].sort((a, b) => {
    const gemDiff = (b.gems ?? 0) - (a.gems ?? 0)
    if (gemDiff !== 0) return gemDiff
    return a.name.localeCompare(b.name)
  })
}

type HubQuestsData = {
  quests: HubQuest[]
  learner: Learner
}

interface AppShellProps {
  children: ReactNode
  path: string
  learner: Learner
  navigate: (path: string) => void
  onSwitchLearner: () => void
  onSignOut: () => void
}

function DailyQuestsMenu({
  learner,
  compact = false,
}: {
  learner: Learner
  compact?: boolean
}) {
  const updateLearner = useSessionStore((state) => state.updateLearner)
  const bumpHub = useSessionStore((state) => state.bumpHub)
  const hubRevision = useSessionStore((state) => state.hubRevision)
  const [open, setOpen] = useState(false)
  const [quests, setQuests] = useState<HubQuest[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reloadQuests = () => {
    api<HubQuestsData>('/learner/hub')
      .then((data) => {
        setQuests(data.quests ?? [])
        updateLearner(data.learner)
      })
      .catch(() => undefined)
  }

  useEffect(() => {
    reloadQuests()
  }, [learner.id, hubRevision])

  useEffect(() => {
    if (!open) return
    reloadQuests()
    const onPointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, learner.id])

  const clearLeaveTimer = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
  }

  const handleEnter = () => {
    clearLeaveTimer()
    setOpen(true)
  }

  const handleLeave = () => {
    clearLeaveTimer()
    leaveTimer.current = setTimeout(() => setOpen(false), 160)
  }

  const doneCount = quests.filter((quest) => quest.progress >= quest.target).length
  const questTotal = quests.length
  const allDone = questTotal > 0 && doneCount === questTotal
  const hasUnclaimed = quests.some((quest) => quest.progress >= quest.target && !quest.claimed)
  const claimAllEnabled = allDone && hasUnclaimed && !busy

  const claimQuest = async (questId: string) => {
    setBusy(true)
    setMessage('')
    try {
      const response = await api<{ reward: number; learner: Learner }>('/learner/quests/claim', {
        method: 'POST',
        body: { questId },
      })
      updateLearner(response.learner)
      setMessage(`+${response.reward} gems claimed!`)
      bumpHub()
      reloadQuests()
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Could not claim reward')
    } finally {
      setBusy(false)
    }
  }

  const claimAll = async () => {
    if (!claimAllEnabled) return
    setBusy(true)
    setMessage('')
    try {
      const response = await api<{ reward: number; learner: Learner; claimedQuestIds: string[] }>(
        '/learner/quests/claim-all',
        { method: 'POST' },
      )
      updateLearner(response.learner)
      setMessage(response.reward ? `+${response.reward} gems claimed!` : 'Nothing left to claim')
      bumpHub()
      reloadQuests()
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Could not claim rewards')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`quests-menu-wrap${compact ? ' compact' : ''}`}
      ref={wrapRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        className="quests-menu"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title="Daily Quests"
      >
        <Target size={compact ? 16 : 15} />
        {!compact && <strong>Daily Quests</strong>}
        <span className="quests-menu-count">{doneCount}/{questTotal}</span>
        {!compact && <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="quests-dropdown" role="menu">
          <header className="quests-dropdown-head">
            <Target size={14} />
            <strong>DAILY QUESTS</strong>
            <span>{doneCount}/{questTotal} Done</span>
          </header>
          {quests.map((quest) => (
            <div className="quests-dropdown-row" key={quest.id}>
              <Check className={quest.progress >= quest.target ? 'done' : ''} size={14} />
              <div>
                <p>{quest.label} <small>(+{quest.reward} gems)</small></p>
                <Progress value={(quest.progress / quest.target) * 100} />
                {quest.progress >= quest.target && !quest.claimed && (
                  <button
                    type="button"
                    className="quest-claim"
                    disabled={busy}
                    onClick={() => void claimQuest(quest.id)}
                  >
                    Claim
                  </button>
                )}
                {quest.claimed && <small className="quest-claimed">Claimed</small>}
              </div>
            </div>
          ))}
          {!quests.length && <p className="no-results">Loading quests…</p>}
          <button
            type="button"
            className="quests-claim-all"
            disabled={!claimAllEnabled}
            onClick={() => void claimAll()}
          >
            Claim All
          </button>
          {message && <p className="quests-dropdown-note" role="status">{message}</p>}
        </div>
      )}
    </div>
  )
}

export function AppShell({ children, path, learner, navigate, onSwitchLearner, onSignOut }: AppShellProps) {
  const hubRevision = useSessionStore((state) => state.hubRevision)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [giftOpen, setGiftOpen] = useState(false)
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const [gifts, setGifts] = useState<GiftsData | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [leaderboard, setLeaderboard] = useState<Learner[]>([])
  const [giftBusy, setGiftBusy] = useState(false)
  const [giftMessage, setGiftMessage] = useState('')
  const profileRef = useRef<HTMLDivElement>(null)

  const links = [
    { path: '/home', label: 'Home Hub', icon: Home },
    { path: '/explore', label: 'Word Explorer', icon: BookOpen },
  ]

  const go = (next: string) => {
    setMenuOpen(false)
    setProfileOpen(false)
    navigate(next)
  }

  const switchLearner = () => {
    setMenuOpen(false)
    setProfileOpen(false)
    onSwitchLearner()
  }

  const openGifts = () => {
    setMenuOpen(false)
    setProfileOpen(false)
    setGiftMessage('')
    setGiftOpen(true)
  }

  const openAchievements = () => {
    setMenuOpen(false)
    setProfileOpen(false)
    setAchievementsOpen(true)
  }

  useEffect(() => {
    if (!profileOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [profileOpen])

  useEffect(() => {
    if (!giftOpen) return
    let active = true
    api<GiftsData>('/learner/gifts')
      .then((data) => { if (active) setGifts(data) })
      .catch(() => {
        if (active) setGifts({ gems: learner.gems ?? 0, catalog: [], pending: null })
      })
    return () => { active = false }
  }, [giftOpen, learner.gems, learner.id])

  useEffect(() => {
    if (!achievementsOpen) return
    let active = true
    api<{ achievements: Achievement[] }>('/learner/hub')
      .then((data) => { if (active) setAchievements(data.achievements ?? []) })
      .catch(() => { if (active) setAchievements([]) })
    return () => { active = false }
  }, [achievementsOpen, learner.id])

  useEffect(() => {
    let active = true
    api<{ learners: Learner[] }>('/learners')
      .then((data) => { if (active) setLeaderboard(sortByGems(data.learners)) })
      .catch(() => { if (active) setLeaderboard([]) })
    return () => { active = false }
  }, [learner.id, hubRevision])

  const reloadGifts = () => {
    api<GiftsData>('/learner/gifts')
      .then(setGifts)
      .catch(() => setGifts({ gems: learner.gems ?? 0, catalog: [], pending: null }))
  }

  const requestGift = async (giftId: string) => {
    setGiftBusy(true)
    try {
      await api('/learner/gifts/request', { method: 'POST', body: { giftId } })
      setGiftMessage('Request sent — ask a grown-up to confirm in Analytics.')
      reloadGifts()
    } catch (error) {
      setGiftMessage(error instanceof ApiError ? error.message : 'Could not request gift')
    } finally {
      setGiftBusy(false)
    }
  }

  const cancelGift = async () => {
    setGiftBusy(true)
    try {
      await api('/learner/gifts/cancel', { method: 'POST' })
      setGiftMessage('Gift request cancelled.')
      reloadGifts()
    } catch (error) {
      setGiftMessage(error instanceof ApiError ? error.message : 'Could not cancel request')
    } finally {
      setGiftBusy(false)
    }
  }

  const gemBalance = gifts?.gems ?? learner.gems
  const pendingGift = gifts?.pending
  const unlockedAchievements = achievements.filter((item) => item.unlocked)

  return (
    <div className="app-shell">
      <header className="mobile-head">
        <div className="mobile-head-row">
          <Logo />
          <div className="mobile-head-actions">
            <DailyQuestsMenu learner={learner} compact />
            <button className="icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        <VocabularySearch navigate={navigate} className="mobile-search" />
      </header>
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <Logo />
        <nav aria-label="Main navigation">
          {links.map(({ path: href, label, icon: Icon }) => (
            <button key={href} className={path === href ? 'active' : ''} onClick={() => go(href)}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <section className="sidebar-leaderboard" aria-label="Leaderboard">
          <h2><Trophy size={14} /> Leaderboard</h2>
          <ol className="leaderboard-list">
            {leaderboard.length
              ? leaderboard.map((entry, index) => (
                <li
                  key={entry.id}
                  className={`leaderboard-row${entry.id === learner.id ? ' is-you' : ''}`}
                >
                  <span className="leaderboard-rank">{index + 1}</span>
                  <span className="leaderboard-avatar" aria-hidden="true">{entry.avatar}</span>
                  <span className="leaderboard-name">
                    <strong>{entry.name}</strong>
                    {entry.id === learner.id && <small>You</small>}
                  </span>
                  <span className="leaderboard-gems"><Gem size={12} /> {entry.gems ?? 0}</span>
                </li>
              ))
              : <li className="no-results">No explorers to rank yet.</li>}
          </ol>
        </section>
        <div className="sidebar-profile">
          <button type="button" onClick={() => go('/dashboard')}>
            <LayoutDashboard size={16} /> Educator dashboard
          </button>
          <button type="button" className="danger" onClick={onSignOut}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <VocabularySearch navigate={navigate} />
          <div className="top-actions">
            <DailyQuestsMenu learner={learner} />
            <div className="profile-menu-wrap" ref={profileRef}>
              <button
                className="profile-menu"
                type="button"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((open) => !open)}
                title="Learner menu"
              >
                <span>{learner.avatar}</span><strong>{learner.name} Student</strong><ChevronDown size={15} />
              </button>
              {profileOpen && (
                <div className="profile-dropdown" role="menu">
                  <button type="button" role="menuitem" onClick={openGifts}>
                    <Gift size={15} /> Request Real-World Gift
                  </button>
                  <button type="button" role="menuitem" onClick={openAchievements}>
                    <Trophy size={15} /> Recent Achievement
                  </button>
                  <button type="button" role="menuitem" onClick={switchLearner}>
                    <UserRound size={15} /> Switch Learner
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="page">{children}</main>
      </div>

      {giftOpen && (
        <div className="modal-backdrop" onClick={() => setGiftOpen(false)}>
          <section
            className="modal gift-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gift-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setGiftOpen(false)} aria-label="Close"><X /></button>
            <h2 id="gift-modal-title"><Gift /> Request Real-World Gift</h2>
            <p className="gift-modal-balance">{gemBalance} gems available</p>
            {giftMessage && <p className="inline-note" role="status">{giftMessage}</p>}
            {pendingGift && (
              <div className="gift-pending">
                <strong>Pending: {pendingGift.giftName}</strong>
                <small>{pendingGift.costGems} gems · waiting for a grown-up</small>
                <button className="text-link" disabled={giftBusy} onClick={() => void cancelGift()}>Cancel request</button>
              </div>
            )}
            <ul className="gift-shop-list">
              {(gifts?.catalog ?? []).map((gift) => {
                const cannotAfford = gemBalance < gift.costGems
                const blocked = Boolean(pendingGift) || cannotAfford || giftBusy
                return (
                  <li key={gift.id}>
                    <span>
                      <strong>{gift.name}</strong>
                      <small>{gift.costGems} gems</small>
                    </span>
                    <Button
                      variant="secondary"
                      disabled={blocked}
                      onClick={() => void requestGift(gift.id)}
                    >
                      Request
                    </Button>
                  </li>
                )
              })}
            </ul>
            {!gifts?.catalog.length && (
              <p className="no-results">Ask a grown-up to add gifts in Curriculum Settings.</p>
            )}
          </section>
        </div>
      )}

      {achievementsOpen && (
        <div className="modal-backdrop" onClick={() => setAchievementsOpen(false)}>
          <section
            className="modal achievements-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="achievements-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setAchievementsOpen(false)} aria-label="Close"><X /></button>
            <h2 id="achievements-modal-title"><Trophy /> Recent Achievement</h2>
            <div className="achievements-modal-grid">
              {unlockedAchievements.slice(0, 8).map((item) => (
                <span key={item.id}><i>{item.icon}</i><small>{item.label}</small></span>
              ))}
              {!unlockedAchievements.length && <small className="no-results">Play to unlock achievements</small>}
            </div>
            <Progress
              value={achievements.length ? (unlockedAchievements.length / achievements.length) * 100 : 0}
              label={`${unlockedAchievements.length} of ${achievements.length} achievements`}
            />
            <p className="achievements-modal-count">
              {unlockedAchievements.length} of {achievements.length} achievements
            </p>
            <div className="achievement-list">
              {achievements.map((item) => (
                <article key={item.id} className={item.unlocked ? '' : 'locked'}>
                  <span>{item.icon}</span>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
