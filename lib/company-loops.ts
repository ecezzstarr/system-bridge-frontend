import { sql } from '@/lib/db'

export const COMPANY_LOOP_ROLES = ['client', 'agent', 'bridger', 'admin'] as const
export const COMPANY_LOOP_PLAYER_ROLE = 'client' as const
export const COMPANY_LOOP_SUPPORT_ROLES = ['agent', 'bridger', 'admin'] as const
export type CompanyLoopRole = typeof COMPANY_LOOP_ROLES[number]

export function getDb() { return sql }

export async function ensureCompanyLoopsSchema(sql = getDb()) {
  await sql`
    CREATE TABLE IF NOT EXISTS company_loops (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      loop_number integer NOT NULL CHECK (loop_number > 0),
      title varchar(255) NOT NULL,
      purpose text NOT NULL DEFAULT '',
      stage varchar(255) NOT NULL DEFAULT '',
      position text NOT NULL DEFAULT 'all',
      functions text NOT NULL DEFAULT '',
      economics text NOT NULL DEFAULT '',
      responsibilities text NOT NULL DEFAULT '',
      boundaries text NOT NULL DEFAULT '',
      agreement_version varchar(120),
      audience text[] NOT NULL DEFAULT ARRAY['client','agent','bridger','admin']::text[],
      status varchar(40) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
      created_by uuid,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      published_at timestamptz
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS company_loops_status_idx ON company_loops(status)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS company_loops_number_idx ON company_loops(loop_number)
  `
}

export function normalizeAudience(value: unknown): string[] {
  if (!Array.isArray(value)) return ['client', 'agent', 'bridger', 'admin']
  const allowed = value.filter((v): v is string =>
    typeof v === 'string' && COMPANY_LOOP_ROLES.includes(v as CompanyLoopRole)
  )
  return allowed.length ? Array.from(new Set(allowed)) : ['client', 'agent', 'bridger', 'admin']
}
