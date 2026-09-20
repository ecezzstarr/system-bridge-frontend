import { neon } from '@/lib/pg-neon'

export type SystemEvent = {
  eventType: string
  actorId?: string | null
  actorRole?: string | null
  subjectType?: string | null
  subjectId?: string | null
  source?: string | null
  payload?: Record<string, unknown>
}

export async function recordSystemEvent(event: SystemEvent) {
  try {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
    if (!url) return
    const sql = neon(url)
    await sql`
      INSERT INTO system_events
        (event_type, actor_id, actor_role, subject_type, subject_id, source, payload)
      VALUES
        (${event.eventType}, ${event.actorId || null}, ${event.actorRole || null},
         ${event.subjectType || null}, ${event.subjectId || null}, ${event.source || null},
         ${JSON.stringify(event.payload || {})}::jsonb)
    `
  } catch (error) {
    // Event recording must never break the business transaction.
    console.error('System event recording failed', error instanceof Error ? error.message : 'unknown error')
  }
}
