import { randomInt } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { getFlameEvent } from '@/lib/weave-event-store'
import { ensureReferralBonusTable } from '@/lib/referral-bonus'
import { recoverSupportAdvanceFromEarning } from '@/lib/company-support'

export const dynamic = 'force-dynamic'
const EVENT_KEY = 'flame-event-01'
const MAX_REWARD = 8
const treasuryId = () => String(process.env.WEAVE_FLAME_OF_HOPE_TREASURY_USER_ID || '').trim()
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
const daySql = "(NOW() AT TIME ZONE 'Africa/Lagos')::date"

async function ensureSchema() {
  const pool = getPool()
  await pool.query("CREATE TABLE IF NOT EXISTS weave_flame_of_hope_claims (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bridger_id uuid NOT NULL REFERENCES users(id),event_key varchar(48) NOT NULL,claim_day date NOT NULL,source_kind varchar(32) NOT NULL,source_id text NOT NULL,reward_system_switch integer NOT NULL CHECK (reward_system_switch BETWEEN 1 AND 8),treasury_user_id uuid NOT NULL REFERENCES users(id),claimed_at timestamptz NOT NULL DEFAULT NOW(),UNIQUE (bridger_id,event_key,claim_day))")
}
async function eventOpen() {
  const event = await getFlameEvent()
  const now = Date.now()
  return event.key === EVENT_KEY && event.effectiveStatus === 'active' &&
    now >= Date.parse(event.startsAt) && now <= Date.parse(event.endsAt)
}
async function qualifyingActivity(client: {query: (sql: string, values?: any[]) => Promise<any>}, bridgerId: string) {
  // Only server-settled economic activity qualifies. Prospect responses are not independently verified yet.
  const result = await client.query(
    "SELECT kind,source_id FROM (" +
    "SELECT 'client_crossing' AS kind,COALESCE(l.metadata->>'source_id',l.id::text) AS source_id,2 AS priority FROM ledger_entries l WHERE l.user_id=$1::uuid AND l.metadata->>'commerce_type'='bridger_commission' AND (l.created_at AT TIME ZONE 'Africa/Lagos')::date="+daySql+" " +
    "UNION ALL SELECT 'verified_referral',r.id::text,3 FROM referral_bonus_awards r WHERE r.referrer_user_id=$1::uuid AND r.status='paid' AND (r.paid_at AT TIME ZONE 'Africa/Lagos')::date="+daySql+" " +
    ") qualified ORDER BY priority DESC LIMIT 1",
    [bridgerId],
  )
  return result.rows[0] as {kind:string,source_id:string}|undefined
}
async function currentClaim(client: {query: (sql: string, values?: any[]) => Promise<any>}, bridgerId: string) {
  const result = await client.query(
    "SELECT id,claim_day::text AS day,source_kind AS activity,reward_system_switch AS reward,claimed_at FROM weave_flame_of_hope_claims WHERE bridger_id=$1::uuid AND event_key=$2 AND claim_day="+daySql+" LIMIT 1",
    [bridgerId,EVENT_KEY],
  )
  return result.rows[0] || null
}
async function funding(client: {query: (sql: string, values?: any[]) => Promise<any>}) {
  const id = treasuryId()
  if (!isUuid(id)) return {ready:false,amount:0}
  const result = await client.query("SELECT w.balance_trx FROM wallets w JOIN users u ON u.id=w.user_id WHERE u.id=$1::uuid AND u.role='admin' AND u.is_active=true AND w.is_primary=true LIMIT 1",[id])
  const amount = Number(result.rows[0]?.balance_trx || 0)
  return {ready: amount >= MAX_REWARD,amount}
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'bridger') return NextResponse.json({success:false,error:'Bridger authentication required'},{status:403})
  try {
    const open = await eventOpen()
    await ensureSchema()
    const pool = getPool()
    const claim = await currentClaim(pool,user.id)
    if (!open || claim) return NextResponse.json({success:true,open,claimed:!!claim,claim,eligible:false,available:false,minReward:1,maxReward:8},{headers:{'Cache-Control':'no-store'}})
    await ensureReferralBonusTable()
    const [qualified,backing] = await Promise.all([qualifyingActivity(pool,user.id),funding(pool)])
    return NextResponse.json({success:true,open,claimed:false,claim:null,eligible:!!qualified,activity:qualified?.kind||null,available:backing.ready,minReward:1,maxReward:8},{headers:{'Cache-Control':'no-store'}})
  } catch(error) {
    console.error('[flame-of-hope] status failed',error)
    return NextResponse.json({success:false,error:'Unable to load Flame of Hope'},{status:503})
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'bridger') return NextResponse.json({success:false,error:'Bridger authentication required'},{status:403})
  if (!await eventOpen()) return NextResponse.json({success:false,error:'Flame of Hope is available only during the active Flame Event'},{status:403})
  const sponsor = treasuryId()
  if (!isUuid(sponsor) || sponsor === user.id) return NextResponse.json({success:false,error:'Administrations has not activated the funded Flame of Hope reward pool'},{status:503})
  await ensureSchema()
  await ensureReferralBonusTable()
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const active = await client.query("SELECT u.id FROM users u JOIN bridger_profiles p ON p.user_id=u.id WHERE u.id=$1::uuid AND u.role='bridger' AND u.is_active=true AND p.status='active' LIMIT 1",[user.id])
    if (!active.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({success:false,error:'Active Bridger position required'},{status:403})
    }
    const previous = await currentClaim(client,user.id)
    if (previous) {
      await client.query('COMMIT')
      return NextResponse.json({success:true,alreadyClaimed:true,claim:previous})
    }
    const qualified = await qualifyingActivity(client,user.id)
    if (!qualified) {
      await client.query('ROLLBACK')
      return NextResponse.json({success:false,error:'Complete a verified referral or settled Client File Folder crossing today before claiming'},{status:409})
    }
    // Lock the funded Administrations balance first; concurrent claims serialize here.
    const source = await client.query("SELECT w.id,w.balance_trx FROM wallets w JOIN users u ON u.id=w.user_id WHERE u.id=$1::uuid AND u.role='admin' AND u.is_active=true AND w.is_primary=true ORDER BY w.created_at ASC LIMIT 1 FOR UPDATE OF w",[sponsor])
    if (!source.rows[0] || Number(source.rows[0].balance_trx)<MAX_REWARD) {
      await client.query('ROLLBACK')
      return NextResponse.json({success:false,error:'Flame of Hope rewards are awaiting company funding'},{status:503})
    }
    const destination = await client.query("SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true ORDER BY created_at ASC LIMIT 1 FOR UPDATE",[user.id])
    if (!destination.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({success:false,error:'Your System Switch wallet is unavailable'},{status:409})
    }
    const reward = randomInt(1,9) // Uniform integer reward from 1 through 8, with no paid chance.
    const insert = await client.query(
      "INSERT INTO weave_flame_of_hope_claims(bridger_id,event_key,claim_day,source_kind,source_id,reward_system_switch,treasury_user_id) VALUES($1::uuid,$2,"+daySql+",$3,$4,$5,$6::uuid) ON CONFLICT(bridger_id,event_key,claim_day) DO NOTHING RETURNING id,claim_day::text AS day,source_kind AS activity,reward_system_switch AS reward,claimed_at",
      [user.id,EVENT_KEY,qualified.kind,qualified.source_id,reward,sponsor],
    )
    if (!insert.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({success:false,error:'Today’s Flame of Hope was already claimed; refresh to view it'},{status:409})
    }
    const sBefore = Number(source.rows[0].balance_trx)
    const dBefore = Number(destination.rows[0].balance_trx)
    await client.query("UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=NOW() WHERE id=$2::uuid",[reward,source.rows[0].id])
    await client.query("UPDATE wallets SET balance_trx=balance_trx+$1,updated_at=NOW() WHERE id=$2::uuid",[reward,destination.rows[0].id])
    const metadata = JSON.stringify({commerce_type:'flame_of_hope',event_key:EVENT_KEY,claim_id:insert.rows[0].id,source_kind:qualified.kind,source_id:qualified.source_id})
    await client.query(
      "INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata) VALUES " +
      "($1::uuid,'transfer',$3,'Flame Coin','Flame of Hope · funded company reward',$4,$5,$8::jsonb)," +
      "($2::uuid,'earning',$3,'Flame Coin','Flame of Hope · mystery box reward',$6,$7,$8::jsonb)",
      [sponsor,user.id,reward,sBefore,sBefore-reward,dBefore,dBefore+reward,metadata],
    )
    await client.query("UPDATE bridger_profiles SET total_earnings=COALESCE(total_earnings,0)+$1,updated_at=NOW() WHERE user_id=$2::uuid",[reward,user.id])
    await recoverSupportAdvanceFromEarning(client,user.id,reward,'flame_of_hope:'+String(insert.rows[0].id))
    await client.query("INSERT INTO notifications(user_id,type,title,content,from_user_name,link) VALUES($1::uuid,'commission','Flame of Hope opened',$2,'WEAVE · Hope','/bridger/flame-of-hope')",[user.id,'Your mystery box contained '+reward+' System Switch. This company-funded reward recognizes your recorded activity during Burning River.'])
    await client.query('COMMIT')
    return NextResponse.json({success:true,alreadyClaimed:false,claim:insert.rows[0]})
  } catch(error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('[flame-of-hope] claim failed',error)
    return NextResponse.json({success:false,error:'Unable to complete the Flame of Hope claim'},{status:503})
  } finally {
    client.release()
  }
}
