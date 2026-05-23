/**
 * API Client for Eight Backend (Cloud Run)
 * All data comes from the real backend - no mock data
 */

// Core API for Arena, Sessions, Rooms, etc.
const CORE_API_URL = process.env.NEXT_PUBLIC_CORE_API_URL || 'https://ssbnow-core-823579957639.us-central1.run.app'
// API Server for Auth
const API_SERVER_URL = process.env.NEXT_PUBLIC_API_SERVER_URL || 'https://api-server-823579957639.us-central1.run.app'
// Default for general requests
const CLOUD_RUN_API_URL = CORE_API_URL

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null
    // Token is stored in session storage by auth context
    return sessionStorage.getItem('accessToken')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken()
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await fetch(`${CLOUD_RUN_API_URL}${endpoint}`, {
        ...options,
        headers,
        cache: 'no-store',
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
        }
      }

      return {
        success: true,
        data,
      }
    } catch (error) {
      console.error('[API] Request error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      }
    }
  }

  // Auth - these now go to Cloud Run
  async login(credentials: { email: string; password: string }): Promise<ApiResponse<{ user: unknown; token: string }>> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: unknown; wallet: unknown }>> {
    const userRes = await this.request<{ id: string; email: string; name: string; username: string; role: string }>('/users/me')
    if (!userRes.success) return { success: false, error: userRes.error }
    
    const walletRes = await this.request<{ id: string; balance: number; currency: string }>('/wallet')
    
    return {
      success: true,
      data: {
        user: userRes.data,
        wallet: walletRes.data || null,
      }
    }
  }

  // Users
  async getUsers(params?: { role?: string; presence?: string; search?: string }): Promise<ApiResponse<{ users: unknown[] }>> {
    const searchParams = new URLSearchParams()
    if (params?.role) searchParams.set('role', params.role)
    if (params?.presence) searchParams.set('presence', params.presence)
    if (params?.search) searchParams.set('search', params.search)

    const query = searchParams.toString()
    return this.request(`/users${query ? `?${query}` : ''}`)
  }

  async getUser(id: string): Promise<ApiResponse<unknown>> {
    return this.request(`/users/${id}`)
  }

  // Wallet
  async getWallet(): Promise<ApiResponse<{ wallet: unknown; transactions: unknown[] }>> {
    const walletRes = await this.request<{ id: string; balance: number; currency: string }>('/wallet')
    if (!walletRes.success) return { success: false, error: walletRes.error }
    
    const txRes = await this.request<{ transactions: unknown[] }>('/transactions?limit=10')
    
    return {
      success: true,
      data: {
        wallet: walletRes.data,
        transactions: txRes.data?.transactions || [],
      }
    }
  }

  async sendTrx(data: {
    toUserId: string
    amount: number
    description?: string
  }): Promise<ApiResponse<{ transaction: unknown; wallet: unknown }>> {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: 'transfer',
        recipientId: data.toUserId,
        amount: data.amount,
        description: data.description || 'Transfer',
      }),
    })
  }

  async deposit(amount: number): Promise<ApiResponse<{ transaction: unknown; wallet: unknown }>> {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: 'deposit',
        amount,
        description: 'Deposit',
      }),
    })
  }

  // Transactions
  async getTransactions(params?: {
    type?: string
    limit?: number
    offset?: number
  }): Promise<ApiResponse<{ transactions: unknown[]; total: number }>> {
    const searchParams = new URLSearchParams()
    if (params?.type) searchParams.set('type', params.type)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())

    const query = searchParams.toString()
    return this.request(`/transactions${query ? `?${query}` : ''}`)
  }

  // Clients
  async getClients(params?: { status?: string }): Promise<ApiResponse<{ clients: unknown[] }>> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)

    const query = searchParams.toString()
    return this.request(`/clients${query ? `?${query}` : ''}`)
  }

  async createClient(data: { clientUserId: string; notes?: string }): Promise<ApiResponse<{ client: unknown }>> {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Sessions (Private Ground)
  async getSessions(params?: { status?: string }): Promise<ApiResponse<{ sessions: unknown[] }>> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)

    const query = searchParams.toString()
    return this.request(`/sessions${query ? `?${query}` : ''}`)
  }

  async createSession(data: {
    hostId: string
    scheduledAt: string
    duration: number
    price: number
    notes?: string
  }): Promise<ApiResponse<{ session: unknown; wallet: unknown }>> {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Rooms (Lounge)
  async getRooms(params?: { category?: string; isLive?: boolean }): Promise<ApiResponse<{ rooms: unknown[] }>> {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set('category', params.category)
    if (params?.isLive !== undefined) searchParams.set('isLive', params.isLive.toString())

    const query = searchParams.toString()
    return this.request(`/rooms${query ? `?${query}` : ''}`)
  }

  async joinRoom(roomId: string): Promise<ApiResponse<{ room: unknown; joined: boolean }>> {
    return this.request(`/rooms/${roomId}/join`, {
      method: 'POST',
    })
  }

  // Videos
  async getVideos(params?: { category?: string; isLive?: boolean; creatorId?: string }): Promise<ApiResponse<{ videos: unknown[] }>> {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set('category', params.category)
    if (params?.isLive !== undefined) searchParams.set('isLive', params.isLive.toString())
    if (params?.creatorId) searchParams.set('creatorId', params.creatorId)

    const query = searchParams.toString()
    return this.request(`/videos${query ? `?${query}` : ''}`)
  }

  async tipVideo(videoId: string, amount: number): Promise<ApiResponse<{ video: unknown; transaction: unknown }>> {
    return this.request(`/videos/${videoId}/tip`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    })
  }

  // Arena - uses local Vercel API routes (connected to Neon)
  async getArenaMatches(params?: { status?: string; category?: string; limit?: number }): Promise<ApiResponse<{ matches: unknown[] }>> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.category) searchParams.set('category', params.category)
    if (params?.limit) searchParams.set('limit', params.limit.toString())

    const query = searchParams.toString()
    try {
      const response = await fetch(`/api/arena/matches${query ? `?${query}` : ''}`, {
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to fetch matches' }
      }
      return { success: true, data: { matches: data.matches || [] } }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  async createArenaMatch(data: {
    title: string
    description?: string
    entryFee: number
    maxParticipants: number
    category: string
    startsAt: string
    hostId: string
  }): Promise<ApiResponse<{ match: unknown }>> {
    try {
      const response = await fetch('/api/arena/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to create match' }
      }
      return { success: true, data: { match: result.match } }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  async joinArenaMatch(matchId: string, userId: string): Promise<ApiResponse<{ match: unknown; wallet: unknown; transaction: unknown }>> {
    try {
      const response = await fetch(`/api/arena/matches/${matchId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const result = await response.json()
      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to join match' }
      }
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  async startArenaMatch(matchId: string, userId: string): Promise<ApiResponse<{ match: unknown }>> {
    try {
      const response = await fetch(`/api/arena/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', userId }),
      })
      const result = await response.json()
      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to start match' }
      }
      return { success: true, data: { match: result.match } }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  async endArenaMatch(matchId: string, userId: string, winnerId: string): Promise<ApiResponse<{ match: unknown }>> {
    try {
      const response = await fetch(`/api/arena/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', userId, winnerId }),
      })
      const result = await response.json()
      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to end match' }
      }
      return { success: true, data: { match: result.match } }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  // Marketplace
  async getMarketplaceListings(params?: { category?: string; status?: string; search?: string }): Promise<ApiResponse<{ listings: unknown[] }>> {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set('category', params.category)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.search) searchParams.set('search', params.search)

    const query = searchParams.toString()
    return this.request(`/marketplace${query ? `?${query}` : ''}`)
  }

  async createMarketplaceListing(data: {
    title: string
    description: string
    price: number
    category: string
    imageUrl?: string
  }): Promise<ApiResponse<{ listing: unknown }>> {
    return this.request('/marketplace', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async purchaseMarketplaceListing(listingId: string): Promise<ApiResponse<{ listing: unknown; wallet: unknown; transaction: unknown }>> {
    return this.request(`/marketplace/${listingId}/purchase`, {
      method: 'POST',
    })
  }

  // Earnings
  async getEarnings(params?: { category?: string; period?: string }): Promise<ApiResponse<{ earnings: unknown[]; byCategory: Record<string, number>; total: number }>> {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set('category', params.category)
    if (params?.period) searchParams.set('period', params.period)

    const query = searchParams.toString()
    return this.request(`/earnings${query ? `?${query}` : ''}`)
  }

  // Campaigns (Fund Wall)
  async getCampaigns(params?: { status?: string; creatorId?: string }): Promise<ApiResponse<{ campaigns: unknown[] }>> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.creatorId) searchParams.set('creatorId', params.creatorId)

    const query = searchParams.toString()
    return this.request(`/campaigns${query ? `?${query}` : ''}`)
  }

  async createCampaign(data: {
    title: string
    description: string
    goalAmount: number
    imageUrl?: string
    endsAt: string
  }): Promise<ApiResponse<{ campaign: unknown }>> {
    return this.request('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async contributeToCampaign(campaignId: string, amount: number): Promise<ApiResponse<{ campaign: unknown; wallet: unknown; transaction: unknown }>> {
    return this.request(`/campaigns/${campaignId}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    })
  }

  // Admin - Wallet Sweep
  async sweepToCompanyWallet(data?: { walletIds?: string[]; minBalance?: number }): Promise<ApiResponse<{ sweep: unknown }>> {
    return this.request('/admin/sweep', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    })
  }

  async getSweepHistory(params?: { limit?: number }): Promise<ApiResponse<{ sweeps: unknown[]; total: number }>> {
    const query = params?.limit ? `?limit=${params.limit}` : ''
    return this.request(`/admin/sweep/history${query}`)
  }

  // System
  async getSystemStats(): Promise<ApiResponse<{
    totalUsers: number
    onlineUsers: number
    totalWalletBalance: number
    systemBalance: number
    totalTransactions: number
    activeRooms: number
    activeMatches: number
    activeListings: number
    activeCampaigns: number
  }>> {
    return this.request('/system/stats')
  }
}

export const api = new ApiClient()
export default api
