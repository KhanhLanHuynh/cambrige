import { LockKeyhole, Search, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge, Button } from '../../components/ui'
import { SentenceEditorModal } from '../dashboard/SentenceEditorModal'
import { api, ApiError } from '../../lib'
import { useSessionStore } from '../../stores'
import type { CambridgeLevel } from '../../types'

type DictionaryFilter = 'All' | CambridgeLevel

type DictionaryWord = {
  id: string
  word: string
  partOfSpeech: string
  level: CambridgeLevel
  definition: string
}

const FILTERS: DictionaryFilter[] = ['All', 'Starters', 'Movers', 'Flyers', 'Preliminary']
const PAGE_SIZE = 25

export function DictionaryPage({ navigate }: { navigate: (path: string) => void }) {
  const adultUnlocked = useSessionStore((state) => state.adultUnlocked)
  const unlockAdult = useSessionStore((state) => state.unlockAdult)
  const lockAdult = useSessionStore((state) => state.lockAdult)
  const [gateError, setGateError] = useState('')
  const [levelFilter, setLevelFilter] = useState<DictionaryFilter>('All')
  const [query, setQuery] = useState('')
  const [words, setWords] = useState<DictionaryWord[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [page, setPage] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [editWordId, setEditWordId] = useState<string | null>(null)
  const [listRevision, setListRevision] = useState(0)

  useEffect(() => {
    if (!adultUnlocked) return
    let active = true
    setLoading(true)
    setLoadError('')
    const levelQuery = levelFilter === 'All' ? '' : `?level=${encodeURIComponent(levelFilter)}`
    api<{ words: DictionaryWord[] }>(`/parent/vocabulary${levelQuery}`)
      .then((response) => {
        if (!active) return
        setWords(response.words)
        setPage(0)
      })
      .catch((error) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 403) {
          lockAdult()
          return
        }
        setWords([])
        setLoadError(error instanceof ApiError ? error.message : 'Could not load dictionary')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [adultUnlocked, levelFilter, lockAdult, listRevision])

  useEffect(() => setPage(0), [query])

  const filteredWords = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return words
    return words.filter((word) => word.word.toLowerCase().includes(needle))
  }, [words, query])

  const pageCount = Math.max(1, Math.ceil(filteredWords.length / PAGE_SIZE))
  const pagedWords = useMemo(
    () => filteredWords.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filteredWords, page],
  )

  if (!adultUnlocked) {
    return (
      <div className="gate-page">
        <section className="card gate">
          <span><LockKeyhole /></span>
          <Badge tone="lime">GROWN-UPS ONLY</Badge>
          <h1>Dictionary</h1>
          <p>Enter the adult account password to browse and edit Cambridge vocabulary.</p>
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
            <Button type="submit">Unlock dictionary <ShieldCheck /></Button>
          </form>
          <button className="text-link" onClick={() => navigate('/home')}>Return to learner home</button>
        </section>
      </div>
    )
  }

  return (
    <>
      <section className="dictionary-page health-section">
        <div className="section-heading">
          <div>
            <h1>Dictionary</h1>
            <p>Browse all Cambridge words by level, sorted A–Z. Edit definitions and example sentences.</p>
          </div>
          <div className="table-actions">
            <label>
              <Search />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search words..."
                aria-label="Search words in current filter"
              />
            </label>
          </div>
        </div>

        <div className="dictionary-filters" role="tablist" aria-label="Cambridge level">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={levelFilter === filter}
              className={levelFilter === filter ? 'dictionary-filter is-active' : 'dictionary-filter'}
              onClick={() => setLevelFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="table-scroll card">
          <table>
            <thead>
              <tr>
                <th>Vocabulary Word</th>
                <th>Part of Speech</th>
                <th>Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedWords.map((word) => (
                <tr key={word.id}>
                  <td>{word.word}</td>
                  <td>{word.partOfSpeech}</td>
                  <td>{word.level}</td>
                  <td>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => {
                        setEditWordId(word.id)
                        setEditOpen(true)
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading
            ? <p className="no-results">Loading words…</p>
            : loadError
              ? <p className="no-results">{loadError}</p>
              : !words.length
                ? <p className="no-results">No words found for this filter.</p>
                : !filteredWords.length
                  ? <p className="no-results">No words match this search.</p>
                  : (
                    <div className="table-pagination">
                      <span>
                        {filteredWords.length} words · Page {page + 1} of {pageCount}
                      </span>
                      <Button variant="secondary" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</Button>
                      <Button variant="secondary" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button>
                    </div>
                  )}
        </div>
      </section>

      {editOpen && (
        <SentenceEditorModal
          initialWordId={editWordId}
          onClose={() => {
            setEditOpen(false)
            setEditWordId(null)
            setListRevision((current) => current + 1)
          }}
        />
      )}
    </>
  )
}
