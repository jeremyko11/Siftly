import { getSiftlyUrl, getSiftlyToken } from './storage'

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = await getSiftlyUrl()
  const token = await getSiftlyToken()
  if (!baseUrl) throw new Error('Siftly URL not configured')

  const url = `${baseUrl.replace(/\/$/, '')}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Cookie'] = `session=${token}`
  }

  return fetch(url, { ...options, headers })
}

export interface AuthStatus {
  authenticated: boolean
}

export async function checkAuth(): Promise<boolean> {
  try {
    const res = await apiFetch('/api/auth/status')
    const data = await res.json() as AuthStatus
    return data.authenticated === true
  } catch {
    return false
  }
}

export async function login(password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
    if (res.ok) return { ok: true }
    const data = await res.json() as { error?: string }
    return { ok: false, error: data.error || 'Login failed' }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
