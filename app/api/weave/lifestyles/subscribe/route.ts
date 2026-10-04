import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { ensureWeaveLifestyleSchema, getWeaveLifestyleMonthlyPrice } from '@/lib/weave-lifestyle'

const round = (value: number) => Math.round(value * 1e8) / 1e8

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const monthlyPrice = getWeaveLifestyleMonthlyPrice()
  if (!(monthlyPrice > 0)) {
    return NextResponse.json({ error: 'Subscribed WEAVE monthly price has not been configured yet' }, { status: 503 })
  }

  await ensureWeaveLifestyleSchema()
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const wallet = await client.query(
      'SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE',
      [user.id]
    )
    const before = Number(wallet.rows[0]?.balance_trx || 0)
    if (before < monthlyPrice) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Insufficient Flame Coin balance', required: monthlyPrice, available: before }, { status: 400 })
    }

    const existing = await client.query(
      'SELECT expires_at FROM weave_lifestyle_subscriptions WHERE user_id=$1::uuid FOR UPDATE',
      [user.id]
    )
    const currentExpiry = existing.rows[0]?.expires_at ? new Date(existing.rows[0].expires_at) : null
    const base = currentExpiry && currentExpiry.getTime() > Date.now() ? currentExpiry : new Date()
    const nextExpiry = new Date(base.getTime())
    nextExpiry.setUTCDate(nextExpiry.getUTCDate() + 30)

    const after = round(before - monthlyPrice)
    await client.query(
      'UPDATE wallets SET balance_trx=$1,updated_at=NOW() WHERE user_id=$2::uuid AND is_primary=true',
      [after, user.id]
    )
    await client.query(
      `INSERT INTO weave_lifestyle_subscriptions (user_id,status,expires_at,created_at,updated_at)
       VALUES ($1::uuid,'active',$2,NOW(),NOW())
       ON CONFLICT (user_id) DO UPDATE SET status='active',expires_at=EXCLUDED.expires_at,updated_at=NOW()`,
      [user.id, nextExpiry.toISOString()]
    )
    await client.query(
      `INSERT INTO ledger_entries (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,created_at,metadata)
       VALUES (gen_random_uuid(),$1::uuid,'fee',$2,'Flame Coin','Subscribed WEAVE monthly access',$3,$4,NOW(),jsonb_build_object('commerce_type','weave_lifestyle_subscription','expires_at',$5))`,
      [user.id, -monthlyPrice, before, after, nextExpiry.toISOString()]
    )
    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      monthlyPrice,
      currency: 'Flame Coin',
      access: { active: true, status: 'active', expiresAt: nextExpiry.toISOString() },
    })
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('Subscribed WEAVE activation failed:', error)
    return NextResponse.json({ error: 'Failed to activate Subscribed WEAVE access' }, { status: 500 })
  } finally {
    client.release()
  }
}
