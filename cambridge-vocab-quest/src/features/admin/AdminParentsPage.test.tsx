import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '../../stores'
import { AdminParentsPage } from './AdminParentsPage'

const jamie = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Jamie',
  email: 'jamie@example.com',
  createdAt: '2026-01-15T00:00:00.000Z',
  learnerCount: 2,
}

const taylor = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Taylor',
  email: 'taylor@example.com',
  createdAt: '2026-02-01T00:00:00.000Z',
  learnerCount: 0,
}

describe('AdminParentsPage', () => {
  beforeEach(() => {
    useSessionStore.setState({
      user: { id: 'admin-1', name: 'Operator', email: 'admin@example.com', role: 'superadmin' },
      learners: [],
      activeLearnerId: null,
      adultUnlocked: false,
      hydrated: true,
    })

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method?.toUpperCase() ?? 'GET'
      if (url.endsWith('/api/admin/parents') && method === 'GET') {
        return new Response(JSON.stringify({ parents: [jamie, taylor] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.endsWith(`/api/admin/parents/${jamie.id}`) && method === 'PATCH') {
        const body = JSON.parse(String(init?.body ?? '{}')) as { name?: string; email?: string }
        return new Response(JSON.stringify({ parent: { ...jamie, ...body } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.endsWith(`/api/admin/parents/${jamie.id}`) && method === 'DELETE') {
        return new Response(null, { status: 204 })
      }
      return new Response(JSON.stringify({ error: `unmocked ${method} ${url}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }))
  })

  it('lists parents and edits name and email', async () => {
    const user = userEvent.setup()
    render(<AdminParentsPage onSignOut={() => undefined} />)

    expect(await screen.findByRole('heading', { name: /parent accounts/i })).toBeInTheDocument()
    expect(screen.getByText('jamie@example.com')).toBeInTheDocument()
    expect(screen.getByText('taylor@example.com')).toBeInTheDocument()

    const jamieRow = screen.getByText('jamie@example.com').closest('tr')
    expect(jamieRow).toBeTruthy()
    await user.click(within(jamieRow as HTMLElement).getByRole('button', { name: 'Edit' }))

    const dialog = await screen.findByRole('dialog', { name: /update jamie/i })
    const nameInput = within(dialog).getByLabelText('Name')
    const emailInput = within(dialog).getByLabelText('Email')
    await user.clear(nameInput)
    await user.type(nameInput, 'Jamie Updated')
    await user.clear(emailInput)
    await user.type(emailInput, 'jamie.new@example.com')
    await user.click(within(dialog).getByRole('button', { name: /save parent/i }))

    expect(await screen.findByText('Jamie Updated')).toBeInTheDocument()
    expect(screen.getByText('jamie.new@example.com')).toBeInTheDocument()
  })

  it('deletes a parent after typing the email', async () => {
    const user = userEvent.setup()
    render(<AdminParentsPage onSignOut={() => undefined} />)

    const jamieRow = (await screen.findByText('jamie@example.com')).closest('tr')
    expect(jamieRow).toBeTruthy()
    await user.click(within(jamieRow as HTMLElement).getByRole('button', { name: 'Delete' }))

    const dialog = await screen.findByRole('dialog', { name: /delete jamie/i })
    const confirm = within(dialog).getByRole('button', { name: /delete forever/i })
    expect(confirm).toBeDisabled()

    await user.type(within(dialog).getByLabelText(/type parent email/i), 'jamie@example.com')
    expect(confirm).toBeEnabled()
    await user.click(confirm)

    await waitFor(() => {
      expect(screen.queryByText('jamie@example.com')).not.toBeInTheDocument()
    })
    expect(screen.getByText('taylor@example.com')).toBeInTheDocument()
  })
})
