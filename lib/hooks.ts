'use client'

import useSWR from 'swr'
import { api } from './api'

// Current User & Wallet
export function useCurrentUser() {
  return useSWR('currentUser', async () => {
    const res = await api.getCurrentUser()
    if (!res.success) throw new Error(res.error)
    return res.data
  })
}

export function useWallet() {
  return useSWR('wallet', async () => {
    const res = await api.getWallet()
    if (!res.success) throw new Error(res.error)
    return res.data
  })
}

// Users
export function useUsers(params?: { role?: string; presence?: string }) {
  return useSWR(['users', params], async () => {
    const res = await api.getUsers(params)
    if (!res.success) throw new Error(res.error)
    return res.data
  })
}

// Clients
export function useClients(params?: { status?: string }) {
  return useSWR(['clients', params], async () => {
    const res = await api.getClients(params)
    if (!res.success) throw new Error(res.error)
    return res.data
  })
}

// Sessions (Private Ground)
export function useSessions(params?: { status?: string }) {
  return useSWR(['sessions', params], async () => {
    const res = await api.getSessions(params)
    if (!res.success) throw new Error(res.error)
    return res.data
  })
}

// Rooms (Lounge)
export function useRooms(params?: { category?: string; isLive?: boolean }) {
  return useSWR(['rooms', params], async () => {
    const res = await api.getRooms(params)
    if (!res.success) throw new Error(res.error)
    return res.data
  })
}

// Videos
export function useVideos(params?: { category?: string; isLive?: boolean }) {
  return useSWR(['videos', params], async () => {
    const res = await api.getVideos(params)
    if (!res.success) throw new Error(res.error)
    return res.data
  })
}

// Arena
export function useArenaMatches(params?: { status?: string; category?: string }) {
  return useSWR(['arenaMatches', params], async () => {
    const res = await api.getArenaMatches(params)
    if (!res.success) throw new Error(res.error)
    return res.data
  })
}

// Marketplace
export function useMarketplace(params?: { category?: string; status?: string }) {
  return useSWR(['marketplace', params], async () => {
    const res = await api.getMarketplaceListings(params)
    if (!res.success) throw new Error(res.error)
    return res.data
  })
}

// Earnings
export function useEarnings(params?: { category?: string; period?: string }) {
  return useSWR(['earnings', params], async () => {
    const res = await api.getEarnings(params)
    if (!res.success) throw new Error(res.error)
    return res.data
  })
}

// Campaigns (Fund Wall)
export function useCampaigns(params?: { status?: string }) {
  return useSWR(['campaigns', params], async () => {
    const res = await api.getCampaigns(params)
    if (!res.success) throw new Error(res.error)
    return res.data
  })
}

// System Stats
export function useSystemStats() {
  return useSWR('systemStats', async () => {
    const res = await api.getSystemStats()
    if (!res.success) throw new Error(res.error)
    return res.data
  })
}

// Public Profiles (used by profiles page)
export function usePublicProfiles(params?: { limit?: number; search?: string }) {
  return useSWR(['publicProfiles', params], async () => {
    const res = await api.getUsers(params as { search?: string })
    if (!res.success) throw new Error(res.error)
    // Transform users into profile format
    const profiles = res.data?.users.map(user => ({
      id: user.id,
      userId: user.id,
      user: user,
      bio: `${user.role} member of the community`,
      location: 'Global',
      website: null,
    })) || []
    return { data: params?.limit ? profiles.slice(0, params.limit) : profiles }
  })
}

// Video Feed (used by video-feed page)
export function useVideoFeed(params?: { live?: boolean; limit?: number }) {
  return useSWR(['videoFeed', params], async () => {
    const res = await api.getVideos({ isLive: params?.live })
    if (!res.success) throw new Error(res.error)
    const videos = res.data?.videos || []
    return { data: params?.limit ? videos.slice(0, params.limit) : videos }
  })
}

// Private Sessions (used by private-ground page)
export function usePrivateSessions(params?: { status?: string }) {
  return useSWR(['privateSessions', params], async () => {
    const res = await api.getSessions(params)
    if (!res.success) throw new Error(res.error)
    return res.data
  })
}

// Marketplace Items (used by marketplace page)
export function useMarketplaceItems(params?: { category?: string; status?: string; search?: string }) {
  return useSWR(['marketplaceItems', params], async () => {
    const res = await api.getMarketplaceListings(params)
    if (!res.success) throw new Error(res.error)
    return res.data
  })
}

// Lounge Rooms (used by lounge page)
export function useLoungeRooms(params?: { category?: string; isLive?: boolean }) {
  return useSWR(['loungeRooms', params], async () => {
    const res = await api.getRooms(params)
    if (!res.success) throw new Error(res.error)
    return res.data
  })
}

// Fund Wall Entries (used by fund-wall page)
export function useFundWallEntries(params?: { status?: string }) {
  return useSWR(['fundWallEntries', params], async () => {
    const res = await api.getCampaigns(params)
    if (!res.success) throw new Error(res.error)
    return res.data
  })
}

// Earnings Summary (used by earnings page)
export function useEarningsSummary(params?: { period?: string }) {
  return useSWR(['earningsSummary', params], async () => {
    const res = await api.getEarnings(params)
    if (!res.success) throw new Error(res.error)
    return {
      byCategory: res.data?.byCategory || {},
      total: res.data?.total || 0,
    }
  })
}

// Earnings History (used by earnings page)
export function useEarningsHistory(params?: { category?: string; period?: string }) {
  return useSWR(['earningsHistory', params], async () => {
    const res = await api.getEarnings(params)
    if (!res.success) throw new Error(res.error)
    return res.data?.earnings || []
  })
}
