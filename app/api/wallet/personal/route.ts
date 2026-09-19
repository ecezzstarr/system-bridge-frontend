import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/auth-client'
import { updatePersonalWalletAddress, getUserById } from '@/lib/mock-db'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '') || getToken()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { wallet_address } = await request.json()

    if (!wallet_address) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    // Validate TRON address format (starts with T)
    if (!wallet_address.startsWith('T')) {
      return NextResponse.json({ error: 'Invalid TRON address format' }, { status: 400 })
    }

    // In a real app, you'd extract the user ID from the token
    // For now, we'll store in the session/token
    const userId = 'user_demo' // This would be extracted from token

    const success = updatePersonalWalletAddress(userId, wallet_address)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Personal wallet address saved',
        wallet_address,
      })
    } else {
      return NextResponse.json({ error: 'Failed to save wallet address' }, { status: 500 })
    }
  } catch (error) {
    console.error('[v0] Error saving wallet:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
