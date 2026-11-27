import {NextResponse} from 'next/server'
import {access,stat} from 'node:fs/promises'
import {constants} from 'node:fs'
import {getPool} from '@/lib/db'

export const runtime='nodejs'
export const dynamic='force-dynamic'

/**
 * Read-only operational readiness. Unlike /api/health (process liveness),
 * this verifies the database path and the persistent media mount.
 * Does not disclose DB addresses, secrets, environment variables, or user data.
 */
let lastCheck:Promise<{checks:{database:boolean;accounts:boolean;media:boolean};ready:boolean}>|null=null
let lastAt=0
async function actualReadiness(){
 const checks={database:false,accounts:false,media:false}
 try{
  const result=await getPool().query('SELECT 1 AS ready')
  checks.database=result.rows[0]?.ready===1
  const accounts=await getPool().query('SELECT EXISTS(SELECT 1 FROM users) AS accounts')
  checks.accounts=accounts.rows[0]?.accounts===true
 }catch(error){console.error('[weave readiness] DB unavailable',error instanceof Error?error.message:'unavailable')}
 try{
  const root=process.env.WEAVE_MEDIA_ROOT||'/var/lib/weave/media'
  const info=await stat(root)
  if(info.isDirectory()){
   await access(root,constants.R_OK|constants.W_OK)
   checks.media=true
  }
 }catch{ /* Not mounted or not writable; do not invent healthy storage. */ }
 const ready=checks.database&&checks.accounts&&checks.media
 return {checks,ready}
}
export async function GET(){
 if(!lastCheck||Date.now()-lastAt>10000){
  lastAt=Date.now()
  lastCheck=actualReadiness().catch(error=>{lastCheck=null;throw error})
 }
 const {checks,ready}=await lastCheck
 return NextResponse.json({
  status:ready?'ready':'blocked',
  releaseSha:/^[0-9a-f]{40}$/i.test(process.env.WEAVE_RELEASE_SHA||'')?
    process.env.WEAVE_RELEASE_SHA:null,
  checks,
  host:{
   provider:process.env.WEAVE_HOST_PROVIDER==='weave-owned'?'weave-owned':
    process.env.WEAVE_HOST_PROVIDER==='oracle'?'oracle':'unverified',
   nodeId:/^[a-z][a-z0-9-]{5,63}$/.test(process.env.WEAVE_SOVEREIGN_NODE_ID||'')?
    process.env.WEAVE_SOVEREIGN_NODE_ID:null,
  },
 },{status:ready?200:503,headers:{'Cache-Control':'no-store, max-age=0'}})
}
