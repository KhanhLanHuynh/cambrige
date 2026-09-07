import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '../../stores'
import { DashboardPage } from './DashboardPage'

const wordHealth = [
  { id: '1', word: 'zebra', partOfSpeech: 'noun', category: 'animals', health: 'At risk', accuracy: 10, quizzes: 4, lastActivity: null, lastActivityLabel: '—' },
  { id: '2', word: 'apple', partOfSpeech: 'noun', category: 'food', health: 'Healthy', accuracy: 90, quizzes: 8, lastActivity: null, lastActivityLabel: '—' },
  { id: '3', word: 'mango', partOfSpeech: 'noun', category: 'food', health: 'At risk', accuracy: 10, quizzes: 3, lastActivity: null, lastActivityLabel: '—' },
  { id: '4', word: 'balloon', partOfSpeech: 'noun', category: 'objects', health: 'Warming', accuracy: 50, quizzes: 2, lastActivity: null, lastActivityLabel: '—' },
  { id: '5', word: 'cloud', partOfSpeech: 'noun', category: 'weather', health: 'Healthy', accuracy: 80, quizzes: 5, lastActivity: null, lastActivityLabel: '—' },
  { id: '6', word: 'dragon', partOfSpeech: 'noun', category: 'animals', health: 'Healthy', accuracy: 100, quizzes: 6, lastActivity: null, lastActivityLabel: '—' },
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function matrixSection() {
  return screen.getByRole('heading', { name: 'Word Health Matrix' }).closest('section') as HTMLElement
}

function matrixWords() {
  const rows = within(within(matrixSection()).getByRole('table')).getAllByRole('row').slice(1)
  return rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent ?? '')
}

describe('DashboardPage Word Health Matrix accuracy sort', () => {
  beforeEach(() => {
    useSessionStore.setState({
      user: { id: 'parent-1', name: 'Demo', email: 'parent@example.com', role: 'parent' },
      learners: [{ id: 'learner-1', name: 'Explorer', avatar: 'owl', level: 'Movers', hasPin: true, streak: 1, gems: 10 }],
      activeLearnerId: 'learner-1',
      adultUnlocked: true,
      hydrated: true,
    })

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/parent/dashboard')) {
        return jsonResponse({
          activity: [],
          masteredThisWeek: 0,
          masteryByLevel: [],
          learners: [{
            id: 'learner-1',
            name: 'Explorer',
            avatar: 'owl',
            level: 'Movers',
            hasPin: true,
            streak: 1,
            gems: 10,
            totalAnswers: 12,
            accuracy: 70,
            atRiskWords: 2,
            masteredThisWeek: 0,
          }],
          wordHealth,
        })
      }
      if (url.includes('/api/curriculum/assignments')) {
        return jsonResponse({ assignments: [] })
      }
      return jsonResponse({ error: `unmocked ${url}` }, 500)
    }))
  })

  it('defaults to lowest accuracy first and toggles to highest first', async () => {
    const user = userEvent.setup()
    render(<DashboardPage navigate={vi.fn()} />)

    await waitFor(() => {
      expect(matrixWords()).toEqual(['mango', 'zebra', 'balloon', 'cloud', 'apple'])
    })

    const accuracyHeader = within(matrixSection()).getByRole('columnheader', { name: /accuracy/i })
    expect(accuracyHeader).toHaveAttribute('aria-sort', 'ascending')

    await user.click(within(matrixSection()).getByRole('button', { name: 'Sort accuracy from highest to lowest' }))

    expect(matrixWords()).toEqual(['dragon', 'apple', 'cloud', 'balloon', 'mango'])
    expect(accuracyHeader).toHaveAttribute('aria-sort', 'descending')
    expect(within(matrixSection()).getByText('Page 1 of 2')).toBeInTheDocument()

    await user.click(within(matrixSection()).getByRole('button', { name: 'Next' }))
    expect(matrixWords()).toEqual(['zebra'])

    await user.click(within(matrixSection()).getByRole('button', { name: 'Sort accuracy from lowest to highest' }))
    expect(matrixWords()).toEqual(['mango', 'zebra', 'balloon', 'cloud', 'apple'])
    expect(accuracyHeader).toHaveAttribute('aria-sort', 'ascending')
    expect(within(matrixSection()).getByText('Page 1 of 2')).toBeInTheDocument()
  })

  it('keeps the filtered list sorted and paginates in sorted order', async () => {
    const user = userEvent.setup()
    render(<DashboardPage navigate={vi.fn()} />)

    await waitFor(() => {
      expect(matrixWords()).toContain('mango')
    })

    await user.type(screen.getByPlaceholderText('Filter words...'), 'a')
    expect(matrixWords()).toEqual(['mango', 'zebra', 'balloon', 'apple', 'dragon'])

    await user.selectOptions(screen.getByLabelText('Health status'), 'Healthy')
    expect(matrixWords()).toEqual(['apple', 'dragon'])

    await user.selectOptions(screen.getByLabelText('Health status'), 'All')
    await user.clear(screen.getByPlaceholderText('Filter words...'))
    await user.click(within(matrixSection()).getByRole('button', { name: 'Next' }))

    expect(matrixWords()).toEqual(['dragon'])
    expect(within(matrixSection()).getByText('Page 2 of 2')).toBeInTheDocument()
  })
})
