import 'server-only'
import {createHash} from 'node:crypto'

/**
 * A non-secret, private-admin-facing route identity. It asserts the candidate
 * and live app are CONFIGURED for the same DB endpoint, never that a snapshot
 * of rows, media, backups, or transactions is independently verified.
 *
 * Passwords, usernames and raw DB hosts are never emitted. Do not use for
 * authorizing financial movement or as a substitute for migration proof.
 */
export function databaseEndpointFingerprint(raw:string|undefined|null):string|null{
 if(!raw)return null
 try{
  const url=new URL(raw)
  if(url.protocol!=='postgres:'&&url.protocol!=='postgresql:')return null
  if(!url.hostname||!url.pathname||url.pathname==='/')return null
  const host=url.hostname.toLowerCase().replace(/\.$/,'')
  const db=decodeURIComponent(url.pathname.slice(1))
  if(!db||db.length>256||db.includes('/')||db.includes('\u0000'))return null
  const port=url.port||'5432'
  return createHash('sha256').update('WEAVE:db-endpoint:v1\0'+host+'\0'+port+'\0'+db,'utf8').digest('hex')
 }catch{return null}
}

export function currentDatabaseEndpointFingerprint(){
 return databaseEndpointFingerprint(process.env.DATABASE_URL)
}
