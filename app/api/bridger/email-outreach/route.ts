import { NextRequest, NextResponse } from 'next/server'

import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import {
  EMAIL_PROSPECT_PRICE_FLAME_COIN,
  deliverOutreachEmail,
  emailOutreachProviderConfigured,
  ensureEmailOutreachSchema,
  senderForUser,
} from '@/lib/email-outreach'
import { ensureWeaveReceiptSchema, issueWeaveReceipt } from '@/lib/weave-receipts'

const DEFAULT_SUBJECT = 'A place to build what you are already moving'
const DEFAULT_MESSAGE = 'Hello {{name}}, I am a Bridger with WEAVE. We work with people around something they are already trying to build, sell, organize or move forward. If that matches something you are carrying, reply and I can show you the right crossing.'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'bridger') {
    return NextResponse.json({ error: 'Bridger authentication required' }, { status: 401 })
  }

  try {
    await ensureEmailOutreachSchema()
    const pool = getPool()
    const [sender, wallet, available, leads, outreach] = await Promise.all([
    senderForUser(user.id),
    pool.query(
      `SELECT balance_trx FROM wallets
       WHERE user_id=$1::uuid AND is_primary=true
       LIMIT 1`,
      [user.id],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM weave_email_prospect_leads
       WHERE status='available' AND contactable=true AND owned_by IS NULL`,
    ),
    pool.query(
      `SELECT id,lead_code,name,email,source,consent_basis,status,acquired_at,created_at
       FROM weave_email_prospect_leads
       WHERE owned_by=$1::uuid
       ORDER BY acquired_at DESC NULLS LAST,created_at DESC
       LIMIT 100`,
      [user.id],
    ),
    pool.query(
      `SELECT o.id,o.lead_id,o.subject,o.status,o.provider_message_id,o.failure_reason,o.sent_at,o.replied_at,o.created_at,
              l.lead_code,l.name,l.email,s.reply_email AS source_email
       FROM weave_email_outreach o
       JOIN weave_email_prospect_leads l ON l.id=o.lead_id
       LEFT JOIN weave_email_senders s ON s.id=o.sender_id
       WHERE o.actor_id=$1::uuid
       ORDER BY o.created_at DESC
       LIMIT 100`,
      [user.id],
    ),
  ])

    return NextResponse.json({
    success: true,
    providerConfigured: emailOutreachProviderConfigured(),
    sender,
    accountEmail: user.email,
    priceFlameCoin: EMAIL_PROSPECT_PRICE_FLAME_COIN,
    normalProspectReferenceFlameCoin: 1.1,
    walletBalance: Number(wallet.rows[0]?.balance_trx || 0),
    availableCount: Number(available.rows[0]?.count || 0),
    leads: leads.rows,
    outreach: outreach.rows,
    defaultSubject: DEFAULT_SUBJECT,
    defaultMessage: DEFAULT_MESSAGE,
    })
  } catch (error) {
    console.error('[bridger-email-outreach] GET failed', error)
    return NextResponse.json(
      { error: 'Email Outreach could not open. The runtime will retry schema initialization on the next request.' },
      { status: 503 },
    )
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'bridger') {
    return NextResponse.json({ error: 'Bridger authentication required' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  await ensureEmailOutreachSchema()
  const pool = getPool()
  const action = String(body.action || '').trim()

  if (action === 'acquire') {
    const client = await pool.connect()
    let lead: any = null
    let balanceAfter = 0
    try {
      await client.query('BEGIN')

      const profile = await client.query(
        `SELECT status FROM bridger_profiles WHERE user_id=$1::uuid LIMIT 1`,
        [user.id],
      )
      if (profile.rows[0]?.status !== 'active') {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Only active Bridgers can acquire email prospects' }, { status: 403 })
      }

      const wallet = await client.query(
        `SELECT balance_trx FROM wallets
         WHERE user_id=$1::uuid AND is_primary=true
         FOR UPDATE`,
        [user.id],
      )
      if (!wallet.rows[0]) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Primary Flame Coin wallet not found' }, { status: 404 })
      }

      const balanceBefore = Number(wallet.rows[0].balance_trx || 0)
      if (balanceBefore < EMAIL_PROSPECT_PRICE_FLAME_COIN) {
        await client.query('ROLLBACK')
        return NextResponse.json({
          error: 'Insufficient Flame Coin balance',
          required: EMAIL_PROSPECT_PRICE_FLAME_COIN,
          currentBalance: balanceBefore,
        }, { status: 400 })
      }

      const leadResult = await client.query(
        `SELECT *
         FROM weave_email_prospect_leads
         WHERE status='available' AND contactable=true AND owned_by IS NULL
         ORDER BY created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1`,
      )
      lead = leadResult.rows[0]
      if (!lead) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'No email Prospect is available right now' }, { status: 409 })
      }

      balanceAfter = balanceBefore - EMAIL_PROSPECT_PRICE_FLAME_COIN
      await client.query(
        `UPDATE wallets SET balance_trx=$1,updated_at=NOW()
         WHERE user_id=$2::uuid AND is_primary=true`,
        [balanceAfter, user.id],
      )
      await client.query(
        `UPDATE weave_email_prospect_leads
         SET status='acquired',owned_by=$1::uuid,acquired_at=NOW(),updated_at=NOW()
         WHERE id=$2::uuid`,
        [user.id, lead.id],
      )
      await client.query(
        `INSERT INTO ledger_entries
          (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,created_at)
         VALUES
          (gen_random_uuid(),$1::uuid,'email_prospect_purchase',$2,'Flame Coin',$3,$4,$5,NOW())`,
        [
          user.id,
          EMAIL_PROSPECT_PRICE_FLAME_COIN,
          `Email Prospect ${lead.lead_code}`,
          balanceBefore,
          balanceAfter,
        ],
      )

      await client.query('COMMIT')
    } catch (error) {
      try { await client.query('ROLLBACK') } catch {}
      console.error('[bridger-email-outreach] acquire failed', error)
      return NextResponse.json({ error: 'Email Prospect acquisition failed' }, { status: 500 })
    } finally {
      client.release()
    }

    await ensureWeaveReceiptSchema()
    const receipt = await issueWeaveReceipt({
      userId: user.id,
      kind: 'purchase',
      source: 'email_prospect',
      sourceId: lead.id,
      amount: EMAIL_PROSPECT_PRICE_FLAME_COIN,
      currency: 'Flame Coin',
      status: 'completed',
      description: 'Bridger email Prospect acquisition',
      metadata: { leadCode: lead.lead_code, balanceAfter },
    })

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        lead_code: lead.lead_code,
        name: lead.name,
        email: lead.email,
        source: lead.source,
        consent_basis: lead.consent_basis,
        status: 'acquired',
      },
      newBalance: balanceAfter,
      receipt,
    })
  }

  if (action === 'send') {
    const leadId = String(body.leadId || '').trim()
    const subject = String(body.subject || DEFAULT_SUBJECT).trim().slice(0,240)
    const message = String(body.message || DEFAULT_MESSAGE).trim().slice(0,5000)

    const leadResult = await pool.query(
      `SELECT *
       FROM weave_email_prospect_leads l
       WHERE l.id=$1::uuid
         AND l.owned_by=$2::uuid
         AND l.contactable=true
         AND NOT EXISTS (
           SELECT 1 FROM weave_email_outreach o
           WHERE o.lead_id=l.id
             AND o.actor_id=$2::uuid
             AND o.status IN ('sent','replied')
         )
       LIMIT 1`,
      [leadId, user.id],
    )
    const lead = leadResult.rows[0]
    if (!lead) {
      return NextResponse.json({ error: 'This email Prospect is unavailable or was already messaged' }, { status: 409 })
    }

    try {
      const delivered = await deliverOutreachEmail({
        actorId: user.id,
        actorRole: 'bridger',
        lead,
        subject,
        message,
        mode: 'manual',
      })
      return NextResponse.json({ success: true, delivered })
    } catch (error: any) {
      return NextResponse.json({ error: String(error?.message || 'Email outreach failed') }, { status: 503 })
    }
  }

  if (action === 'mark_replied') {
    const outreachId = String(body.outreachId || '').trim()
    const result = await pool.query(
      `UPDATE weave_email_outreach
       SET status='replied',replied_at=COALESCE(replied_at,NOW()),updated_at=NOW()
       WHERE id=$1::uuid AND actor_id=$2::uuid
       RETURNING id,status,replied_at`,
      [outreachId, user.id],
    )
    if (!result.rows[0]) return NextResponse.json({ error: 'Outreach record not found' }, { status: 404 })
    return NextResponse.json({ success: true, outreach: result.rows[0] })
  }

  return NextResponse.json({ error: 'Unsupported email outreach action' }, { status: 400 })
}
