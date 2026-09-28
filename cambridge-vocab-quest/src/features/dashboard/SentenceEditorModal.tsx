import { Check, Plus, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui'
import { api, ApiError } from '../../lib'
import type { CambridgeLevel } from '../../types'

export type ParentVocabSearchHit = {
  id: string
  word: string
  definition: string
  partOfSpeech: string
  level: CambridgeLevel
  sentenceCount: number
}

export type ParentVocabWord = {
  id: string
  word: string
  definition: string
  definitionVi: string
  partOfSpeech: string
  level: CambridgeLevel
  sentences: string[]
}

export function SentenceEditorModal({
  initialWordId,
  onClose,
}: {
  initialWordId?: string | null
  onClose: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ParentVocabSearchHit[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selected, setSelected] = useState<ParentVocabWord | null>(null)
  const [drafts, setDrafts] = useState<string[]>([])
  const [definitionDraft, setDefinitionDraft] = useState('')
  const [definitionViDraft, setDefinitionViDraft] = useState('')
  const [wordLoading, setWordLoading] = useState(Boolean(initialWordId))
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const loadWord = async (wordId: string) => {
    setWordLoading(true)
    setError('')
    setSaved(false)
    try {
      const response = await api<{ word: ParentVocabWord }>(`/parent/vocabulary/${encodeURIComponent(wordId)}`)
      setSelected(response.word)
      setDrafts(response.word.sentences.length ? [...response.word.sentences] : [''])
      setDefinitionDraft(response.word.definition)
      setDefinitionViDraft(response.word.definitionVi ?? '')
      setSearchQuery(response.word.word)
      setSearchResults([])
    } catch (requestError) {
      setSelected(null)
      setDrafts([])
      setDefinitionDraft('')
      setDefinitionViDraft('')
      setError(requestError instanceof ApiError ? requestError.message : 'Could not load word')
    } finally {
      setWordLoading(false)
    }
  }

  useEffect(() => {
    if (!initialWordId) return
    void loadWord(initialWordId)
  }, [initialWordId])

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed || (selected && trimmed.toLowerCase() === selected.word.toLowerCase())) {
      setSearchResults([])
      setSearchLoading(false)
      setSearchError('')
      return
    }

    let active = true
    setSearchLoading(true)
    setSearchError('')
    const timer = window.setTimeout(() => {
      void api<{ results: ParentVocabSearchHit[] }>(
        `/parent/vocabulary/search?q=${encodeURIComponent(trimmed)}&limit=12`,
      )
        .then((response) => {
          if (!active) return
          setSearchResults(response.results)
          setSearchLoading(false)
        })
        .catch(() => {
          if (!active) return
          setSearchResults([])
          setSearchError('Could not search words')
          setSearchLoading(false)
        })
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [searchQuery, selected])

  const save = async () => {
    if (!selected) {
      setError('Search and select a vocabulary word first')
      return
    }
    const definition = definitionDraft.trim()
    const definitionVi = definitionViDraft.trim()
    const sentences = drafts.map((sentence) => sentence.trim()).filter(Boolean)
    if (!definition) {
      setError('Add an English definition')
      return
    }
    if (definition.length > 300) {
      setError('English definition must be 300 characters or fewer')
      return
    }
    if (definitionVi.length > 300) {
      setError('Vietnamese definition must be 300 characters or fewer')
      return
    }
    if (!sentences.length) {
      setError('Add at least one example sentence')
      return
    }
    if (sentences.length > 20) {
      setError('Keep at most 20 example sentences')
      return
    }
    if (sentences.some((sentence) => sentence.length > 200)) {
      setError('Each sentence must be 200 characters or fewer')
      return
    }
    setBusy(true)
    setError('')
    try {
      const response = await api<{ word: ParentVocabWord }>(
        `/parent/vocabulary/${encodeURIComponent(selected.id)}/sentences`,
        { method: 'PUT', body: { definition, definitionVi, sentences } },
      )
      setSelected(response.word)
      setDrafts(response.word.sentences.length ? [...response.word.sentences] : [''])
      setDefinitionDraft(response.word.definition)
      setDefinitionViDraft(response.word.definitionVi ?? '')
      setSaved(true)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Could not save word')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal settings-modal sentence-editor-modal" role="dialog" aria-modal="true" aria-labelledby="sentence-editor-title">
        <button className="modal-close" onClick={onClose} aria-label="Close word editor"><X /></button>
        <h2 id="sentence-editor-title">Edit word</h2>
        <p>Search any Cambridge word, then edit its English and Vietnamese definitions and example sentences used in quizzes and games.</p>

        <label className="sentence-search-label">
          <span>Find a word</span>
          <div className="sentence-search-field">
            <Search />
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setSaved(false)
              }}
              placeholder="Search vocabulary..."
              aria-label="Search vocabulary words"
            />
          </div>
        </label>
        {searchLoading && <p className="sentence-search-hint">Searching…</p>}
        {searchError && <div className="form-error">{searchError}</div>}
        {searchResults.length > 0 && (
          <ul className="sentence-search-results">
            {searchResults.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => void loadWord(hit.id)}
                >
                  <strong>{hit.word}</strong>
                  <small>{hit.level} · {hit.partOfSpeech} · {hit.sentenceCount} sentences</small>
                  <span>{hit.definition}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {wordLoading ? <p>Loading word…</p> : null}

        {selected && !wordLoading ? (
          <div className="sentence-editor-body">
            <header className="sentence-word-header">
              <div>
                <h3>{selected.word}</h3>
                <small>{selected.level} · {selected.partOfSpeech}</small>
              </div>
              <label className="sentence-definition-label">
                <span>English definition</span>
                <textarea
                  aria-label="English definition"
                  value={definitionDraft}
                  maxLength={300}
                  rows={2}
                  onChange={(event) => {
                    setDefinitionDraft(event.target.value)
                    setSaved(false)
                  }}
                />
              </label>
              <label className="sentence-definition-label">
                <span>Vietnamese definition</span>
                <textarea
                  aria-label="Vietnamese definition"
                  value={definitionViDraft}
                  maxLength={300}
                  rows={2}
                  onChange={(event) => {
                    setDefinitionViDraft(event.target.value)
                    setSaved(false)
                  }}
                />
              </label>
            </header>

            <ul className="sentence-editor-list">
              {drafts.map((sentence, index) => (
                <li key={`${selected.id}-${index}`}>
                  <textarea
                    aria-label={`Example sentence ${index + 1}`}
                    value={sentence}
                    maxLength={200}
                    rows={2}
                    onChange={(event) => {
                      const value = event.target.value
                      setDrafts((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)))
                      setSaved(false)
                    }}
                  />
                  <button
                    type="button"
                    className="text-link"
                    disabled={drafts.length <= 1}
                    onClick={() => {
                      setDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))
                      setSaved(false)
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <div className="sentence-editor-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={drafts.length >= 20}
                onClick={() => {
                  setDrafts((current) => [...current, ''])
                  setSaved(false)
                }}
              >
                <Plus /> Add sentence
              </Button>
              <Button type="button" disabled={busy} onClick={() => void save()}>
                {busy ? 'Saving…' : 'Save word'}
              </Button>
            </div>
          </div>
        ) : null}

        {!selected && !wordLoading && !searchQuery.trim() ? (
          <p className="no-results">Search for a word, or open one from the Word Health Matrix.</p>
        ) : null}

        {error && <div className="form-error">{error}</div>}
        {saved && <div className="save-success"><Check /> Word saved</div>}
      </section>
    </div>
  )
}
