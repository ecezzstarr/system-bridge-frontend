/**
 * Cloud Run API Client
 * Connects to the backend services running on Google Cloud Run
 */

// API Server - Auth & User Hub
const API_SERVER_URL = process.env.NEXT_PUBLIC_API_SERVER_URL || 'https://api-server-823579957639.us-central1.run.app'
// Core API - Business Logic
const CORE_API_URL = process.env.NEXT_PUBLIC_CORE_API_URL || 'https://ssbnow-core-823579957639.us-central1.run.app'
// Shop API - E-commerce
const SHOP_API_URL = process.env.NEXT_PUBLIC_SHOP_API_URL || 'https://ssbnowshop-823579957639.us-central1.run.app'

// Default to API Server for auth operations
const CLOUD_RUN_API_URL = API_SERVER_URL

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: Record<string, unknown>
  token?: string
}

/**
 * Make authenticated request to Cloud Run backend
 */
async function cloudRunFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, token } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Add authorization token if provided (from user session)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${CLOUD_RUN_API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('[CloudRun] API Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error connecting to backend',
    }
  }
}

// ============================================
// Authentication Endpoints
// ============================================

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  username?: string
  role?: 'agent' | 'bridger'
  departmental_code?: string
}

export interface AuthResponse {
  user: {
    id: string
    email: string
    name: string
    username: string
    role: string
    avatar?: string
    platform_wallet_balance?: number
    escrow_balance?: number
    departmental_code?: string
  }
  token: string
  refreshToken?: string
}

export async function login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
  return cloudRunFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: credentials,
  })
}

export async function register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
  return cloudRunFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: data,
  })
}

export async function googleAuth(idToken: string): Promise<ApiResponse<AuthResponse>> {
  return cloudRunFetch<AuthResponse>('/auth/google', {
    method: 'POST',
    body: { idToken },
  })
}

export async function refreshToken(token: string): Promise<ApiResponse<AuthResponse>> {
  return cloudRunFetch<AuthResponse>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: token },
  })
}

export async function logout(token: string): Promise<ApiResponse<void>> {
  return cloudRunFetch<void>('/auth/logout', {
    method: 'POST',
    token,
  })
}

// ============================================
// User Endpoints
// ============================================

export interface User {
  id: string
  email: string
  name: string
  username: string
  role: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

export async function getCurrentUser(token: string): Promise<ApiResponse<User>> {
  return cloudRunFetch<User>('/users/me', { token })
}

export async function getUsers(token: string, params?: { search?: string; limit?: number }): Promise<ApiResponse<{ users: User[]; total: number }>> {
  const query = new URLSearchParams()
  if (params?.search) query.set('search', params.search)
  if (params?.limit) query.set('limit', params.limit.toString())
  const queryString = query.toString()
  return cloudRunFetch<{ users: User[]; total: number }>(`/users${queryString ? `?${queryString}` : ''}`, { token })
}

export async function getUserById(token: string, userId: string): Promise<ApiResponse<User>> {
  return cloudRunFetch<User>(`/users/${userId}`, { token })
}

export async function updateUser(token: string, userId: string, data: Partial<User>): Promise<ApiResponse<User>> {
  return cloudRunFetch<User>(`/users/${userId}`, {
    method: 'PUT',
    body: data,
    token,
  })
}

// ============================================
// Wallet Endpoints
// ============================================

export interface Wallet {
  id: string
  userId: string
  balance: number
  currency: string
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  walletId: string
  type: 'credit' | 'debit' | 'transfer' | 'sweep'
  amount: number
  currency: string
  description: string
  status: 'pending' | 'completed' | 'failed'
  reference?: string
  createdAt: string
}

export async function getWallet(token: string): Promise<ApiResponse<Wallet>> {
  return cloudRunFetch<Wallet>('/wallet', { token })
}

export async function getWalletBalance(token: string): Promise<ApiResponse<{ balance: number; currency: string }>> {
  return cloudRunFetch<{ balance: number; currency: string }>('/wallet/balance', { token })
}

export async function getTransactions(
  token: string,
  params?: { limit?: number; offset?: number; type?: string }
): Promise<ApiResponse<{ transactions: Transaction[]; total: number }>> {
  const query = new URLSearchParams()
  if (params?.limit) query.set('limit', params.limit.toString())
  if (params?.offset) query.set('offset', params.offset.toString())
  if (params?.type) query.set('type', params.type)
  const queryString = query.toString()
  return cloudRunFetch<{ transactions: Transaction[]; total: number }>(`/transactions${queryString ? `?${queryString}` : ''}`, { token })
}

export async function createTransaction(
  token: string,
  data: { type: string; amount: number; description: string; recipientId?: string }
): Promise<ApiResponse<Transaction>> {
  return cloudRunFetch<Transaction>('/transactions', {
    method: 'POST',
    body: data,
    token,
  })
}

// ============================================
// Admin Endpoints (Wallet Sweep)
// ============================================

export interface SweepResult {
  id: string
  totalAmount: number
  transactionCount: number
  status: 'completed' | 'partial' | 'failed'
  companyWalletId: string
  createdAt: string
}

export async function sweepToCompanyWallet(
  token: string,
  data?: { walletIds?: string[]; minBalance?: number }
): Promise<ApiResponse<SweepResult>> {
  return cloudRunFetch<SweepResult>('/admin/sweep', {
    method: 'POST',
    body: data || {},
    token,
  })
}

export async function getSweepHistory(
  token: string,
  params?: { limit?: number }
): Promise<ApiResponse<{ sweeps: SweepResult[]; total: number }>> {
  const query = params?.limit ? `?limit=${params.limit}` : ''
  return cloudRunFetch<{ sweeps: SweepResult[]; total: number }>(`/admin/sweep/history${query}`, { token })
}

// ============================================
// Health Check
// ============================================

export async function healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
  return cloudRunFetch<{ status: string; timestamp: string }>('/health')
}

// Export the client
export const cloudRunClient = {
  // Auth
  login,
  register,
  googleAuth,
  refreshToken,
  logout,
  // Users
  getCurrentUser,
  getUsers,
  getUserById,
  updateUser,
  // Wallet
  getWallet,
  getWalletBalance,
  getTransactions,
  createTransaction,
  // Admin
  sweepToCompanyWallet,
  getSweepHistory,
  // Health
  healthCheck,
}

export default cloudRunClient
