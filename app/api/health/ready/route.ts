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
export async function GET(){
 const checks={database:false,media:false}
 try{
  const result=await getPool().query({text:'SELECT 1 AS ready',query_timeout:3000})
  checks.database=result.rows[0]?.ready===1
 }catch(error){console.error('[weave readiness] DB unavailable',error instanceof Error?error.message:'unavailable')}
 try{
  const root=process.env.WEAVE_MEDIA_ROOT||'/var/lib/weave/media'
  const info=await stat(root)
  if(info.isDirectory()){
   await access(root,constants.R_OK|constants.W_OK)
   checks.media=true
  }
 }catch{ /* Not mounted or not writable; do not invent healthy storage. */ }
 const ready=checks.database&&checks.media
 return NextResponse.json({
  status:ready?'ready':'blocked',
  releaseSha:/^[0-9a-f]{40}$/i.test(process.env.WEAVE_RELEASE_SHA||'')?
    process.env.WEAVE_RELEASE_SHA:null,
  checks,
 },{status:ready?200:503,headers:{'Cache-Control':'no-store, max-age=0'}})
}
