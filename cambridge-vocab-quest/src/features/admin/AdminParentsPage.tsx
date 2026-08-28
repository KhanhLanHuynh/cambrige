import { Download, LogOut, Search, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Badge, Button, Logo } from '../../components/ui'
import { api, ApiError, downloadFromApi } from '../../lib'
import { useSessionStore } from '../../stores'

export interface AdminParent {
  id: string
  name: string
  email: string
  createdAt: string
  learnerCount: number
}

type BackupScopes = { database: boolean; vocabulary: boolean }

function formatDate(value: string) {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function backupQuery(scopes: BackupScopes) {
  const params = new URLSearchParams()
  if (scopes.database) params.set('database', '1')
  if (scopes.vocabulary) params.set('vocabulary', '1')
  return `/admin/backup?${params.toString()}`
}

function backupDownloadName(scopes: BackupScopes) {
  const day = new Date().toISOString().slice(0, 10)
  if (scopes.database && scopes.vocabulary) return `cvq-backup-${day}.json`
  if (scopes.database) return `cvq-backup-database-${day}.json`
  return `cvq-backup-vocabulary-${day}.json`
}

function inspectBackup(value: unknown): BackupScopes | null {
  if (!value || typeof value !== 'object') return null
  const record = value as { format?: unknown; includes?: unknown; database?: unknown; vocabulary?: unknown }
  if (record.format !== 'cvq-backup') return null
  const includes = Array.isArray(record.includes)
    ? record.includes.filter((item): item is string => typeof item === 'string')
    : []
  const database = includes.includes('database') || record.database != null
  const vocabulary = includes.includes('vocabulary') || record.vocabulary != null
  if (!database && !vocabulary) return null
  return { database, vocabulary }
}

function restoreWarning(scopes: BackupScopes) {
  if (scopes.database && scopes.vocabulary) {
    return 'This replaces all accounts, progress, and vocabulary files.'
  }
  if (scopes.database) {
    return 'This replaces all accounts and progress. Vocabulary files stay as they are.'
  }
  return 'This replaces vocabulary files. Accounts and progress stay as they are.'
}

function formatRestoreResult(result: { restored: string[]; users?: number; learners?: number; words?: number }) {
  const parts: string[] = []
  if (result.restored.includes('database')) {
    const users = result.users ?? 0
    const learners = result.learners ?? 0
    parts.push(`runtime data (${users} account${users === 1 ? '' : 's'}, ${learners} learner${learners === 1 ? '' : 's'})`)
  }
  if (result.restored.includes('vocabulary')) {
    const words = result.words
    parts.push(words == null ? 'vocabulary' : `vocabulary (${words} words)`)
  }
  if (parts.length === 0) return 'Restore complete.'
  return `Restored ${parts.join(' and ')}.`
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
  const [exportScopes, setExportScopes] = useState<BackupScopes>({ database: true, vocabulary: true })
  const [exportError, setExportError] = useState('')
  const [exportBusy, setExportBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const [restoreFile, setRestoreFile] = useState<{ name: string; payload: unknown; available: BackupScopes } | null>(null)
  const [restoreScopes, setRestoreScopes] = useState<BackupScopes>({ database: false, vocabulary: false })
  const [restoreError, setRestoreError] = useState('')
  const [restoreSuccess, setRestoreSuccess] = useState('')
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [confirmRestoreText, setConfirmRestoreText] = useState('')

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

  const downloadBackup = async () => {
    if (!exportScopes.database && !exportScopes.vocabulary) return
    setExportBusy(true)
    setExportError('')
    try {
      await downloadFromApi(backupQuery(exportScopes), backupDownloadName(exportScopes))
    } catch (error) {
      setExportError(error instanceof ApiError ? error.message : 'Could not download backup')
    } finally {
      setExportBusy(false)
    }
  }

  const onPickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setRestoreError('')
    setRestoreSuccess('')
    try {
      const parsed = JSON.parse(await file.text()) as unknown
      const available = inspectBackup(parsed)
      if (!available) {
        setRestoreFile(null)
        setRestoreError('Not a valid Cambridge Vocab Quest backup')
        return
      }
      setRestoreFile({ name: file.name, payload: parsed, available })
      setRestoreScopes({ ...available })
    } catch {
      setRestoreFile(null)
      setRestoreError('Could not read that backup file')
    }
  }

  const openRestoreConfirm = () => {
    if (!restoreFile || (!restoreScopes.database && !restoreScopes.vocabulary)) return
    setConfirmRestoreText('')
    setRestoreError('')
    setConfirmRestore(true)
  }

  const runRestore = async () => {
    if (!restoreFile || (!restoreScopes.database && !restoreScopes.vocabulary)) return
    if (confirmRestoreText.trim().toUpperCase() !== 'RESTORE') {
      setRestoreError('Type RESTORE to confirm')
      return
    }
    setRestoreBusy(true)
    setRestoreError('')
    try {
      const result = await api<{ ok: true; restored: string[]; users?: number; learners?: number; words?: number }>(
        backupQuery(restoreScopes),
        { method: 'PUT', body: restoreFile.payload },
      )
      setConfirmRestore(false)
      setConfirmRestoreText('')
      setRestoreSuccess(formatRestoreResult(result))
      if (restoreScopes.database) await loadParents()
    } catch (error) {
      setRestoreError(error instanceof ApiError ? error.message : 'Could not restore backup')
    } finally {
      setRestoreBusy(false)
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

        <section className="admin-backup card">
          <Badge>BACKUP</Badge>
          <h2>Export and restore</h2>
          <p>
            Download a backup before each Render deploy. Free instances wipe data on redeploy and idle spin-down
            unless a paid disk is attached.
          </p>
          <div className="admin-backup-grid">
            <div className="admin-backup-panel">
              <h3>Download backup</h3>
              <div className="admin-backup-scopes">
                <label>
                  <input
                    type="checkbox"
                    checked={exportScopes.database}
                    aria-label="Include runtime data"
                    onChange={(event) => setExportScopes((current) => ({ ...current, database: event.target.checked }))}
                  />
                  <span>Runtime data (accounts, learners, progress)</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={exportScopes.vocabulary}
                    aria-label="Include vocabulary edits"
                    onChange={(event) => setExportScopes((current) => ({ ...current, vocabulary: event.target.checked }))}
                  />
                  <span>Vocabulary edits</span>
                </label>
              </div>
              {exportScopes.database && (
                <p className="admin-backup-note">Runtime backups contain password hashes. Store the file privately.</p>
              )}
              {exportError && <div className="form-error" role="alert">{exportError}</div>}
              <Button
                type="button"
                variant="secondary"
                disabled={exportBusy || (!exportScopes.database && !exportScopes.vocabulary)}
                onClick={() => void downloadBackup()}
              >
                <Download /> {exportBusy ? 'Downloading…' : 'Download backup'}
              </Button>
            </div>
            <div className="admin-backup-panel">
              <h3>Restore from file</h3>
              <input
                ref={fileInput}
                className="admin-backup-file"
                type="file"
                accept="application/json,.json"
                aria-label="Choose backup file"
                onChange={(event) => void onPickFile(event)}
              />
              <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>
                <Upload /> Choose backup file
              </Button>
              {restoreFile && <p className="admin-backup-note">Selected: {restoreFile.name}</p>}
              <div className="admin-backup-scopes">
                <label>
                  <input
                    type="checkbox"
                    checked={restoreScopes.database}
                    disabled={!restoreFile?.available.database}
                    aria-label="Restore runtime data"
                    onChange={(event) => setRestoreScopes((current) => ({ ...current, database: event.target.checked }))}
                  />
                  <span>Runtime data (accounts, learners, progress)</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={restoreScopes.vocabulary}
                    disabled={!restoreFile?.available.vocabulary}
                    aria-label="Restore vocabulary edits"
                    onChange={(event) => setRestoreScopes((current) => ({ ...current, vocabulary: event.target.checked }))}
                  />
                  <span>Vocabulary edits</span>
                </label>
              </div>
              {restoreError && !confirmRestore && <div className="form-error" role="alert">{restoreError}</div>}
              {restoreSuccess && <p className="admin-backup-success" role="status">{restoreSuccess}</p>}
              <Button
                type="button"
                disabled={!restoreFile || restoreBusy || (!restoreScopes.database && !restoreScopes.vocabulary)}
                onClick={openRestoreConfirm}
              >
                Restore from file
              </Button>
            </div>
          </div>
        </section>

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

      {confirmRestore && (
        <div className="modal-backdrop" role="presentation" onClick={() => !restoreBusy && setConfirmRestore(false)}>
          <section
            className="modal settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-backup-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setConfirmRestore(false)}>
              <X />
            </button>
            <Badge tone="rose">RESTORE BACKUP</Badge>
            <h2 id="restore-backup-title">Restore this backup?</h2>
            <p>
              {restoreWarning(restoreScopes)} This cannot be undone. Type <b>RESTORE</b> to confirm.
            </p>
            <div className="delete-learner-confirm">
              <input
                aria-label="Type RESTORE to confirm"
                value={confirmRestoreText}
                placeholder="RESTORE"
                autoFocus
                onChange={(event) => setConfirmRestoreText(event.target.value)}
              />
              {restoreError && <div className="form-error" role="alert">{restoreError}</div>}
              <div className="gift-editor-actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={restoreBusy}
                  onClick={() => {
                    setConfirmRestore(false)
                    setConfirmRestoreText('')
                    setRestoreError('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={restoreBusy || confirmRestoreText.trim().toUpperCase() !== 'RESTORE'}
                  onClick={() => void runRestore()}
                >
                  {restoreBusy ? 'Restoring…' : 'Restore now'}
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
