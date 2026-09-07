export type AccuracySortDirection = 'asc' | 'desc'

export function compareWordHealthByAccuracy(
  a: { word: string; accuracy: number },
  b: { word: string; accuracy: number },
  direction: AccuracySortDirection,
) {
  const diff = a.accuracy - b.accuracy
  if (diff !== 0) return direction === 'asc' ? diff : -diff
  return a.word.localeCompare(b.word)
}
