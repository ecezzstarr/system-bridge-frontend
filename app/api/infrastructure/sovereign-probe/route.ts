import {NextRequest,NextResponse} from 'next/server'
import {createHash,timingSafeEqual} from 'node:crypto'
import {getPool} from '@/lib/db'
import {requireWorkshopAuthorization} from '@/lib/workshop-auth'
import {currentDatabaseEndpointFingerprint} from '@/lib/weave-sovereign-database-identity'

export const dynamic='force-dynamic'
export const runtime='nodejs'
const noStore={'Cache-Control':'private, no-store'}
const CHECKS=[
 'independent_host','hardware','docker','compose','persistent_media',
 'database_and_media','https_preview','release_identity','restore_rehearsal',
] as const
const validNode=/^[a-z][a-z0-9-]{5,63}$/
const validSha=/^[0-9a-f]{40}$/i
let initialized:Promise<void>|null=null
async function ensure(){
 if(!initialized)initialized=(async()=>{
  await getPool().query("CREATE TABLE IF NOT EXISTS weave_sovereign_server_reports ("+
   "id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,"+
   "node_id varchar(64) NOT NULL,provider varchar(32) NOT NULL,"+
   "observed_at timestamptz NOT NULL,received_at timestamptz NOT NULL DEFAULT now(),"+
   "release_sha varchar(40),checks jsonb NOT NULL,ready boolean NOT NULL)")
  await getPool().query("ALTER TABLE weave_sovereign_server_reports ADD COLUMN IF NOT EXISTS database_fingerprint varchar(64)")
  await getPool().query("CREATE INDEX IF NOT EXISTS weave_sovereign_reports_latest "+
   "ON weave_sovereign_server_reports(node_id,received_at DESC)")
 })().catch(error=>{initialized=null;throw error})
 return initialized
}

function authorizeNode(request:NextRequest){
 const expected=process.env.WEAVE_SOVEREIGN_PROBE_TOKEN||''
 if(expected.length<32)return {ok:false,configured:false}
 const supplied=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||''
 const good=timingSafeEqual(createHash('sha256').update(supplied).digest(),
  createHash('sha256').update(expected).digest())
 return {ok:good,configured:true}
}

/** A candidate host can report its state, but never instruct a cutover or release. */
export async function POST(request:NextRequest){
 const auth=authorizeNode(request)
 if(!auth.configured)return NextResponse.json({error:'Candidate reporting not configured'},{status:503,headers:noStore})
 if(!auth.ok)return NextResponse.json({error:'Unauthorized candidate'},{status:401,headers:noStore})
 if(!request.headers.get('content-type')?.includes('application/json'))
  return NextResponse.json({error:'Expected JSON evidence'},{status:415,headers:noStore})
 if(Number(request.headers.get('content-length')||0)>12000)
  return NextResponse.json({error:'Evidence too large'},{status:413,headers:noStore})
 const body=await request.json().catch(()=>null)
 if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>12000)
  return NextResponse.json({error:'Invalid evidence'},{status:400,headers:noStore})
 const nodeId=body.nodeId,provider=body.provider,sha=body.releaseSha
 const dbFingerprint=body.databaseFingerprint
 const recordedAt=new Date(body.observedAt)
 const checks=body.checks
 if(typeof nodeId!=='string'||!validNode.test(nodeId)||
  !['weave-owned','unverified'].includes(provider)||
  (sha!==null&&!(typeof sha==='string'&&validSha.test(sha)))||
  (dbFingerprint!==null&&!(typeof dbFingerprint==='string'&&/^[0-9a-f]{64}$/i.test(dbFingerprint)))||
  !Number.isFinite(recordedAt.getTime())||
  Math.abs(Date.now()-recordedAt.getTime())>10*60*1000||
  !checks||typeof checks!=='object'||Array.isArray(checks)||
  Object.keys(checks).length!==CHECKS.length||
  Object.keys(checks).some(key=>!CHECKS.includes(key as typeof CHECKS[number]))||
  CHECKS.some(key=>typeof checks[key]!=='boolean'))
  return NextResponse.json({error:'Candidate evidence does not match the verified format'},{status:400,headers:noStore})
 const ready=provider==='weave-owned'&&Boolean(sha)&&CHECKS.every(key=>checks[key]===true)
 try{
  await ensure()
  await getPool().query(
   "INSERT INTO weave_sovereign_server_reports(node_id,provider,observed_at,release_sha,checks,ready,database_fingerprint) "+
   "VALUES($1,$2,$3,$4,$5::jsonb,$6,$7)",
   [nodeId,provider,recordedAt.toISOString(),sha,JSON.stringify(checks),ready,dbFingerprint])
  return NextResponse.json({success:true,recorded:true,ready},{headers:noStore})
 }catch(error){
  console.error('[weave sovereign server] evidence storage unavailable',error instanceof Error?error.message:'unknown')
  return NextResponse.json({error:'Candidate report register unavailable'},{status:503,headers:noStore})
 }
}

/** Only appointed Administrations may inspect the candidate readiness ledger. */
export async function GET(request:NextRequest){
 const auth=await requireWorkshopAuthorization(request)
 if(!auth.authorized)return auth.response
 try{
  await ensure()
  const query=await getPool().query(
   "SELECT DISTINCT ON (node_id) node_id,provider,observed_at,received_at,release_sha,checks,ready,database_fingerprint "+
   "FROM weave_sovereign_server_reports ORDER BY node_id,received_at DESC")
  const productionDb=currentDatabaseEndpointFingerprint()
  const nodes=query.rows.slice(0,25).map(row=>({
   nodeId:row.node_id,provider:row.provider,observedAt:row.observed_at,
   receivedAt:row.received_at,releaseSha:row.release_sha,checks:row.checks,
   reportedReady:row.ready,
   sharedCurrentDatabase:Boolean(productionDb&&row.database_fingerprint===productionDb),
   continuityMode:productionDb&&row.database_fingerprint===productionDb?'same-live-database':'not-proven',
   fresh:Date.now()-new Date(row.received_at).getTime()<=15*60*1000,
   ready:row.ready&&(Date.now()-new Date(row.received_at).getTime()<=15*60*1000)&&Boolean(productionDb&&row.database_fingerprint===productionDb),
  }))
  return NextResponse.json({success:true,nodes,
   cutoverAuthorized:false,
   note:'Readiness evidence only. No DNS switch, production transfer, data migration, source release or automatic Oracle shutdown.'},{headers:noStore})
 }catch(error){
  console.error('[weave sovereign server] report read unavailable',error instanceof Error?error.message:'unknown')
  return NextResponse.json({error:'Readiness register unavailable'},{status:503,headers:noStore})
 }
}
