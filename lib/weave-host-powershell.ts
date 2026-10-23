import { sql } from '@/lib/db'

// PowerShell runs on the private host. The Next.js app never executes shell input.
const key=()=>process.env.WEAVE_DEPLOYMENT_SERVER||'weave-selfhost'
const fields=['host','docker','weave','edge','disk','memory','checkedAt','health']
let ready:Promise<void>|null=null
export function ensureHostPowerShellSchema(){
  if(!ready)ready=(async()=>{
    await sql`CREATE TABLE IF NOT EXISTS weave_host_powershell(
      server_key varchar(120) PRIMARY KEY,
      worker_key varchar(120) NOT NULL,
      last_seen_at timestamptz NOT NULL DEFAULT now(),
      snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
    )`
  })().catch(err=>{ready=null;throw err})
  return ready
}
export function hostRuntimeSecurity(){
  const secret=(value?:string)=>Boolean(value&&value.length>=32&&!/replace-with|your-secret|change-in-production/i.test(value))
  return {
    production:process.env.NODE_ENV==='production',
    httpsOrigin:(process.env.NEXTAUTH_URL||'').startsWith('https://'),
    nextAuthSecret:secret(process.env.NEXTAUTH_SECRET),
    jwtSecret:secret(process.env.JWT_SECRET),
    distinctAuthSecrets:Boolean(process.env.NEXTAUTH_SECRET&&process.env.JWT_SECRET&&process.env.JWT_SECRET!==process.env.NEXTAUTH_SECRET),
    releaseWorkerConfigured:secret(process.env.WEAVE_RELEASE_CONTROL_TOKEN),
    powershellWorkerConfigured:secret(process.env.WEAVE_HOST_CONTROL_TOKEN),
  }
}
export function filterHostSnapshot(input:unknown){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid host snapshot')
  const filtered:Record<string,string|number|boolean|null>={}
  const record=input as Record<string,unknown>
  for(const field of fields){
    const value=record[field]
    if(typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))
      filtered[field]=value
    if(typeof value==='string'&&value.length<=160)
      filtered[field]=value
  }
  return filtered
}
export async function writePowerShellSnapshot(workerKey:string,snapshot:unknown){
  await ensureHostPowerShellSchema()
  const filtered=filterHostSnapshot(snapshot)
  await sql`INSERT INTO weave_host_powershell(server_key,worker_key,last_seen_at,snapshot)
    VALUES(${key()},${workerKey},now(),${JSON.stringify(filtered)}::jsonb)
    ON CONFLICT(server_key) DO UPDATE SET
      worker_key=EXCLUDED.worker_key,last_seen_at=now(),snapshot=EXCLUDED.snapshot`
}
export async function getPowerShellStatus(){
  await ensureHostPowerShellSchema()
  const [row]=await sql`SELECT worker_key,last_seen_at,snapshot FROM weave_host_powershell
    WHERE server_key=${key()} LIMIT 1`
  const lastSeen=row?.last_seen_at?new Date(row.last_seen_at).toISOString():null
  return {
    serverKey:key(),online:Boolean(lastSeen&&Date.now()-new Date(lastSeen).getTime()<90000),
    lastSeen,snapshot:row?.snapshot||null,security:hostRuntimeSecurity(),
  }
}
