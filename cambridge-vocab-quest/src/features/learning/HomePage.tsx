import {
  Check, ChevronLeft, ChevronRight, Flame, Gamepad2, Gift, Rocket, Star, Target, Trophy, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, Button, Progress } from '../../components/ui'
import { api, ApiError } from '../../lib'
import type { Achievement, GiftDefinition, GiftRedemption, HubQuest, Learner, LearnerSettings } from '../../types'

type HubData = {
  learner: Learner
  dailyGoal: number
  completedToday: number
  recentAccuracy: number
  minutesRemaining: number
  completedQuizToday: boolean
  settings: LearnerSettings
  quests: HubQuest[]
  map: {
    unlocks: Record<'space-station' | 'nature-valley' | 'crystal-caves' | 'dragon-ridge', boolean>
    correctCount: number
    thresholds: Record<'space-station' | 'nature-valley' | 'crystal-caves' | 'dragon-ridge', number>
  }
  achievements: Achievement[]
  journey: Array<{ word: string; category: string; definition: string; mastery: number }>
  assignment: { id: string; level: string; categories: string[] } | null
  bonusReady: boolean
}

type GiftsData = {
  gems: number
  catalog: GiftDefinition[]
  pending: GiftRedemption | null
}

export function HomePage({ learner, navigate }: { learner: Learner; navigate: (path: string) => void }) {
  const [hub, setHub] = useState<HubData | null>(null)
  const [gifts, setGifts] = useState<GiftsData | null>(null)
  const [message, setMessage] = useState('')
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const [journeyOffset, setJourneyOffset] = useState(0)
  const [giftBusy, setGiftBusy] = useState(false)

  const reload = () => {
    api<HubData>('/learner/hub')
      .then(setHub)
      .catch(() => undefined)
    api<GiftsData>('/learner/gifts')
      .then(setGifts)
      .catch(() => setGifts({ gems: learner.gems ?? 0, catalog: [], pending: null }))
  }

  useEffect(() => { reload() }, [learner.id])

  const currentLearner = hub?.learner ?? learner
  const settings = hub?.settings
  const gamesLocked = Boolean(settings?.focusMode && !hub?.completedQuizToday)
  const timedLocked = settings && !settings.timedModesEnabled
  const limitReached = (hub?.minutesRemaining ?? 1) <= 0
  const journey = hub?.journey ?? []
  const visibleJourney = journey.slice(journeyOffset, journeyOffset + 4)
  const gemBalance = gifts?.gems ?? currentLearner.gems ?? currentLearner.stars
  const pendingGift = gifts?.pending

  const startStop = (stop: 'space-station' | 'nature-valley' | 'crystal-caves' | 'dragon-ridge') => {
    if (limitReached) return setMessage('Daily learning limit reached. Come back tomorrow!')
    if (!hub?.map.unlocks[stop]) {
      return setMessage(`Locked — need ${hub?.map.thresholds[stop] ?? 0} correct answers (you have ${hub?.map.correctCount ?? 0}).`)
    }
    navigate(`/explore?stop=${stop}`)
  }

  const claimQuest = async (questId: string) => {
    try {
      const response = await api<{ reward: number; learner: Learner }>('/learner/quests/claim', {
        method: 'POST',
        body: { questId },
      })
      setMessage(`+${response.reward} gems claimed!`)
      reload()
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Could not claim reward')
    }
  }

  const requestGift = async (giftId: string) => {
    setGiftBusy(true)
    try {
      await api('/learner/gifts/request', { method: 'POST', body: { giftId } })
      setMessage('Request sent — ask a grown-up to confirm in Analytics.')
      reload()
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Could not request gift')
    } finally {
      setGiftBusy(false)
    }
  }

  const cancelGift = async () => {
    setGiftBusy(true)
    try {
      await api('/learner/gifts/cancel', { method: 'POST' })
      setMessage('Gift request cancelled.')
      reload()
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Could not cancel request')
    } finally {
      setGiftBusy(false)
    }
  }

  const openMiniGame = (path: '/games/fill-blank' | '/games/speed-match') => {
    if (gamesLocked) return setMessage('Focus mode: finish today’s quiz first.')
    if (timedLocked) return setMessage('Timed modes are turned off in parent settings.')
    if (limitReached) return setMessage('Daily learning limit reached.')
    navigate(path)
  }

  return (
    <>
      <div className="welcome-row">
        <div>
          <p className="eyebrow">YOUR LEARNING UNIVERSE</p>
          <h1>Welcome back, {currentLearner.name}! <span>👋</span></h1>
          <p>
            {hub?.assignment
              ? `Today’s assignment: ${hub.assignment.categories.join(' & ') || hub.assignment.level}`
              : 'Ready to explore new words in the magical forest?'}
          </p>
          {message && <p className="inline-note" role="status">{message}</p>}
        </div>
        <div className="stat-pills">
          <Badge tone="lime"><Flame /> {currentLearner.streak} DAY STREAK</Badge>
          <Badge><Star /> {gemBalance} GEMS</Badge>
          <Badge>🎯 {hub?.completedToday ?? 0}/{hub?.dailyGoal ?? 10}</Badge>
          <Badge>{hub?.minutesRemaining ?? '—'}m left</Badge>
        </div>
      </div>
      <div className="home-grid">
        <div className="home-main">
          <section className="quest-map card">
            <div className="map-sky">
              <span className="cloud cloud-one" /><span className="cloud cloud-two" /><span className="planet">🪐</span>
              <div className="map-path" />
              <button
                className="map-stop stop-one"
                onClick={() => startStop('nature-valley')}
                title="Nature Valley"
              >
                <i>🌱</i><span>NATURE VALLEY</span>
              </button>
              <button
                className={`map-stop stop-two ${hub?.map.unlocks['space-station'] ? '' : 'locked'}`}
                onClick={() => startStop('space-station')}
                title={hub?.map.unlocks['space-station'] ? 'Space Station' : `Need ${hub?.map.thresholds['space-station'] ?? 50} correct`}
              >
                <i>{hub?.map.unlocks['space-station'] ? '👆' : '🔒'}</i><span>SPACE STATION</span>
              </button>
              <button
                className={`map-stop stop-three ${hub?.map.unlocks['crystal-caves'] ? '' : 'locked'}`}
                onClick={() => startStop('crystal-caves')}
                title={hub?.map.unlocks['crystal-caves'] ? 'Crystal Caves' : `Need ${hub?.map.thresholds['crystal-caves'] ?? 150} correct`}
              >
                <i>{hub?.map.unlocks['crystal-caves'] ? '💎' : '🔒'}</i><span>CRYSTAL CAVES</span>
              </button>
              <button
                className={`map-stop stop-four ${hub?.map.unlocks['dragon-ridge'] ? '' : 'locked'}`}
                onClick={() => startStop('dragon-ridge')}
                title={hub?.map.unlocks['dragon-ridge'] ? 'Dragon Ridge' : `Need ${hub?.map.thresholds['dragon-ridge'] ?? 300} correct`}
              >
                <i>{hub?.map.unlocks['dragon-ridge'] ? '🐉' : '🔒'}</i><span>DRAGON RIDGE</span>
              </button>
              <Button disabled={limitReached} onClick={() => startStop('nature-valley')}>Resume Quest <Rocket size={17} /></Button>
            </div>
          </section>
          <div className="home-actions">
            <Button variant="lime" disabled={limitReached} onClick={() => startStop('nature-valley')}><Rocket /> START NEW QUIZ</Button>
            <Button variant="secondary" disabled={gamesLocked || timedLocked || limitReached} onClick={() => openMiniGame('/games/fill-blank')}>
              <Gamepad2 /> {gamesLocked ? 'MINI-GAMES (LOCKED)' : 'FILL THE BLANK'}
            </Button>
            <Button variant="secondary" disabled={gamesLocked || timedLocked || limitReached} onClick={() => openMiniGame('/games/speed-match')}>
              <Gamepad2 /> {gamesLocked ? 'MINI-GAMES (LOCKED)' : 'SPEED MATCH'}
            </Button>
          </div>
        </div>
        <aside className="home-rail">
          <section className="card daily">
            <h3><Target /> DAILY QUESTS <span>{hub?.quests.filter((quest) => quest.progress >= quest.target).length ?? 0}/3 Done</span></h3>
            {(hub?.quests ?? []).map((quest) => (
              <div className="quest-line" key={quest.id}>
                <Check className={quest.progress >= quest.target ? 'done' : ''} />
                <span>
                  {quest.label} (+{quest.reward} gems)
                  <Progress value={(quest.progress / quest.target) * 100} />
                  {quest.progress >= quest.target && !quest.claimed && (
                    <button className="text-link" onClick={() => void claimQuest(quest.id)}>Claim</button>
                  )}
                  {quest.claimed && <small>Claimed</small>}
                </span>
              </div>
            ))}
            <button
              className="reward"
              disabled={!hub?.bonusReady}
              onClick={() => void claimQuest('bonus')}
            >
              <span>🎁</span>
              <strong>BONUS REWARD<small>{hub?.bonusReady ? 'Claim Treasure Chest' : 'Complete all quests'}</small></strong>
              <ChevronRight />
            </button>
          </section>
          <section className="card gift-shop">
            <h3><Gift /> REAL-WORLD GIFTS</h3>
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
          <section className="card achievements">
            <h3>
              <Trophy /> RECENT ACHIEVEMENTS
              <button className="text-link" onClick={() => setAchievementsOpen(true)}>View all</button>
            </h3>
            <div>
              {(hub?.achievements.filter((item) => item.unlocked).slice(0, 4) ?? []).map((item) => (
                <span key={item.id}><i>{item.icon}</i><small>{item.label}</small></span>
              ))}
              {!hub?.achievements.some((item) => item.unlocked) && <small>Play to unlock achievements</small>}
            </div>
            <Progress
              value={hub ? (hub.achievements.filter((item) => item.unlocked).length / Math.max(1, hub.achievements.length)) * 100 : 0}
              label={`${hub?.achievements.filter((item) => item.unlocked).length ?? 0} of ${hub?.achievements.length ?? 0} achievements`}
            />
          </section>
        </aside>
      </div>
      <section className="journey">
        <div className="section-heading">
          <h2><span className="heading-icon"><Target /></span> Continue Your Word Journey</h2>
          <div>
            <button aria-label="Previous" disabled={journeyOffset === 0} onClick={() => setJourneyOffset((value) => Math.max(0, value - 1))}><ChevronLeft /></button>
            <button aria-label="Next" disabled={journeyOffset + 4 >= journey.length} onClick={() => setJourneyOffset((value) => value + 1)}><ChevronRight /></button>
          </div>
        </div>
        <div className="word-cards">
          {visibleJourney.length
            ? visibleJourney.map((item) => (
              <article className="card" key={item.word}>
                <Badge tone={item.category.toLowerCase().includes('nature') ? 'lime' : 'cyan'}>{item.category}</Badge>
                <h3>{item.word}</h3>
                <p>{item.definition}</p>
                <small>MASTERY <b>{item.mastery}%</b></small>
                <Progress value={item.mastery} />
              </article>
            ))
            : <p className="no-results">Practice words in Word Explorer to build your journey.</p>}
        </div>
      </section>
      <section className="parent-promo card">
        <div className="promo-art">📊</div>
        <div>
          <h2>Check your progress with Parents!</h2>
          <p>Head over to the Dashboard together to see your word count grow.</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Analytics Dashboard</Button>
        </div>
      </section>
      {achievementsOpen && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true">
            <button className="modal-close" onClick={() => setAchievementsOpen(false)} aria-label="Close"><X /></button>
            <h2>Achievements</h2>
            <div className="achievement-list">
              {(hub?.achievements ?? []).map((item) => (
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
    </>
  )
}
