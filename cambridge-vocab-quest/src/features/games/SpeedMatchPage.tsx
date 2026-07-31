import { ArrowLeft, Check, Timer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Progress } from '../../components/ui'
import { api, ApiError } from '../../lib'
import type { Learner, QuizAnswerResult, QuizSession } from '../../types'

type Pair = { wordId: string; word: string; definition: string }

type CreatedSession = QuizSession & {
  settings?: { hintsEnabled?: boolean; soundEnabled?: boolean; speedMatchSeconds?: number }
}

export function SpeedMatchPage({ learner, navigate }: { learner: Learner; navigate: (path: string) => void }) {
  const [session, setSession] = useState<CreatedSession | null>(null)
  const [pairs, setPairs] = useState<Pair[]>([])
  const [definitions, setDefinitions] = useState<string[]>([])
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [seconds, setSeconds] = useState(60)
  const [error, setError] = useState('')
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    let active = true
    api<CreatedSession>('/quiz/sessions', { method: 'POST', body: { count: 6, mode: 'speed-match', level: learner.level } })
      .then((created) => {
        if (!active) return
        setSeconds(created.settings?.speedMatchSeconds ?? 60)
        setSession(created)
        const nextPairs = created.questions.map((question) => ({
          wordId: question.id,
          word: question.word,
          definition: question.definition,
        }))
        setPairs(nextPairs)
        setDefinitions(nextPairs.map((item) => item.definition).sort(() => Math.random() - 0.5))
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof ApiError ? requestError.message : 'Could not start Speed Match')
      })
    return () => { active = false }
  }, [learner.id, learner.level])

  useEffect(() => {
    if (!session || finished) return
    if (seconds <= 0) {
      setFinished(true)
      return
    }
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [seconds, session, finished])

  const remaining = useMemo(() => pairs.filter((pair) => !matched.has(pair.wordId)), [pairs, matched])

  const pickDefinition = async (definition: string) => {
    if (!selectedWord || !session || finished) return
    const pair = pairs.find((item) => item.wordId === selectedWord)
    if (!pair) return
    if (pair.definition !== definition) {
      setSelectedWord(null)
      return
    }
    try {
      const result = await api<QuizAnswerResult>(`/quiz/sessions/${session.id}/answers`, {
        method: 'POST',
        body: { wordId: pair.wordId, answer: pair.word },
      })
      if (result.correct) {
        setMatched((current) => new Set(current).add(pair.wordId))
        setScore((value) => value + (result.gemsAwarded ?? 10))
        if (matched.size + 1 >= pairs.length) setFinished(true)
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Could not save match')
    }
    setSelectedWord(null)
  }

  if (error) {
    return (
      <section className="card gate">
        <h1>Speed Match paused</h1>
        <p>{error}</p>
        <Button onClick={() => navigate('/home')}>Return home</Button>
      </section>
    )
  }

  if (!session) {
    return <section className="card gate"><Badge>LOADING</Badge><h1>Warming up Speed Match…</h1></section>
  }

  return (
    <>
      <div className="quiz-head">
        <button className="back-button" onClick={() => navigate('/home')}><ArrowLeft /></button>
        <div>
          <p className="eyebrow">MINI-GAME</p>
          <h1>Speed Match</h1>
          <p>Match each word to its definition before time runs out.</p>
        </div>
        <div className="quest-progress">
          <span><Timer size={16} /> {seconds}s · +{score} gems</span>
          <Progress value={(matched.size / Math.max(1, pairs.length)) * 100} />
        </div>
      </div>
      {finished ? (
        <section className="card gate">
          <Badge tone="lime">ROUND COMPLETE</Badge>
          <h1>You matched {matched.size}/{pairs.length}</h1>
          <p>Gems earned this round: +{score}</p>
          <Button onClick={() => navigate('/home')}>Back to hub</Button>
        </section>
      ) : (
        <div className="speed-match">
          <section className="card">
            <h3>Words</h3>
            <div className="match-grid">
              {remaining.map((pair) => (
                <button
                  key={pair.wordId}
                  className={selectedWord === pair.wordId ? 'selected' : ''}
                  onClick={() => setSelectedWord(pair.wordId)}
                >
                  {pair.word}
                </button>
              ))}
            </div>
          </section>
          <section className="card">
            <h3>Definitions</h3>
            <div className="match-grid">
              {definitions.filter((definition) => !pairs.some((pair) => matched.has(pair.wordId) && pair.definition === definition)).map((definition) => (
                <button key={definition} disabled={!selectedWord} onClick={() => void pickDefinition(definition)}>
                  {definition}
                </button>
              ))}
            </div>
          </section>
          <p className="inline-note"><Check size={14} /> Select a word, then tap its definition.</p>
        </div>
      )}
    </>
  )
}
