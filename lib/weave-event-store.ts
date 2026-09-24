import { sql } from '@/lib/db'
import { FLAME_EVENT, type WeaveEvent, type WeaveEventStatus, resolveEventStatus } from '@/lib/weave-event'

function toIso(value: unknown, fallback: string) {
  const date = value instanceof Date ? value : new Date(String(value || fallback))
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

export async function ensureWeaveEventSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS weave_events (
      event_key varchar(120) PRIMARY KEY,
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
    INSERT INTO weave_events (
      event_key, title, subtitle, announcement, status,
      starts_at, ends_at, ad_enabled, auto_start
    )
    VALUES (
      ${FLAME_EVENT.key},
      ${FLAME_EVENT.title},
      ${FLAME_EVENT.subtitle},
      ${FLAME_EVENT.announcement},
      ${FLAME_EVENT.status},
      ${FLAME_EVENT.startsAt},
      ${FLAME_EVENT.endsAt},
      ${FLAME_EVENT.adEnabled},
      ${FLAME_EVENT.autoStart}
    )
    ON CONFLICT (event_key) DO NOTHING
  `
}

export async function getFlameEvent(): Promise<WeaveEvent> {
  await ensureWeaveEventSchema()
  const [row] = await sql`
    SELECT event_key, title, subtitle, announcement, status, starts_at, ends_at, ad_enabled, auto_start
    FROM weave_events
    WHERE event_key = ${FLAME_EVENT.key}
    LIMIT 1
  `

  if (!row) return { ...FLAME_EVENT, effectiveStatus: resolveEventStatus(FLAME_EVENT) }

  const event: WeaveEvent = {
    ...FLAME_EVENT,
    key: row.event_key || FLAME_EVENT.key,
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

  return getFlameEvent()
}
