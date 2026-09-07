const API_URL = '/api'
const TOKEN_KEYS = ['ssb_auth_token', 'auth_token'] as const
const USER_KEYS = ['ssb_auth_user', 'auth_user'] as const

interface AuthResponse {
  token?: string
  session?: string
  user: {
    id: string
    email: string
    username: string
    name: string
    role?: 'client' | 'agent' | 'bridger' | 'admin'
    wallet_balance?: number
  }
}

// Helper to get Clerk token
export async function getClerkToken(): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && (window as any).Clerk) {
      const token = await (window as any).Clerk.session?.getToken()
      return token || null
    }
  } catch (error) {
    // Silently fail - Clerk is optional
  }
  return null
}

export async function register(data: {
  email: string
  password: string
  name: string
  username: string
  role: 'agent' | 'bridger'
  department: string
}): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`
    try {
      const errorData = await response.json()
      errorMsg = errorData.message || errorData.error || errorMsg
    } catch {}
    throw new Error(errorMsg)
  }

  return response.json()
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`
    try {
      const errorData = await response.json()
      errorMsg = errorData.message || errorData.error || errorMsg
    } catch {}
    throw new Error(errorMsg)
  }

  return response.json()
}

export function saveToken(token: string): void {
  if (typeof window === 'undefined') return
  try {
    // Keep both historical keys synchronized while the app migrates to ssb_*.
    for (const key of TOKEN_KEYS) localStorage.setItem(key, token)
  } catch {
    ;(window as any).__auth_token = token
  }
}

export function saveUser(user: any): void {
  if (typeof window === 'undefined') return
  try {
    const value = JSON.stringify(user)
    for (const key of USER_KEYS) localStorage.setItem(key, value)
  } catch {
    ;(window as any).__auth_user = user
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    for (const key of TOKEN_KEYS) {
      const value = localStorage.getItem(key)
      if (value) return value
    }
  } catch {}
  return (window as any).__auth_token || null
}

export function getUser(): any {
  if (typeof window === 'undefined') return null
  try {
    for (const key of USER_KEYS) {
      const value = localStorage.getItem(key)
      if (value) return JSON.parse(value)
    }
  } catch {}
  return (window as any).__auth_user || null
}

export function clearToken(): void {
  if (typeof window === 'undefined') return
  for (const key of [...TOKEN_KEYS, ...USER_KEYS]) {
    try { localStorage.removeItem(key) } catch {}
  }
  ;(window as any).__auth_token = null
  ;(window as any).__auth_user = null
}

export function getAuthHeaders(): HeadersInit {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}
