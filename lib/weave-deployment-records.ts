import { sql } from '@/lib/db'
import { recordSystemEvent } from '@/lib/system-events'

export const WEAVE_DEPLOYMENT_STATUSES = [
  'started',
  'built',
  'restarted',
  'healthy',
  'failed',
  'rollback_started',
  'rolled_back',
] as const

export type WeaveDeploymentStatus = typeof WEAVE_DEPLOYMENT_STATUSES[number]

export type WeaveDeploymentRecordInput = {
  status: WeaveDeploymentStatus
  releaseSha: string
  previousSha?: string | null
  serverKey?: string | null
  source?: string | null
  verification?: string | null
  rollbackPath?: string | null
  details?: Record<string, unknown>
  sovereignId?: string | null
}

export async function ensureWeaveDeploymentRecordSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS weave_deployment_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      sovereign_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
      server_key varchar(120) NOT NULL DEFAULT 'weave-selfhost',
      release_sha varchar(64) NOT NULL,
      previous_sha varchar(64) NULL,
      status varchar(40) NOT NULL,
      source varchar(120) NOT NULL DEFAULT 'selfhost-deploy',
      verification text NULL,
      rollback_path text NULL,
      details jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_weave_deployment_records_created ON weave_deployment_records(created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_weave_deployment_records_release ON weave_deployment_records(release_sha)`

  // Flame keeps the runtime/release side of the same movement. This is not a
  // second deployment authority: it is the system-state record that mirrors
  // the Sovereign Scroll entry below.
  await sql`
    CREATE TABLE IF NOT EXISTS flame_system_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      record_type varchar(80) NOT NULL,
      status varchar(40) NOT NULL,
      release_sha varchar(64) NOT NULL,
      previous_sha varchar(64) NULL,
      server_key varchar(120) NOT NULL DEFAULT 'weave-selfhost',
      source varchar(120) NOT NULL DEFAULT 'selfhost-deploy',
      verification text NULL,
      details jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_flame_system_records_created ON flame_system_records(created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_flame_system_records_release ON flame_system_records(release_sha)`

  // The Scroll already exists in production, but self-host bootstrap must be
  // able to preserve deployment authority even on a freshly restored database.
  await sql`
    CREATE TABLE IF NOT EXISTS eight_scroll (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      sovereign_id uuid NOT NULL REFERENCES users(id),
      source text NOT NULL,
      authority text NOT NULL DEFAULT 'Sovereign',
      movement text NOT NULL,
      operation text,
      result text,
      verification text,
      deployment_status text,
      rollback_path text,
      created_at timestamptz DEFAULT CURRENT_TIMESTAMP
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_eight_scroll_sovereign ON eight_scroll(sovereign_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_eight_scroll_created ON eight_scroll(created_at DESC)`
}

async function resolveSovereignId(explicit?: string | null) {
  if (explicit) return explicit
  if (process.env.WEAVE_SOVEREIGN_ID) return process.env.WEAVE_SOVEREIGN_ID
  const [admin] = await sql`SELECT id FROM users WHERE role='admin' LIMIT 1`
  return admin?.id ? String(admin.id) : null
}

export async function recordWeaveDeploymentMovement(input: WeaveDeploymentRecordInput) {
  await ensureWeaveDeploymentRecordSchema()

  const sovereignId = await resolveSovereignId(input.sovereignId)
  const serverKey = input.serverKey || process.env.WEAVE_DEPLOYMENT_SERVER || 'weave-selfhost'
  const source = input.source || 'selfhost-deploy'
  const details = input.details || {}

  const [record] = await sql`
    INSERT INTO weave_deployment_records (
      sovereign_id, server_key, release_sha, previous_sha, status, source,
      verification, rollback_path, details
    ) VALUES (
      ${sovereignId}::uuid,
      ${serverKey},
      ${input.releaseSha},
      ${input.previousSha || null},
      ${input.status},
      ${source},
      ${input.verification || null},
      ${input.rollbackPath || null},
      ${JSON.stringify(details)}::jsonb
    )
    RETURNING *
  `

  await sql`
    INSERT INTO flame_system_records (
      record_type, status, release_sha, previous_sha, server_key, source,
      verification, details
    ) VALUES (
      'deployment',
      ${input.status},
      ${input.releaseSha},
      ${input.previousSha || null},
      ${serverKey},
      ${source},
      ${input.verification || null},
      ${JSON.stringify({ ...details, deploymentRecordId: record.id })}::jsonb
    )
  `

  if (sovereignId) {
    const movement = `WEAVE production deployment ${input.status}: ${input.releaseSha}${input.previousSha ? ` from ${input.previousSha}` : ''} on ${serverKey}`
    await sql`
      INSERT INTO eight_scroll (
        sovereign_id, source, authority, movement, operation, result,
        verification, deployment_status, rollback_path
      ) VALUES (
        ${sovereignId}::uuid,
        ${source},
        'Sovereign',
        ${movement},
        'production_deployment',
        ${JSON.stringify(details)},
        ${input.verification || null},
        ${input.status},
        ${input.rollbackPath || null}
      )
    `
  }

  await recordSystemEvent({
    eventType: `deployment_${input.status}`,
    actorId: sovereignId,
    actorRole: sovereignId ? 'admin' : 'system',
    subjectType: 'weave_release',
    subjectId: input.releaseSha,
    source,
    payload: {
      previousSha: input.previousSha || null,
      serverKey,
      verification: input.verification || null,
      rollbackPath: input.rollbackPath || null,
      deploymentRecordId: record.id,
      ...details,
    },
  })

  return record
}

export async function listWeaveDeploymentRecords(limit = 50) {
  await ensureWeaveDeploymentRecordSchema()
  const bounded = Math.max(1, Math.min(Number(limit) || 50, 200))
  return sql`
    SELECT id, sovereign_id, server_key, release_sha, previous_sha, status, source,
           verification, rollback_path, details, created_at
    FROM weave_deployment_records
    ORDER BY created_at DESC
    LIMIT ${bounded}
  `
}
