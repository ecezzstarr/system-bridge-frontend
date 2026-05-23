/**
 * Client Auth Utility - Works on mobile and desktop
 * Uses cookies as primary storage (works in all browsers)
 * Falls back to localStorage/memory for compatibility
 */

interface ClientUser {
  id: string
  email: string
  phone: string
  name: string
  business_name: string
  role?: 'admin' | 'client'
}

// Cookie helpers
function setCookie(name: string, value: string, days: number = 7) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift()
    return cookieValue ? decodeURIComponent(cookieValue) : null
  }
  return null
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

// Client auth functions
export function saveClientToken(token: string) {
  setCookie('client_token', token)
  try {
    localStorage.setItem('client_token', token)
  } catch {
    // Ignore localStorage errors
  }
}

export function getClientToken(): string | null {
  // Try cookie first (most reliable on mobile)
  const cookieToken = getCookie('client_token')
  if (cookieToken) return cookieToken
  
  // Fallback to localStorage
  try {
    return localStorage.getItem('client_token')
  } catch {
    return null
  }
}

export function saveClientUser(user: ClientUser) {
  const userStr = JSON.stringify(user)
  setCookie('client_user', userStr)
  try {
    localStorage.setItem('client_user', userStr)
  } catch {
    // Ignore localStorage errors
  }
}

export function getClientUser(): ClientUser | null {
  // Try cookie first
  const cookieUser = getCookie('client_user')
  if (cookieUser) {
    try {
      return JSON.parse(cookieUser)
    } catch {
      // Invalid JSON
    }
  }
  
  // Fallback to localStorage
  try {
    const localUser = localStorage.getItem('client_user')
    if (localUser) return JSON.parse(localUser)
  } catch {
    // Ignore errors
  }
  
  return null
}

export function clearClientAuth() {
  deleteCookie('client_token')
  deleteCookie('client_user')
  try {
    localStorage.removeItem('client_token')
    localStorage.removeItem('client_user')
  } catch {
    // Ignore errors
  }
}

export function isClientAuthenticated(): boolean {
  return !!getClientToken() && !!getClientUser()
}
