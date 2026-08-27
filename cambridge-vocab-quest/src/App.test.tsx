import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { vocabulary } from './data/vocabulary'
import { useSessionStore } from './stores'

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/auth')
    localStorage.clear()
    useSessionStore.setState({ user: null, learners: [], activeLearnerId: null, adultUnlocked: false, hydrated: false })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))
  })

  it('renders accessible account entry', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: /sign in to continue/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('type', 'email')
    expect(screen.getByRole('button', { name: /enter vocab quest/i })).toBeEnabled()
  })

  it('keeps every quiz answer among its choices', () => {
    for (const word of vocabulary) {
      expect(word.choices).toHaveLength(4)
      expect(word.choices).toContain(word.answer)
      expect(new Set(word.choices).size).toBe(4)
    }
  })

  it('routes a super-admin to the parent management page', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/auth/session')) {
        return new Response(JSON.stringify({
          authenticated: true,
          user: { id: 'admin-1', name: 'Operator', email: 'admin@example.com', role: 'superadmin' },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      if (url.includes('/admin/parents')) {
        return new Response(JSON.stringify({ parents: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: 'unmocked' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    render(<App />)

    expect(await screen.findByRole('heading', { name: /parent accounts/i })).toBeInTheDocument()
    expect(screen.getByText(/signed in as/i)).toHaveTextContent('admin@example.com')
  })
})
