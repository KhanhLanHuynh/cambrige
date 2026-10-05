import { ArrowLeft, Check } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Badge, Button } from '../../components/ui'
import { api, ApiError } from '../../lib'
import { useSessionStore } from '../../stores'
import type { Learner } from '../../types'

type LastLetterStart = {
  id: string
  word: string
  letter: string
  gemsAwarded: number
}

type LastLetterReason = 'ok' | 'wrong-letter' | 'repeat' | 'not-english' | 'unavailable'

type LastLetterAnswer = {
  correct: boolean
  reason: LastLetterReason
  word: string
  letter: string
  gemsAwarded: number
  totalGems: number
}

function feedback(result: LastLetterAnswer) {
  if (result.reason === 'ok') return `Nice — “${result.word}”. +${result.gemsAwarded} gems`
  if (result.reason === 'wrong-letter') return `That word needs to start with ${result.letter.toUpperCase()}.`
  if (result.reason === 'repeat') return 'You already used that word.'
  if (result.reason === 'not-english') return 'That is not an English word.'
  return 'Could not check that word. Try again.'
}

function ChainWord({ word }: { word: string }) {
  return <>{word.slice(0, -1)}<span className="last-letter-mark">{word.slice(-1)}</span></>
}

function SessionWords({ words }: { words: string[] }) {
  const latest = words.length - 1
  return (
    <section className="last-letter-chain" aria-label="Words in this session">
      <p className="fill-blank-label">Words in this session</p>
      <ol>
        {words.map((word, index) => (
          <li key={word} className={index === latest ? 'is-current' : undefined} aria-current={index === latest ? 'true' : undefined}>
            <ChainWord word={word} />
          </li>
        ))}
      </ol>
    </section>
  )
}

export function GrabLastLetterPage({ learner, navigate }: { learner: Learner; navigate: (path: string) => void }) {
  const updateLearner = useSessionStore((state) => state.updateLearner)
  const bumpHub = useSessionStore((state) => state.bumpHub)
  const [game, setGame] = useState<LastLetterStart | null>(null)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [notice, setNotice] = useState('')
  const [noticeOk, setNoticeOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [stopped, setStopped] = useState(false)
  const [limitNote, setLimitNote] = useState('')
  const [words, setWords] = useState<string[]>([])

  useEffect(() => {
    let active = true
    api<LastLetterStart>('/games/last-letter', { method: 'POST' })
      .then((created) => {
        if (!active) return
        setGame(created)
        setWords([created.word])
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof ApiError ? requestError.message : 'Could not start Grab the Last Letter')
      })
    return () => { active = false }
  }, [learner.id])

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!game || busy || stopped) return
    const trimmed = answer.trim()
    if (!trimmed) return
    setBusy(true)
    setNotice('')
    try {
      const result = await api<LastLetterAnswer>(`/games/last-letter/${game.id}/answers`, {
        method: 'POST',
        body: { answer: trimmed },
      })
      setGame((current) => current ? { ...current, word: result.word, letter: result.letter } : current)
      setNotice(feedback(result))
      setNoticeOk(result.correct)
      if (result.correct) {
        setWords((current) => current.includes(result.word) ? current : [...current, result.word])
        setScore((value) => value + result.gemsAwarded)
        setAnswer('')
        updateLearner({ ...learner, gems: result.totalGems })
        bumpHub()
      }
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 429) {
        setLimitNote(requestError.message)
        setStopped(true)
        return
      }
      setNotice(requestError instanceof ApiError ? requestError.message : 'Could not check your answer')
      setNoticeOk(false)
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <section className="card gate">
        <h1>Grab the Last Letter paused</h1>
        <p>{error}</p>
        <Button onClick={() => navigate('/home')}>Return home</Button>
      </section>
    )
  }

  if (!game) {
    return <section className="card gate"><Badge>LOADING</Badge><h1>Warming up Grab the Last Letter…</h1></section>
  }

  const head = game.word.slice(0, -1)
  const tail = game.word.slice(-1)

  return (
    <>
      <div className="quiz-head">
        <button className="back-button" onClick={() => navigate('/home')}><ArrowLeft /></button>
        <div>
          <p className="eyebrow">MINI-GAME</p>
          <h1>Grab the Last Letter</h1>
          <p>Type an English word that starts with the highlighted letter.</p>
        </div>
        <div className="quest-progress">
          <span>+{score} gems</span>
        </div>
      </div>
      {stopped ? (
        <>
          <section className="card gate">
            <Badge tone="lime">ROUND STOPPED</Badge>
            <h1>You earned +{score} gems</h1>
            {limitNote && <p>{limitNote}</p>}
            <Button onClick={() => navigate('/home')}>Back to hub</Button>
          </section>
          <SessionWords words={words} />
        </>
      ) : (
        <>
        <section className="card last-letter">
          <p className="eyebrow">Starts with {tail.toUpperCase()}</p>
          <p className="last-letter-word" aria-label={`Current word ${game.word}. Grab the letter ${tail}.`}>
            {head}<span className="last-letter-mark">{tail}</span>
          </p>
          <form className="fill-blank-form" onSubmit={(event) => void submit(event)}>
            <label className="fill-blank-label" htmlFor="last-letter-answer">Next word</label>
            <input
              id="last-letter-answer"
              className="fill-blank-input"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Type a word…"
              autoFocus
            />
            {notice && (
              <p className={noticeOk ? 'last-letter-ok' : 'last-letter-miss'} role="status">{notice}</p>
            )}
            <div className="fill-blank-actions">
              <Button type="button" variant="secondary" onClick={() => setStopped(true)}>Stop</Button>
              <Button type="submit" disabled={busy || !answer.trim()}>
                <Check size={17} /> Check
              </Button>
            </div>
          </form>
        </section>
        <SessionWords words={words} />
        </>
      )}
    </>
  )
}
