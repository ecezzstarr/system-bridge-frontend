import { sql } from '@/lib/db'
import { ONE_NIGERIAN_LOOP, COMPANY_LOOP_THREE_STARTS_AT } from '@/lib/company-loop-two'

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

  // Official Company Loop 2 is independent of the preserved Burning River row.
  // Existing Administration-authored Loop 2 records are never overwritten.
  await sql`
    INSERT INTO company_loops (
      loop_number, title, purpose, stage, position, functions,
      responsibilities, boundaries, audience, status, published_at
    )
    SELECT
      2,
      'One Nigerian',
      'Company Loop 2 — Flame Event: One Nigerian operates January 1–11, 2027, with WEAVE taking on a green–white–green national environment.',
      'Scheduled',
      'all',
      'Agents operate Stability; Bridgers carry Hope; Clients build and operate their File Folder worlds; Administration organizes and verifies movement.',
      'Each position follows its authorized operating systems, records real work and checks the status of approvals, orders and builds.',
      'The daily scroll explains the current place but does not confirm employment, payments, orders or completed systems.',
      ARRAY['client','agent','bridger','admin']::text[],
      'published',
      NOW()
    WHERE NOT EXISTS (SELECT 1 FROM company_loops WHERE loop_number = 2)
  `

  // Reconcile only the original generated description, never an edited Administration record.
  await sql`
    UPDATE company_loops
    SET purpose = ${"Company Loop 2 — Flame Event: One Nigerian operates January 1–11, 2027, with WEAVE taking on a green–white–green national environment."}, updated_at = NOW()
    WHERE loop_number = 2 AND title = 'One Nigerian'
      AND purpose = ${"Company Loop 2 — Flame Event: One Nigerian operates from January 1 through May 1, 2027, with WEAVE taking on a green–white–green national environment."}
  `

  // Company Loop 3 carries the Sovereign-authored individual event identity.
  await sql`
    INSERT INTO company_loops (
      loop_number, title, purpose, stage, position, boundaries,
      audience, status, published_at
    )
    SELECT
      3,
      'From my God will lead me to my God is',
      'Company Loop 3 — Individual Event: From my God will lead me to my God is. Begins January 12, 2027 (West Africa Time); the event ending and scroll remain to be authored.',
      'Scheduled',
      'all',
      'This individual event has its own meaning and must not inherit the One Nigerian scroll or green–white–green theme.',
      ARRAY['client','agent','bridger','admin']::text[],
      'published',
      NOW()
    WHERE NOT EXISTS (SELECT 1 FROM company_loops WHERE loop_number = 3)
  `
  await sql`
    UPDATE company_loops
    SET stage = CASE WHEN NOW() >= ${COMPANY_LOOP_THREE_STARTS_AT}::timestamptz
      THEN 'Movement' ELSE 'Scheduled' END,
      updated_at = NOW()
    WHERE loop_number = 3 AND title IN ('Company Loop 3','From my God will lead me to my God is') AND status = 'published'
      AND stage IS DISTINCT FROM CASE WHEN NOW() >= ${COMPANY_LOOP_THREE_STARTS_AT}::timestamptz
        THEN 'Movement' ELSE 'Scheduled' END
  `

  await sql`
    UPDATE company_loops
    SET stage = CASE
      WHEN NOW() > ${ONE_NIGERIAN_LOOP.endsAt}::timestamptz THEN 'Closing'
      WHEN NOW() >= ${ONE_NIGERIAN_LOOP.startsAt}::timestamptz THEN 'Movement'
      ELSE 'Scheduled'
    END, updated_at = NOW()
    WHERE loop_number = 2
      AND title = 'One Nigerian'
      AND status = 'published'
      AND stage IS DISTINCT FROM CASE
        WHEN NOW() > ${ONE_NIGERIAN_LOOP.endsAt}::timestamptz THEN 'Closing'
        WHEN NOW() >= ${ONE_NIGERIAN_LOOP.startsAt}::timestamptz THEN 'Movement'
        ELSE 'Scheduled'
      END
  `
}

export function normalizeAudience(value: unknown): string[] {
  if (!Array.isArray(value)) return ['client', 'agent', 'bridger', 'admin']
  const allowed = value.filter((v): v is string =>
    typeof v === 'string' && COMPANY_LOOP_ROLES.includes(v as CompanyLoopRole)
  )
  return allowed.length ? Array.from(new Set(allowed)) : ['client', 'agent', 'bridger', 'admin']
}
