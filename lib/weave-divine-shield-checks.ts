import { sql } from '@/lib/db'
import { getDivineShieldState, recordDeploymentRequest } from '@/lib/weave-infrastructure'
import { listWeaveDeploymentRecords } from '@/lib/weave-deployment-records'

export type ShieldCheckResult={name:string;passed:boolean;detail:string}
const validSha=(value:string)=>/^[0-9a-f]{40}$/i.test(value)
const releaseSha=()=>String(process.env.WEAVE_RELEASE_SHA||'').trim().toLowerCase()

/** Only a check for the current raised cycle, release SHA and last 15 minutes can unlock work. */
export async function getDivineShieldReadiness(){
  const shield=await getDivineShieldState()
  const sha=releaseSha()
  if(!shield.active||!shield.updatedAt||!validSha(sha)){
    return {ready:false,releaseSha:validSha(sha)?sha:null,checkedAt:null,checks:[] as ShieldCheckResult[]}
  }
  const rows=await sql`
    SELECT status,details,created_at
    FROM weave_deployment_requests
    WHERE action='divine_shield_check'
      AND source_ref=${sha}
      AND details->>'raisedAt'=${shield.updatedAt}
    ORDER BY created_at DESC,id DESC LIMIT 1
  `
  const row=rows[0]
  const checks=Array.isArray(row?.details?.checks)?row.details.checks as ShieldCheckResult[]:[]
  const checkedAt=row?.created_at?new Date(row.created_at).toISOString():null
  return {
    ready: Boolean(row?.status==='healthy'&&checkedAt&&Date.now()-new Date(checkedAt).getTime()<15*60*1000),
    releaseSha:sha,checkedAt,checks,
  }
}

/** Audited, non-destructive smoke checks. This action never deploys or changes role/session data. */
export async function runDivineShieldChecks(adminId:string){
  const shield=await getDivineShieldState()
  if(!shield.active||!shield.updatedAt)throw Error('Raise Divine Shield before performing release checks')
  const sha=releaseSha()
  const checks:ShieldCheckResult[]=[]
  checks.push({name:'Release identity',passed:validSha(sha),
    detail:validSha(sha)?'Production release SHA is present':'Server has not reported a verified 40-character release SHA'})

  try{
    const rows=await sql`SELECT 1 AS ready FROM weave_platform_controls WHERE control_key='divine_shield' AND enabled=TRUE`
    checks.push({name:'Infrastructure control',passed:rows.length===1,
      detail:rows.length===1?'Persistent Shield control is reachable':'Raised Shield control not confirmed'})
  }catch{
    checks.push({name:'Infrastructure control',passed:false,detail:'Database control unavailable'})
  }

  try{
    // Read-only continuity check: no user records or session tokens are returned.
    await sql`SELECT COUNT(*)::int AS active_sessions FROM sessions WHERE expires_at>NOW()`
    checks.push({name:'Session continuity',passed:true,detail:'Persistent session ledger is accessible without session revocation'})
  }catch{
    checks.push({name:'Session continuity',passed:false,detail:'Session ledger cannot be verified'})
  }

  try{
    const records=await listWeaveDeploymentRecords(100)
    const matched=validSha(sha)&&records.some((r:any)=>String(r.release_sha).toLowerCase()===sha &&
      ['healthy','rolled_back'].includes(String(r.status)))
    checks.push({name:'Deployment record',passed:Boolean(matched),
      detail:matched?'Current release has a recorded healthy deployment':'No verified healthy deployment record for the current release'})
  }catch{
    checks.push({name:'Deployment record',passed:false,detail:'Deployment audit could not be read'})
  }

  try{
    // Fixed, company-configured public origin; never accept an arbitrary URL from the browser.
    const host=String(process.env.WEAVE_DOMAIN||'weavingsystem.online').replace(/^https?:\/\//,'').replace(/\/$/,'')
    if(!/^[a-z0-9.-]+(?::[0-9]{1,5})?$/i.test(host))throw Error('Invalid company domain configuration')
    const response=await fetch('https://'+host+'/api/health',{
      cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000),
    })
    const body=await response.json()
    const matched=response.ok&&body?.status==='healthy'&&validSha(sha)&&
      String(body.releaseSha||'').toLowerCase()===sha
    checks.push({name:'Public release health',passed:Boolean(matched),
      detail:matched?'Live public health reports the exact deployed release':'Public health or deployed SHA does not match the current server'})
  }catch{
    checks.push({name:'Public release health',passed:false,detail:'Live public health could not be verified'})
  }

  const passed=checks.every(item=>item.passed)
  await recordDeploymentRequest({
    action:'divine_shield_check',sourceRef:validSha(sha)?sha:'unverified',
    status:passed?'healthy':'failed',adminId,
    details:{raisedAt:shield.updatedAt,releaseSha:validSha(sha)?sha:null,checks},
  })
  return {passed,releaseSha:validSha(sha)?sha:null,checks}
}
