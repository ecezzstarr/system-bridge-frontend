import crypto from 'node:crypto'

import { getPool, sql } from './db'

export const WHATSAPP_PROSPECT_UNIT_PRICE = 1.1
export const EMAIL_PROSPECT_UNIT_PRICE = WHATSAPP_PROSPECT_UNIT_PRICE / 2

export type ProspectChannel='whatsapp'|'email'

function fingerprintSecret(){
  const configured=String(process.env.PROSPECT_FINGERPRINT_SECRET||process.env.NEXTAUTH_SECRET||'').trim()
  if((!configured||configured==='your-secret-key-change-in-production')&&process.env.NODE_ENV==='production'){
    throw new Error('Prospect fingerprint secret is not configured')
  }
  return configured||'weave-local-prospect-fingerprint'
}

export function normalizeProspectEmail(value:unknown){
  return String(value||'').trim().toLowerCase()
}

export function isValidProspectEmail(value:string){
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
}

export function makeProspectFingerprint(kind:ProspectChannel,value:string){
  const normalized=kind==='email'
    ? normalizeProspectEmail(value)
    : String(value||'').replace(/\D/g,'')
  return crypto.createHmac('sha256',fingerprintSecret()).update(`${kind}:${normalized}`).digest('hex')
}

export async function ensureMarketTables() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS market_prospect_packages (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        created_by UUID NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL DEFAULT 'Prospect Package',
        description TEXT,
        price_trx NUMERIC(20,6) NOT NULL DEFAULT 1.1,
        channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        purchased_by UUID REFERENCES users(id),
        purchased_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `
    await sql`ALTER TABLE market_prospect_packages ADD COLUMN IF NOT EXISTS channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp'`

    await sql`
      CREATE TABLE IF NOT EXISTS market_prospect_contacts (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        package_id UUID REFERENCES market_prospect_packages(id) ON DELETE CASCADE,
        name VARCHAR(255),
        phone VARCHAR(50),
        whatsapp_number VARCHAR(20),
        email VARCHAR(255),
        channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
        contact_fingerprint VARCHAR(64),
        source_platform VARCHAR(50) DEFAULT 'engine',
        status VARCHAR(20) NOT NULL DEFAULT 'available',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `
    await sql`ALTER TABLE market_prospect_contacts ALTER COLUMN phone DROP NOT NULL`
    await sql`ALTER TABLE market_prospect_contacts ADD COLUMN IF NOT EXISTS email VARCHAR(255)`
    await sql`ALTER TABLE market_prospect_contacts ADD COLUMN IF NOT EXISTS channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp'`
    await sql`ALTER TABLE market_prospect_contacts ADD COLUMN IF NOT EXISTS contact_fingerprint VARCHAR(64)`
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_market_prospect_contact_fingerprint
      ON market_prospect_contacts(contact_fingerprint)
      WHERE contact_fingerprint IS NOT NULL
    `
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_market_prospect_email_unique
      ON market_prospect_contacts(LOWER(email))
      WHERE email IS NOT NULL
    `

    await sql`
      CREATE TABLE IF NOT EXISTS market_prospect_audit (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        package_id UUID REFERENCES market_prospect_packages(id),
        actor_id UUID REFERENCES users(id),
        action VARCHAR(50) NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS prospect_number_series (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        source_number VARCHAR(20) NOT NULL,
        series_start VARCHAR(20) NOT NULL,
        series_end VARCHAR(20) NOT NULL,
        count INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'processing',
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS market_prospect_outreach (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        contact_id UUID NOT NULL REFERENCES market_prospect_contacts(id),
        bridger_id UUID NOT NULL REFERENCES users(id),
        bridge_ai_id UUID REFERENCES bridge_ais(id),
        channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
        sender_mailbox_id UUID,
        provider_message_id VARCHAR(255),
        delivery_error TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        message_sent TEXT,
        sent_at TIMESTAMPTZ,
        last_activity_at TIMESTAMPTZ DEFAULT now(),
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `
    await sql`ALTER TABLE market_prospect_outreach ADD COLUMN IF NOT EXISTS channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp'`
    await sql`ALTER TABLE market_prospect_outreach ADD COLUMN IF NOT EXISTS sender_mailbox_id UUID`
    await sql`ALTER TABLE market_prospect_outreach ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(255)`
    await sql`ALTER TABLE market_prospect_outreach ADD COLUMN IF NOT EXISTS delivery_error TEXT`

    return true
  } catch (error) {
    console.error('Failed to ensure market tables:', error)
    return false
  }
}

export async function addEmailProspects(adminId:string,emails:string[],source='email_engine'){
  await ensureMarketTables()
  const unique=[...new Set(emails.map(normalizeProspectEmail).filter(isValidProspectEmail))]
  const added:any[]=[]
  const existing:string[]=[]
  for(const email of unique){
    const fingerprint=makeProspectFingerprint('email',email)
    const rows=await sql`
      INSERT INTO market_prospect_contacts(
        email,channel,contact_fingerprint,source_platform,status,notes
      )
      VALUES(
        ${email},'email',${fingerprint},${source},'available',
        'Email Prospect candidate. Reachability and interest become known through real outreach.'
      )
      ON CONFLICT DO NOTHING
      RETURNING id,email,channel,status,created_at
    `
    if(rows[0])added.push(rows[0])
    else existing.push(email)
  }
  await sql`
    INSERT INTO market_prospect_audit(package_id,actor_id,action,details)
    VALUES(NULL,${adminId}::uuid,'email_prospect_intake',
      jsonb_build_object('submitted',${unique.length}::int,'added',${added.length}::int,'duplicates',${existing.length}::int))
  `
  return {submitted:unique.length,added,duplicates:existing}
}

export async function createProspectPackage(
  adminId:string,
  contactIds:string[],
  priceTrx?:number,
  channel?:ProspectChannel,
){
  await ensureMarketTables()
  const client=await getPool().connect()
  try{
    await client.query('BEGIN')
    const state=await client.query(
      `SELECT id,channel,status
       FROM market_prospect_contacts
       WHERE id=ANY($1::uuid[])
       FOR UPDATE`,
      [contactIds],
    )
    if(state.rows.length!==contactIds.length){
      await client.query('ROLLBACK')
      throw new Error('One or more Prospects do not exist')
    }
    if(state.rows.some((contact:any)=>contact.status!=='available')){
      await client.query('ROLLBACK')
      throw new Error('One or more Prospects are no longer available')
    }

    const channels=[...new Set(state.rows.map((contact:any)=>String(contact.channel||'whatsapp')))]
    if(channels.length!==1){
      await client.query('ROLLBACK')
      throw new Error('Create separate packages for WhatsApp and email Prospects')
    }
    const resolvedChannel=(channel||channels[0]) as ProspectChannel
    if(resolvedChannel!=='whatsapp'&&resolvedChannel!=='email'){
      await client.query('ROLLBACK')
      throw new Error('Unsupported Prospect channel')
    }
    if(resolvedChannel!==channels[0]){
      await client.query('ROLLBACK')
      throw new Error('Package channel does not match selected Prospects')
    }

    const unitPrice=resolvedChannel==='email'?EMAIL_PROSPECT_UNIT_PRICE:WHATSAPP_PROSPECT_UNIT_PRICE
    const finalPrice=resolvedChannel==='email'
      ? Math.round((contactIds.length*EMAIL_PROSPECT_UNIT_PRICE)*1e6)/1e6
      : typeof priceTrx==='number'&&Number.isFinite(priceTrx)&&priceTrx>0
        ? priceTrx
        : Math.round((contactIds.length*unitPrice)*1e6)/1e6
    const label=resolvedChannel==='email'?'Email Prospect':'WhatsApp Prospect'
    const title=`${label} Package #${Math.floor(Math.random()*9000)+1000}`
    const description=`${contactIds.length} ${label} candidate${contactIds.length===1?'':'s'} organized through the WEAVE Prospect Engine. Reachability is confirmed only through real outreach.`

    const pkgResult=await client.query(
      `INSERT INTO market_prospect_packages(created_by,title,description,price_trx,channel,status)
       VALUES($1::uuid,$2,$3,$4,$5,'published')
       RETURNING *`,
      [adminId,title,description,finalPrice,resolvedChannel],
    )
    const pkg=pkgResult.rows[0]

    const assigned=await client.query(
      `UPDATE market_prospect_contacts
       SET package_id=$1::uuid,status='packaged'
       WHERE id=ANY($2::uuid[]) AND status='available'
       RETURNING id`,
      [pkg.id,contactIds],
    )
    if(assigned.rowCount!==contactIds.length)throw new Error('Prospect inventory changed during package creation')

    await client.query(
      `INSERT INTO market_prospect_audit(package_id,actor_id,action,details)
       VALUES($1::uuid,$2::uuid,'package_created',
         jsonb_build_object('channel',$3::text,'contact_count',$4::int,'price_flame_coin',$5::numeric))`,
      [pkg.id,adminId,resolvedChannel,contactIds.length,finalPrice],
    )

    await client.query('COMMIT')
    return pkg
  }catch(error){
    try{await client.query('ROLLBACK')}catch{}
    throw error
  }finally{
    client.release()
  }
}

export async function generateNumberSeries(adminId: string, sourceNumber: string, count: number) {
  await ensureMarketTables()

  const baseNum=sourceNumber.replace(/\D/g,'')
  if(baseNum.length<5)throw new Error('Invalid source number')

  const prefix=baseNum.slice(0,-3)
  const startSuffix=parseInt(baseNum.slice(-3))
  const contacts=[]
  for(let i=0;i<count;i++){
    const currentSuffix=(startSuffix+i).toString().padStart(3,'0')
    const phoneNumber=`+${prefix}${currentSuffix}`
    const fingerprint=makeProspectFingerprint('whatsapp',phoneNumber)

    const contact=await sql`
      INSERT INTO market_prospect_contacts(
        phone,whatsapp_number,channel,contact_fingerprint,source_platform,status,notes
      )
      SELECT
        ${phoneNumber},${phoneNumber},'whatsapp',${fingerprint},
        'number_engine_candidate','available',
        'Generated candidate. Reachability has not been independently verified.'
      WHERE NOT EXISTS(
        SELECT 1 FROM market_prospect_contacts
        WHERE COALESCE(NULLIF(TRIM(whatsapp_number),''),NULLIF(TRIM(phone),''))=${phoneNumber}
      )
      ON CONFLICT DO NOTHING
      RETURNING *
    `
    if(contact[0])contacts.push(contact[0])
  }

  const series=await sql`
    INSERT INTO prospect_number_series(source_number,series_start,series_end,count,status,created_by)
    VALUES(
      ${sourceNumber},
      ${contacts[0]?.phone||sourceNumber},
      ${contacts[contacts.length-1]?.phone||sourceNumber},
      ${contacts.length},
      'completed',
      ${adminId}::uuid
    )
    RETURNING *
  `

  return {series:series[0],contactsGenerated:contacts.length}
}

export async function linkOutreachToSession(outreachId:string,sessionId:string){
  await sql`
    UPDATE bridge_sessions SET outreach_id=${outreachId}::uuid WHERE id=${sessionId}::uuid
  `
  await sql`
    UPDATE market_prospect_outreach
    SET status='opened',last_activity_at=NOW()
    WHERE id=${outreachId}::uuid AND status='sent'
  `
}

export async function markProspectConverted(outreachId:string){
  await sql`
    UPDATE market_prospect_outreach
    SET status='converted',last_activity_at=NOW()
    WHERE id=${outreachId}::uuid
  `
  await sql`
    UPDATE market_prospect_contacts
    SET status='converted'
    WHERE id=(SELECT contact_id FROM market_prospect_outreach WHERE id=${outreachId}::uuid)
  `
}
