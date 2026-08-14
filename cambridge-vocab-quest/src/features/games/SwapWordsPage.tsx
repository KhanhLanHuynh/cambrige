import { ArrowLeft, Check } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Progress } from '../../components/ui'
import { api, ApiError, pickRandomSentence, shuffleTokens, speakAnswerFeedback, tokenizeSentence } from '../../lib'
import type { Learner, QuizAnswerResult, QuizQuestion, QuizSession } from '../../types'

type CreatedSession = QuizSession & {
  settings?: { hintsEnabled: boolean; soundEnabled: boolean }
}

type Chip = { id: string; text: string }

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function pickTargetSentence(question: QuizQuestion) {
  const target = question.word.replace(/\)+$/g, '').trim()
  const pool = question.sentences
  const withWord = pool.filter((sentence) =>
    target ? new RegExp(`\\b${escapeRegExp(target)}\\b`, 'i').test(sentence) : false,
  )
  return (
    pickRandomSentence(withWord) ||
    pickRandomSentence(pool) ||
    (target ? `Write this word: ${target}` : 'Put the words in order.')
  )
}

function toChips(tokens: string[]): Chip[] {
  return tokens.map((text, index) => ({ id: `${index}-${text}`, text }))
}

function normalizeSentence(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function SwapWordsPage({ learner, navigate }: { learner: Learner; navigate: (path: string) => void }) {
  const [session, setSession] = useState<CreatedSession | null>(null)
  const [index, setIndex] = useState(0)
  const [bank, setBank] = useState<Chip[]>([])
  const [placed, setPlaced] = useState<Chip[]>([])
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
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
      body: { count: 8, mode: 'swap-words', level: learner.level },
    })
      .then((created) => {
        if (active) setSession(created)
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof ApiError ? requestError.message : 'Could not start Swap Words')
      })
    return () => { active = false }
  }, [learner.id, learner.level])

  const questions = session?.questions ?? []
  const question = questions[index]
  const puzzle = useMemo(() => {
    if (!question) return null
    const sentence = normalizeSentence(pickTargetSentence(question))
    const chips = toChips(shuffleTokens(tokenizeSentence(sentence)))
    return { sentence, chips }
  }, [question])
  const total = questions.length

  useEffect(() => {
    if (!puzzle) return
    setBank(puzzle.chips)
    setPlaced([])
    setStatus('idle')
  }, [puzzle])

  const placeChip = (chip: Chip) => {
    if (status !== 'idle' || busy) return
    setBank((current) => current.filter((item) => item.id !== chip.id))
    setPlaced((current) => [...current, chip])
  }

  const returnChip = (chip: Chip) => {
    if (status !== 'idle' || busy) return
    setPlaced((current) => current.filter((item) => item.id !== chip.id))
    setBank((current) => [...current, chip])
  }

  const submit = async () => {
    if (!session || !question || !puzzle || status !== 'idle' || busy) return
    if (placed.length !== puzzle.chips.length) return
    const assembled = normalizeSentence(placed.map((chip) => chip.text).join(' '))
    const orderCorrect = assembled === puzzle.sentence
    setBusy(true)
    try {
      const result = await api<QuizAnswerResult>(`/quiz/sessions/${session.id}/answers`, {
        method: 'POST',
        body: { wordId: question.id, answer: orderCorrect ? question.word : '_' },
      })
      setStatus(result.correct ? 'correct' : 'wrong')
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
  }

  if (error) {
    return (
      <section className="card gate">
        <h1>Swap Words paused</h1>
        <p>{error}</p>
        <Button onClick={() => navigate('/home')}>Return home</Button>
      </section>
    )
  }

  if (!session || !question || !puzzle) {
    return <section className="card gate"><Badge>LOADING</Badge><h1>Warming up Swap Words…</h1></section>
  }

  return (
    <>
      <div className="quiz-head">
        <button className="back-button" onClick={() => navigate('/home')}><ArrowLeft /></button>
        <div>
          <p className="eyebrow">MINI-GAME</p>
          <h1>Swap Words</h1>
          <p>Tap the words into the right order to make the sentence.</p>
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
        <section className="card swap-words">
          <p className="eyebrow">{question.category} · {question.partOfSpeech}</p>
          <div className="swap-words-prompt">
            {question.image ? (
              <img
                className="swap-words-image"
                src={question.image}
                alt=""
                loading="lazy"
              />
            ) : null}
            <aside className="fill-blank-hint">
              <p><strong>Meaning:</strong> {question.definition}</p>
              {question.definitionVi && <p className="fill-blank-hint-vi">{question.definitionVi}</p>}
            </aside>
          </div>
          {status === 'idle' ? (
            <div className="swap-words-play">
              <p className="swap-words-label">Your sentence</p>
              <div className="swap-words-row sentence" aria-label="Words you placed">
                {placed.length
                  ? placed.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className="swap-words-chip"
                      onClick={() => returnChip(chip)}
                    >
                      {chip.text}
                    </button>
                  ))
                  : <span className="swap-words-placeholder">Tap words below to build the sentence</span>}
              </div>
              <p className="swap-words-label">Word bank</p>
              <div className="swap-words-row" aria-label="Shuffled words">
                {bank.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className="swap-words-chip"
                    onClick={() => placeChip(chip)}
                  >
                    {chip.text}
                  </button>
                ))}
              </div>
              <div className="fill-blank-actions">
                <Button type="button" disabled={busy || placed.length !== puzzle.chips.length} onClick={() => void submit()}>
                  <Check size={17} /> Check
                </Button>
              </div>
            </div>
          ) : (
            <div className="fill-blank-feedback">
              <Badge tone={status === 'correct' ? 'lime' : undefined}>
                {status === 'correct' ? 'Correct!' : 'Not quite'}
              </Badge>
              <p>
                {status === 'correct'
                  ? `Nice — that sentence is right. +${lastGems} gems`
                  : 'The words go in this order:'}
              </p>
              <p className="swap-words-revealed">{puzzle.sentence}</p>
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
