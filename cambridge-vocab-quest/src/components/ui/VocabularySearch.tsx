import { BookOpen, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { api, pickRandomSentence } from '../../lib'
import type { VocabularySearchResult } from '../../types'

type VocabularySearchProps = {
  navigate: (path: string) => void
  className?: string
}

export function VocabularySearch({ navigate, className = '' }: VocabularySearchProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VocabularySearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedWord, setSelectedWord] = useState<VocabularySearchResult | null>(null)
  const exampleSentence = useMemo(
    () => (selectedWord ? pickRandomSentence(selectedWord.sentences) : ''),
    [selectedWord],
  )

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      setError('')
      return
    }

    let active = true
    setLoading(true)
    setError('')
    const timer = window.setTimeout(() => {
      void api<{ results: VocabularySearchResult[] }>(
        `/vocabulary/search?q=${encodeURIComponent(trimmed)}&limit=12`,
      )
        .then((response) => {
          if (!active) return
          setResults(response.results)
          setOpen(true)
          setLoading(false)
        })
        .catch(() => {
          if (!active) return
          setResults([])
          setError('Could not search words')
          setOpen(true)
          setLoading(false)
        })
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setOpen(false)
    setError('')
  }

  const selectResult = (word: VocabularySearchResult) => {
    setSelectedWord(word)
    setOpen(false)
  }

  const practice = () => {
    setSelectedWord(null)
    clearSearch()
    navigate('/explore')
  }

  return (
    <>
      <div className={`search-wrap ${className}`} ref={rootRef}>
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Search vocabulary"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={open}
            placeholder="Search words…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              if (query.trim() || results.length || error) setOpen(true)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setOpen(false)
                return
              }
              if (event.key === 'Enter' && open && results[0]) {
                event.preventDefault()
                selectResult(results[0])
              }
            }}
          />
        </label>
        {open && query.trim() && (
          <div className="search-results" id={listId} role="listbox">
            {loading && <p className="search-status">Searching…</p>}
            {!loading && error && <p className="search-status">{error}</p>}
            {!loading && !error && !results.length && (
              <p className="search-status">No words found</p>
            )}
            {!loading && !error && results.map((word) => (
              <button
                key={word.id}
                type="button"
                role="option"
                className="search-result"
                onClick={() => selectResult(word)}
              >
                <strong>{word.word}</strong>
                <span>{word.level}</span>
                <small>{word.definition}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedWord && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedWord(null)}>
          <section
            className="modal search-word-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-word-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setSelectedWord(null)} aria-label="Close">
              <X />
            </button>
            <p className="eyebrow">{selectedWord.category} · {selectedWord.level}</p>
            <h2 id="search-word-title">{selectedWord.word}</h2>
            <p className="search-phonetic">{selectedWord.phonetic}</p>
            <p>{selectedWord.definition}</p>
            {exampleSentence && (
              <p className="search-sentence">“{exampleSentence}”</p>
            )}
            {selectedWord.hint && <p className="search-hint">Hint: {selectedWord.hint}</p>}
            <div className="search-modal-actions">
              <button type="button" className="button button-secondary" onClick={() => setSelectedWord(null)}>Close</button>
              <button type="button" className="button button-primary" onClick={practice}>
                <BookOpen size={17} /> Practice
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
