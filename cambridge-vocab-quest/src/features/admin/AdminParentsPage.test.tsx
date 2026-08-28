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

    URL.createObjectURL = vi.fn(() => 'blob:backup')
    URL.revokeObjectURL = vi.fn()

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method?.toUpperCase() ?? 'GET'
      if (url.includes('/api/admin/backup') && method === 'GET') {
        return new Response(JSON.stringify({ format: 'cvq-backup', version: 1, includes: ['database'] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('/api/admin/backup') && method === 'PUT') {
        return new Response(JSON.stringify({
          ok: true,
          restored: ['database'],
          users: 2,
          learners: 2,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
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

  it('downloads a store-only backup when vocabulary is unchecked', async () => {
    const user = userEvent.setup()
    render(<AdminParentsPage onSignOut={() => undefined} />)
    await screen.findByRole('heading', { name: /parent accounts/i })

    await user.click(screen.getByRole('checkbox', { name: 'Include vocabulary edits' }))
    await user.click(screen.getByRole('button', { name: /download backup/i }))

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls.map(([input, init]) => ({
        url: String(input),
        method: init?.method?.toUpperCase() ?? 'GET',
      }))
      expect(calls.some((call) => call.method === 'GET' && call.url.includes('/api/admin/backup?database=1') && !call.url.includes('vocabulary='))).toBe(true)
    })
  })

  it('restores a store-only file after typing RESTORE', async () => {
    const user = userEvent.setup()
    render(<AdminParentsPage onSignOut={() => undefined} />)
    await screen.findByRole('heading', { name: /parent accounts/i })

    const file = new File([JSON.stringify({
      format: 'cvq-backup',
      version: 1,
      exportedAt: '2026-08-28T00:00:00.000Z',
      includes: ['database'],
      database: { version: 2, users: [] },
    })], 'cvq-backup-database.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText('Choose backup file'), file)

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Restore runtime data' })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Restore vocabulary edits' })).toBeDisabled()
    })

    await user.click(screen.getByRole('button', { name: /restore from file/i }))
    const dialog = await screen.findByRole('dialog', { name: /restore this backup/i })
    const confirm = within(dialog).getByRole('button', { name: /restore now/i })
    expect(confirm).toBeDisabled()
    expect(within(dialog).getByText(/vocabulary files stay as they are/i)).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText(/type restore to confirm/i), 'RESTORE')
    expect(confirm).toBeEnabled()
    await user.click(confirm)

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/restored runtime data/i)
    })
    const put = vi.mocked(fetch).mock.calls.find(([input, init]) => (
      String(input).includes('/api/admin/backup?database=1') && init?.method?.toUpperCase() === 'PUT'
    ))
    expect(put).toBeTruthy()
  })
})
