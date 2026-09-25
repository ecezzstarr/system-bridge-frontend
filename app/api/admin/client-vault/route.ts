import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { ensureClientVaultLedgerSchema } from '@/lib/client-vault-ledger'
import { ensureAllClientMoneyEnvironments } from '@/lib/client-money-environment'

export async function GET(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response

  const sql = neon(process.env.DATABASE_URL!)
  await ensureClientVaultLedgerSchema(sql)
  await ensureAllClientMoneyEnvironments(sql)

  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  const search = `%${q}%`

  const clients = q
    ? await sql`
        SELECT
          c.id,
          c.name,
          c.email,
          c.file_number,
          COALESCE(v.balance,0) AS vault_balance,
          'Flame Coin' AS currency,
          COALESCE(sf.balance_flame_coin,0) AS sibling_flame_coin,
          COALESCE(sf.balance_trx,0) AS sibling_trx,
          COALESCE(sf.balance_usdt,0) AS sibling_usdt,
          COALESCE(w.balance_trx,0) AS main_flame_coin,
          COALESCE(w.balance_usdt,0) AS main_usdt
        FROM users c
        LEFT JOIN client_vaults v ON v.client_id=c.id
        LEFT JOIN client_sibling_funds_wallets sf ON sf.client_id=c.id
        LEFT JOIN wallets w ON w.user_id=c.id AND w.is_primary=true
        WHERE c.role='client'
          AND (
            c.name ILIKE ${search}
            OR c.email ILIKE ${search}
            OR c.file_number ILIKE ${search}
          )
        ORDER BY c.created_at DESC
        LIMIT 100
      `
    : await sql`
        SELECT
          c.id,
          c.name,
          c.email,
          c.file_number,
          COALESCE(v.balance,0) AS vault_balance,
          'Flame Coin' AS currency,
          COALESCE(sf.balance_flame_coin,0) AS sibling_flame_coin,
          COALESCE(sf.balance_trx,0) AS sibling_trx,
          COALESCE(sf.balance_usdt,0) AS sibling_usdt,
          COALESCE(w.balance_trx,0) AS main_flame_coin,
          COALESCE(w.balance_usdt,0) AS main_usdt
        FROM users c
        LEFT JOIN client_vaults v ON v.client_id=c.id
        LEFT JOIN client_sibling_funds_wallets sf ON sf.client_id=c.id
        LEFT JOIN wallets w ON w.user_id=c.id AND w.is_primary=true
        WHERE c.role='client'
        ORDER BY c.created_at DESC
        LIMIT 100
      `

  const withdrawals = await sql`
    SELECT
      w.id,
      w.client_id,
      w.amount,
      w.currency,
      w.destination,
      w.status,
      w.requested_at,
      w.reviewed_at,
      w.processed_at,
      c.name AS client_name,
      c.file_number
    FROM client_vault_withdrawals w
    JOIN users c ON c.id=w.client_id
    WHERE c.role='client'
    ORDER BY w.requested_at DESC
    LIMIT 100
  `

  return NextResponse.json({ clients, withdrawals }, { headers: { 'Cache-Control': 'private, no-store' } })
}
