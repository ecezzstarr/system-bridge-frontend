import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb, ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'
import { ensureFileFolderWorldSchema } from '@/lib/client-file-folder-world'
import { chatWithBridge, type BridgeMessage } from '@/lib/bridge-ai-engine'
import { ensureClientMoneyEnvironment } from '@/lib/client-money-environment'
import { WORLD_RULES } from '@/lib/world/constants'
import { issueWeaveReceipt } from '@/lib/weave-receipts'

async function ensureClientBridgeAiMessageSchema(sql: any) {
  await sql`
    CREATE TABLE IF NOT EXISTS client_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL,
      client_name varchar(200),
      position varchar(50) NOT NULL,
      sender_type varchar(20),
      content text NOT NULL,
      is_read boolean DEFAULT false,
      created_at timestamp DEFAULT now()
    )
  `

  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='client_messages'
  `
  const names = new Set(columns.map((column: any) => String(column.column_name)))

  if (!names.has('client_name')) {
    await sql`ALTER TABLE client_messages ADD COLUMN IF NOT EXISTS client_name varchar(200)`
  }
  if (!names.has('sender_type')) {
    await sql`ALTER TABLE client_messages ADD COLUMN IF NOT EXISTS sender_type varchar(20)`
  }
  if (!names.has('is_read')) {
    await sql`ALTER TABLE client_messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false`
  }

  if (names.has('sender')) {
    await sql`UPDATE client_messages SET sender_type=COALESCE(sender_type,sender,'client') WHERE sender_type IS NULL`
    await sql`ALTER TABLE client_messages ALTER COLUMN sender DROP NOT NULL`
  } else {
    await sql`UPDATE client_messages SET sender_type='client' WHERE sender_type IS NULL`
  }

  await sql`UPDATE client_messages SET is_read=false WHERE is_read IS NULL`
  await sql`
    CREATE INDEX IF NOT EXISTS idx_client_messages_client_position_created
    ON client_messages(client_id, position, created_at)
  `
}

async function contextFor(request: NextRequest) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const clientId = await resolveClientToken(token, sql)
  if (!clientId) return { sql, error: NextResponse.json({ error: 'Client login required' }, { status: 401 }) }

  await ensureClientFileFolderSchema(sql)
  await ensureClientWorkshopSchema(sql)
  await ensureFileFolderWorldSchema(sql)
  await ensureClientBridgeAiMessageSchema(sql)
  await ensureClientMoneyEnvironment(sql, clientId)

  const [userColumnState] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='users' AND column_name='referred_by_bridger_id'
    ) AS has_referred_by_bridger_id
  `
  const clientRows = userColumnState?.has_referred_by_bridger_id
    ? await sql`
        SELECT id,name,business_name,file_number,
               COALESCE(referred_by,referred_by_bridger_id) AS assigned_bridger_id
        FROM users
        WHERE id=${clientId}::uuid AND role='client' AND COALESCE(is_active,true)=true
        LIMIT 1
      `
    : await sql`
        SELECT id,name,business_name,file_number,referred_by AS assigned_bridger_id
        FROM users
        WHERE id=${clientId}::uuid AND role='client' AND COALESCE(is_active,true)=true
        LIMIT 1
      `
  const client = clientRows[0]
  if (!client?.file_number) {
    return { sql, error: NextResponse.json({ error: 'Active Client File Folder required' }, { status: 409 }) }
  }

  const [workshop] = await sql`
    SELECT workshop_type,title,description
    FROM client_system_workshops
    WHERE client_id=${client.id}::uuid
    LIMIT 1
  `

  const systems = await sql`
    SELECT id,title,system_type,status,configuration,activated_at
    FROM client_built_systems
    WHERE client_id=${client.id}::uuid
      AND file_number=${client.file_number}
      AND status='active'
    ORDER BY activated_at DESC
    LIMIT 20
  `

  let crossing: any = null
  const [tableState] = await sql`SELECT to_regclass('public.bridge_sessions') AS table_name`
  if (tableState?.table_name) {
    const rows = await sql`
      SELECT
        s.id,s.messages,s.created_at,s.last_active_at,
        b.bridge_code,t.name AS template_name,t.system_prompt
      FROM bridge_sessions s
      JOIN bridge_ais b ON b.id=s.bridge_id
      JOIN bridge_templates t ON t.id=b.template_id
      WHERE s.converted_client_id=${client.id}::uuid
      ORDER BY s.last_active_at DESC
      LIMIT 1
    `
    crossing = rows[0] || null
  }

  if (!crossing && client.assigned_bridger_id) {
    const rows = await sql`
      SELECT
        NULL::uuid AS id,
        '[]'::jsonb AS messages,
        b.created_at,
        b.created_at AS last_active_at,
        b.bridge_code,t.name AS template_name,t.system_prompt
      FROM bridge_ais b
      JOIN bridge_templates t ON t.id=b.template_id
      WHERE b.bridger_id=${client.assigned_bridger_id}::uuid
        AND b.status='active'
        AND t.status='published'
      ORDER BY b.created_at DESC
      LIMIT 1
    `
    crossing = rows[0] || null
  }

  return { sql, client, workshop: workshop || null, systems, crossing, error: null }
}

async function supportHistory(sql: any, clientId: string) {
  return sql`
    SELECT id,sender_type,content,created_at
    FROM client_messages
    WHERE client_id::text=${clientId}
      AND position='bridge_ai'
      AND sender_type IN ('client','bridge_ai')
    ORDER BY created_at ASC
    LIMIT 60
  `
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await contextFor(request)
    if (ctx.error) return ctx.error
    const messages = await supportHistory(ctx.sql, String(ctx.client.id))
    const [wallet] = await ctx.sql`
      SELECT balance_trx
      FROM wallets
      WHERE user_id=${ctx.client.id}::uuid AND is_primary=true
      ORDER BY created_at ASC
      LIMIT 1
    `
    const feeFlameCoin = WORLD_RULES.CLIENT_BRIDGE_AI_ASSIST_FEE_FLAME_COIN

    return NextResponse.json({
      success: true,
      identity: {
        name: 'Bridge AI',
        role: 'Client AI Support',
        continuity: ctx.crossing?.id ? 'crossing-linked' : 'client-continuity',
        template: ctx.crossing?.template_name || null,
      },
      billing: {
        feeFlameCoin,
        walletBalanceFlameCoin: Number(wallet?.balance_trx || 0),
        currency: 'Flame Coin',
        unit: 'assisted reply',
      },
      messages,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[client/bridge-ai GET]', error)
    return NextResponse.json({ error: 'Unable to load Bridge AI support' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await contextFor(request)
    if (ctx.error) return ctx.error

    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 6000) : ''
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    const feeFlameCoin = WORLD_RULES.CLIENT_BRIDGE_AI_ASSIST_FEE_FLAME_COIN
    let balanceAfter: number | null = null
    let charged = false

    if (feeFlameCoin > 0) {
      const chargedRows = await ctx.sql`
        UPDATE wallets
        SET balance_trx=balance_trx-${feeFlameCoin},updated_at=NOW()
        WHERE user_id=${ctx.client.id}::uuid
          AND is_primary=true
          AND balance_trx >= ${feeFlameCoin}
        RETURNING balance_trx
      `
      if (!chargedRows[0]) {
        return NextResponse.json({
          error: `Bridge AI assistance requires ${feeFlameCoin.toLocaleString()} Flame Coin per assisted reply. Add Flame Coin to continue.`,
          code: 'INSUFFICIENT_FLAME_COIN',
          billing: { feeFlameCoin, currency: 'Flame Coin' },
        }, { status: 409 })
      }
      balanceAfter = Number(chargedRows[0].balance_trx || 0)
      charged = true
    }

    await ctx.sql`
      INSERT INTO client_messages (client_id,client_name,position,sender_type,content,is_read)
      VALUES (${String(ctx.client.id)},${ctx.client.name},'bridge_ai','client',${message},true)
    `

    const historyRows = await supportHistory(ctx.sql, String(ctx.client.id))
    const history: BridgeMessage[] = historyRows.slice(-24).map((entry: any) => ({
      role: entry.sender_type === 'bridge_ai' ? 'assistant' : 'user',
      content: String(entry.content || ''),
    }))

    const installedSystems = (ctx.systems || []).map((system: any) => ({
      title: system.title,
      type: system.system_type,
      status: system.status,
      installedParts: Array.isArray(system.configuration?.appliedParts)
        ? system.configuration.appliedParts.map((part: any) => part.name || part.item_key)
        : [],
    }))

    const crossingRecord = ctx.crossing?.messages
      ? JSON.stringify(ctx.crossing.messages).slice(0, 8000)
      : 'No recoverable legacy crossing transcript is linked to this Client.'

    const supportPrompt = `
You are now operating inside the authenticated Client File Folder.

Client: ${ctx.client.name}
Business: ${ctx.client.business_name || 'not named'}
File Number: ${ctx.client.file_number}
Workshop: ${ctx.workshop?.title || 'Interaction in Motion'}
Workshop purpose: ${ctx.workshop?.description || 'Continue the Client movement truthfully and practically.'}

Installed live systems:
${JSON.stringify(installedSystems, null, 2)}

Crossing continuity:
Template: ${ctx.crossing?.template_name || 'Bridge AI continuity'}
Recovered crossing record: ${crossingRecord}

Client-support rules:
- You are the Client's Bridge AI support continuing from the crossing.
- Treat the File Folder as the Client's persistent operating environment.
- Help the Client understand, use, continue and build their real systems.
- Distinguish previews, construction state and live recorded operation.
- Never claim an external transaction, deployment, customer action or integration occurred unless the File Folder record shows it.
- Keep the Client's current topic and unfinished movement continuous rather than restarting with generic onboarding.
- The human remains the source of direction and judgment.
`.trim()

    let saved: any
    try {
      const response = await chatWithBridge(history, supportPrompt)
      ;[saved] = await ctx.sql`
        INSERT INTO client_messages (client_id,client_name,position,sender_type,content,is_read)
        VALUES (${String(ctx.client.id)},${ctx.client.name},'bridge_ai','bridge_ai',${response},true)
        RETURNING id,sender_type,content,created_at
      `
    } catch (error) {
      if (charged && feeFlameCoin > 0) {
        await ctx.sql`
          UPDATE wallets
          SET balance_trx=balance_trx+${feeFlameCoin},updated_at=NOW()
          WHERE user_id=${ctx.client.id}::uuid AND is_primary=true
        `.catch(() => null)
      }
      throw error
    }

    let receipt = null
    if (charged && feeFlameCoin > 0) {
      try {
        receipt = await issueWeaveReceipt({
          userId: String(ctx.client.id),
          kind: 'payment',
          source: 'bridge_ai_client_support',
          sourceId: String(saved.id),
          amount: feeFlameCoin,
          currency: 'Flame Coin',
          status: 'completed',
          description: 'Bridge AI assisted reply inside Client File Folder',
          metadata: { fileNumber: ctx.client.file_number, balanceAfter },
          sql: ctx.sql,
        })
      } catch (receiptError) {
        console.error('[client/bridge-ai receipt]', receiptError)
      }
    }

    return NextResponse.json({
      success: true,
      message: saved,
      billing: {
        chargedFlameCoin: feeFlameCoin,
        walletBalanceFlameCoin: balanceAfter,
        currency: 'Flame Coin',
      },
      receipt,
    })
  } catch (error) {
    console.error('[client/bridge-ai POST]', error)
    return NextResponse.json({ error: 'Bridge AI support is unavailable' }, { status: 500 })
  }
}
