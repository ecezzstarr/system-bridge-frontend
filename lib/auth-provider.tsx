"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { clearToken, getToken, getUser, login as loginRequest, register as registerRequest, saveToken, saveUser } from './auth-client'

interface User {
  id: string
  email: string
  name: string
  username: string
  role: string
  avatar?: string
  wallet_address?: string
  platform_wallet_balance?: number
  escrow_balance?: number
  departmental_code?: string
  assigned_by_admin?: boolean
}

interface Wallet {
  id: string
  balance: number
  currency: string
}

interface AuthContextType {
  user: User | null
  wallet: Wallet | null
  token: string | null
  accessToken: string | null
  loading: boolean
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  loginWithGoogle: () => Promise<void>
  register: (data: {
    username: string
    password: string
    name: string
    departmentalCode?: string
    department?: string
    email?: string
    role?: 'agent' | 'bridger'
    referredBy?: string
  }) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshWallet: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isAuthenticated = Boolean(user && token)

  useEffect(() => {
    setUser(getUser())
    setToken(getToken())
    setIsLoading(false)
  }, [])

  const refreshWallet = useCallback(async () => {
    const currentToken = getToken()
    if (!currentToken) {
      setWallet(null)
      return
    }

    try {
      const response = await fetch('/api/wallet', {
        headers: { Authorization: `****** },
      })
      const result = await response.json()

      if (response.ok && result?.success && result.data) {
        setWallet({
          id: result.data.id || 'default',
          balance: result.data.balance || 0,
          currency: result.data.currency || 'TRX',
        })
      }
    } catch (error) {
      console.error('[Auth] Failed to fetch wallet:', error)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setWallet(null)
      return
    }

    void refreshWallet()
  }, [isAuthenticated, refreshWallet])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await loginRequest(email, password)
      if (!result.token || !result.user) {
        return { success: false, error: 'Login failed' }
      }

      const nextUser = result.user as User
      saveToken(result.token)
      saveUser(nextUser)
      setToken(result.token)
      setUser(nextUser)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }
    }
  }, [])

  const register = useCallback(
    async (    data: {
      username: string
      password: string
      name: string
      departmentalCode?: string
      department?: string
      email?: string
      role?: 'agent' | 'bridger'
      referredBy?: string
    }) => {
      try {
        const result = await registerRequest({
          email: (data.email || '').trim(),
          password: data.password,
          name: data.name,
          username: data.username,
          role: data.role || 'agent',
          department: data.departmentalCode || data.department || '',
        })

        if (!result.token || !result.user) {
          return { success: false, error: 'Registration failed' }
        }

        const nextUser = result.user as User
        saveToken(result.token)
        saveUser(nextUser)
        setToken(result.token)
        setUser(nextUser)

        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Registration failed',
        }
      }
    },
    []
  )

  const logout = useCallback(async () => {
    clearToken()
    setToken(null)
    setUser(null)
    setWallet(null)
  }, [])

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      wallet,
      token,
      accessToken: token,
      loading: isLoading,
      isLoading,
      isAuthenticated,
      login,
      loginWithGoogle: async () => {
        throw new Error('Google sign-in is not configured for this environment')
      },
      register,
      logout,
      refreshWallet,
    }),
    [isAuthenticated, isLoading, login, logout, refreshWallet, register, token, user, wallet]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
