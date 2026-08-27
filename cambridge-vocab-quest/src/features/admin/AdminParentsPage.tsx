import { LogOut, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Badge, Button, Logo } from '../../components/ui'
import { api, ApiError } from '../../lib'
import { useSessionStore } from '../../stores'

export interface AdminParent {
  id: string
  name: string
  email: string
  createdAt: string
  learnerCount: number
}

function formatDate(value: string) {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function AdminParentsPage({ onSignOut }: { onSignOut: () => void }) {
  const user = useSessionStore((state) => state.user)
  const [parents, setParents] = useState<AdminParent[]>([])
  const [query, setQuery] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminParent | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editError, setEditError] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<AdminParent | null>(null)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadParents = async () => {
    setLoadError('')
    try {
      const response = await api<{ parents: AdminParent[] }>('/admin/parents')
      setParents(response.parents)
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Could not load parents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadParents()
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return parents
    return parents.filter((parent) =>
      parent.name.toLowerCase().includes(needle) || parent.email.toLowerCase().includes(needle),
    )
  }, [parents, query])

  const openEdit = (parent: AdminParent) => {
    setEditing(parent)
    setEditName(parent.name)
    setEditEmail(parent.email)
    setEditError('')
  }

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editing) return
    const name = editName.trim()
    const email = editEmail.trim().toLowerCase()
    if (!name) {
      setEditError('Enter a name')
      return
    }
    if (!email) {
      setEditError('Enter an email')
      return
    }
    setEditBusy(true)
    setEditError('')
    try {
      const response = await api<{ parent: AdminParent }>(`/admin/parents/${editing.id}`, {
        method: 'PATCH',
        body: { name, email },
      })
      setParents((current) => current.map((item) => (item.id === response.parent.id ? response.parent : item)))
      setEditing(null)
    } catch (error) {
      setEditError(error instanceof ApiError ? error.message : 'Could not update parent')
    } finally {
      setEditBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    if (confirmEmail.trim().toLowerCase() !== pendingDelete.email) {
      setDeleteError('Type the parent’s email exactly to confirm')
      return
    }
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await api(`/admin/parents/${pendingDelete.id}`, { method: 'DELETE' })
      setParents((current) => current.filter((item) => item.id !== pendingDelete.id))
      setPendingDelete(null)
      setConfirmEmail('')
    } catch (error) {
      setDeleteError(error instanceof ApiError ? error.message : 'Could not delete parent')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-topbar">
        <Logo />
        <div className="admin-session">
          <span>Signed in as <strong>{user?.email}</strong></span>
          <button type="button" className="profile-sign-out" onClick={onSignOut}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>
      <main className="admin-panel">
        <Badge tone="lime">SUPER ADMIN</Badge>
        <h1>Parent accounts</h1>
        <p>Edit a household adult’s name or email, or remove the whole household.</p>
        <div className="section-heading admin-heading">
          <div>
            <h2>All parents</h2>
            <p>{parents.length} household{parents.length === 1 ? '' : 's'}</p>
          </div>
          <div className="table-actions">
            <label>
              <Search />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name or email"
                aria-label="Search parents"
              />
            </label>
          </div>
        </div>
        {loadError && <div className="form-error" role="alert">{loadError}</div>}
        <div className="table-scroll card">
          <table className="admin-parents-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Learners</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((parent) => (
                <tr key={parent.id}>
                  <td>{parent.name}</td>
                  <td>{parent.email}</td>
                  <td>{parent.learnerCount}</td>
                  <td>{formatDate(parent.createdAt)}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button type="button" className="text-link" onClick={() => openEdit(parent)}>Edit</button>
                      <button
                        type="button"
                        className="text-link danger-link"
                        onClick={() => {
                          setPendingDelete(parent)
                          setConfirmEmail('')
                          setDeleteError('')
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <p className="no-results">{parents.length === 0 ? 'No parent accounts yet.' : 'No matching parents.'}</p>
          )}
        </div>
      </main>

      {editing && (
        <div className="modal-backdrop" role="presentation" onClick={() => !editBusy && setEditing(null)}>
          <section
            className="modal settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-parent-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setEditing(null)}>
              <X />
            </button>
            <Badge>EDIT PARENT</Badge>
            <h2 id="edit-parent-title">Update {editing.name}</h2>
            <p>Changes apply to this household adult account only.</p>
            <form onSubmit={(event) => void saveEdit(event)}>
              <label>
                Name
                <input value={editName} onChange={(event) => setEditName(event.target.value)} autoComplete="name" />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  autoComplete="email"
                />
              </label>
              {editError && <div className="form-error" role="alert">{editError}</div>}
              <div className="gift-editor-actions">
                <Button type="button" variant="secondary" disabled={editBusy} onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editBusy}>{editBusy ? 'Saving…' : 'Save parent'}</Button>
              </div>
            </form>
          </section>
        </div>
      )}

      {pendingDelete && (
        <div className="modal-backdrop" role="presentation" onClick={() => !deleteBusy && setPendingDelete(null)}>
          <section
            className="modal settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-parent-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setPendingDelete(null)}>
              <X />
            </button>
            <Badge tone="rose">DELETE HOUSEHOLD</Badge>
            <h2 id="delete-parent-title">Delete {pendingDelete.name}?</h2>
            <p>
              This cannot be undone. It removes the parent, all learners, quizzes, and progress for this household.
              Type <b>{pendingDelete.email}</b> to confirm.
            </p>
            <div className="delete-learner-confirm">
              <input
                aria-label="Type parent email to confirm delete"
                value={confirmEmail}
                placeholder={pendingDelete.email}
                autoFocus
                onChange={(event) => setConfirmEmail(event.target.value)}
              />
              {deleteError && <div className="form-error" role="alert">{deleteError}</div>}
              <div className="gift-editor-actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={deleteBusy}
                  onClick={() => {
                    setPendingDelete(null)
                    setConfirmEmail('')
                    setDeleteError('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={deleteBusy || confirmEmail.trim().toLowerCase() !== pendingDelete.email}
                  onClick={() => void confirmDelete()}
                >
                  Delete forever
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
