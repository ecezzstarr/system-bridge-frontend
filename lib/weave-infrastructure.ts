import { query, sql } from '@/lib/db'

export type DivineShieldState = {
  active: boolean
  title: string
  message: string
  updatedAt: string | null
}

const SYSTEM_SEED = [
  ['weave-public','WEAVINGSYSTEM.ONLINE · WEAVE Public App','application','https://weavingsystem.online','/api/health',{role:'public',server:'weave-selfhost'}],
  ['weave-admin','SSBNOW.ONLINE · Administration Workshop','application','https://ssbnow.online','/api/health',{role:'administration',server:'weave-selfhost'}],
  ['weave-client','SSBNOW.SHOP · Client Service Portal','application','https://ssbnow.shop','/api/health',{role:'client-service',server:'weave-selfhost'}],
  ['system-bridge-frontend','System Bridge Frontend · WEAVE Self-Host Runtime','runtime','https://weavingsystem.online','/api/health',{serverKey:'weave-selfhost',runtime:'docker-compose',edge:'caddy',appPort:'127.0.0.1:3000'}],
  ['eight-runtime','EIGHT · Infrastructure Operator','intelligence',null,'/api/health',{scope:'administration',web:'read-only',deploy:'verified-main-to-selfhost'}],
] as const

const RETIRED_GOOGLE_SYSTEMS = ['api-server','ssbnow-core','ssbnowshop-service'] as const

let schemaReady:Promise<void>|null=null
let shieldCache:{value:DivineShieldState;expires:number}|null=null

export async function ensureWeaveInfrastructureSchema() {
  if(schemaReady) return schemaReady
  schemaReady=(async()=>{
  await query(`
    CREATE TABLE IF NOT EXISTS weave_infrastructure_systems (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      system_key VARCHAR(80) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      kind VARCHAR(40) NOT NULL DEFAULT 'service',
      deployment_target VARCHAR(40) NOT NULL DEFAULT 'selfhost',
      public_url TEXT,
      health_path VARCHAR(255) NOT NULL DEFAULT '/api/health',
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await query(`ALTER TABLE weave_infrastructure_systems ALTER COLUMN deployment_target SET DEFAULT 'selfhost'`)
  await query(`
    CREATE TABLE IF NOT EXISTS weave_platform_controls (
      control_key VARCHAR(80) PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      title VARCHAR(255),
      message TEXT,
      updated_by UUID,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS weave_deployment_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      action VARCHAR(40) NOT NULL,
      source_ref VARCHAR(255),
      provider VARCHAR(40) NOT NULL DEFAULT 'weave-selfhost',
      external_id VARCHAR(255),
      status VARCHAR(40) NOT NULL DEFAULT 'requested',
      requested_by UUID,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await query(`ALTER TABLE weave_deployment_requests ALTER COLUMN provider SET DEFAULT 'weave-selfhost'`)
  await sql`
    INSERT INTO weave_platform_controls(control_key,enabled,title,message)
    VALUES(
      'divine_shield',
      FALSE,
      'WEAVE is under maintenance',
      'The system is being refined. Participation will reopen when Administration releases the Divine Shield.'
    )
    ON CONFLICT(control_key) DO NOTHING
  `
  for (const [key,name,kind,url,healthPath,metadata] of SYSTEM_SEED) {
    await sql`
      INSERT INTO weave_infrastructure_systems(system_key,name,kind,deployment_target,public_url,health_path,metadata)
      VALUES(${key},${name},${kind},'selfhost',${url},${healthPath},${JSON.stringify(metadata)}::jsonb)
      ON CONFLICT(system_key) DO UPDATE SET
        name=EXCLUDED.name,
        kind=EXCLUDED.kind,
        deployment_target='selfhost',
        public_url=EXCLUDED.public_url,
        health_path=EXCLUDED.health_path,
        enabled=TRUE,
        metadata=weave_infrastructure_systems.metadata || EXCLUDED.metadata,
        updated_at=NOW()
    `
  }
  await sql`
    UPDATE weave_infrastructure_systems
    SET enabled=FALSE,
        metadata=metadata || ${JSON.stringify({retired:true,reason:'Google runtime retired; WEAVE self-host is production authority'})}::jsonb,
        updated_at=NOW()
    WHERE system_key = ANY(${[...RETIRED_GOOGLE_SYSTEMS]})
  `
  })()
  try{ await schemaReady }
  catch(error){ schemaReady=null; throw error }
}

export async function getDivineShieldState(): Promise<DivineShieldState> {
  if(shieldCache && shieldCache.expires>Date.now()) return shieldCache.value
  await ensureWeaveInfrastructureSchema()
  const rows=await sql`
    SELECT enabled,title,message,updated_at
    FROM weave_platform_controls
    WHERE control_key='divine_shield'
    LIMIT 1
  `
  const row=rows[0]
  const value={
    active:Boolean(row?.enabled),
    title:row?.title || 'WEAVE is under maintenance',
    message:row?.message || 'The system is being refined. Participation will reopen when Administration releases the Divine Shield.',
    updatedAt:row?.updated_at ? new Date(row.updated_at).toISOString() : null,
  }
  shieldCache={value,expires:Date.now()+2000}
  return value
}

export async function setDivineShieldState(input:{active:boolean;title?:string;message?:string;adminId:string}) {
  await ensureWeaveInfrastructureSchema()
  const rows=await sql`
    INSERT INTO weave_platform_controls(control_key,enabled,title,message,updated_by,updated_at)
    VALUES(
      'divine_shield',
      ${input.active},
      ${input.title || 'WEAVE is under maintenance'},
      ${input.message || 'The system is being refined. Participation will reopen when Administration releases the Divine Shield.'},
      ${input.adminId}::uuid,
      NOW()
    )
    ON CONFLICT(control_key) DO UPDATE SET
      enabled=EXCLUDED.enabled,
      title=EXCLUDED.title,
      message=EXCLUDED.message,
      updated_by=EXCLUDED.updated_by,
      updated_at=NOW()
    RETURNING enabled,title,message,updated_at
  `
  const row=rows[0]
  const value={
    active:Boolean(row.enabled),
    title:row.title,
    message:row.message,
    updatedAt:new Date(row.updated_at).toISOString(),
  }
  shieldCache={value,expires:Date.now()+2000}
  return value
}

export async function getInfrastructureRegistry() {
  await ensureWeaveInfrastructureSchema()
  return sql`
    SELECT system_key,name,kind,deployment_target,public_url,health_path,enabled,metadata,created_at,updated_at
    FROM weave_infrastructure_systems
    ORDER BY
      CASE kind WHEN 'application' THEN 1 WHEN 'runtime' THEN 2 WHEN 'intelligence' THEN 3 ELSE 4 END,
      name
  `
}

export async function recordDeploymentRequest(input:{
  action:string
  sourceRef?:string|null
  externalId?:string|null
  status?:string
  adminId:string
  details?:Record<string,unknown>
}) {
  await ensureWeaveInfrastructureSchema()
  const rows=await sql`
    INSERT INTO weave_deployment_requests(action,source_ref,external_id,status,requested_by,details)
    VALUES(
      ${input.action},
      ${input.sourceRef || null},
      ${input.externalId || null},
      ${input.status || 'requested'},
      ${input.adminId}::uuid,
      ${JSON.stringify(input.details || {})}::jsonb
    )
    RETURNING *
  `
  return rows[0]
}

export async function recentDeploymentRequests(limit=12) {
  await ensureWeaveInfrastructureSchema()
  return sql`
    SELECT id,action,source_ref,provider,external_id,status,requested_by,details,created_at,updated_at
    FROM weave_deployment_requests
    ORDER BY created_at DESC
    LIMIT ${Math.max(1,Math.min(limit,50))}
  `
}
