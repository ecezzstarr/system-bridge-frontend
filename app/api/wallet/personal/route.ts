import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { neon } from '@/lib/pg-neon'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { wallet_address } = await request.json()
    if (!wallet_address || typeof wallet_address !== 'string') return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(wallet_address.trim())) return NextResponse.json({ error: 'Invalid TRON address format' }, { status: 400 })

    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || '')
    const [user] = await sql`
      UPDATE users SET tron_wallet_address=${wallet_address.trim()}, updated_at=NOW()
      WHERE id=${userId}::uuid RETURNING id, tron_wallet_address
    `
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({ success: true, message: 'Personal wallet address saved', wallet_address: user.tron_wallet_address })
  } catch (error) {
    console.error('Error saving wallet address', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
