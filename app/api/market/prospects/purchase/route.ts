import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { creditBridgerActivityCommission } from '@/lib/bridger-commission-router'
import { ensureMarketTables } from '@/lib/market'
import { getWeaveBridgeOrigin } from '@/lib/weave-origin'
import { issueWeaveReceipt } from '@/lib/weave-receipts'

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = authUser.id

  let packageId: string
  try {
    const body = await request.json()
    packageId = body.packageId
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!packageId) {
    return NextResponse.json({ error: 'packageId required' }, { status: 400 })
  }

  await ensureMarketTables()

  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Verify active Bridger status
    const bridgerResult = await client.query(
      `SELECT status FROM bridger_profiles WHERE user_id = $1::uuid`,
      [userId]
    )
    const bridger = bridgerResult.rows[0]
    if (!bridger || bridger.status !== 'active') {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Only active Bridgers can purchase prospect packages' }, { status: 403 })
    }

    // 2. Lock the package row (meaningful now, inside a real transaction)
    const pkgResult = await client.query(
      `SELECT * FROM market_prospect_packages WHERE id = $1::uuid AND status = 'published' FOR UPDATE`,
      [packageId]
    )
    const pkg = pkgResult.rows[0]
    if (!pkg) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Package not available' }, { status: 404 })
    }
    const priceTrx = Number(pkg.price_trx)

    // 3. Lock wallet row and check balance
    const walletResult = await client.query(
      `SELECT balance_trx FROM wallets WHERE user_id = $1::uuid AND is_primary = true FOR UPDATE`,
      [userId]
    )
    const wallet = walletResult.rows[0]
    if (!wallet) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    const currentBalance = Number(wallet.balance_trx) || 0
    if (currentBalance < priceTrx) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Insufficient Flame Coin balance', currentBalance, required: priceTrx }, { status: 400 })
    }

    // 4. Deduct Flame Coin
    const newBalance = currentBalance - priceTrx
    await client.query(
      `UPDATE wallets SET balance_trx = $1, updated_at = NOW() WHERE user_id = $2::uuid AND is_primary = true`,
      [newBalance, userId]
    )

    // 5. Ledger entry
    await client.query(
      `INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, balance_before, balance_after, created_at)
       VALUES (gen_random_uuid(), $1::uuid, 'prospect_package_purchase', $2, 'Flame Coin', $3, $4, $5, NOW())`,
      [userId, priceTrx, `Purchased prospect package ${packageId}`, currentBalance, newBalance]
    )

    // 6. Mark package sold + assign to this Bridger
    const soldResult = await client.query(
      `UPDATE market_prospect_packages
       SET status = 'sold', purchased_by = $1::uuid, purchased_at = NOW(), updated_at = NOW()
       WHERE id = $2::uuid
       RETURNING *`,
      [userId, packageId]
    )

    // 7. Audit trail
    await client.query(
      `INSERT INTO market_prospect_audit (package_id, actor_id, action, details)
       VALUES ($1::uuid, $2::uuid, 'purchased', $3::jsonb)`,
      [packageId, userId, JSON.stringify({ priceTrx })]
    )

    // 8. Fetch the contacts in this package
    const contactsResult = await client.query(
      `SELECT * FROM market_prospect_contacts WHERE package_id = $1::uuid`,
      [packageId]
    )

      const bridgeUrlBase = getWeaveBridgeOrigin()

    // 9. Find Bridger's active Bridge AI
    const bridgeResult = await client.query(
      `SELECT id, bridge_code FROM bridge_ais WHERE bridger_id = $1::uuid AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    )
    const bridgeAi = bridgeResult.rows[0]

    // 10. Create Outreach records
    for (const contact of contactsResult.rows) {
      const outreachId = crypto.randomUUID()
      const message = bridgeAi 
        ? `Hello, I'm connecting you with Bridge AI from Weave. You can continue here: ${bridgeUrlBase}/bridge/${bridgeAi.bridge_code}?pid=${outreachId}`
        : `Hello, I'm connecting you with Bridge AI from Weave. You can continue here: ${bridgeUrlBase}/bridge/default`

      await client.query(
        `INSERT INTO market_prospect_outreach (id, contact_id, bridger_id, bridge_ai_id, status, message_sent)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'pending', $5)`,
        [outreachId, contact.id, userId, bridgeAi?.id || null, message]
      )
    }

    await client.query('COMMIT')

    // 11. Trigger fulfillment reconciliation (re-package available prospects)
    import('@/lib/fulfillment-agent').then(({ fulfillmentAgent }) => {
      fulfillmentAgent.reconcile().catch(err => console.error('[market purchase] reconcile error:', err))
    })

    creditBridgerActivityCommission({
      bridgerId: userId,
      activity: 'prospect_package_purchase',
      baseAmount: priceTrx,
      description: `30% commission: Bridger purchased a ${priceTrx} Flame Coin prospect package`,
    }).catch(err => console.error('[market purchase] commission error:', err))

    const receipt = await issueWeaveReceipt({
      userId,
      kind: 'purchase',
      source: 'prospect_package',
      sourceId: String(packageId),
      amount: priceTrx,
      currency: 'Flame Coin',
      status: 'completed',
      description: 'Bridger prospect package purchase',
      metadata: { packageId, contactCount: contactsResult.rows.length, balanceAfter: newBalance },
    })
    return NextResponse.json({
      success: true,
      package: soldResult.rows[0],
      contacts: contactsResult.rows,
      newBalance,
      receipt,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[Market Prospects Purchase] Error:', error)
    return NextResponse.json({ error: 'Purchase failed' }, { status: 500 })
  } finally {
    client.release()
  }
}
