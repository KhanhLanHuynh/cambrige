export function pickRandomSentence(pool: string[]): string {
  if (!pool.length) return ''
  return pool[Math.floor(Math.random() * pool.length)] ?? ''
}

export function tokenizeSentence(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean)
}

export function shuffleTokens(tokens: string[]): string[] {
  if (tokens.length <= 1) return [...tokens]
  const original = tokens.join('\u0000')
  const next = [...tokens]
  for (let attempt = 0; attempt < 20; attempt += 1) {
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      const current = next[index]
      const swap = next[swapIndex]
      if (current === undefined || swap === undefined) continue
      next[index] = swap
      next[swapIndex] = current
    }
    if (next.join('\u0000') !== original) return next
  }
  const first = next[0]
  const second = next[1]
  if (first !== undefined && second !== undefined) {
    next[0] = second
    next[1] = first
  }
  return next
}
