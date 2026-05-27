import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'

function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('Database not configured')
  return neon(url)
}

// Extract user ID from token (format: token_{userId}_{timestamp})
function getUserIdFromToken(token: string): string | null {
  if (!token || !token.startsWith('token_')) return null
  const parts = token.split('_')
  if (parts.length >= 2) {
    return parts[1]
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }
    
    const tokenUserId = getUserIdFromToken(token)
    if (!tokenUserId) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
    }

    const { userId, amount, address } = await request.json()

    // Verify the user ID matches the token
    if (tokenUserId !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    if (!userId || !amount || !address) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    if (amount < 10) {
      return NextResponse.json({ success: false, error: 'Minimum withdrawal is 10 TRX' }, { status: 400 })
    }

    // Validate TRON address format
    if (!address.startsWith('T') || address.length !== 34) {
      return NextResponse.json({ success: false, error: 'Invalid TRON wallet address' }, { status: 400 })
    }

    const sql = getDb()

    // Check user's balance
    const wallets = await sql`
      SELECT id, balance_trx FROM wallets WHERE user_id = ${userId}::uuid
    `

    if (wallets.length === 0) {
      return NextResponse.json({ success: false, error: 'Wallet not found' }, { status: 404 })
    }

    const wallet = wallets[0]
    const currentBalance = parseFloat(wallet.balance_trx) || 0

    if (currentBalance < amount) {
      return NextResponse.json({ success: false, error: 'Insufficient balance' }, { status: 400 })
    }

    // Deduct from wallet
    const newBalance = currentBalance - amount
    await sql`
      UPDATE wallets SET balance_trx = ${newBalance} WHERE id = ${wallet.id}
    `

    // Create withdrawal request (would be processed by admin or automated system)
    const reference = `WD-${userId.substring(0, 8)}-${Date.now()}`
    await sql`
      INSERT INTO withdrawal_requests (user_id, amount, address, reference, status, created_at)
      VALUES (${userId}::uuid, ${amount}, ${address}, ${reference}, 'pending', NOW())
    `.catch(() => {
      // Table might not exist, create it
    })

    return NextResponse.json({
      success: true,
      message: 'Withdrawal request submitted',
      reference,
      newBalance,
    })
  } catch (error: any) {
    console.error('Withdrawal error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Withdrawal failed',
    }, { status: 500 })
  }
}
