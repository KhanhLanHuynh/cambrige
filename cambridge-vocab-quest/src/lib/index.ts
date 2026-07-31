import { getCached, queueMutation, setCached } from '../db'

export { pickRandomSentence } from './sentences'
export { speakAnswerFeedback } from './sounds'

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown }

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = options.method?.toUpperCase() ?? 'GET'
  const cacheKey = `${method}:${path}`
  const init: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  }

  try {
    const response = await fetch(`/api${path}`, init)
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null
      throw new ApiError(payload?.error ?? `Request failed (${response.status})`, response.status)
    }
    const result = response.status === 204 ? undefined : await response.json()
    if (method === 'GET') await setCached(cacheKey, result)
    return result as T
  } catch (error) {
    // Never mask auth/permission failures with stale cache — only fall back when offline/network fails.
    if (error instanceof ApiError) throw error
    if (method === 'GET') {
      const cached = await getCached<T>(cacheKey)
      if (cached !== undefined) return cached
    } else if (!navigator.onLine && (path.startsWith('/settings') || path.startsWith('/curriculum/'))) {
      await queueMutation({ url: path, method, body: options.body, createdAt: Date.now() })
      return undefined as T
    }
    throw error
  }
}

export function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return
  const columns = Object.keys(rows[0])
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  const csv = [columns.join(','), ...rows.map((row) => columns.map((key) => escape(row[key])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function downloadFromApi(path: string, filename: string) {
  const response = await fetch(`/api${path}`, { credentials: 'include' })
  if (!response.ok) throw new ApiError(`Download failed (${response.status})`, response.status)
  const url = URL.createObjectURL(await response.blob())
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
