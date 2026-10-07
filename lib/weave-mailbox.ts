import crypto from 'node:crypto'
import { sql, getPool } from '@/lib/db'
import { normalizeMailAddress, verifyGoogleMailbox } from '@/lib/weave-mail'

function credentialKey(){
  const source=String(process.env.WEAVE_MAIL_CREDENTIAL_KEY||process.env.NEXTAUTH_SECRET||'').trim()
  if((!source||source==='your-secret-key-change-in-production')&&process.env.NODE_ENV==='production'){
    throw new Error('WEAVE mail credential encryption key is not configured')
  }
  return crypto.createHash('sha256').update(source||'weave-local-mail-credential').digest()
}

function encryptSecret(value:string){
  const iv=crypto.randomBytes(12)
  const cipher=crypto.createCipheriv('aes-256-gcm',credentialKey(),iv)
  const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()])
  const tag=cipher.getAuthTag()
  return [iv,tag,encrypted].map(part=>part.toString('base64url')).join('.')
}

function decryptSecret(value:string){
  const [ivPart,tagPart,dataPart]=String(value||'').split('.')
  if(!ivPart||!tagPart||!dataPart)throw new Error('Stored mailbox credential is invalid')
  const decipher=crypto.createDecipheriv('aes-256-gcm',credentialKey(),Buffer.from(ivPart,'base64url'))
  decipher.setAuthTag(Buffer.from(tagPart,'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(dataPart,'base64url')),decipher.final()]).toString('utf8')
}

let mailboxSchemaPromise:Promise<void>|null=null
export async function ensureWeaveMailboxSchema(){
  if(!mailboxSchemaPromise)mailboxSchemaPromise=(async()=>{
    const client=await getPool().connect()
    try{
      await client.query('BEGIN')
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['weave_mailbox_schema_v1'])
  await client.query(`
    CREATE TABLE IF NOT EXISTS weave_mailboxes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner_role varchar(32) NOT NULL,
      email varchar(255) NOT NULL,
      provider varchar(32) NOT NULL DEFAULT 'google',
      credential_ciphertext text NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'connected',
      verified_at timestamptz,
      last_sent_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE(owner_user_id)
    )
  `)
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_weave_mailboxes_email ON weave_mailboxes(LOWER(email))`)
      await client.query('COMMIT')
    }catch(error){
      await client.query('ROLLBACK').catch(()=>{})
      throw error
    }finally{client.release()}
  })().catch(error=>{mailboxSchemaPromise=null;throw error})
  return mailboxSchemaPromise
}

export async function connectGoogleMailbox(input:{
  userId:string
  role:string
  email:string
  appPassword:string
}){
  await ensureWeaveMailboxSchema()
  const email=normalizeMailAddress(input.email)
  const appPassword=String(input.appPassword||'').replace(/\s+/g,'')
  const encrypted=encryptSecret(appPassword)
  await verifyGoogleMailbox({email,appPassword,fromName:input.role==='admin'?'WeaveBridge - Weave of Presence':'WEAVE Bridger'})

  const rows=await sql`
    INSERT INTO weave_mailboxes(owner_user_id,owner_role,email,credential_ciphertext,status,verified_at,updated_at)
    VALUES(${input.userId}::uuid,${input.role},${email},${encrypted},'connected',NOW(),NOW())
    ON CONFLICT(owner_user_id) DO UPDATE SET
      owner_role=EXCLUDED.owner_role,
      email=EXCLUDED.email,
      credential_ciphertext=EXCLUDED.credential_ciphertext,
      status='connected',
      verified_at=NOW(),
      updated_at=NOW()
    RETURNING id,email,provider,status,verified_at,last_sent_at
  `
  return rows[0]
}

export async function disconnectGoogleMailbox(userId:string){
  await ensureWeaveMailboxSchema()
  const rows=await sql`
    UPDATE weave_mailboxes
    SET status='disconnected',credential_ciphertext='',updated_at=NOW()
    WHERE owner_user_id=${userId}::uuid
    RETURNING id,email,status
  `
  return rows[0]||null
}

export async function getMailboxSummary(userId:string){
  await ensureWeaveMailboxSchema()
  const rows=await sql`
    SELECT id,email,provider,status,verified_at,last_sent_at
    FROM weave_mailboxes
    WHERE owner_user_id=${userId}::uuid
    LIMIT 1
  `
  return rows[0]||null
}

export async function getConnectedMailboxCredential(userId:string){
  await ensureWeaveMailboxSchema()
  const rows=await sql`
    SELECT id,email,owner_role,credential_ciphertext
    FROM weave_mailboxes
    WHERE owner_user_id=${userId}::uuid AND status='connected'
    LIMIT 1
  `
  const row=rows[0]
  if(!row)return null
  return {
    id:row.id as string,
    email:row.email as string,
    fromName:row.owner_role==='admin'?'WeaveBridge - Weave of Presence':'WEAVE Bridger',
    appPassword:decryptSecret(row.credential_ciphertext as string),
  }
}

export async function getConnectedMailboxCredentialById(mailboxId:string){
  await ensureWeaveMailboxSchema()
  const rows=await sql`
    SELECT id,email,owner_role,credential_ciphertext
    FROM weave_mailboxes
    WHERE id=${mailboxId}::uuid AND status='connected'
    LIMIT 1
  `
  const row=rows[0]
  if(!row)return null
  return {
    id:row.id as string,
    email:row.email as string,
    fromName:row.owner_role==='admin'?'WeaveBridge - Weave of Presence':'WEAVE Bridger',
    appPassword:decryptSecret(row.credential_ciphertext as string),
  }
}

export async function getAdministrationGoogleMailboxCredential(){
  await ensureWeaveMailboxSchema()
  const rows=await sql`
    SELECT id,email,owner_role,credential_ciphertext
    FROM weave_mailboxes
    WHERE owner_role='admin' AND status='connected'
    ORDER BY verified_at DESC NULLS LAST,updated_at DESC
    LIMIT 1
  `
  const row=rows[0]
  if(!row)return null
  return {
    id:row.id as string,
    email:row.email as string,
    fromName:'WeaveBridge - Weave of Presence',
    appPassword:decryptSecret(row.credential_ciphertext as string),
  }
}

export async function markMailboxSent(mailboxId:string){
  await sql`UPDATE weave_mailboxes SET last_sent_at=NOW(),updated_at=NOW() WHERE id=${mailboxId}::uuid`
}
