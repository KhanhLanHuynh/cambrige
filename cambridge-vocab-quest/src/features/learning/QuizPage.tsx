import {
  ArrowLeft, Check, ChevronRight, CircleHelp, Gem, Sparkles, Trophy, Volume2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, Button, Progress } from '../../components/ui'
import { api, ApiError, pickRandomSentence, speakAnswerFeedback } from '../../lib'
import { useQuestStore } from '../../stores'
import type { Learner, QuizAnswerResult, QuizQuestion, QuizSession } from '../../types'

type CreatedSession = QuizSession & {
  settings?: { hintsEnabled: boolean; soundEnabled: boolean }
  mode?: string
}

export function QuizPage({ learner, navigate }: { learner: Learner; navigate: (path: string) => void }) {
  const { index, xp, streak, recordAnswer, next, reset } = useQuestStore()
  const [session, setSession] = useState<CreatedSession | null>(null)
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState('')
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [hint, setHint] = useState(false)
  const [answerResult, setAnswerResult] = useState<QuizAnswerResult | null>(null)
  const [exampleSentence, setExampleSentence] = useState('')
  const word = session?.questions[index]

  useEffect(() => {
    let active = true
    reset()
    const params = new URLSearchParams(window.location.search)
    const stop = params.get('stop')
    const focus = params.get('focus')
    const review = params.get('review') === '1'
    const mapStop = stop === 'nature-valley' || stop === 'crystal-caves' || stop === 'space-station' || stop === 'dragon-ridge'
      ? stop
      : undefined
    api<CreatedSession>('/quiz/sessions', {
      method: 'POST',
      body: focus
        ? { count: 5, level: learner.level, focusWordIds: [focus] }
        : review
          ? { count: 8, level: learner.level, reviewOnly: true }
          : {
              count: 10,
              level: learner.level,
              mapStop,
            },
    })
      .then((created) => { if (active) setSession(created) })
      .catch((error) => { if (active) setLoadError(error instanceof ApiError ? error.message : 'Could not start the quiz') })
    return () => { active = false }
  }, [learner.id, learner.level, reset])

  useEffect(() => {
    if (!word) {
      setExampleSentence('')
      return
    }
    setExampleSentence(pickRandomSentence(word.sentences))
  }, [word?.id])

  const speak = () => {
    if (!word || session?.settings?.soundEnabled === false) return
    speechSynthesis.cancel()
    speechSynthesis.speak(new SpeechSynthesisUtterance(word.word))
  }

  const check = async () => {
    if (!word || !session) return
    try {
      const result = await api<QuizAnswerResult>(`/quiz/sessions/${session.id}/answers`, {
        method: 'POST',
        body: { wordId: word.id, answer: selected },
      })
      setAnswerResult(result)
      setStatus(result.correct ? 'correct' : 'wrong')
      recordAnswer(word.id, result.correct, result.gemsAwarded ?? 10)
      if (session.settings?.soundEnabled !== false) speakAnswerFeedback(result.correct)
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Could not save your answer')
    }
  }

  const continueQuest = () => {
    if (answerResult?.complete) {
      navigate('/home')
      return
    }
    next(session?.questions.length ?? 1)
    setSelected('')
    setStatus('idle')
    setHint(false)
    setAnswerResult(null)
  }

  if (loadError) return <section className="card gate"><h1>Quest paused</h1><p>{loadError}</p><Button onClick={() => navigate('/home')}>Return home</Button></section>
  if (!word || !session) return <section className="card gate"><Badge>PREPARING QUEST</Badge><h1>Loading your next words…</h1></section>

  const progress = Math.round(((index + (status === 'idle' ? 0 : 1)) / session.questions.length) * 100)
  const hintsEnabled = session.settings?.hintsEnabled !== false
  const revealed = status !== 'idle'

  return (
    <>
      <div className="quiz-head">
        <button className="back-button" onClick={() => navigate('/home')}><ArrowLeft /></button>
        <div>
          <p className="eyebrow">WORD EXPLORER</p>
          <h1>Quiz · {learner.level}</h1>
          <p>{learner.level} • {index + 1}/{session.questions.length} Words</p>
        </div>
        <div className="quest-progress">
          <span>🚀 QUEST PROGRESS <b>{progress}%</b></span>
          <Progress value={progress} />
        </div>
      </div>
      <div className="quiz-layout">
        <div className="quiz-main">
          <section className="word-stage card">
            <div className="word-hero">
              {status === 'correct' && word.image ? (
                <img className="word-image" src={word.image} alt="" />
              ) : (
                <span className="orbit-icon" aria-hidden="true">🚀</span>
              )}
              <Badge tone="lime">{word.partOfSpeech}</Badge>
              {revealed ? (
                <>
                  <h2>
                    {word.word.toUpperCase()}
                    <button onClick={speak} aria-label={`Hear ${word.word}`} disabled={session.settings?.soundEnabled === false}><Volume2 /></button>
                  </h2>
                  <strong>{word.phonetic}</strong>
                </>
              ) : (
                <h2 aria-label="Mystery word">?</h2>
              )}
            </div>
            <div className="definition">
              <CircleHelp />
              <span>
                <small>DEFINITION</small>
                <b>“{word.definition}”</b>
                {word.definitionVi ? <p className="definition-vi">{word.definitionVi}</p> : null}
              </span>
            </div>
            {revealed ? (
              <div className="sentence"><small>EXAMPLE SENTENCE</small><p>{exampleSentence}</p></div>
            ) : null}
          </section>
          <div className="answers" aria-label="Answer choices">
            {word.choices.map((choice) => (
              <button
                key={choice}
                disabled={status !== 'idle'}
                className={`${selected === choice ? 'selected' : ''} ${status !== 'idle' && choice === answerResult?.answer ? 'correct' : ''} ${status === 'wrong' && selected === choice ? 'wrong' : ''}`}
                onClick={() => setSelected(choice)}
              >
                {choice}{status !== 'idle' && choice === answerResult?.answer && <Check />}
              </button>
            ))}
          </div>
          <div className={`feedback ${status}`} aria-live="polite">
            {status === 'correct' && <><span>✨</span><div><strong>Brilliant work!</strong><p>You matched the word perfectly. +{answerResult?.gemsAwarded ?? 10} gems</p></div></>}
            {status === 'wrong' && <><span>💡</span><div><strong>Good try — you’re learning!</strong><p>The answer is {answerResult?.answer}. Read the definition once more.</p></div></>}
          </div>
          <div className="quiz-actions">
            {hintsEnabled
              ? <button className="hint-button" onClick={() => setHint(!hint)}><CircleHelp /> {hint ? word.hint : 'Need a hint?'}</button>
              : <span className="hint-button muted">Hints disabled</span>}
            {status === 'idle' ? <Button disabled={!selected} onClick={check}>Check Answer</Button> : <Button variant="lime" onClick={continueQuest}>Continue <ChevronRight /></Button>}
          </div>
        </div>
        <aside className="quiz-rail">
          <div className="guide-message"><span>🤖</span><p>Welcome back, Explorer! Can you choose the right word to complete our mission?</p></div>
          <section className="card session-card">
            <h3>SESSION STATS <Badge tone="lime"><Sparkles /> Live</Badge></h3>
            <div>
              <span><Trophy /><small>STREAK</small><b>{streak}</b></span>
              <span><Gem /><small>GEMS</small><b>+{xp}</b></span>
            </div>
            <h4>SESSION PROGRESS</h4>
            <div className="milestone">
              <i>🏆</i>
              <span>
                <small>QUEST COMPLETION</small>
                <b>{index + (status === 'idle' ? 0 : 1)} / {session.questions.length}</b>
                <Progress value={progress} />
              </span>
            </div>
          </section>
          <section className="space-fact"><strong>● &nbsp; SPACE FACT</strong><p>{answerResult?.fact ?? 'Answer the question to unlock a new fact.'}</p></section>
        </aside>
      </div>
    </>
  )
}
