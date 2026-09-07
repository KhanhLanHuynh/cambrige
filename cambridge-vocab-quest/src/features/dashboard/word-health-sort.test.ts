import { describe, expect, it } from 'vitest'
import { compareWordHealthByAccuracy } from './word-health-sort'

const rows = [
  { word: 'zebra', accuracy: 20 },
  { word: 'apple', accuracy: 90 },
  { word: 'mango', accuracy: 20 },
]

describe('compareWordHealthByAccuracy', () => {
  it('puts lower accuracy first when ascending', () => {
    const sorted = rows.toSorted((a, b) => compareWordHealthByAccuracy(a, b, 'asc'))
    expect(sorted.map((row) => row.accuracy)).toEqual([20, 20, 90])
    expect(sorted[2]?.word).toBe('apple')
  })

  it('puts higher accuracy first when descending', () => {
    const sorted = rows.toSorted((a, b) => compareWordHealthByAccuracy(a, b, 'desc'))
    expect(sorted.map((row) => row.accuracy)).toEqual([90, 20, 20])
    expect(sorted[0]?.word).toBe('apple')
  })

  it('sorts equal accuracy alphabetically', () => {
    const sorted = rows.toSorted((a, b) => compareWordHealthByAccuracy(a, b, 'asc'))
    expect(sorted.filter((row) => row.accuracy === 20).map((row) => row.word)).toEqual(['mango', 'zebra'])
  })
})
