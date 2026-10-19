import { sql } from '@/lib/db'
import { FLAME_EVENT } from '@/lib/weave-event'

export const FRONTIER_ZONES = [
  'North Central', 'North East', 'North West', 'South East', 'South South', 'South West', 'Federal Capital Territory',
] as const

// The 36 states are distinct from the FCT; no state is presumed active.
export const NIGERIA_FRONTIER_STATES = [
  { code: 'BE', name: 'Benue', zone: 'North Central' },
  { code: 'KO', name: 'Kogi', zone: 'North Central' },
  { code: 'KW', name: 'Kwara', zone: 'North Central' },
  { code: 'NA', name: 'Nasarawa', zone: 'North Central' },
  { code: 'NI', name: 'Niger', zone: 'North Central' },
  { code: 'PL', name: 'Plateau', zone: 'North Central' },
  { code: 'AD', name: 'Adamawa', zone: 'North East' },
  { code: 'BA', name: 'Bauchi', zone: 'North East' },
  { code: 'BO', name: 'Borno', zone: 'North East' },
  { code: 'GO', name: 'Gombe', zone: 'North East' },
  { code: 'TA', name: 'Taraba', zone: 'North East' },
  { code: 'YO', name: 'Yobe', zone: 'North East' },
  { code: 'JI', name: 'Jigawa', zone: 'North West' },
  { code: 'KD', name: 'Kaduna', zone: 'North West' },
  { code: 'KN', name: 'Kano', zone: 'North West' },
  { code: 'KT', name: 'Katsina', zone: 'North West' },
  { code: 'KE', name: 'Kebbi', zone: 'North West' },
  { code: 'SO', name: 'Sokoto', zone: 'North West' },
  { code: 'ZA', name: 'Zamfara', zone: 'North West' },
  { code: 'AB', name: 'Abia', zone: 'South East' },
  { code: 'AN', name: 'Anambra', zone: 'South East' },
  { code: 'EB', name: 'Ebonyi', zone: 'South East' },
  { code: 'EN', name: 'Enugu', zone: 'South East' },
  { code: 'IM', name: 'Imo', zone: 'South East' },
  { code: 'AK', name: 'Akwa Ibom', zone: 'South South' },
  { code: 'BY', name: 'Bayelsa', zone: 'South South' },
  { code: 'CR', name: 'Cross River', zone: 'South South' },
  { code: 'DE', name: 'Delta', zone: 'South South' },
  { code: 'ED', name: 'Edo', zone: 'South South' },
  { code: 'RI', name: 'Rivers', zone: 'South South' },
  { code: 'EK', name: 'Ekiti', zone: 'South West' },
  { code: 'LA', name: 'Lagos', zone: 'South West' },
  { code: 'OG', name: 'Ogun', zone: 'South West' },
  { code: 'ON', name: 'Ondo', zone: 'South West' },
  { code: 'OS', name: 'Osun', zone: 'South West' },
  { code: 'OY', name: 'Oyo', zone: 'South West' },
  { code: 'FC', name: 'FCT Abuja', zone: 'Federal Capital Territory' },
] as const

export const FRONTIER_SECTORS = [
  'food', 'work', 'health', 'markets', 'transport', 'education', 'enterprise', 'public_services',
] as const
export const FRONTIER_PHASES = ['recognized', 'organized', 'delivered'] as const
export type FrontierPhase = (typeof FRONTIER_PHASES)[number]
export type FrontierSector = (typeof FRONTIER_SECTORS)[number]

export function isFrontierState(code: unknown): code is (typeof NIGERIA_FRONTIER_STATES)[number]['code'] {
  return typeof code === 'string' && NIGERIA_FRONTIER_STATES.some(state => state.code === code)
}
export function isFrontierSector(value: unknown): value is FrontierSector {
  return typeof value === 'string' && FRONTIER_SECTORS.some(sector => sector === value)
}
export function isFrontierPhase(value: unknown): value is FrontierPhase {
  return typeof value === 'string' && FRONTIER_PHASES.some(phase => phase === value)
}

export async function ensureFlameFrontierSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS weave_flame_frontier (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_key varchar(120) NOT NULL,
      state_code varchar(2) NOT NULL,
      sector varchar(40) NOT NULL,
      phase varchar(24) NOT NULL,
      title varchar(120) NOT NULL,
      public_summary varchar(500) NOT NULL,
      evidence_note text NOT NULL,
      public_opt_in boolean NOT NULL DEFAULT false,
      status varchar(16) NOT NULL DEFAULT 'submitted',
      submitted_by uuid NOT NULL,
      submitted_role varchar(16) NOT NULL,
      reviewed_by uuid,
      review_note text,
      reviewed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      CONSTRAINT weave_frontier_status CHECK (status IN ('submitted','verified','rejected')),
      CONSTRAINT weave_frontier_phase CHECK (phase IN ('recognized','organized','delivered'))
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS weave_frontier_public_idx
    ON weave_flame_frontier (event_key, state_code, phase, reviewed_at DESC)
    WHERE status = 'verified' AND public_opt_in = true
  `
  await sql`
    CREATE INDEX IF NOT EXISTS weave_frontier_pending_idx
    ON weave_flame_frontier (event_key, created_at DESC)
    WHERE status = 'submitted'
  `
}

export async function getPublicFlameFrontier() {
  await ensureFlameFrontierSchema()
  const grouped = await sql`
    SELECT state_code, phase, COUNT(*)::int AS total
    FROM weave_flame_frontier
    WHERE event_key = ${FLAME_EVENT.key}
      AND status = 'verified'
      AND public_opt_in = true
    GROUP BY state_code, phase
  `
  const states = NIGERIA_FRONTIER_STATES.map(state => {
    const counts: Record<FrontierPhase, number> = { recognized: 0, organized: 0, delivered: 0 }
    for (const item of grouped) {
      if (item.state_code === state.code && isFrontierPhase(item.phase)) {
        counts[item.phase] = Number(item.total) || 0
      }
    }
    return { ...state, ...counts, total: counts.recognized + counts.organized + counts.delivered }
  })
  const recent = await sql`
    SELECT id, state_code, sector, phase, title, public_summary, reviewed_at
    FROM weave_flame_frontier
    WHERE event_key = ${FLAME_EVENT.key}
      AND status = 'verified'
      AND public_opt_in = true
    ORDER BY reviewed_at DESC
    LIMIT 12
  `
  const totals = {
    recognized: states.reduce((sum, state) => sum + state.recognized, 0),
    organized: states.reduce((sum, state) => sum + state.organized, 0),
    delivered: states.reduce((sum, state) => sum + state.delivered, 0),
    statesWithVerifiedMovement: states.filter(state => state.total > 0 && state.code !== 'FC').length,
    fctHasVerifiedMovement: states.some(state => state.code === 'FC' && state.total > 0),
  }
  return { eventKey: FLAME_EVENT.key, states, totals, recent }
}
