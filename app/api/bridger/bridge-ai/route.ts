import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql, getPool } from '@/lib/db'
import crypto from 'crypto'
import { WORLD_RULES } from '@/lib/world/constants'
import { issueWeaveReceipt } from '@/lib/weave-receipts'
import { getWeavePublicOrigin } from '@/lib/weave-origin'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || (user.role !== 'bridger' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Bridger only' }, { status: 403 })
  }
  try {
    const bridges = await sql`
      SELECT
        b.id, b.bridge_code, b.status, b.created_at, b.custom_welcome_message,
        t.name as template_name,
        (SELECT COUNT(*) FROM bridge_events e WHERE e.bridge_id = b.id AND e.event_type = 'view') as views,
        (SELECT COUNT(*) FROM bridge_sessions s WHERE s.bridge_id = b.id) as conversations,
        (SELECT COUNT(*) FROM bridge_sessions s WHERE s.bridge_id = b.id AND s.status = 'converted') as registrations
      FROM bridge_ais b
      JOIN bridge_templates t ON t.id = b.template_id
      WHERE b.bridger_id = ${user.id}::uuid
      ORDER BY b.created_at DESC
    `
    const bridgeOrigin = getWeavePublicOrigin()
    return NextResponse.json({
      success: true,
      bridges: bridges.map((bridge: any) => ({
        ...bridge,
        public_url: `${bridgeOrigin}/bridge/${bridge.bridge_code}`,
      })),
    })
  } catch (error: any) {
    console.error('[bridger bridge-ai GET] error:', error)
    return NextResponse.json({ error: 'Failed to load Bridge AIs' }, { status: 500 })
  }
}

// Each newly opened Bridge AI template path costs 8 Flame Coin once.
// Existing paths remain live; there is no Bridge AI monthly subscription.
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || (user.role !== 'bridger' && user.role !== 'admin')) {
    return NextResponse.json({error:'Bridger access required'},{status:403})
  }
  const body = await request.json().catch(() => ({}))
  const templateId = String(body.templateId||'')
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(templateId)) {
    return NextResponse.json({error:'A valid Bridge AI template is required'},{status:400})
  }
  const customWelcomeMessage = typeof body.customWelcomeMessage === 'string'
    ? body.customWelcomeMessage.trim().slice(0,2000) : null
  const bridgeCode = crypto.randomBytes(9).toString('base64url')
  const client = await getPool().connect()
  let result: any = null
  let paid = false
  let balanceAfter = 0
  try {
    await client.query('BEGIN')
    const template = await client.query(
      "SELECT id FROM bridge_templates WHERE id=$1::uuid AND status='published' LIMIT 1",
      [templateId]
    )
    if (!template.rows.length) {
      await client.query('ROLLBACK')
      return NextResponse.json({error:'Published template not found'},{status:404})
    }
    // Keep ordinary Bridger activity accessible without Agentic-Bridger purchase.
    const bridger = await client.query('SELECT role,is_active,assigned_agent_id FROM users WHERE id=$1::uuid LIMIT 1',[user.id])
    const owner = bridger.rows[0]
    if (!owner || (user.role === 'bridger' && owner.is_active === false)) {
      await client.query('ROLLBACK')
      return NextResponse.json({error:'Active Bridger position required'},{status:403})
    }
    if (user.role === 'bridger') {
      const wallets = await client.query(
        'SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true ORDER BY created_at LIMIT 1 FOR UPDATE',
        [user.id]
      )
      const wallet = wallets.rows[0]
      const before = Number(wallet?.balance_trx || 0)
      if (!wallet || before < WORLD_RULES.BRIDGE_AI_TEMPLATE_OPEN_FLAME_COIN) {
        await client.query('ROLLBACK')
        return NextResponse.json({
          success:false,reason:'insufficient_balance',
          requiredFlameCoin:WORLD_RULES.BRIDGE_AI_TEMPLATE_OPEN_FLAME_COIN,
          availableFlameCoin:before
        },{status:402})
      }
      const debit = await client.query(
        'UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=NOW() WHERE id=$2::uuid AND balance_trx >= $1 RETURNING balance_trx',
        [WORLD_RULES.BRIDGE_AI_TEMPLATE_OPEN_FLAME_COIN,wallet.id]
      )
      if (!debit.rows.length) throw new Error('Bridge AI wallet debit lost concurrency race')
      balanceAfter = Number(debit.rows[0].balance_trx)
      paid = true
    }
    const created = await client.query(
      `INSERT INTO bridge_ais (bridge_code,bridger_id,agent_id,template_id,custom_welcome_message,status)
       VALUES ($1,$2::uuid,$3::uuid,$4::uuid,$5,'active')
       RETURNING id,bridge_code,status,created_at`,
      [bridgeCode,user.id,owner.assigned_agent_id||null,templateId,customWelcomeMessage]
    )
    result = created.rows[0]
    if (paid) {
      await client.query(
        `INSERT INTO ledger_entries (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at)
         VALUES (gen_random_uuid(),$1::uuid,'fee',$2,'Flame Coin','Bridge AI template opening',$3,$4,$5::jsonb,NOW())`,
        [user.id,WORLD_RULES.BRIDGE_AI_TEMPLATE_OPEN_FLAME_COIN,
         balanceAfter+WORLD_RULES.BRIDGE_AI_TEMPLATE_OPEN_FLAME_COIN,balanceAfter,
         JSON.stringify({commerce_type:'purchase',source:'bridge_ai_template_open',template_id:templateId,bridge_id:result.id})]
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('[bridger bridge-ai POST] failed:',error)
    return NextResponse.json({error:'Bridge AI path could not be opened; no charge completed'},{status:500})
  } finally {
    client.release()
  }
  if (paid && result) {
    try {
      await issueWeaveReceipt({
        userId:user.id,kind:'purchase',source:'bridge_ai_template_open',sourceId:String(result.id),
        amount:WORLD_RULES.BRIDGE_AI_TEMPLATE_OPEN_FLAME_COIN,currency:'Flame Coin',status:'paid',
        description:'Bridge AI template opening',metadata:{templateId,bridgeCode,balanceAfter}
      })
    } catch (error) { console.error('[bridge-ai] receipt creation failed:',error) }
  }
  return NextResponse.json({
    success:true,chargedFlameCoin:paid?WORLD_RULES.BRIDGE_AI_TEMPLATE_OPEN_FLAME_COIN:0,
    bridge:{...result,public_url:`${getWeavePublicOrigin()}/bridge/${result.bridge_code}`}
  },{status:201})
}
