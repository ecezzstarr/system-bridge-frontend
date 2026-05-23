// System Switch Bridge - Routes authenticated users to appropriate engine
// Based on user role and context, routes to Arena, Marketplace, or Role engine

import { getSql } from './db'

const CLOUD_RUN_BASE_URL = process.env.GOOGLE_CLOUD_RUN_URL || 'https://ssbnow-backend.run.app'

interface UserContext {
  userId: string
  username: string
  role: string
  walletAddress?: string
}

interface EngineRoute {
  engine: 'arena' | 'marketplace' | 'role' | 'dashboard'
  url: string
  context: UserContext
}

// Determine which engine to route user to
export async function getEngineRoute(userId: string): Promise<EngineRoute> {
  try {
    const sql = getSql()
    console.log('[v0] Getting engine route for user:', userId)
    
    // Get user details
    const userResult = await sql`
      SELECT id, username, role, tron_wallet_address FROM users 
      WHERE id = ${userId}::uuid AND is_active = true
    `
    
    if (!userResult || userResult.length === 0) {
      throw new Error('User not found')
    }
    
    const user = userResult[0]
    const context: UserContext = {
      userId: user.id,
      username: user.username,
      role: user.role,
      walletAddress: user.tron_wallet_address,
    }
    
    // Route based on user role and status
    let engine: 'arena' | 'marketplace' | 'role' | 'dashboard' = 'dashboard'
    
    if (user.role === 'admin') {
      engine = 'dashboard'
    } else if (user.role === 'bridger') {
      engine = 'role' // Bridger goes to role management
    } else if (user.role === 'agent') {
      engine = 'marketplace' // Agent can access marketplace
    } else {
      engine = 'arena' // Default user starts in arena
    }
    
    console.log('[v0] Routing to engine:', engine)
    
    return {
      engine,
      url: `${CLOUD_RUN_BASE_URL}/api/engine/${engine}`,
      context,
    }
  } catch (error) {
    console.error('[v0] Error getting engine route:', error)
    throw error
  }
}

// Call external engine API
export async function callEngineAPI(
  engine: 'arena' | 'marketplace' | 'role',
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
) {
  try {
    console.log('[v0] Calling engine API:', engine, endpoint)
    
    const url = `${CLOUD_RUN_BASE_URL}/api/engine/${engine}${endpoint}`
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.CLOUD_RUN_API_KEY || '',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Engine API error: ${response.status} - ${error}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('[v0] Engine API error:', error)
    throw error
  }
}

// Get active matches from Arena
export async function getArenaMatches(userId: string) {
  return callEngineAPI('arena', `/matches?userId=${userId}`)
}

// Get marketplace listings
export async function getMarketplaceListings(filter?: string) {
  return callEngineAPI('marketplace', `/listings${filter ? `?filter=${filter}` : ''}`)
}

// Get user roles/status
export async function getUserRoles(userId: string) {
  return callEngineAPI('role', `/roles?userId=${userId}`)
}

export { CLOUD_RUN_BASE_URL }
