import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// Platform admin ID (hardcoded)
const PLATFORM_ADMIN_ID = 'be4f0618-d666-4e13-ae8f-13c986784ff7'

// Extract user ID from token (format: token_{userId}_{timestamp} or ssb_{userId}_{timestamp})
function getUserIdFromToken(token: string): string | null {
  if (!token) return null
  const knownPrefixes = ['token_', 'ssb_']
  const matchedPrefix = knownPrefixes.find(p => token.startsWith(p))
  if (!matchedPrefix) return null
  const rest = token.slice(matchedPrefix.length)
  const lastUnderscore = rest.lastIndexOf('_')
  return lastUnderscore !== -1 ? rest.slice(0, lastUnderscore) : rest
}

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = getUserIdFromToken(token)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
    }
    
    // Skip session check for platform admin (fallback login doesn't create session)
    if (userId !== PLATFORM_ADMIN_ID) {
      const sessions = await sql`
        SELECT user_id FROM sessions WHERE token = ${token} AND expires_at > NOW()
      `
      
      if (sessions.length === 0) {
        return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })
      }
    }
    
    // Get wallet balance
    const wallets = await sql`
      SELECT balance_trx, play_balance FROM wallets WHERE user_id = ${userId}::uuid
    `
    
    if (wallets.length === 0) {
      return NextResponse.json({ 
        success: true, 
        coreTrx: 0, 
        playTrx: 0 
      })
    }
    
    return NextResponse.json({
      success: true,
      coreTrx: parseFloat(wallets[0].balance_trx) || 0,
      playTrx: parseFloat(wallets[0].play_balance) || 0,
    })
  } catch (error) {
    console.error('Wallet balance error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch balance' }, { status: 500 })
  }
}
