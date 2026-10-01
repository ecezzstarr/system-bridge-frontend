import { getPool, sql } from '@/lib/db'
import { getWeaveBridgeOrigin } from '@/lib/weave-origin'
import { ensureMarketTables } from '@/lib/market'
import {
  getConnectedMailboxCredential,
  markMailboxSent,
} from '@/lib/weave-mailbox'
import { sendAuthenticatedGoogleMail } from '@/lib/weave-mail'

export const FLAME_EMAIL_DAILY_DEFAULT=25
export const FLAME_EMAIL_DAILY_MAX=250

export function buildPremiumFileFolderEmail(input:{
  prospectName?:string|null
  bridgeUrl?:string|null
}){
  const name=String(input.prospectName||'').trim()
  const greeting=name?`Hello ${name},`:'Hello,'
  const subject='WEAVE Flame Event · Premium File Folder'
  const text=`${greeting}

WEAVE of Presence is opening Company Loop 1 — Flame Event.

The Premium File Folder is a personal operating environment for building, organizing and opening real systems through WEAVE: your Customer Door, workshop, store and the systems that support your movement.

You do not need to understand every part of WEAVE before entering. Begin by seeing the environment and deciding whether it fits what you are trying to build.

${input.bridgeUrl?`Enter your WEAVE Bridge: ${input.bridgeUrl}\n\n`:''}If this is not relevant to you, reply STOP and WEAVE will end promotional outreach to this address.

WEAVE of Presence
System Switch · Bridge Radiance`
  const html=`<div style="font-family:Arial,sans-serif;background:#050b12;color:#e8edf4;padding:28px">
    <div style="max-width:620px;margin:0 auto;border-top:1px solid #7f3f16;border-bottom:1px solid #7f3f16;padding:30px 0">
      <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#f5a44b">Company Loop 1 · Flame Event</div>
      <h1 style="font-size:26px;line-height:1.2;margin:16px 0 10px;color:#fff">Premium File Folder</h1>
      <p style="line-height:1.8;color:#c2ccd8">${greeting}</p>
      <p style="line-height:1.8;color:#c2ccd8">The Premium File Folder is a personal operating environment for building, organizing and opening real systems through WEAVE: your Customer Door, workshop, store and the systems that support your movement.</p>
      <p style="line-height:1.8;color:#c2ccd8">You do not need to understand every part of WEAVE before entering. Begin by seeing the environment and deciding whether it fits what you are trying to build.</p>
      ${input.bridgeUrl?`<p style="margin:26px 0"><a href="${input.bridgeUrl}" style="display:inline-block;padding:12px 18px;border:1px solid #f5a44b;color:#fff;text-decoration:none;font-weight:700">Enter your WEAVE Bridge</a></p>`:''}
      <p style="font-size:12px;line-height:1.7;color:#748398">If this is not relevant to you, reply STOP and WEAVE will end promotional outreach to this address.</p>
      <div style="margin-top:26px;font-size:11px;color:#657585">WEAVE of Presence · System Switch · Bridge Radiance</div>
    </div>
  </div>`
  return {subject,text,html}
}

export async function sendEmailOutreach(input:{
  outreachId:string
  senderUserId:string
  allowAdminOverride?:boolean
}){
  await ensureMarketTables()
  const rows=await sql`
    SELECT
      o.id,o.bridger_id,o.status,o.channel,o.bridge_ai_id,
      c.id AS contact_id,c.name,c.email,
      b.bridge_code
    FROM market_prospect_outreach o
    JOIN market_prospect_contacts c ON c.id=o.contact_id
    LEFT JOIN bridge_ais b ON b.id=o.bridge_ai_id
    WHERE o.id=${input.outreachId}::uuid
    LIMIT 1
  `
  const outreach:any=rows[0]
  if(!outreach)throw new Error('Prospect outreach was not found')
  if(outreach.channel!=='email')throw new Error('This Prospect movement is not email')
  if(String(outreach.bridger_id)!==String(input.senderUserId)&&!input.allowAdminOverride){
    throw new Error('Prospect outreach is not owned by this sender')
  }
  if(!outreach.email)throw new Error('Prospect email is missing')
  if(outreach.status==='converted')throw new Error('Converted Client outreach is closed')
  if(outreach.status==='unsubscribed')throw new Error('Prospect has ended promotional email')
  if(outreach.status==='sent'||outreach.status==='opened'||outreach.status==='responded'){
    return {alreadySent:true,outreachId:outreach.id}
  }

  const mailbox=await getConnectedMailboxCredential(input.senderUserId)
  if(!mailbox)throw new Error('Connect and authenticate a Google mailbox before sending email')

  const bridgeOrigin=getWeaveBridgeOrigin()
  const bridgeUrl=outreach.bridge_code
    ? `${bridgeOrigin}/bridge/${outreach.bridge_code}?pid=${outreach.id}`
    : null
  const message=buildPremiumFileFolderEmail({prospectName:outreach.name,bridgeUrl})

  try{
    const delivery=await sendAuthenticatedGoogleMail({
      credential:mailbox,
      to:outreach.email,
      subject:message.subject,
      text:message.text,
      html:message.html,
      replyTo:mailbox.email,
    })

    await sql`
      UPDATE market_prospect_outreach
      SET
        status='sent',
        message_sent=${message.text},
        sender_mailbox_id=${mailbox.id}::uuid,
        provider_message_id=${delivery.messageId},
        delivery_error=NULL,
        sent_at=COALESCE(sent_at,NOW()),
        last_activity_at=NOW()
      WHERE id=${outreach.id}::uuid
    `
    await markMailboxSent(mailbox.id)
    return {
      success:true,
      outreachId:outreach.id,
      recipient:outreach.email,
      providerMessageId:delivery.messageId,
    }
  }catch(error){
    const detail=error instanceof Error?error.message:'Google mail delivery failed'
    await sql`
      UPDATE market_prospect_outreach
      SET delivery_error=${detail.slice(0,1000)},last_activity_at=NOW()
      WHERE id=${outreach.id}::uuid
    `
    throw error
  }
}

export async function runAdministrationEmailMovement(input:{
  adminId:string
  limit?:number
}){
  await ensureMarketTables()
  const limit=Math.max(1,Math.min(FLAME_EMAIL_DAILY_MAX,Math.trunc(input.limit||FLAME_EMAIL_DAILY_DEFAULT)))
  const client=await getPool().connect()
  const queued:string[]=[]
  try{
    await client.query('BEGIN')

    const retry=await client.query(
      `SELECT o.id
       FROM market_prospect_outreach o
       JOIN market_prospect_contacts c ON c.id=o.contact_id
       WHERE o.bridger_id=$1::uuid
         AND o.channel='email'
         AND o.status='pending'
         AND c.status<>'converted'
       ORDER BY o.created_at ASC
       LIMIT $2
       FOR UPDATE OF o SKIP LOCKED`,
      [input.adminId,limit],
    )
    for(const row of retry.rows)queued.push(row.id)

    const remaining=limit-queued.length
    if(remaining>0){
      const candidates=await client.query(
        `SELECT c.id,c.name,c.email
         FROM market_prospect_contacts c
         WHERE c.channel='email'
           AND c.status='available'
           AND c.package_id IS NULL
           AND c.email IS NOT NULL
           AND NOT EXISTS(SELECT 1 FROM market_prospect_outreach o WHERE o.contact_id=c.id)
         ORDER BY c.created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [remaining],
      )

      const bridge=await client.query(
        `SELECT id FROM bridge_ais
         WHERE bridger_id=$1::uuid AND status='active'
         ORDER BY created_at DESC LIMIT 1`,
        [input.adminId],
      )
      const bridgeAiId=bridge.rows[0]?.id||null

      for(const candidate of candidates.rows){
        const outreachId=crypto.randomUUID()
        await client.query(
          `INSERT INTO market_prospect_outreach(
             id,contact_id,bridger_id,bridge_ai_id,channel,status,message_sent
           ) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,'email','pending','')`,
          [outreachId,candidate.id,input.adminId,bridgeAiId],
        )
        await client.query(
          `UPDATE market_prospect_contacts SET status='contacted' WHERE id=$1::uuid`,
          [candidate.id],
        )
        queued.push(outreachId)
      }
    }

    await client.query('COMMIT')
  }catch(error){
    try{await client.query('ROLLBACK')}catch{}
    throw error
  }finally{
    client.release()
  }

  const report:{sent:number;failed:number;results:any[]}={sent:0,failed:0,results:[]}
  for(const outreachId of queued){
    try{
      const result=await sendEmailOutreach({outreachId,senderUserId:input.adminId})
      report.sent+=result.alreadySent?0:1
      report.results.push({outreachId,status:result.alreadySent?'already_sent':'sent'})
    }catch(error){
      report.failed+=1
      report.results.push({outreachId,status:'failed',error:error instanceof Error?error.message:'Delivery failed'})
    }
  }
  return {...report,queued:queued.length}
}
