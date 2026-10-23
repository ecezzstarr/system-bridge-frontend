import {NextRequest,NextResponse} from 'next/server'
import {timingSafeEqual} from 'node:crypto'
import {claimReleaseJob,completeReleaseJob} from '@/lib/weave-release-workshop'
export const dynamic='force-dynamic'
export const runtime='nodejs'

function authorized(req:NextRequest){
  const expected=process.env.WEAVE_RELEASE_CONTROL_TOKEN||''
  const actual=(req.headers.get('authorization')||'').replace(/^Bearer /,'')
  if(expected.length<32||actual.length!==expected.length||Buffer.byteLength(actual)!==Buffer.byteLength(expected))return false
  return timingSafeEqual(Buffer.from(actual),Buffer.from(expected))
}
export async function POST(req:NextRequest){
  if(!process.env.WEAVE_RELEASE_CONTROL_TOKEN||process.env.WEAVE_RELEASE_CONTROL_TOKEN.length<32)
    return NextResponse.json({error:'Release worker not configured'},{status:503})
  if(!authorized(req))return NextResponse.json({error:'Release worker denied'},{status:401})
  try{
    const body=await req.json()
    const action=String(body?.action||'')
    if(action==='claim'){
      // An older Oracle worker ignores a queued pinned target and would deploy
      // whichever main SHA it sees at claim time. Refuse all legacy workers.
      if(!Array.isArray(body.capabilities)||!body.capabilities.includes('pinned-main-v2'))
        return NextResponse.json({error:'Oracle release worker must support pinned-main-v2 before claiming jobs'},{status:409})
      const workerKey=String(body.workerKey||'').slice(0,120)
      if(!/^[a-z0-9][a-z0-9._-]{2,119}$/i.test(workerKey))
        return NextResponse.json({error:'Worker identifier invalid'},{status:400})
      const job=await claimReleaseJob(workerKey)
      return NextResponse.json({success:true,job},{headers:{'Cache-Control':'no-store'}})
    }
    if(action==='complete'){
      if(!['healthy','rolled_back','failed'].includes(body.status))
        return NextResponse.json({error:'Invalid result'},{status:400})
      const job=await completeReleaseJob({
        id:String(body.id||''),leaseToken:String(body.leaseToken||''),
        status:body.status,resolvedSha:body.resolvedSha,previousSha:body.previousSha,
        verification:String(body.verification||''),
      })
      return NextResponse.json({success:true,job},{headers:{'Cache-Control':'no-store'}})
    }
    return NextResponse.json({error:'Unsupported worker action'},{status:400})
  }catch(error:any){
    console.error('[Release worker]',error)
    return NextResponse.json({error:error?.message||'Release worker request failed'},{status:400})
  }
}
