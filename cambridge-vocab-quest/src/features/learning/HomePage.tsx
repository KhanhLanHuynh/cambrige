import {
  ChevronLeft, ChevronRight, Flame, Gamepad2, Gem, Rocket, Target,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, Button, Progress } from '../../components/ui'
import { api } from '../../lib'
import { useSessionStore } from '../../stores'
import type { CambridgeLevel, Learner, LearnerSettings, WordHealth } from '../../types'

type MapStop = 'space-station' | 'nature-valley' | 'crystal-caves' | 'dragon-ridge'

const LEVEL_TO_STOP: Record<CambridgeLevel, MapStop> = {
  Starters: 'nature-valley',
  Movers: 'space-station',
  Flyers: 'crystal-caves',
  Preliminary: 'dragon-ridge',
}

type JourneyItem = {
  wordId: string
  word: string
  category: string
  definition: string
  mastery: number
  health: WordHealth
}

type HubData = {
  learner: Learner
  dailyGoal: number
  completedToday: number
  recentAccuracy: number
  minutesRemaining: number
  completedQuizToday: boolean
  settings: LearnerSettings
  map: {
    unlocks: Record<MapStop, boolean>
    correctCount: number
    thresholds: Record<MapStop, number>
  }
  journey: JourneyItem[]
  assignment: { id: string; level: string; categories: string[] } | null
}

export function HomePage({ learner, navigate }: { learner: Learner; navigate: (path: string) => void }) {
  const updateLearner = useSessionStore((state) => state.updateLearner)
  const hubRevision = useSessionStore((state) => state.hubRevision)
  const [hub, setHub] = useState<HubData | null>(null)
  const [message, setMessage] = useState('')
  const [journeyOffset, setJourneyOffset] = useState(0)

  const reload = () => {
    api<HubData>('/learner/hub')
      .then((data) => {
        setHub(data)
        updateLearner(data.learner)
      })
      .catch(() => undefined)
  }

  useEffect(() => { reload() }, [learner.id, hubRevision])

  const currentLearner = hub?.learner ?? learner
  const settings = hub?.settings
  const gamesLocked = Boolean(settings?.focusMode && !hub?.completedQuizToday)
  const timedLocked = settings && !settings.timedModesEnabled
  const limitReached = (hub?.minutesRemaining ?? 1) <= 0
  const journey = hub?.journey ?? []
  const visibleJourney = journey.slice(journeyOffset, journeyOffset + 4)
  const focusStop = LEVEL_TO_STOP[currentLearner.level] ?? 'nature-valley'

  const startStop = (stop: MapStop) => {
    if (limitReached) return setMessage('Daily learning limit reached. Come back tomorrow!')
    if (!hub?.map.unlocks[stop]) {
      return setMessage(`Locked — need ${hub?.map.thresholds[stop] ?? 0} correct answers (you have ${hub?.map.correctCount ?? 0}).`)
    }
    navigate(`/explore?stop=${stop}`)
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
          <Badge><Gem /> {currentLearner.gems} GEMS</Badge>
          <Badge>🎯 {hub?.completedToday ?? 0}/{hub?.dailyGoal ?? 10}</Badge>
          <Badge>{hub?.minutesRemaining ?? '—'}m left</Badge>
        </div>
      </div>
      <div className="home-grid">
        <div className="home-main">
          <div className="home-actions">
            <Button variant="lime" disabled={limitReached} onClick={() => startStop(focusStop)}><Rocket /> START NEW QUIZ</Button>
            <Button variant="secondary" disabled={gamesLocked || timedLocked || limitReached} onClick={() => openMiniGame('/games/fill-blank')}>
              <Gamepad2 /> {gamesLocked ? 'MINI-GAMES (LOCKED)' : 'FILL THE BLANK'}
            </Button>
            <Button variant="secondary" disabled={gamesLocked || timedLocked || limitReached} onClick={() => openMiniGame('/games/speed-match')}>
              <Gamepad2 /> {gamesLocked ? 'MINI-GAMES (LOCKED)' : 'SPEED MATCH'}
            </Button>
          </div>
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
                title={hub?.map.unlocks['space-station'] ? 'Space Station' : `Need ${hub?.map.thresholds['space-station'] ?? 200} correct`}
              >
                <i>{hub?.map.unlocks['space-station'] ? '👆' : '🔒'}</i><span>SPACE STATION</span>
              </button>
              <button
                className={`map-stop stop-three ${hub?.map.unlocks['crystal-caves'] ? '' : 'locked'}`}
                onClick={() => startStop('crystal-caves')}
                title={hub?.map.unlocks['crystal-caves'] ? 'Crystal Caves' : `Need ${hub?.map.thresholds['crystal-caves'] ?? 350} correct`}
              >
                <i>{hub?.map.unlocks['crystal-caves'] ? '💎' : '🔒'}</i><span>CRYSTAL CAVES</span>
              </button>
              <button
                className={`map-stop stop-four ${hub?.map.unlocks['dragon-ridge'] ? '' : 'locked'}`}
                onClick={() => startStop('dragon-ridge')}
                title={hub?.map.unlocks['dragon-ridge'] ? 'Dragon Ridge' : `Need ${hub?.map.thresholds['dragon-ridge'] ?? 550} correct`}
              >
                <i>{hub?.map.unlocks['dragon-ridge'] ? '🐉' : '🔒'}</i><span>DRAGON RIDGE</span>
              </button>
            </div>
          </section>
        </div>
      </div>
      <section className="journey">
        <div className="section-heading">
          <h2><span className="heading-icon"><Target /></span> Continue Your Word Journey</h2>
          <div className="journey-heading-actions">
            <Button
              variant="secondary"
              className="journey-weak-cta"
              disabled={!journey.length || limitReached}
              onClick={() => {
                if (limitReached) return setMessage('Daily learning limit reached.')
                navigate('/explore?review=1')
              }}
            >
              Practice weak words
            </Button>
            <button aria-label="Previous" disabled={journeyOffset === 0} onClick={() => setJourneyOffset((value) => Math.max(0, value - 1))}><ChevronLeft /></button>
            <button aria-label="Next" disabled={journeyOffset + 4 >= journey.length} onClick={() => setJourneyOffset((value) => value + 1)}><ChevronRight /></button>
          </div>
        </div>
        <div className="word-cards">
          {visibleJourney.length
            ? visibleJourney.map((item) => (
              <article className="card journey-card" key={item.wordId}>
                <div className="journey-card-badges">
                  <Badge tone={item.category.toLowerCase().includes('nature') ? 'lime' : 'cyan'}>{item.category}</Badge>
                  <Badge tone={item.health === 'Healthy' ? 'lime' : item.health === 'At risk' ? 'rose' : 'cyan'}>{item.health}</Badge>
                </div>
                <h3>{item.word}</h3>
                <p>{item.definition}</p>
                <small>MASTERY <b>{item.mastery}%</b></small>
                <Progress value={item.mastery} />
                <Button
                  variant="secondary"
                  className="journey-practice-cta"
                  disabled={limitReached}
                  onClick={() => {
                    if (limitReached) return setMessage('Daily learning limit reached.')
                    navigate(`/explore?focus=${encodeURIComponent(item.wordId)}`)
                  }}
                >
                  Practice
                </Button>
              </article>
            ))
            : <p className="no-results">Practice words in Word Explorer to build your journey.</p>}
        </div>
      </section>
    </>
  )
}
