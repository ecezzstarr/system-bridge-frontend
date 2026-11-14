import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto'
import {getPool} from '@/lib/db'

/**
 * Hope's connected WhatsApp Business numbers are separate from the WEAVE Number
 * Bay inventory. A provider-approved Meta Embedded Signup is the ONLY proof of
 * phone ownership. Neither a WEAVE File Number nor an entered SMS code grants access.
 */
export const HOPE_WA_HEADERS={'Cache-Control':'private, no-store, max-age=0'}
export const HOPE_WA_COOKIELESS=true

export function whatsappMetaSettings(){
 const appId=process.env.NEXT_PUBLIC_WEAVE_META_APP_ID||''
 const configId=process.env.NEXT_PUBLIC_WEAVE_META_CONFIG_ID||''
 const appSecret=process.env.WEAVE_META_APP_SECRET||''
 const verifyToken=process.env.WEAVE_META_WEBHOOK_VERIFY_TOKEN||''
 const encryptionKey=process.env.WEAVE_WHATSAPP_TOKEN_ENCRYPTION_KEY||''
 const version=process.env.WEAVE_META_GRAPH_VERSION||'v25.0'
 const valid=/^v[0-9]{1,2}\.[0-9]{1,2}$/.test(version)
 const connected=Boolean(/^\d{8,25}$/.test(appId)&&configId&&appSecret&&verifyToken&&
  /^[A-Za-z0-9_-]{8,150}$/.test(configId)&&valid&&/^[0-9a-f]{64}$/i.test(encryptionKey))
 return {appId,configId,appSecret,verifyToken,encryptionKey,version,configured:connected}
}

function secretKey(){
 const hex=process.env.WEAVE_WHATSAPP_TOKEN_ENCRYPTION_KEY||''
 if(!/^[0-9a-f]{64}$/i.test(hex))throw new Error('Company WhatsApp encryption key has not been configured')
 return Buffer.from(hex,'hex')
}
export function encryptWhatsAppToken(value:string){
 if(!value||value.length>4096)throw new Error('Invalid Meta business token')
 const iv=randomBytes(12)
 const cipher=createCipheriv('aes-256-gcm',secretKey(),iv)
 const ct=Buffer.concat([cipher.update(value,'utf8'),cipher.final()])
 return [iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),ct.toString('base64url')].join('.')
}
export function decryptWhatsAppToken(value:string){
 const [iv,tag,ciphertext]=value.split('.')
 if(!iv||!tag||!ciphertext)throw new Error('Invalid encrypted business credential')
 const decipher=createDecipheriv('aes-256-gcm',secretKey(),Buffer.from(iv,'base64url'))
 decipher.setAuthTag(Buffer.from(tag,'base64url'))
 return Buffer.concat([decipher.update(Buffer.from(ciphertext,'base64url')),decipher.final()]).toString('utf8')
}

export async function ensureHopeWhatsappSchema(){
 const db=getPool()
 await db.query("CREATE TABLE IF NOT EXISTS hope_whatsapp_channels ("+
  "id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"+
  "bridger_id uuid NOT NULL UNIQUE REFERENCES users(id),"+
  "waba_id varchar(40) NOT NULL,phone_number_id varchar(40) NOT NULL UNIQUE,"+
  "display_phone_number varchar(40) NOT NULL,verified_name varchar(255),"+
  "token_ciphertext text NOT NULL,"+
  "status varchar(30) NOT NULL DEFAULT 'pending_registration' "+
    "CHECK (status IN ('pending_registration','connected','disconnected')),"+
  "created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())")
 await db.query("CREATE TABLE IF NOT EXISTS hope_whatsapp_threads ("+
  "id uuid PRIMARY KEY DEFAULT gen_random_uuid(),channel_id uuid NOT NULL REFERENCES hope_whatsapp_channels(id),"+
  "remote_wa_id varchar(32) NOT NULL,display_name varchar(255),last_inbound_at timestamptz,"+
  "last_message_at timestamptz NOT NULL DEFAULT now(),"+
  "UNIQUE(channel_id,remote_wa_id))")
 await db.query("CREATE INDEX IF NOT EXISTS hope_whatsapp_threads_activity "+
  "ON hope_whatsapp_threads(channel_id,last_message_at DESC)")
 await db.query("CREATE TABLE IF NOT EXISTS hope_whatsapp_messages ("+
  "id uuid PRIMARY KEY DEFAULT gen_random_uuid(),thread_id uuid NOT NULL REFERENCES hope_whatsapp_threads(id),"+
  "provider_message_id varchar(255) UNIQUE,client_request_id uuid UNIQUE,"+
  "direction varchar(12) NOT NULL CHECK(direction IN ('inbound','outbound')),"+
  "message_type varchar(40) NOT NULL DEFAULT 'text',body text NOT NULL,"+
  "delivery_status varchar(40) NOT NULL DEFAULT 'received',"+
  "created_at timestamptz NOT NULL DEFAULT now())")
 await db.query("CREATE INDEX IF NOT EXISTS hope_whatsapp_messages_thread "+
  "ON hope_whatsapp_messages(thread_id,created_at ASC)")
}

export function digits(value:unknown){
 const v=String(value||'').replace(/[^0-9]/g,'')
 return /^[1-9][0-9]{7,14}$/.test(v)?v:null
}
export function graphUrl(path:string){
 const s=whatsappMetaSettings()
 if(!/^\/[0-9A-Za-z_/-]+$/.test(path))throw new Error('Unsafe Meta Graph path')
 return 'https://graph.facebook.com/'+s.version+path
}
export async function metaGraph(path:string,token:string,options?:{method?:'GET'|'POST';body?:unknown}){
 const method=options?.method||'GET'
 const url=graphUrl(path)
 const response=await fetch(url,{
  method,headers:{Authorization:'Bearer '+token,...(options?.body?{'Content-Type':'application/json'}:{})},
  ...(options?.body?{body:JSON.stringify(options.body)}:{}),
  cache:'no-store',signal:AbortSignal.timeout(15000)
 })
 const result=await response.json().catch(()=>({}))
 if(!response.ok)throw new Error('Meta WhatsApp connection could not complete ('+response.status+'). Check the approved business setup.')
 return result
}
export async function ownerChannel(bridgerId:string){
 const {rows}=await getPool().query(
  "SELECT id,bridger_id,waba_id,phone_number_id,display_phone_number,verified_name,status,token_ciphertext "+
  "FROM hope_whatsapp_channels WHERE bridger_id=$1::uuid LIMIT 1",[bridgerId])
 return rows[0]||null
}
export function publicChannel(row:any){
 return row?{id:row.id,phoneNumber:row.display_phone_number,
  verifiedName:row.verified_name,status:row.status}:null
}
