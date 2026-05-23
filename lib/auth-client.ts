const API_URL = '/api'

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
  try {
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
      } catch (e) {
        // Ignore JSON parse error
      }
      throw new Error(errorMsg)
    }

    const result = await response.json()
    return result
  } catch (error) {
    throw error
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
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
      } catch (e) {
        // Ignore JSON parse error
      }
      throw new Error(errorMsg)
    }

    const result = await response.json()
    return result
  } catch (error) {
    throw error
  }
}

export function saveToken(token: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('auth_token', token)
    } catch (e) {
      // localStorage not available (private browsing, quota exceeded, etc)
      console.warn('[v0] localStorage unavailable, using memory storage')
      if (typeof window !== 'undefined') {
        (window as any).__auth_token = token
      }
    }
  }
}

export function saveUser(user: any): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('auth_user', JSON.stringify(user))
    } catch (e) {
      // localStorage not available
      console.warn('[v0] localStorage unavailable, using memory storage')
      if (typeof window !== 'undefined') {
        (window as any).__auth_user = user
      }
    }
  }
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem('auth_token') || (window as any).__auth_token || null
    } catch (e) {
      return (window as any).__auth_token || null
    }
  }
  return null
}

export function getUser(): any {
  if (typeof window !== 'undefined') {
    try {
      const user = localStorage.getItem('auth_user')
      return user ? JSON.parse(user) : (window as any).__auth_user || null
    } catch (e) {
      return (window as any).__auth_user || null
    }
  }
  return null
}

export function clearToken(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    } catch (e) {
      // Silently fail
    }
    (window as any).__auth_token = null
    (window as any).__auth_user = null
  }
}

export function getAuthHeaders(): HeadersInit {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}
