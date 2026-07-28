import { ArrowLeft, Check } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Badge, Button, Progress } from '../../components/ui'
import { api, ApiError, speakAnswerFeedback } from '../../lib'
import type { Learner, QuizAnswerResult, QuizQuestion, QuizSession } from '../../types'

type CreatedSession = QuizSession & {
  settings?: { hintsEnabled: boolean; soundEnabled: boolean }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function blankSentence(question: QuizQuestion) {
  const target = question.word.replace(/\)+$/g, '').trim()
  const pool = question.sentences
  const withWord = pool.filter((sentence) =>
    target ? new RegExp(`\\b${escapeRegExp(target)}\\b`, 'i').test(sentence) : false,
  )
  // Prefer classroom-safe lines; avoid leftover nonsense templates.
  const ranked = [...withWord].sort((a, b) => scoreSentence(a, target) - scoreSentence(b, target))
  const match = ranked[0] ?? pool[0] ?? (target ? `Write the word: ${target}` : 'Write the missing word.')
  if (!target) return match
  return match.replace(new RegExp(`\\b${escapeRegExp(target)}\\b`, 'i'), '______')
}

function scoreSentence(sentence: string, word: string) {
  let score = 0
  const lower = sentence.toLowerCase()
  if (/ate .+ for lunch/i.test(sentence) && !isLikelyFoodWord(word)) score += 50
  if (/put on .+ this morning/i.test(sentence) && !isLikelyClothesWord(word)) score += 50
  if (/is soft and warm/i.test(sentence) && !isLikelyClothesWord(word)) score += 40
  if (/drank .+ at breakfast/i.test(sentence)) score -= 5
  if (/learned about|talked about|in the picture|in class|pointed to/i.test(lower)) score -= 10
  if (sentence.length > 90) score += 5
  return score
}

function isLikelyFoodWord(word: string) {
  return /^(apple|banana|bread|burger|cake|candy|carrot|cheese|chicken|chips|chocolate|egg|fish|food|fruit|grape|honey|jam|juice|lemon|milk|mushroom|olive|olives|orange|pasta|peanut|pizza|rice|salad|salt|sandwich|sauce|soup|strawberry|sugar|toast|tomato|water|yoghurt|yogurt|coffee|tea|dessert|supper|lettuce|cabbage|spinach|herb|chilli|chili|vanilla)$/i.test(word.trim())
}

function isLikelyClothesWord(word: string) {
  return /^(shirt|dress|hat|shoe|shoes|jacket|jeans|boot|boots|sock|socks|coat|scarf|gloves|trousers|skirt|sweater|jumper|tie|belt|cap|sandal|sandals|shorts|t-shirt)$/i.test(word.trim())
}

export function FillBlankPage({ learner, navigate }: { learner: Learner; navigate: (path: string) => void }) {
  const [session, setSession] = useState<CreatedSession | null>(null)
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [revealed, setRevealed] = useState('')
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [lastGems, setLastGems] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    let active = true
    api<CreatedSession>('/quiz/sessions', {
      method: 'POST',
      body: { count: 8, mode: 'fill-blank', level: learner.level },
    })
      .then((created) => {
        if (active) setSession(created)
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof ApiError ? requestError.message : 'Could not start Fill the Blank')
      })
    return () => { active = false }
  }, [learner.id, learner.level])

  const questions = session?.questions ?? []
  const question = questions[index]
  const cloze = useMemo(() => (question ? blankSentence(question) : ''), [question])
  const total = questions.length

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!session || !question || status !== 'idle' || busy) return
    const trimmed = answer.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      const result = await api<QuizAnswerResult>(`/quiz/sessions/${session.id}/answers`, {
        method: 'POST',
        body: { wordId: question.id, answer: trimmed },
      })
      setStatus(result.correct ? 'correct' : 'wrong')
      setRevealed(result.answer)
      if (result.correct) {
        const awarded = result.gemsAwarded ?? 5
        setLastGems(awarded)
        setScore((value) => value + awarded)
        setCorrectCount((value) => value + 1)
      } else {
        setLastGems(0)
      }
      if (session.settings?.soundEnabled !== false) speakAnswerFeedback(result.correct)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Could not check your answer')
    } finally {
      setBusy(false)
    }
  }

  const advance = () => {
    if (!session || status === 'idle') return
    if (index + 1 >= total) {
      setFinished(true)
      return
    }
    setIndex((value) => value + 1)
    setAnswer('')
    setStatus('idle')
    setRevealed('')
  }

  if (error) {
    return (
      <section className="card gate">
        <h1>Fill the Blank paused</h1>
        <p>{error}</p>
        <Button onClick={() => navigate('/home')}>Return home</Button>
      </section>
    )
  }

  if (!session || !question) {
    return <section className="card gate"><Badge>LOADING</Badge><h1>Warming up Fill the Blank…</h1></section>
  }

  return (
    <>
      <div className="quiz-head">
        <button className="back-button" onClick={() => navigate('/home')}><ArrowLeft /></button>
        <div>
          <p className="eyebrow">MINI-GAME</p>
          <h1>Fill the Blank</h1>
          <p>Read the sentence and type the missing word.</p>
        </div>
        <div className="quest-progress">
          <span>{index + 1}/{total} · +{score} gems</span>
          <Progress value={((index + (status === 'idle' ? 0 : 1)) / Math.max(1, total)) * 100} />
        </div>
      </div>
      {finished ? (
        <section className="card gate">
          <Badge tone="lime">ROUND COMPLETE</Badge>
          <h1>You got {correctCount}/{total} right</h1>
          <p>Gems earned this round: +{score}</p>
          <Button onClick={() => navigate('/home')}>Back to hub</Button>
        </section>
      ) : (
        <section className="card fill-blank">
          <p className="eyebrow">{question.category} · {question.partOfSpeech}</p>
          <p className="fill-blank-sentence" aria-label="Sentence with missing word">{cloze}</p>
          {status === 'idle' ? (
            <form className="fill-blank-form" onSubmit={(event) => void submit(event)}>
              <aside className="fill-blank-hint">
                <p><strong>Meaning:</strong> {question.definition}</p>
                {question.definitionVi && <p className="fill-blank-hint-vi">{question.definitionVi}</p>}
              </aside>
              <label className="fill-blank-label" htmlFor="fill-blank-answer">Missing word</label>
              <input
                id="fill-blank-answer"
                className="fill-blank-input"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Type the word…"
                autoFocus
              />
              <div className="fill-blank-actions">
                <Button type="submit" disabled={busy || !answer.trim()}>
                  <Check size={17} /> Check
                </Button>
              </div>
            </form>
          ) : (
            <div className="fill-blank-feedback">
              <Badge tone={status === 'correct' ? 'lime' : undefined}>
                {status === 'correct' ? 'Correct!' : 'Not quite'}
              </Badge>
              <p>
                {status === 'correct'
                  ? `Nice — “${revealed}” fits the blank. +${lastGems} gems`
                  : `The missing word was “${revealed}”.`}
              </p>
              <p className="fill-blank-revealed">{question.definition}</p>
              <Button onClick={advance}>
                {index + 1 >= total ? 'Finish' : 'Next'}
              </Button>
            </div>
          )}
        </section>
      )}
    </>
  )
}
