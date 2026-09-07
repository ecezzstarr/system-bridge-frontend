'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const TOKEN_KEY = 'ssb_auth_token'
const USER_KEY = 'ssb_auth_user'
const LOOP_ONE_AGREEMENT_PATH = '/loop-one/agreement'

interface User {
  id: string
  email: string
  username: string
  name: string
  role?: 'agent' | 'bridger' | 'admin'
  wallet_balance?: number
  wallet_address?: string
  personal_wallet_address?: string
  platform_wallet_balance?: number
  escrow_balance?: number
  assigned_by_admin?: boolean
  departmental_code?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  register: (data: { email: string; password: string; name: string; username: string; role: 'agent' | 'bridger'; department: string; referredBy?: string }) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function saveToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token)
}

function saveUser(user: User) {
  if (typeof window !== 'undefined') localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
}

function getUser(): User | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(USER_KEY)
    if (stored) {
      try { return JSON.parse(stored) } catch { return null }
    }
  }
  return null
}

function clearAuth() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }
}

async function requireLoopOneAgreement(user: User, token: string | null) {
  if (!token || !['agent', 'bridger'].includes(user.role || '')) return true
  if (typeof window === 'undefined' || window.location.pathname === LOOP_ONE_AGREEMENT_PATH) return true

  try {
    const response = await fetch('/api/loop-one/agreement', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return false
    const data = await response.json()
    if (data.required && !data.signed) {
      window.location.replace(LOOP_ONE_AGREEMENT_PATH)
      return false
    }
    return true
  } catch {
    // Fail closed for Loop One: do not allow role activation when agreement status cannot be verified.
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getUser())
  const [token, setToken] = useState<string | null>(() => getToken())
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!(getToken() && getUser()))

  useEffect(() => {
    const existingToken = getToken()
    const existingUser = getUser()
    if (existingToken && existingUser) {
      setToken(existingToken)
      setUser(existingUser)
      setIsAuthenticated(true)
      void requireLoopOneAgreement(existingUser, existingToken)
    } else {
      setIsAuthenticated(false)
    }
  }, [])

  const register = async (data: { email: string; password: string; name: string; username: string; role: 'agent' | 'bridger'; department: string; referredBy?: string }) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          username: data.username,
          role: data.role,
          department: data.department,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Registration failed')

      if (result.token && result.user) {
        const userData: User = result.user
        saveToken(result.token)
        saveUser(userData)
        setToken(result.token)
        setUser(userData)
        setIsAuthenticated(true)
        if (userData.role === 'agent' || userData.role === 'bridger') {
          window.location.href = LOOP_ONE_AGREEMENT_PATH
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Login failed')

      if (!result.token || !result.user) throw new Error('Login failed')

      const userData: User = {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        name: result.user.name,
        role: result.user.role as 'agent' | 'bridger' | 'admin',
        platform_wallet_balance: result.user.platform_wallet_balance || 0,
        escrow_balance: result.user.escrow_balance || 0,
        departmental_code: result.user.departmental_code,
        wallet_address: result.user.wallet_address,
      }

      saveToken(result.token)
      saveUser(userData)
      setToken(result.token)
      setUser(userData)
      setIsAuthenticated(true)

      if (userData.role === 'agent' || userData.role === 'bridger') {
        const allowed = await requireLoopOneAgreement(userData, result.token)
        if (!allowed) return
      }
    } catch (error) {
      setIsLoading(false)
      throw error
    }
    setIsLoading(false)
  }

  const logout = () => {
    clearAuth()
    setToken(null)
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
