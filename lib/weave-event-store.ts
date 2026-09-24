import { sql } from '@/lib/db'
import { ensureCompanyLoopsSchema } from '@/lib/company-loops'
import { FLAME_EVENT, type WeaveEvent, type WeaveEventStatus, resolveEventStatus } from '@/lib/weave-event'

function toIso(value: unknown, fallback: string) {
  const date = value instanceof Date ? value : new Date(String(value || fallback))
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

async function ensureFlameEventCompanyLoop() {
  await ensureCompanyLoopsSchema(sql)

  const [existing] = await sql`
    SELECT id
    FROM company_loops
    WHERE loop_number = 1
    ORDER BY created_at ASC
    LIMIT 1
  `

  if (!existing) {
    await sql`
      INSERT INTO company_loops (
        loop_number,
        title,
        purpose,
        stage,
        position,
        functions,
        responsibilities,
        boundaries,
        audience,
        status,
        published_at
      )
      VALUES (
        1,
        'Flame Event',
        'The opening of WEAVE to the world through real participation in one shared event ground.',
        'Preparing',
        'all',
        'Interaction in Motion across Client, Bridger, Agent and Administration positions.',
        'Each position participates according to its function while the Client remains the player.',
        'Flame Event is Company Loop 1. It is not a separate loop or a separate event system.',
        ARRAY['client','bridger','agent','admin']::text[],
        'published',
        NOW()
      )
    `
  } else {
    await sql`
      UPDATE company_loops
      SET
        title = 'Flame Event',
        purpose = CASE WHEN purpose = '' THEN 'The opening of WEAVE to the world through real participation in one shared event ground.' ELSE purpose END,
        stage = CASE WHEN stage = '' THEN 'Preparing' ELSE stage END,
        position = 'all',
        audience = ARRAY['client','bridger','agent','admin']::text[],
        status = CASE WHEN status = 'draft' THEN 'published' ELSE status END,
        published_at = COALESCE(published_at, NOW()),
        updated_at = NOW()
      WHERE id = ${existing.id}::uuid
    `
  }
}

export async function ensureWeaveEventSchema() {
  await ensureFlameEventCompanyLoop()

  await sql`
    CREATE TABLE IF NOT EXISTS weave_events (
      event_key varchar(120) PRIMARY KEY,
      loop_number integer NOT NULL DEFAULT 1,
      title varchar(180) NOT NULL,
      subtitle varchar(320) NOT NULL,
      announcement text NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'planned',
      starts_at timestamptz NOT NULL,
      ends_at timestamptz NOT NULL,
      ad_enabled boolean NOT NULL DEFAULT true,
      auto_start boolean NOT NULL DEFAULT true,
      updated_by uuid,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      CONSTRAINT weave_events_status_check CHECK (status IN ('planned', 'active', 'closed'))
    )
  `

  await sql`
    ALTER TABLE weave_events
    ADD COLUMN IF NOT EXISTS loop_number integer NOT NULL DEFAULT 1
  `

  await sql`
    INSERT INTO weave_events (
      event_key,
      loop_number,
      title,
      subtitle,
      announcement,
      status,
      starts_at,
      ends_at,
      ad_enabled,
      auto_start
    )
    VALUES (
      ${FLAME_EVENT.key},
      1,
      ${FLAME_EVENT.title},
      ${FLAME_EVENT.subtitle},
      ${FLAME_EVENT.announcement},
      ${FLAME_EVENT.status},
      ${FLAME_EVENT.startsAt},
      ${FLAME_EVENT.endsAt},
      ${FLAME_EVENT.adEnabled},
      ${FLAME_EVENT.autoStart}
    )
    ON CONFLICT (event_key) DO UPDATE
    SET loop_number = 1
  `
}

export async function getFlameEvent(): Promise<WeaveEvent> {
  await ensureWeaveEventSchema()
  const [row] = await sql`
    SELECT event_key, loop_number, title, subtitle, announcement, status, starts_at, ends_at, ad_enabled, auto_start
    FROM weave_events
    WHERE event_key = ${FLAME_EVENT.key}
    LIMIT 1
  `

  if (!row) return { ...FLAME_EVENT, effectiveStatus: resolveEventStatus(FLAME_EVENT) }

  const event: WeaveEvent = {
    ...FLAME_EVENT,
    key: row.event_key || FLAME_EVENT.key,
    loopNumber: 1,
    title: row.title || FLAME_EVENT.title,
    subtitle: row.subtitle || FLAME_EVENT.subtitle,
    announcement: row.announcement || FLAME_EVENT.announcement,
    status: (row.status || FLAME_EVENT.status) as WeaveEventStatus,
    startsAt: toIso(row.starts_at, FLAME_EVENT.startsAt),
    endsAt: toIso(row.ends_at, FLAME_EVENT.endsAt),
    adEnabled: row.ad_enabled !== false,
    autoStart: row.auto_start !== false,
  }

  return { ...event, effectiveStatus: resolveEventStatus(event) }
}

export async function updateFlameEvent(input: {
  title: string
  subtitle: string
  announcement: string
  status: WeaveEventStatus
  startsAt: string
  endsAt: string
  adEnabled: boolean
  autoStart: boolean
  updatedBy?: string | null
}): Promise<WeaveEvent> {
  await ensureWeaveEventSchema()

  await sql`
    UPDATE weave_events
    SET
      loop_number = 1,
      title = ${input.title},
      subtitle = ${input.subtitle},
      announcement = ${input.announcement},
      status = ${input.status},
      starts_at = ${input.startsAt},
      ends_at = ${input.endsAt},
      ad_enabled = ${input.adEnabled},
      auto_start = ${input.autoStart},
      updated_by = ${input.updatedBy || null}::uuid,
      updated_at = NOW()
    WHERE event_key = ${FLAME_EVENT.key}
  `

  const loopStage = input.status === 'closed' ? 'Closing' : input.status === 'active' ? 'Movement' : 'Preparing'
  const loopStatus = input.status === 'closed' ? 'archived' : 'published'

  await sql`
    UPDATE company_loops
    SET
      title = 'Flame Event',
      stage = ${loopStage},
      audience = ARRAY['client','bridger','agent','admin']::text[],
      status = ${loopStatus},
      published_at = CASE WHEN ${loopStatus} = 'published' THEN COALESCE(published_at, NOW()) ELSE published_at END,
      updated_at = NOW()
    WHERE loop_number = 1
  `

  return getFlameEvent()
}
