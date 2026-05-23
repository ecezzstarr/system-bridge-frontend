'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Local storage keys
const TOKEN_KEY = 'ssb_auth_token'
const USER_KEY = 'ssb_auth_user'

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

// Helper functions for local storage
function saveToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

function saveUser(user: User) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY)
  }
  return null
}

function getUser(): User | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(USER_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return null
      }
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

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage immediately (not in useEffect)
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      return getUser()
    }
    return null
  })
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return getToken()
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!(getToken() && getUser())
    }
    return false
  })

  // Sync state on mount (for SSR hydration)
  useEffect(() => {
    const existingToken = getToken()
    const existingUser = getUser()
    
    if (existingToken && existingUser) {
      setToken(existingToken)
      setUser(existingUser)
      setIsAuthenticated(true)
    } else {
      setIsAuthenticated(false)
    }
  }, [])

  // Register - uses local API connected to Neon database
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

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed')
      }

      // Save auth data
      if (result.token && result.user) {
        saveToken(result.token)
        saveUser(result.user)
        setToken(result.token)
        setUser(result.user)
        setIsAuthenticated(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Login - uses local API connected to Neon database
  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Login failed')
      }

      if (result.token && result.user) {
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
      } else {
        throw new Error('Login failed')
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
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isLoading, 
      isAuthenticated, 
      register, 
      login, 
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
