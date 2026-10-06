import { getPool, sql } from './db'
import { ensureContinuanceTables } from './bridger-subscription'
import { ensureBridgeAiContinuanceTable } from './bridge-ai-subscription'
import { ensureEchoTables } from './echo-db'
import { issueWeaveReceipt } from './weave-receipts'
import { WORLD_RULES } from './world/constants'
import { ngnToFlameCoin } from './flame-coin'
import { getTrxPaymentNgnRate } from './trx-payment'

const BRIDGE_AI_FEE = WORLD_RULES.BRIDGE_AI_SUBSCRIPTION_FEE_FLAME_COIN
const ECHO_FEE = 7
const MONTH_MS = 30 * 24 * 60 * 60 * 1000

type SubscriptionServiceKey = 'continuance' | 'bridge_ai' | 'echo'

type SubscriptionService = {
  key: SubscriptionServiceKey
  label: string
  active: boolean
  due: boolean
  exempt?: boolean
  expiry: string | null
  amountFlameCoin: number | null
}

function activeSubscription(status: unknown, expiry: unknown) {
  if (String(status || '') !== 'active' || !expiry) return false
  return new Date(String(expiry)).getTime() > Date.now()
}

async function ensureAllTables() {
  await ensureContinuanceTables()
  await ensureBridgeAiContinuanceTable()
  await ensureEchoTables()
}

async function getRate() {
  try {
    const quote = await getTrxPaymentNgnRate()
    const rate = Number(quote.rateNgnPerTrx || 0)
    return Number.isFinite(rate) && rate > 0 ? rate : null
  } catch (error) {
    console.error('Bridger subscribe-all rate lookup failed:', error)
    return null
  }
}

export async function getBridgerSubscribeAllQuote(userId: string) {
  await ensureAllTables()
  const pool = getPool()
  const [userResult, bridgeResult, echoResult, walletResult] = await Promise.all([
    pool.query(
      `SELECT id,role,subscription_status,subscription_expiry,is_subscription_exempt
       FROM users WHERE id=$1::uuid LIMIT 1`,
      [userId],
    ),
    pool.query(
      `SELECT status,expiry FROM bridge_ai_subscriptions WHERE user_id=$1::uuid LIMIT 1`,
      [userId],
    ),
    pool.query(
      `SELECT status,expiry FROM echo_subscriptions WHERE user_id=$1::uuid LIMIT 1`,
      [userId],
    ),
    pool.query(
      `SELECT balance_trx FROM wallets
       WHERE user_id=$1::uuid AND is_primary=true
       ORDER BY created_at ASC LIMIT 1`,
      [userId],
    ),
  ])

  const user = userResult.rows[0]
  if (!user || user.role !== 'bridger') {
    return { success: false as const, reason: 'bridger_not_found' as const }
  }

  const bridge = bridgeResult.rows[0]
  const echo = echoResult.rows[0]
  const exempt = Boolean(user.is_subscription_exempt)
  const continuanceActive = exempt || activeSubscription(user.subscription_status, user.subscription_expiry)
  const bridgeActive = activeSubscription(bridge?.status, bridge?.expiry)
  const echoActive = activeSubscription(echo?.status, echo?.expiry)
  const continuanceDue = !continuanceActive && !exempt
  const rate = continuanceDue ? await getRate() : null
  const continuanceAmount = continuanceDue && rate
    ? ngnToFlameCoin(WORLD_RULES.BRIDGER_CONTINUANCE_NGN, rate)
    : continuanceDue ? null : 0

  const services: SubscriptionService[] = [
    {
      key: 'continuance',
      label: 'Bridger Continuance',
      active: continuanceActive,
      due: continuanceDue,
      exempt,
      expiry: user.subscription_expiry ? new Date(user.subscription_expiry).toISOString() : null,
      amountFlameCoin: continuanceAmount,
    },
    {
      key: 'bridge_ai',
      label: 'Bridge AI',
      active: bridgeActive,
      due: !bridgeActive,
      expiry: bridge?.expiry ? new Date(bridge.expiry).toISOString() : null,
      amountFlameCoin: bridgeActive ? 0 : BRIDGE_AI_FEE,
    },
    {
      key: 'echo',
      label: 'Echo',
      active: echoActive,
      due: !echoActive,
      expiry: echo?.expiry ? new Date(echo.expiry).toISOString() : null,
      amountFlameCoin: echoActive ? 0 : ECHO_FEE,
    },
  ]

  const quoteUnavailable = services.some(service => service.due && service.amountFlameCoin == null)
  const totalDueFlameCoin = quoteUnavailable
    ? null
    : services.reduce((sum, service) => sum + Number(service.amountFlameCoin || 0), 0)

  return {
    success: true as const,
    services,
    allActive: services.every(service => service.active || service.exempt),
    totalDueFlameCoin,
    availableFlameCoin: Number(walletResult.rows[0]?.balance_trx || 0),
    rateNgnPerFlameCoin: rate,
  }
}

export async function subscribeAllBridgerEssentials(userId: string) {
  await ensureAllTables()
  const rate = await getRate()
  const client = await getPool().connect()

  let totalDue = 0
  let balanceBefore = 0
  let balanceAfter = 0
  let activated: SubscriptionServiceKey[] = []
  let receiptSourceId = `BRIDGER-ALL-${Date.now()}`
  let serviceAmounts: Record<SubscriptionServiceKey, number> = {
    continuance: 0,
    bridge_ai: 0,
    echo: 0,
  }
  let expiries: Partial<Record<SubscriptionServiceKey, string>> = {}

  try {
    await client.query('BEGIN')

    const userResult = await client.query(
      `SELECT id,role,subscription_status,subscription_expiry,is_subscription_exempt
       FROM users WHERE id=$1::uuid FOR UPDATE`,
      [userId],
    )
    const user = userResult.rows[0]
    if (!user || user.role !== 'bridger') {
      await client.query('ROLLBACK')
      return { success: false as const, reason: 'bridger_not_found' as const }
    }

    const bridgeResult = await client.query(
      `SELECT status,expiry FROM bridge_ai_subscriptions
       WHERE user_id=$1::uuid FOR UPDATE`,
      [userId],
    )
    const echoResult = await client.query(
      `SELECT status,expiry FROM echo_subscriptions
       WHERE user_id=$1::uuid FOR UPDATE`,
      [userId],
    )

    const now = new Date()
    const exempt = Boolean(user.is_subscription_exempt)
    const continuanceCurrent = exempt || activeSubscription(user.subscription_status, user.subscription_expiry)
    const bridgeCurrent = activeSubscription(bridgeResult.rows[0]?.status, bridgeResult.rows[0]?.expiry)
    const echoCurrent = activeSubscription(echoResult.rows[0]?.status, echoResult.rows[0]?.expiry)

    if (!continuanceCurrent && !exempt) {
      if (!rate) {
        await client.query('ROLLBACK')
        return { success: false as const, reason: 'rate_unavailable' as const }
      }
      const amount = ngnToFlameCoin(WORLD_RULES.BRIDGER_CONTINUANCE_NGN, rate)
      if (!Number.isFinite(amount) || amount <= 0) {
        await client.query('ROLLBACK')
        return { success: false as const, reason: 'rate_unavailable' as const }
      }
      serviceAmounts.continuance = amount
      activated.push('continuance')
    }
    if (!bridgeCurrent) {
      serviceAmounts.bridge_ai = BRIDGE_AI_FEE
      activated.push('bridge_ai')
    }
    if (!echoCurrent) {
      serviceAmounts.echo = ECHO_FEE
      activated.push('echo')
    }

    totalDue = serviceAmounts.continuance + serviceAmounts.bridge_ai + serviceAmounts.echo

    if (totalDue <= 0) {
      if (exempt && user.subscription_status !== 'active') {
        await client.query(`UPDATE users SET subscription_status='active' WHERE id=$1::uuid`, [userId])
      }
      await client.query('COMMIT')
      return { success: true as const, renewed: false, reason: 'all_current' as const, totalDueFlameCoin: 0 }
    }

    const walletResult = await client.query(
      `SELECT id,balance_trx FROM wallets
       WHERE user_id=$1::uuid AND is_primary=true
       ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
      [userId],
    )
    const wallet = walletResult.rows[0]
    balanceBefore = Number(wallet?.balance_trx || 0)
    if (!wallet || balanceBefore < totalDue) {
      await client.query('ROLLBACK')
      return {
        success: false as const,
        reason: 'insufficient_balance' as const,
        requiredFlameCoin: totalDue,
        availableFlameCoin: balanceBefore,
        breakdown: serviceAmounts,
      }
    }

    const debitResult = await client.query(
      `UPDATE wallets
       SET balance_trx=balance_trx-$1,updated_at=NOW()
       WHERE id=$2::uuid AND balance_trx >= $1
       RETURNING balance_trx`,
      [totalDue, wallet.id],
    )
    if (debitResult.rows.length !== 1) throw new Error('Bridger subscribe-all wallet debit lost concurrency race')
    balanceAfter = Number(debitResult.rows[0].balance_trx || 0)

    const nextExpiry = new Date(now.getTime() + MONTH_MS)

    if (serviceAmounts.continuance > 0) {
      const paymentResult = await client.query(
        `INSERT INTO subscription_payments
          (user_id,amount,currency,payment_method,transaction_reference,status,period_start,period_end)
         VALUES ($1::uuid,$2,'Flame Coin','bridger_subscribe_all',$3,'success',$4,$5)
         RETURNING id`,
        [userId, serviceAmounts.continuance, receiptSourceId, now, nextExpiry],
      )
      if (paymentResult.rows[0]?.id) receiptSourceId = String(paymentResult.rows[0].id)
      await client.query(
        `UPDATE users
         SET subscription_status='active',subscription_expiry=$2,subscription_last_paid_at=$3
         WHERE id=$1::uuid`,
        [userId, nextExpiry, now],
      )
      expiries.continuance = nextExpiry.toISOString()
    } else if (exempt && user.subscription_status !== 'active') {
      await client.query(`UPDATE users SET subscription_status='active' WHERE id=$1::uuid`, [userId])
    }

    if (serviceAmounts.bridge_ai > 0) {
      await client.query(
        `INSERT INTO bridge_ai_subscriptions (user_id,status,expiry,last_paid_at)
         VALUES ($1::uuid,'active',$2,$3)
         ON CONFLICT (user_id) DO UPDATE
         SET status='active',expiry=EXCLUDED.expiry,last_paid_at=EXCLUDED.last_paid_at`,
        [userId, nextExpiry, now],
      )
      expiries.bridge_ai = nextExpiry.toISOString()
    }

    if (serviceAmounts.echo > 0) {
      await client.query(
        `INSERT INTO echo_subscriptions (user_id,status,expiry,last_paid_at)
         VALUES ($1::uuid,'active',$2,$3)
         ON CONFLICT (user_id) DO UPDATE
         SET status='active',expiry=EXCLUDED.expiry,last_paid_at=EXCLUDED.last_paid_at`,
        [userId, nextExpiry, now],
      )
      await client.query(
        `INSERT INTO echo_identities (user_id)
         VALUES ($1::uuid)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId],
      )
      expiries.echo = nextExpiry.toISOString()
    }

    await client.query(
      `INSERT INTO ledger_entries
        (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at)
       VALUES
        (gen_random_uuid(),$1::uuid,'fee',$2,'Flame Coin','Bridger Subscribe All',$3,$4,
         ($5::jsonb) || jsonb_build_object('commerce_type','subscription'),NOW())`,
      [
        userId,
        totalDue,
        balanceBefore,
        balanceAfter,
        JSON.stringify({
          source: 'bridger_subscribe_all',
          services: activated,
          breakdown: serviceAmounts,
          rate_ngn_per_flame_coin: rate,
        }),
      ],
    )

    await client.query('COMMIT')
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('Bridger subscribe-all failed:', error)
    return { success: false as const, reason: 'error' as const }
  } finally {
    client.release()
  }

  try {
    await issueWeaveReceipt({
      userId,
      kind: 'subscription',
      source: 'bridger_subscribe_all',
      sourceId: receiptSourceId,
      amount: totalDue,
      currency: 'Flame Coin',
      status: 'paid',
      description: 'Bridger essentials · Continuance + Bridge AI + Echo',
      metadata: {
        services: activated,
        breakdown: serviceAmounts,
        balanceAfter,
        rateNgnPerFlameCoin: rate,
        expiries,
      },
    })
  } catch (error) {
    console.error('Bridger subscribe-all receipt creation failed:', error)
  }

  try {
    await sql`
      INSERT INTO notifications (user_id,type,title,content,link)
      VALUES (
        ${userId}::uuid,
        'subscription',
        'Bridger essentials active',
        ${`WEAVE renewed ${activated.length} Bridger service${activated.length === 1 ? '' : 's'} together from your Flame Coin wallet.`},
        '/bridger/subscription'
      )
    `
  } catch (error) {
    console.error('Bridger subscribe-all notification failed:', error)
  }

  return {
    success: true as const,
    renewed: true,
    services: activated,
    totalFlameCoin: totalDue,
    breakdown: serviceAmounts,
    rateNgnPerFlameCoin: rate,
    newBalance: balanceAfter,
    expiries,
  }
}
