"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { SessionProvider } from 'next-auth/react'

interface User {
  id: string
  email: string
  name: string
  username: string
  role: string
  avatar?: string
}

interface Wallet {
  id: string
  balance: number
  currency: string
}

interface AuthContextType {
  user: User | null
  wallet: Wallet | null
  isLoading: boolean
  isAuthenticated: boolean
  accessToken: string | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  loginWithGoogle: () => Promise<void>
  register: (data: { username: string; password: string; name: string; departmentalCode: string }) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshWallet: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function AuthContextProvider({ children }: { children: ReactNode }) {
  const { data: session, status, update: updateSession } = useSession()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [walletLoading, setWalletLoading] = useState(false)

  const isLoading = status === 'loading'
  const isAuthenticated = !!session?.user
  const user = session?.user as User | null
  const accessToken: string | null = null // Not used with NextAuth JWT strategy

  // Fetch wallet when authenticated
  const refreshWallet = useCallback(async () => {
    if (!isAuthenticated) return
    
    setWalletLoading(true)
    try {
      const response = await fetch('/api/wallet')
      const result = await response.json()
      if (result.success && result.data) {
        setWallet({
          id: result.data.id || 'default',
          balance: result.data.balance || 0,
          currency: result.data.currency || 'TRX',
        })
      }
    } catch (error) {
      console.error('[Auth] Failed to fetch wallet:', error)
    } finally {
      setWalletLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      refreshWallet()
    } else {
      setWallet(null)
    }
  }, [isAuthenticated, refreshWallet])

  const login = async (username: string, password: string) => {
    try {
      console.log('[v0] Attempting login for username:', username)
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      console.log('[v0] SignIn result:', result?.ok ? 'success' : 'failed', result?.error)

      if (result?.error) {
        // Map NextAuth error codes to user-friendly messages
        let errorMessage = result.error
        if (result.error === 'CredentialsSignin' || result.error === 'credentialssignin') {
          errorMessage = 'Invalid username or password'
        } else if (result.error === 'Callback') {
          errorMessage = 'There was an error processing your login. Please try again.'
        }
        console.error('[v0] Login error:', errorMessage)
        return { success: false, error: errorMessage }
      }

      if (result?.ok) {
        console.log('[v0] Login successful, updating session...')
        // Force session update to reflect new login
        await updateSession()
        console.log('[v0] Session updated')
        return { success: true }
      }

      return { success: false, error: 'Login failed' }
    } catch (error) {
      console.error('[v0] Login error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' }
    }
  }

  const loginWithGoogle = async () => {
    await signIn('google', { callbackUrl: '/dashboard' })
  }

  const register = async (data: { username: string; password: string; name: string; departmentalCode: string }) => {
    try {
      // Call local API to register
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        return { success: false, error: result.error || 'Registration failed' }
      }

      // Auto login after registration
      return login(data.username, data.password)
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Registration failed' }
    }
  }

  const logout = async () => {
    console.log('[v0] Logging out user...')
    try {
      await signOut({ callbackUrl: '/login' })
      setWallet(null)
      console.log('[v0] Logout successful')
    } catch (error) {
      console.error('[v0] Logout error:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        isLoading: isLoading || walletLoading,
        isAuthenticated,
        accessToken,
        login,
        loginWithGoogle,
        register,
        logout,
        refreshWallet,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <AuthContextProvider>{children}</AuthContextProvider>
    </SessionProvider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
