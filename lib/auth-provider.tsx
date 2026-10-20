'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

// Local storage keys
const TOKEN_KEY = 'ssb_auth_token'
const USER_KEY = 'ssb_auth_user'

export type WeaveAuthError = Error & { code?: string; recovery?: string }

interface User {
  id: string
  email: string
  username: string
  name: string
  avatar?: string
  role?: 'agent' | 'bridger' | 'admin' | 'client'
  gender?: 'male' | 'female'
  wallet_balance?: number
  wallet_address?: string
  personal_wallet_address?: string
  platform_wallet_balance?: number
  escrow_balance?: number
  assigned_by_admin?: boolean
  departmental_code?: string
  subscription_status?: 'active' | 'due' | 'suspended'
  terms_accepted_at?: string | null
  terms_accepted_version?: number
  business_name?: string
  referred_by?: string
  referral_code?: string
  file_number?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  register: (data: { 
    email: string; 
    password: string; 
    name: string; 
    gender: 'male' | 'female';
    username: string; 
    role: 'agent' | 'bridger'; 
    department: string; 
    referredBy?: string;
    termsAccepted: boolean;
    fullNameConfirmed: string;
    departmentalCode?: string;
  }) => Promise<void>
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  setSession: (token: string, user: User) => void
  updateBalance: (newBalance: number) => void
  isInitialized: boolean
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const existingToken = getToken()
    const existingUser = getUser()
    if (existingToken && existingUser) {
      setToken(existingToken)
      setUser(existingUser)
      setIsAuthenticated(true)
    }
    setIsInitialized(true)
  }, [])

  const register = async (data: { 
    email: string; password: string; name: string; gender: 'male' | 'female'; username: string; role: 'agent' | 'bridger'; department: string;
    referredBy?: string; termsAccepted: boolean; fullNameConfirmed: string; departmentalCode?: string;
  }) => {
    setIsLoading(true)
    try {
      const response = await fetchWithTimeout('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          gender: data.gender,
          username: data.username,
          role: data.role,
          department: data.department,
          termsAccepted: data.termsAccepted,
          fullNameConfirmed: data.fullNameConfirmed,
          referredByBridgerId: data.referredBy,
          departmentalCode: data.departmentalCode,
        }),
      }, 60000)
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Registration failed')
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

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await fetchWithTimeout('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (!response.ok) {
        const authError = new Error(result.error || 'Login failed') as WeaveAuthError
        authError.code = result.code
        authError.recovery = result.recovery
        throw authError
      }

      if (result.token && result.user) {
        const userData: User = {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          name: result.user.name,
          role: result.user.role as 'agent' | 'bridger' | 'admin' | 'client',
          platform_wallet_balance: result.user.platform_wallet_balance || 0,
          escrow_balance: result.user.escrow_balance || 0,
          departmental_code: result.user.departmental_code,
          referral_code: result.user.referral_code,
          wallet_address: result.user.wallet_address,
          subscription_status: result.user.subscription_status,
          terms_accepted_at: result.user.terms_accepted_at || null,
          terms_accepted_version: result.user.terms_accepted_version || 0,
        }

        saveToken(result.token)
        saveUser(userData)
        setToken(result.token)
        setUser(userData)
        setIsAuthenticated(true)
        return userData
      }
      throw new Error('Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    clearAuth()
    setToken(null)
    setUser(null)
    setIsAuthenticated(false)
  }

  const setSession = (newToken: string, newUser: User) => {
    saveToken(newToken)
    saveUser(newUser)
    setToken(newToken)
    setUser(newUser)
    setIsAuthenticated(true)
  }

  const updateBalance = (newBalance: number) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, platform_wallet_balance: newBalance }
      saveUser(updated)
      return updated
    })
  }

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, isAuthenticated, isInitialized, register, login, logout, setSession, updateBalance,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
