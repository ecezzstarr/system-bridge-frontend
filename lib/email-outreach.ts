import crypto from 'node:crypto'

import { getPool } from '@/lib/db'

export const EMAIL_PROSPECT_PRICE_FLAME_COIN = 0.55
export const EMAIL_OUTREACH_ADMIN_DAILY_LIMIT = 120

export function normalizeOutreachEmail(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export function validOutreachEmail(value: unknown) {
  const email = normalizeOutreachEmail(value)
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
}

export function emailLeadCode() {
  return `EML-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
}

export function emailOutreachProviderConfigured() {
  return Boolean(process.env.RESEND_API_KEY && (process.env.WEAVE_OUTREACH_EMAIL_FROM || process.env.PASSWORD_RECOVERY_EMAIL_FROM))
}

let emailOutreachSchemaPromise:Promise<void>|null=null

export async function ensureEmailOutreachSchema() {
  if (emailOutreachSchemaPromise) return emailOutreachSchemaPromise

  emailOutreachSchemaPromise=(async()=>{
    const client=await getPool().connect()
    let locked=false
    try {
      await client.query('SELECT pg_advisory_lock(hashtext($1))',['weave_email_outreach_schema_v1'])
      locked=true

      await client.query(`
        CREATE TABLE IF NOT EXISTS weave_email_senders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL,
          reply_email VARCHAR(255) NOT NULL,
          display_name VARCHAR(120) NOT NULL DEFAULT 'WEAVE',
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      await client.query(`
        CREATE TABLE IF NOT EXISTS weave_email_prospect_leads (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_code VARCHAR(40) NOT NULL UNIQUE,
          name VARCHAR(160),
          email VARCHAR(255) NOT NULL UNIQUE,
          source VARCHAR(120) NOT NULL,
          consent_basis VARCHAR(160) NOT NULL,
          contactable BOOLEAN NOT NULL DEFAULT TRUE,
          status VARCHAR(24) NOT NULL DEFAULT 'available',
          pool VARCHAR(20) NOT NULL DEFAULT 'bridger',
          series_id UUID,
          owned_by UUID REFERENCES users(id),
          acquired_at TIMESTAMPTZ,
          created_by UUID NOT NULL REFERENCES users(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_weave_email_leads_status
        ON weave_email_prospect_leads(status, contactable, created_at)
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_weave_email_leads_owner
        ON weave_email_prospect_leads(owned_by, created_at DESC)
      `)
      await client.query(`
        ALTER TABLE weave_email_prospect_leads
        ADD COLUMN IF NOT EXISTS pool VARCHAR(20) NOT NULL DEFAULT 'bridger'
      `)
      await client.query(`
        ALTER TABLE weave_email_prospect_leads
        ADD COLUMN IF NOT EXISTS series_id UUID
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_weave_email_leads_pool
        ON weave_email_prospect_leads(pool,status,contactable,created_at)
      `)
      await client.query(`
        CREATE TABLE IF NOT EXISTS weave_email_candidate_series (
          id UUID PRIMARY KEY,
          seed_email VARCHAR(255) NOT NULL,
          domain VARCHAR(190) NOT NULL,
          local_prefix VARCHAR(120) NOT NULL,
          generator VARCHAR(40) NOT NULL DEFAULT 'crypto_series_v1',
          destination VARCHAR(20) NOT NULL,
          requested_count INTEGER NOT NULL,
          generated_count INTEGER NOT NULL DEFAULT 0,
          nonce VARCHAR(64) NOT NULL,
          status VARCHAR(24) NOT NULL DEFAULT 'completed',
          created_by UUID NOT NULL REFERENCES users(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_weave_email_candidate_series_created
        ON weave_email_candidate_series(created_at DESC)
      `)
      await client.query(`
        CREATE TABLE IF NOT EXISTS weave_email_outreach (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_id UUID NOT NULL REFERENCES weave_email_prospect_leads(id) ON DELETE CASCADE,
          actor_id UUID NOT NULL REFERENCES users(id),
          sender_id UUID REFERENCES weave_email_senders(id),
          mode VARCHAR(20) NOT NULL,
          subject TEXT NOT NULL,
          message_body TEXT NOT NULL,
          status VARCHAR(24) NOT NULL DEFAULT 'pending',
          provider_message_id TEXT,
          failure_reason TEXT,
          sent_at TIMESTAMPTZ,
          replied_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_weave_email_outreach_actor
        ON weave_email_outreach(actor_id, created_at DESC)
      `)
      await client.query(`
        CREATE TABLE IF NOT EXISTS weave_email_outreach_automation (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          enabled BOOLEAN NOT NULL DEFAULT FALSE,
          daily_limit INTEGER NOT NULL DEFAULT 120,
          subject_template TEXT NOT NULL DEFAULT 'A place to build what you are already moving',
          message_template TEXT NOT NULL DEFAULT 'Hello {{name}}, I am reaching out from WEAVE. We work with people around something they are already trying to build, sell, organize or move forward. If that matches something you are carrying, reply and we can open the right path.',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
    } finally {
      if (locked) {
        try { await client.query('SELECT pg_advisory_unlock(hashtext($1))',['weave_email_outreach_schema_v1']) } catch {}
      }
      client.release()
    }
  })().catch(error=>{
    emailOutreachSchemaPromise=null
    throw error
  })

  return emailOutreachSchemaPromise
}

export type EmailCandidateDestination='admin'|'bridger'|'balanced'

function splitSeedEmail(seedEmail:string){
  const normalized=normalizeOutreachEmail(seedEmail)
  if(!validOutreachEmail(normalized))throw new Error('Enter a valid seed email')
  const at=normalized.lastIndexOf('@')
  const local=normalized.slice(0,at)
  const domain=normalized.slice(at+1)
  const numeric=local.match(/^(.*?)(\d{2,12})$/)
  return {
    normalized,
    domain,
    prefix:numeric?.[1]||local.replace(/[._+-]+$/,'')||'prospect',
    numericWidth:numeric?.[2]?.length||0,
    numericBase:numeric?Number.parseInt(numeric[2],10):0,
  }
}

function cryptoCandidateLocal(input:{
  prefix:string
  width:number
  base:number
  nonce:string
  index:number
}){
  const digest=crypto
    .createHmac('sha256',input.nonce)
    .update(String(input.index))
    .digest()

  if(input.width>0){
    const range=Math.max(100,10**Math.min(input.width,9))
    const offset=digest.readUInt32BE(0)%range
    const candidate=(input.base+offset)%range
    return `${input.prefix}${String(candidate).padStart(input.width,'0')}`
  }

  const token=digest.toString('hex').slice(0,10)
  return `${input.prefix}.${token}`
}

export async function generateEmailCandidateSeries(input:{
  adminId:string
  seedEmail:string
  count:number
  destination:EmailCandidateDestination
}){
  await ensureEmailOutreachSchema()
  const parsed=splitSeedEmail(input.seedEmail)
  const requested=Math.max(1,Math.min(200,Number(input.count||1)))
  const seriesId=crypto.randomUUID()
  const nonce=crypto.randomBytes(24).toString('hex')
  const pool=getPool()
  const client=await pool.connect()

  try{
    await client.query('BEGIN')

    let adminGenerated=0
    let bridgerGenerated=0
    let attempts=0
    let generated=0
    const generatedLeads:Array<{id:string;leadCode:string;email:string;pool:'admin'|'bridger'}>=[]

    while(generated<requested&&attempts<requested*12){
      attempts+=1
      const local=cryptoCandidateLocal({
        prefix:parsed.prefix,
        width:parsed.numericWidth,
        base:parsed.numericBase,
        nonce,
        index:attempts,
      })
      const candidateEmail=`${local}@${parsed.domain}`
      if(candidateEmail===parsed.normalized)continue

      const destinationPool:'admin'|'bridger'=
        input.destination==='admin'
          ?'admin'
          :input.destination==='bridger'
            ?'bridger'
            :generated%2===0?'admin':'bridger'

      const leadId=crypto.randomUUID()
      const leadCode=emailLeadCode()
      const inserted=await client.query(
        `INSERT INTO weave_email_prospect_leads
          (id,lead_code,name,email,source,consent_basis,contactable,status,pool,series_id,created_by)
         VALUES (
           $1::uuid,$2,NULL,$3,'email_engine_candidate',
           'Cryptographic candidate. Reachability and consent have not been independently verified.',
           true,'available',$4,$5::uuid,$6::uuid
         )
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [leadId,leadCode,candidateEmail,destinationPool,seriesId,input.adminId],
      )

      if(!inserted.rowCount)continue
      generated+=1
      if(destinationPool==='admin')adminGenerated+=1
      else bridgerGenerated+=1
      generatedLeads.push({id:leadId,leadCode,email:candidateEmail,pool:destinationPool})
    }

    await client.query(
      `INSERT INTO weave_email_candidate_series
        (id,seed_email,domain,local_prefix,generator,destination,requested_count,generated_count,nonce,status,created_by)
       VALUES ($1::uuid,$2,$3,$4,'crypto_series_v1',$5,$6,$7,$8,$9,$10::uuid)`,
      [
        seriesId,
        parsed.normalized,
        parsed.domain,
        parsed.prefix,
        input.destination,
        requested,
        generated,
        nonce,
        generated===requested?'completed':'partial',
        input.adminId,
      ],
    )

    await client.query('COMMIT')
    return {
      seriesId,
      requested,
      generated,
      adminGenerated,
      bridgerGenerated,
      mode:'crypto_series_v1' as const,
      reachability:'unverified' as const,
      candidates:generatedLeads,
    }
  }catch(error){
    try{await client.query('ROLLBACK')}catch{}
    throw error
  }finally{
    client.release()
  }
}

export async function senderForUser(userId: string) {
  await ensureEmailOutreachSchema()
  const result = await getPool().query(
    `SELECT * FROM weave_email_senders WHERE user_id=$1::uuid AND active=true LIMIT 1`,
    [userId],
  )
  return result.rows[0] || null
}

function mergeTemplate(template: string, input: { name?: string | null; leadCode: string }) {
  const name = String(input.name || 'there').trim() || 'there'
  return template
    .replaceAll('{{name}}', name)
    .replaceAll('{{lead_code}}', input.leadCode)
}

export async function deliverOutreachEmail(input: {
  actorId: string
  actorRole: 'admin' | 'bridger'
  lead: { id: string; lead_code: string; name?: string | null; email: string }
  subject: string
  message: string
  mode: 'manual' | 'automatic'
}) {
  await ensureEmailOutreachSchema()
  if (!emailOutreachProviderConfigured()) throw new Error('WEAVE email transport is not configured')

  const sender = await senderForUser(input.actorId)
  if (!sender) throw new Error('Set your outreach email identity before sending')

  const apiKey = process.env.RESEND_API_KEY!
  const from = process.env.WEAVE_OUTREACH_EMAIL_FROM || process.env.PASSWORD_RECOVERY_EMAIL_FROM!
  const subject = mergeTemplate(input.subject, { name: input.lead.name, leadCode: input.lead.lead_code })
  const message = mergeTemplate(input.message, { name: input.lead.name, leadCode: input.lead.lead_code })

  const outreachId = crypto.randomUUID()
  await getPool().query(
    `INSERT INTO weave_email_outreach
      (id,lead_id,actor_id,sender_id,mode,subject,message_body,status)
     VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,'pending')`,
    [outreachId, input.lead.id, input.actorId, sender.id, input.mode, subject, message],
  )

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.lead.email],
        reply_to: sender.reply_email,
        subject,
        text: `${message}\n\nLead reference: ${input.lead.lead_code}\nWEAVE of Presence · System Switch · Bridge Radiance`,
        html: `<div style="font-family:Arial,sans-serif;background:#04101a;color:#e7f5ff;padding:28px"><div style="max-width:560px;margin:auto;border-top:1px solid #27485a;border-bottom:1px solid #27485a;padding:28px 0"><div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8edffc">WEAVE · Bridge Radiance</div><p style="line-height:1.8;color:#d9e7f0">${message.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</p><div style="margin-top:24px;font-size:11px;color:#7890a0">Reference ${input.lead.lead_code}</div></div></div>`,
      }),
      cache: 'no-store',
    })

    const body = await response.json().catch(() => ({} as any))
    if (!response.ok) throw new Error(String(body?.message || body?.error || `Email provider rejected ${response.status}`))

    await getPool().query(
      `UPDATE weave_email_outreach
       SET status='sent',provider_message_id=$1,sent_at=NOW(),updated_at=NOW()
       WHERE id=$2::uuid`,
      [String(body?.id || ''), outreachId],
    )
    await getPool().query(
      `UPDATE weave_email_prospect_leads
       SET status='contacted',updated_at=NOW()
       WHERE id=$1::uuid`,
      [input.lead.id],
    )

    return { outreachId, providerMessageId: String(body?.id || '') }
  } catch (error: any) {
    await getPool().query(
      `UPDATE weave_email_outreach
       SET status='failed',failure_reason=$1,updated_at=NOW()
       WHERE id=$2::uuid`,
      [String(error?.message || 'Email delivery failed').slice(0,500), outreachId],
    )
    throw error
  }
}

export async function runAdminEmailOutreach(adminId: string) {
  await ensureEmailOutreachSchema()
  const pool = getPool()
  const settingsResult = await pool.query(
    `SELECT * FROM weave_email_outreach_automation WHERE user_id=$1::uuid LIMIT 1`,
    [adminId],
  )
  const settings = settingsResult.rows[0]
  if (!settings?.enabled) return { enabled: false, sent: 0, failed: 0 }

  const limit = Math.max(1, Math.min(EMAIL_OUTREACH_ADMIN_DAILY_LIMIT, Number(settings.daily_limit || EMAIL_OUTREACH_ADMIN_DAILY_LIMIT)))
  const leadsResult = await pool.query(
    `SELECT l.*
     FROM weave_email_prospect_leads l
     WHERE l.status='available'
       AND l.contactable=true
       AND l.pool='admin'
       AND l.owned_by IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM weave_email_outreach o
         WHERE o.lead_id=l.id
           AND o.actor_id=$1::uuid
           AND o.created_at >= CURRENT_DATE
       )
     ORDER BY l.created_at ASC
     LIMIT $2`,
    [adminId, limit],
  )

  let sent = 0
  let failed = 0
  for (const lead of leadsResult.rows) {
    try {
      await deliverOutreachEmail({
        actorId: adminId,
        actorRole: 'admin',
        lead,
        subject: String(settings.subject_template),
        message: String(settings.message_template),
        mode: 'automatic',
      })
      sent += 1
    } catch {
      failed += 1
    }
  }
  return { enabled: true, sent, failed, considered: leadsResult.rows.length }
}
