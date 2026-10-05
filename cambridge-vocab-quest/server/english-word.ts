export type EnglishLookupResult = 'english' | 'unknown' | 'unavailable'

export type EnglishLookup = (word: string) => Promise<EnglishLookupResult>

const cache = new Map<string, 'english' | 'unknown'>()
const USER_AGENT = 'CambridgeVocabQuest/1.0 (educational last-letter game)'

function classifyBody(body: unknown): 'english' | 'unknown' | null {
  if (!body || typeof body !== 'object') return null
  const english = (body as { en?: unknown }).en
  if (!Array.isArray(english)) return 'unknown'
  return english.length > 0 ? 'english' : 'unknown'
}

/** Wiktionary English check. `en` on a 200 means the word is English; 404 means it is not. */
export async function lookupEnglishWord(
  word: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<EnglishLookupResult> {
  const key = word.trim().toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  try {
    const response = await fetchImpl(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(key)}`,
      {
        headers: {
          accept: 'application/json',
          'user-agent': USER_AGENT,
        },
        signal: AbortSignal.timeout(8000),
      },
    )
    if (response.status === 404) {
      cache.set(key, 'unknown')
      return 'unknown'
    }
    if (!response.ok) return 'unavailable'
    const classified = classifyBody(await response.json())
    if (!classified) return 'unavailable'
    cache.set(key, classified)
    return classified
  } catch {
    return 'unavailable'
  }
}
