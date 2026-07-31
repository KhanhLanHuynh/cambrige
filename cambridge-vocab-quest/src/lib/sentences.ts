export function pickRandomSentence(pool: string[]): string {
  if (!pool.length) return ''
  return pool[Math.floor(Math.random() * pool.length)] ?? ''
}
