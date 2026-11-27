import {NextRequest,NextResponse} from 'next/server'
import {resolve4,resolve6} from 'node:dns/promises'
import {isIP} from 'node:net'
import {getPool} from '@/lib/db'
import {requireWorkshopAuthorization} from '@/lib/workshop-auth'
import {currentDatabaseEndpointFingerprint} from '@/lib/weave-sovereign-database-identity'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const noStore={'Cache-Control':'private, no-store'}
const HOST='weavingsystem.online'
const nodePattern=/^[a-z][a-z0-9-]{5,63}$/
const shaPattern=/^[0-9a-f]{40}$/i
const planIdPattern=/^[0-9a-f-]{36}$/i
function problem(message:string,status=409){
 return NextResponse.json({error:message},{status,headers:noStore})
}
function publicIpv4(value:unknown):value is string{
 if(typeof value!=='string'||isIP(value)!==4)return false
 const [a,b,c]=value.split('.').map(Number)
 return !(a===0||a===10||a===127||a>=224||
  a===100&&b>=64&&b<=127||
  a===169&&b===254||
  a===172&&b>=16&&b<=31||
  a===192&&(b===168||b===0||b===0&&c===2)||
  a===198&&(b===18||b===19||b===51&&c===100)||
  a===203&&b===0&&c===113)
}
let initializing:Promise<void>|null=null
async function ensure(){
 if(!initializing)initializing=(async()=>{
  await getPool().query("CREATE TABLE IF NOT EXISTS weave_host_transition_plans ("+
   "id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"+
   "node_id varchar(64) NOT NULL,target_ipv4 varchar(15) NOT NULL,"+
   "release_sha varchar(40) NOT NULL,stage varchar(24) NOT NULL "+
   "CHECK(stage IN ('prepared','authorized','dns_observed','confirmed','cancelled')),"+
   "created_by uuid NOT NULL REFERENCES users(id),approved_by uuid REFERENCES users(id),"+
   "confirmed_by uuid REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),"+
   "authorized_at timestamptz,dns_observed_at timestamptz,confirmed_at timestamptz,"+
   "company_attestations jsonb NOT NULL DEFAULT '{}'::jsonb)")
  await getPool().query("CREATE UNIQUE INDEX IF NOT EXISTS weave_single_unfinished_host_transition "+
   "ON weave_host_transition_plans ((true)) WHERE stage IN ('prepared','authorized','dns_observed')")
  await getPool().query("CREATE TABLE IF NOT EXISTS weave_host_transition_events ("+
   "id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,"+
   "plan_id uuid NOT NULL REFERENCES weave_host_transition_plans(id),"+
   "actor_id uuid NOT NULL REFERENCES users(id),"+
   "event varchar(32) NOT NULL,created_at timestamptz NOT NULL DEFAULT now())")
 })().catch(error=>{initializing=null;throw error})
 return initializing
}

async function dnsTargets(){
 const values=await resolve4(HOST)
 return values.filter(x=>isIP(x)===4)
}
async function suitableCandidate(nodeId:string,expectedSha?:string){
 const fingerprint=currentDatabaseEndpointFingerprint()
 if(!fingerprint)throw Error('The current production PostgreSQL connection is not identifiable')
 const rows=await getPool().query(
  "SELECT node_id,provider,release_sha,checks,ready,database_fingerprint,received_at "+
  "FROM weave_sovereign_server_reports WHERE node_id=$1 ORDER BY received_at DESC LIMIT 1",
  [nodeId])
 const node=rows.rows[0]
 const sha=process.env.WEAVE_RELEASE_SHA||''
 if(!node||node.provider!=='weave-owned'||!node.ready||
  Date.now()-new Date(node.received_at).getTime()>15*60*1000)
  throw Error('An independently ready Weave-owned candidate must report within fifteen minutes')
 if(node.database_fingerprint!==fingerprint)
  throw Error('Database continuity blocked: candidate is not configured for the same existing PostgreSQL endpoint')
 if(!shaPattern.test(sha)||node.release_sha!==sha||(expectedSha&&expectedSha!==sha))
  throw Error('Both hosts must report exactly the same verified production release SHA')
 return {node,sha}
}

async function verifyPublicDestination(plan:{node_id:string;target_ipv4:string;release_sha:string}){
 const targets=await dnsTargets()
 if(!targets.length||targets.some(ip=>ip!==plan.target_ipv4))
  throw Error('Every public IPv4 DNS record must point only to the approved Weave-owned host; mixed Oracle/candidate routing is not accepted')
 const ipv6=await resolve6(HOST).catch((error:NodeJS.ErrnoException)=>{
  if(error.code==='ENODATA'||error.code==='ENOTFOUND')return []
  throw error
 })
 if(ipv6.length)throw Error('Public IPv6 routing is not covered by this IPv4 transition; reconcile AAAA records before verification')
 const response=await fetch('https://'+HOST+'/api/health/ready',{
  cache:'no-store',signal:AbortSignal.timeout(7000),redirect:'error',
 })
 const evidence=await response.json().catch(()=>null)
 if(!response.ok||evidence?.status!=='ready'||evidence?.releaseSha!==plan.release_sha||
  evidence?.host?.provider!=='weave-owned'||evidence?.host?.nodeId!==plan.node_id||
  evidence?.checks?.database!==true||evidence?.checks?.accounts!==true||
  evidence?.checks?.media!==true)
  throw Error('Public destination did not pass approved host identity, database, media and exact release verification')
}

async function getPlans(){
 const result=await getPool().query(
  "SELECT id,node_id,target_ipv4,release_sha,stage,created_at,authorized_at,dns_observed_at,"+
  "confirmed_at,company_attestations FROM weave_host_transition_plans "+
  "ORDER BY created_at DESC LIMIT 16")
 return result.rows
}

/** Change the plan and write its audit event in one transaction. */
async function journalWrite(query:string,params:unknown[],actorId:string,event:string){
 const db=await getPool().connect()
 try{
  await db.query('BEGIN')
  const result=await db.query(query,params)
  if(!result.rowCount||!result.rows[0]?.id)throw Error('The migration plan changed. Refresh and review it again.')
  await db.query("INSERT INTO weave_host_transition_events(plan_id,actor_id,event) "+
   "VALUES($1::uuid,$2::uuid,$3)",[result.rows[0].id,actorId,event])
  await db.query('COMMIT')
  return result.rows[0]
 }catch(error){await db.query('ROLLBACK').catch(()=>{});throw error}
 finally{db.release()}
}

export async function GET(request:NextRequest){
 const auth=await requireWorkshopAuthorization(request)
 if(!auth.authorized)return auth.response
 try{
  await ensure()
  return NextResponse.json({success:true,plans:await getPlans(),
   liveHost:'Oracle until an authorized company cutover is independently executed',
   databaseRule:'First host move must use exactly the same production PostgreSQL database',
   dnsChangeSupported:false,
   note:'This workshop authorizes and verifies each manual host-transition step. It never edits DNS, the Oracle machine, payment credentials, the live database or the Release Workshop.'},
   {headers:noStore})
 }catch(error){return problem(error instanceof Error?error.message:'Transition register unavailable')}
}

export async function POST(request:NextRequest){
 const auth=await requireWorkshopAuthorization(request)
 if(!auth.authorized)return auth.response
 if(!request.headers.get('content-type')?.includes('application/json'))
  return problem('JSON request required',415)
 if(Number(request.headers.get('content-length')||0)>5000)return problem('Request too large',413)
 const body=await request.json().catch(()=>null)
 if(!body||typeof body!=='object'||Array.isArray(body))return problem('Valid manual step required',400)
 const actor=auth.session.user.id
 try{
  await ensure()
  const action=body.action
  if(action==='prepare'){
   const nodeId=body.nodeId,ip=body.targetIpv4
   if(typeof nodeId!=='string'||!nodePattern.test(nodeId)||!publicIpv4(ip))
    return problem('Select a valid candidate and its real public IPv4 address',400)
   const {sha}=await suitableCandidate(nodeId)
   const present=await dnsTargets()
   if(present.includes(ip))throw Error('Target address is already on the production DNS; require a separate independent candidate')
   const created=await journalWrite(
    "INSERT INTO weave_host_transition_plans(node_id,target_ipv4,release_sha,stage,created_by) "+
    "VALUES($1,$2,$3,'prepared',$4::uuid) RETURNING id,node_id,target_ipv4,release_sha,stage",
    [nodeId,ip,sha,actor],actor,'prepared')
   return NextResponse.json({success:true,plan:created},{status:201,headers:noStore})
  }
  if(typeof body.planId!=='string'||!planIdPattern.test(body.planId))
   return problem('Choose an existing transition record',400)
  const selected=await getPool().query(
   "SELECT * FROM weave_host_transition_plans WHERE id=$1::uuid LIMIT 1",[body.planId])
  const plan=selected.rows[0]
  if(!plan)return problem('Transition not found',404)
  if(action==='authorize'){
   if(plan.stage!=='prepared'||body.confirmation!=='AUTHORIZE WEAVE HOST MOVE')
    return problem('Prepare a plan and type AUTHORIZE WEAVE HOST MOVE')
   const attest=body.attestations
   const required=['separateMediaVerified','backupsAndRestoreVerified',
    'paymentAndCallbackPlanVerified','operatorFailbackPlanVerified','workforceAccessVerified']
   if(!attest||typeof attest!=='object'||Array.isArray(attest)||
     required.some(key=>attest[key]!==true))
    return problem('Complete every named company-continuity attestation')
   await suitableCandidate(plan.node_id,plan.release_sha)
   const alreadyRouted=await dnsTargets()
   if(alreadyRouted.includes(plan.target_ipv4))
    throw Error('DNS already points at the candidate; stop and reconcile the live host before authorization')
   await journalWrite(
    "UPDATE weave_host_transition_plans SET stage='authorized',approved_by=$2::uuid,"+
    "authorized_at=now(),company_attestations=$3::jsonb "+
    "WHERE id=$1::uuid AND stage='prepared' RETURNING id",
    [plan.id,actor,JSON.stringify(Object.fromEntries(required.map(key=>[key,true])))],
    actor,'authorized')
   return NextResponse.json({success:true,stage:'authorized',
    note:'Authorization recorded only. The DNS provider has not been instructed to change records.'},
    {headers:noStore})
  }
  if(action==='verify_dns'){
   if(plan.stage!=='authorized'||body.confirmation!=='VERIFY MANUAL DNS SWITCH')
    return problem('Manually authorize first, then type VERIFY MANUAL DNS SWITCH')
   await suitableCandidate(plan.node_id,plan.release_sha)
   await verifyPublicDestination(plan)
   await journalWrite(
    "UPDATE weave_host_transition_plans SET stage='dns_observed',dns_observed_at=now() "+
    "WHERE id=$1::uuid AND stage='authorized' RETURNING id",
    [plan.id],actor,'dns_observed')
   return NextResponse.json({success:true,stage:'dns_observed',
    note:'Observed DNS and public readiness. Accounting, media, callbacks and user access still require explicit operator checks.'},{headers:noStore})
  }
  if(action==='confirm'){
   if(plan.stage!=='dns_observed'||body.confirmation!=='CONFIRM WEAVE OWNED HOST')
    return problem('DNS observation is required before confirmation')
   await suitableCandidate(plan.node_id,plan.release_sha)
   await verifyPublicDestination(plan)
   const attest=body.attestations
   const required=['liveUserSessionsChecked','fileFoldersChecked',
    'balancesAndLedgerChecked','mediaAndCustomerDoorsChecked','paymentCallbacksChecked']
   if(!attest||typeof attest!=='object'||Array.isArray(attest)||
    required.some(key=>attest[key]!==true))
    return problem('Company continuity needs verified post-switch work checks')
   await journalWrite(
    "UPDATE weave_host_transition_plans SET stage='confirmed',confirmed_by=$2::uuid,confirmed_at=now(),"+
    "company_attestations=company_attestations||$3::jsonb "+
    "WHERE id=$1::uuid AND stage='dns_observed' RETURNING id",
    [plan.id,actor,JSON.stringify(Object.fromEntries(required.map(key=>[key,true])))],
    actor,'confirmed')
   return NextResponse.json({success:true,stage:'confirmed',
    note:'Operator acceptance recorded; Oracle has NOT been shut down and must remain available for reviewed recovery.'},{headers:noStore})
  }
  if(action==='cancel'){
   if(!['prepared','authorized'].includes(plan.stage)||body.confirmation!=='CANCEL WEAVE HOST MOVE')
    return problem('Only a pre-DNS plan can be cancelled here. Live failback requires an independently controlled recovery procedure.')
   const currentDns=await dnsTargets()
   if(currentDns.includes(plan.target_ipv4))
    throw Error('Public DNS may already route to this host. Verify it or execute the reviewed failback; a database cancellation alone is unsafe.')
   await journalWrite(
    "UPDATE weave_host_transition_plans SET stage='cancelled' "+
    "WHERE id=$1::uuid AND stage IN ('prepared','authorized') RETURNING id",
    [plan.id],actor,'cancelled')
   return NextResponse.json({success:true,stage:'cancelled',note:'No production infrastructure was modified by this cancellation.'},{headers:noStore})
  }
  return problem('Unknown controlled transition step',400)
 }catch(error){
  console.error('[weave host transition] refused operation',error instanceof Error?error.message:'unknown')
  return problem(error instanceof Error?error.message:'Transition unavailable')
 }
}
