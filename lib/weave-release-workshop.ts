import {randomUUID} from 'node:crypto'
import {sql} from '@/lib/db'
import {listWeaveDeploymentRecords} from '@/lib/weave-deployment-records'

export type ReleaseAction='deploy_latest'|'rollback'
export type ReleaseJobStatus='queued'|'running'|'healthy'|'rolled_back'|'failed'
export const fullReleaseSha=(value:unknown):value is string=>
  typeof value==='string'&&/^[0-9a-f]{40}$/i.test(value)
const serverKey=()=>process.env.WEAVE_DEPLOYMENT_SERVER||'weave-selfhost'

let schemaReady:Promise<void>|null=null
export function ensureReleaseWorkshopSchema(){
  if(schemaReady)return schemaReady
  schemaReady=(async()=>{
    await sql`CREATE TABLE IF NOT EXISTS weave_release_jobs(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      server_key varchar(120) NOT NULL,
      action varchar(24) NOT NULL CHECK(action IN ('deploy_latest','rollback')),
      target_sha varchar(40),
      resolved_sha varchar(40),
      previous_sha varchar(40),
      status varchar(24) NOT NULL DEFAULT 'queued'
        CHECK(status IN ('queued','running','healthy','rolled_back','failed')),
      requested_by uuid NOT NULL REFERENCES users(id),
      worker_key varchar(120),
      lease_token uuid,
      requested_at timestamptz NOT NULL DEFAULT now(),
      started_at timestamptz,
      finished_at timestamptz,
      verification text,
      details jsonb NOT NULL DEFAULT '{}'::jsonb
    )`
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS weave_release_active_server
      ON weave_release_jobs(server_key) WHERE status IN ('queued','running')`
    await sql`CREATE INDEX IF NOT EXISTS weave_release_jobs_history
      ON weave_release_jobs(server_key,requested_at DESC)`
  })().catch(error=>{schemaReady=null;throw error})
  return schemaReady
}

export async function getReleaseWorkshopState(){
  await ensureReleaseWorkshopSchema()
  const [jobs,history]=await Promise.all([
    sql`SELECT id,server_key,action,target_sha,resolved_sha,previous_sha,
        status,requested_by,requested_at,started_at,finished_at,verification,details
        FROM weave_release_jobs WHERE server_key=${serverKey()}
        ORDER BY requested_at DESC LIMIT 30`,
    listWeaveDeploymentRecords(80),
  ])
  const healthyReleases=[...new Set(history.filter(row=>
    row.status==='healthy'||row.status==='rolled_back'
  ).map(row=>String(row.release_sha)).filter(fullReleaseSha))]
  return {jobs,healthyReleases,history:history.slice(0,30),serverKey:serverKey(),
    activeRelease:process.env.WEAVE_RELEASE_SHA||null}
}

export async function requestReleaseJob(input:{action:ReleaseAction;targetSha?:string;userId:string;confirmation:string}){
  await ensureReleaseWorkshopSchema()
  if(input.confirmation!==(input.action==='rollback'?'ROLL BACK':'DEPLOY'))
    throw new Error('Type the exact release confirmation before submitting.')
  if(input.action==='rollback'){
    if(!fullReleaseSha(input.targetSha))throw new Error('Select a full verified historical release SHA.')
    const [known]=await sql`SELECT id FROM weave_deployment_records
      WHERE release_sha=${input.targetSha} AND status IN ('healthy','rolled_back')
      AND server_key=${serverKey()} LIMIT 1`
    if(!known)throw new Error('Rollback is restricted to a previously healthy release on this WEAVE server.')
    if(input.targetSha===process.env.WEAVE_RELEASE_SHA)throw new Error('Selected release is already active.')
  }else if(input.action!=='deploy_latest'){
    throw new Error('Unsupported release operation.')
  }
  try{
    const [job]=await sql`INSERT INTO weave_release_jobs(
      server_key,action,target_sha,requested_by,verification
    ) VALUES (
      ${serverKey()},${input.action},${input.action==='rollback'?input.targetSha:null},
      ${input.userId}::uuid,'Administration confirmed release request'
    ) RETURNING id,server_key,action,target_sha,status,requested_at`
    return job
  }catch(error:any){
    if(error?.code==='23505')throw new Error('A release is already queued or running. Verify its outcome first.')
    throw error
  }
}

export async function claimReleaseJob(workerKey:string){
  await ensureReleaseWorkshopSchema()
  const lease=randomUUID()
  const [job]=await sql`
    UPDATE weave_release_jobs SET
      status='running',started_at=now(),worker_key=${workerKey},
      lease_token=${lease}::uuid,verification='Independent host worker accepted request'
    WHERE id=(
      SELECT id FROM weave_release_jobs
      WHERE server_key=${serverKey()} AND status='queued'
      ORDER BY requested_at ASC FOR UPDATE SKIP LOCKED LIMIT 1
    )
    RETURNING id,action,target_sha,status,lease_token,server_key
  `
  return job||null
}

export async function completeReleaseJob(input:{
  id:string;leaseToken:string;status:'healthy'|'rolled_back'|'failed'
  resolvedSha?:string|null;previousSha?:string|null;verification?:string
}){
  await ensureReleaseWorkshopSchema()
  if(!/^[0-9a-f-]{36}$/i.test(input.id)||!/^[0-9a-f-]{36}$/i.test(input.leaseToken))
    throw new Error('Invalid release job identity')
  if(input.resolvedSha&&!fullReleaseSha(input.resolvedSha))throw new Error('Invalid resulting SHA')
  if(input.previousSha&&!fullReleaseSha(input.previousSha))throw new Error('Invalid previous SHA')
  const [job]=await sql`UPDATE weave_release_jobs SET
    status=${input.status},resolved_sha=${input.resolvedSha||null},
    previous_sha=${input.previousSha||null},
    verification=${String(input.verification||'').slice(0,1500)},
    finished_at=now(),lease_token=null
    WHERE id=${input.id}::uuid AND lease_token=${input.leaseToken}::uuid
      AND server_key=${serverKey()} AND status='running'
      AND ((action='deploy_latest' AND ${input.status} IN ('healthy','failed'))
        OR (action='rollback' AND ${input.status} IN ('rolled_back','failed')))
    RETURNING id,status,resolved_sha,previous_sha,finished_at`
  if(!job)throw new Error('This release is no longer held by the requesting host worker.')
  return job
}
