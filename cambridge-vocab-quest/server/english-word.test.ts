import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookupEnglishWord } from './english-word.js'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('lookupEnglishWord', () => {
  it('treats an English Wiktionary entry as a real word', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { en: [{ partOfSpeech: 'noun' }] }))
    await expect(lookupEnglishWord('cascade', fetchImpl)).resolves.toBe('english')
    await expect(lookupEnglishWord('cascade', fetchImpl)).resolves.toBe('english')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('treats a missing page and a non-English entry as unknown', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse(404, { status: 404 }))
      .mockResolvedValueOnce(jsonResponse(200, { fr: [{ partOfSpeech: 'nom' }] }))
    await expect(lookupEnglishWord('zzzznotaword', fetchImpl)).resolves.toBe('unknown')
    await expect(lookupEnglishWord('bonjouronly', fetchImpl)).resolves.toBe('unknown')
  })

  it('does not cache an outage as a missing word', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse(522, 'timeout'))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(jsonResponse(200, { en: [{ partOfSpeech: 'noun' }] }))
    await expect(lookupEnglishWord('flakyone', fetchImpl)).resolves.toBe('unavailable')
    await expect(lookupEnglishWord('flakytwo', fetchImpl)).resolves.toBe('unavailable')
    await expect(lookupEnglishWord('flakyone', fetchImpl)).resolves.toBe('english')
  })
})
