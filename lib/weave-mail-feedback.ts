import { once } from 'node:events'
import { createInterface } from 'node:readline'
import tls from 'node:tls'

import { getPool } from '@/lib/db'
import { ensureMarketTables } from '@/lib/market'
import {
  ensureWeaveMailboxSchema,
  getConnectedMailboxCredentialById,
} from '@/lib/weave-mailbox'
import type { GmailCredential } from '@/lib/weave-mail'

const IMAP_HOST='imap.gmail.com'
const IMAP_PORT=993
const IMAP_TIMEOUT_MS=15_000

function quoteImap(value:string){
  return '"' + value.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/[\r\n]+/g,' ') + '"'
}

async function readTagged(lines:AsyncIterator<string>,tag:string){
  const received:string[]=[]
  while(true){
    const next=await lines.next()
    if(next.done)throw new Error('Google mailbox connection closed unexpectedly')
    const line=String(next.value||'')
    received.push(line)
    if(line.startsWith(tag+' ')){
      if(!new RegExp('^'+tag+' OK\\b','i').test(line)){
        console.error('[weave-mail-feedback] IMAP command rejected',received.join(' | ').slice(0,600))
        throw new Error('Google mailbox reply check was rejected')
      }
      return received
    }
  }
}

async function withImapSession<T>(credential:GmailCredential,work:(ctx:{
  command:(statement:string)=>Promise<string[]>
})=>Promise<T>){
  const email=String(credential.email||'').trim().toLowerCase()
  const appPassword=String(credential.appPassword||'').replace(/\s+/g,'')
  if(!email||!appPassword)throw new Error('Google mailbox credentials are incomplete')

  const socket=tls.connect({
    host:IMAP_HOST,
    port:IMAP_PORT,
    servername:IMAP_HOST,
    rejectUnauthorized:true,
  })
  socket.setTimeout(IMAP_TIMEOUT_MS,()=>socket.destroy(new Error('Google mailbox reply check timed out')))

  try{
    await once(socket,'secureConnect')
    const reader=createInterface({input:socket,crlfDelay:Infinity})
    const lines=reader[Symbol.asyncIterator]()
    let seq=0
    const command=async(statement:string)=>{
      const tag='W'+String(++seq).padStart(4,'0')
      socket.write(`${tag} ${statement}\r\n`)
      return readTagged(lines,tag)
    }
    try{
      const greeting=await lines.next()
      if(greeting.done||!/^\* (OK|PREAUTH)\b/i.test(String(greeting.value||''))){
        throw new Error('Google mailbox did not accept the IMAP connection')
      }
      await command(`LOGIN ${quoteImap(email)} ${quoteImap(appPassword)}`)
      await command('EXAMINE INBOX')
      return await work({command})
    }finally{
      try{await command('LOGOUT')}catch{}
      reader.close()
    }
  }finally{
    socket.end()
    socket.destroy()
  }
}

async function findReplies(credential:GmailCredential,messageIds:string[]){
  return withImapSession(credential,async({command})=>{
    const replied=new Set<string>()
    for(const messageId of messageIds){
      const lines=await command(`UID SEARCH HEADER In-Reply-To ${quoteImap(messageId)}`)
      const search=lines.find(line=>/^\* SEARCH(?:\s|$)/i.test(line))
      if(search&&search.trim().split(/\s+/).slice(2).some(Boolean))replied.add(messageId)
    }
    return replied
  })
}

export async function syncEmailOutreachFeedback(input:{
  ownerUserId?:string|null
  limit?:number
}={}){
  await Promise.all([ensureMarketTables(),ensureWeaveMailboxSchema()])
  const limit=Math.max(1,Math.min(500,Math.trunc(input.limit||250)))
  const pool=getPool()
  const rows=(await pool.query(
    `SELECT
       o.id,
       o.provider_message_id,
       o.sender_mailbox_id,
       m.owner_user_id
     FROM market_prospect_outreach o
     JOIN weave_mailboxes m ON m.id=o.sender_mailbox_id
     WHERE o.channel='email'
       AND o.status IN ('sent','opened')
       AND o.provider_message_id IS NOT NULL
       AND m.status='connected'
       AND ($1::uuid IS NULL OR m.owner_user_id=$1::uuid)
     ORDER BY o.sent_at DESC NULLS LAST
     LIMIT $2`,
    [input.ownerUserId||null,limit],
  )).rows

  const grouped=new Map<string,typeof rows>()
  for(const row of rows){
    const key=String(row.sender_mailbox_id)
    const group=grouped.get(key)||[]
    group.push(row)
    grouped.set(key,group)
  }

  let checked=0
  let responded=0
  const errors:{mailboxId:string;error:string}[]=[]

  for(const [mailboxId,group] of grouped){
    try{
      const credential=await getConnectedMailboxCredentialById(mailboxId)
      if(!credential)continue
      const ids=group.map(row=>String(row.provider_message_id))
      const replies=await findReplies(credential,ids)
      checked+=ids.length
      for(const row of group){
        if(!replies.has(String(row.provider_message_id)))continue
        const updated=await pool.query(
          `UPDATE market_prospect_outreach
           SET status='responded',reply_detected_at=COALESCE(reply_detected_at,NOW()),last_activity_at=NOW()
           WHERE id=$1::uuid AND status IN ('sent','opened')
           RETURNING id`,
          [row.id],
        )
        responded+=updated.rowCount||0
      }
    }catch(error){
      errors.push({mailboxId,error:error instanceof Error?error.message:'Reply sync failed'})
    }
  }

  return {checked,responded,mailboxes:grouped.size,errors}
}
