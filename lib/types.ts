// User Roles
export type UserRole = 'admin' | 'client' | 'bridger' | 'agent'

// Wealth Tiers based on TRX balance
export type WealthTierType = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

// Presence Status
export type PresenceStatus = 'online' | 'away' | 'offline' | 'busy'

// Transaction Types
export type TransactionType = 
  | 'deposit' 
  | 'withdrawal' 
  | 'transfer' 
  | 'tip' 
  | 'gift' 
  | 'payment' 
  | 'refund'
  | 'earning'
  | 'fee'

// Transaction Status
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

// User
export interface User {
  id: string
  email: string
  displayName: string
  avatar?: string
  role: UserRole
  presence: PresenceStatus
  createdAt: string
  updatedAt: string
}

// Wallet
export interface Wallet {
  id: string
  userId: string
  balance: number
  lockedBalance: number
  tier: WealthTierType
  createdAt: string
  updatedAt: string
}

// Transaction
export interface Transaction {
  id: string
  walletId: string
  type: TransactionType
  amount: number
  fee: number
  status: TransactionStatus
  description?: string
  fromUserId?: string
  toUserId?: string
  fromUser?: User
  toUser?: User
  createdAt: string
  completedAt?: string
}

// Client (for Bridgers/Agents)
export interface Client {
  id: string
  userId: string
  user: User
  assignedTo?: string
  assignedUser?: User
  status: 'active' | 'inactive' | 'pending'
  notes?: string
  createdAt: string
  updatedAt: string
}

// Profile
export interface Profile {
  id: string
  userId: string
  user: User
  bio?: string
  location?: string
  website?: string
  socialLinks?: Record<string, string>
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

// Private Ground Session
export interface PrivateSession {
  id: string
  hostId: string
  host: User
  guestId: string
  guest: User
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  scheduledAt: string
  startedAt?: string
  endedAt?: string
  rate: number
  totalAmount?: number
  createdAt: string
}

// Lounge Room
export interface LoungeRoom {
  id: string
  name: string
  description?: string
  hostId: string
  host: User
  participants: User[]
  maxParticipants: number
  isPrivate: boolean
  entryFee: number
  status: 'open' | 'full' | 'closed'
  createdAt: string
}

// Video Feed Item
export interface VideoFeedItem {
  id: string
  userId: string
  user: User
  title: string
  description?: string
  thumbnailUrl?: string
  videoUrl: string
  duration: number
  views: number
  likes: number
  tips: number
  isLive: boolean
  createdAt: string
}

// Arena Match
export interface ArenaMatch {
  id: string
  title: string
  description?: string
  hostId: string
  host: User
  participants: User[]
  maxParticipants: number
  entryFee: number
  prizePool: number
  status: 'upcoming' | 'live' | 'completed' | 'cancelled'
  scheduledAt: string
  startedAt?: string
  endedAt?: string
  winnerId?: string
  winner?: User
  createdAt: string
}

// Marketplace Item
export interface MarketplaceItem {
  id: string
  sellerId: string
  seller: User
  title: string
  description: string
  price: number
  category: string
  images: string[]
  status: 'available' | 'sold' | 'reserved' | 'removed'
  createdAt: string
  updatedAt: string
}

// Earnings Summary
export interface EarningsSummary {
  totalEarnings: number
  pendingEarnings: number
  withdrawnEarnings: number
  thisWeek: number
  thisMonth: number
  byType: Record<string, number>
}

// Fund Wall Entry
export interface FundWallEntry {
  id: string
  userId: string
  user: User
  targetAmount: number
  currentAmount: number
  title: string
  description: string
  deadline?: string
  contributors: { user: User; amount: number }[]
  status: 'active' | 'completed' | 'expired'
  createdAt: string
}

// System Stats
export interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalTransactions: number
  totalVolume: number
  systemBalance: number
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
