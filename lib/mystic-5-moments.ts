import { sql } from '@/lib/db'
import type { Mystic5Presence, Mystic5Source } from '@/lib/mystic-5'

export interface Mystic5MomentInput {
  userId: string
  source: Mystic5Source
  surface: string
  activity: string
  position?: string | null
  form: string
  context?: string | null
  userMessage: string
  mysticReply: string
  ageAtMoment?: number | null
  userDay?: string | null
  externalGrantId?: string | null
}

function bounded(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

export function normalizeMystic5Age(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  const age = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(age) || age < 0 || age > 130) {
    throw new Error('ageAtMoment must be a whole number from 0 to 130 when supplied.')
  }

  return age
}

export function normalizeMystic5UserDay(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('userDay must use YYYY-MM-DD when supplied.')
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('userDay must be a real calendar day.')
  }

  return value
}

export async function ensureMystic5MomentTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS mystic5_moments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source VARCHAR(20) NOT NULL CHECK (source IN ('weave', 'external')),
      surface VARCHAR(120) NOT NULL,
      activity TEXT NOT NULL,
      position TEXT,
      mystic_form TEXT NOT NULL,
      context TEXT,
      user_message TEXT NOT NULL,
      mystic_reply TEXT NOT NULL,
      age_at_moment INTEGER CHECK (age_at_moment IS NULL OR (age_at_moment >= 0 AND age_at_moment <= 130)),
      user_day DATE,
      external_grant_id UUID,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_mystic5_moments_user_time
    ON mystic5_moments(user_id, occurred_at DESC)
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_mystic5_moments_user_day_age
    ON mystic5_moments(user_id, user_day, age_at_moment)
  `
}

// Mystic 5 is moment intelligence.
// Every call INSERTS a new moment. Previous moments are never updated into a
// newer self and are never read here to determine who the operator is now.
export async function saveMystic5Moment(input: Mystic5MomentInput) {
  await ensureMystic5MomentTable()

  const ageAtMoment = normalizeMystic5Age(input.ageAtMoment)
  const userDay = normalizeMystic5UserDay(input.userDay)

  const rows = await sql`
    INSERT INTO mystic5_moments (
      user_id,
      source,
      surface,
      activity,
      position,
      mystic_form,
      context,
      user_message,
      mystic_reply,
      age_at_moment,
      user_day,
      external_grant_id
    )
    VALUES (
      ${input.userId}::uuid,
      ${input.source},
      ${bounded(input.surface, 120) || 'Weave'},
      ${bounded(input.activity, 240)},
      ${bounded(input.position, 240) || null},
      ${bounded(input.form, 240)},
      ${bounded(input.context, 4000) || null},
      ${bounded(input.userMessage, 12000)},
      ${bounded(input.mysticReply, 16000)},
      ${ageAtMoment},
      ${userDay}::date,
      ${input.externalGrantId || null}::uuid
    )
    RETURNING
      id,
      source,
      surface,
      activity,
      position,
      mystic_form,
      age_at_moment,
      user_day,
      external_grant_id,
      occurred_at
  `

  return rows[0]
}

export async function listMystic5Moments(userId: string, limit = 50) {
  await ensureMystic5MomentTable()
  const safeLimit = Math.min(Math.max(Math.floor(limit) || 50, 1), 200)

  return sql`
    SELECT
      id,
      source,
      surface,
      activity,
      position,
      mystic_form,
      context,
      user_message,
      mystic_reply,
      age_at_moment,
      user_day,
      external_grant_id,
      occurred_at
    FROM mystic5_moments
    WHERE user_id = ${userId}::uuid
    ORDER BY occurred_at DESC
    LIMIT ${safeLimit}
  `
}

export function momentFieldsFromPresence(presence: Mystic5Presence) {
  return {
    source: presence.source,
    surface: presence.surface,
    activity: presence.activity,
    position: presence.position,
    form: presence.form,
    context: presence.context,
    ageAtMoment: presence.ageAtMoment,
    userDay: presence.userDay,
  }
}
