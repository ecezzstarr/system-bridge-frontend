import { sql } from '@/lib/db'

export type SystemSwitchState = {
  sessionId: string
  fileNumber: string | null
  startedAt: string
  lastActiveAt: string
  daysActive: number
  storyState: Record<string, unknown>
  businessConcept: Record<string, unknown>
  events: Array<Record<string, unknown>>
  decisions: Array<Record<string, unknown>>
  milestones: Array<Record<string, unknown>>
  status: 'active' | 'awaiting_recognition' | 'recognized'
}

type Row = {
  session_id: string
  file_number: string | null
  started_at: string | Date
  last_active_at: string | Date
  days_active: number | null
  business_concept: Record<string, unknown> | null
  story_state: Record<string, unknown> | null
  events: Array<Record<string, unknown>> | null
  decisions: Array<Record<string, unknown>> | null
  milestones: Array<Record<string, unknown>> | null
  status: string | null
}

function normalize(row: Row): SystemSwitchState {
  return {
    sessionId: row.session_id,
    fileNumber: row.file_number,
    startedAt: new Date(row.started_at).toISOString(),
    lastActiveAt: new Date(row.last_active_at).toISOString(),
    daysActive: row.days_active ?? 0,
    businessConcept: row.business_concept ?? {},
    storyState: row.story_state ?? {},
    events: row.events ?? [],
    decisions: row.decisions ?? [],
    milestones: row.milestones ?? [],
    status:
      row.status === 'recognized'
        ? 'recognized'
        : row.status === 'awaiting_recognition'
          ? 'awaiting_recognition'
          : 'active',
  }
}

export async function getSystemSwitchState(
  sessionId: string,
): Promise<SystemSwitchState | null> {
  const rows = await sql`
    SELECT
      session_id,
      file_number,
      started_at,
      last_active_at,
      days_active,
      business_concept,
      story_state,
      events,
      decisions,
      milestones,
      status
    FROM system_switch_state
    WHERE session_id = ${sessionId}
    LIMIT 1
  `

  const row = rows[0] as Row | undefined
  return row ? normalize(row) : null
}

export async function createSystemSwitchState(
  sessionId: string,
  fileNumber: string | null,
  businessConcept: Record<string, unknown> = {},
) {
  const rows = await sql`
    INSERT INTO system_switch_state (
      session_id,
      file_number,
      business_concept,
      story_state,
      events,
      decisions,
      milestones,
      status
    )
    VALUES (
      ${sessionId},
      ${fileNumber},
      ${JSON.stringify(businessConcept)}::jsonb,
      '{}'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      'active'
    )
    ON CONFLICT (session_id)
    DO UPDATE SET
      last_active_at = NOW()
    RETURNING
      session_id,
      file_number,
      started_at,
      last_active_at,
      days_active,
      business_concept,
      story_state,
      events,
      decisions,
      milestones,
      status
  `

  return normalize(rows[0] as Row)
}

export async function recordSystemSwitchAction(
  sessionId: string,
  action: {
    type: string
    content?: string
    data?: Record<string, unknown>
  },
) {
  const rows = await sql`
    UPDATE system_switch_state
    SET
      last_active_at = NOW(),
      days_active = GREATEST(
        days_active,
        EXTRACT(DAY FROM NOW() - started_at)::int
      ),
      events = events || ${JSON.stringify([{
        id: crypto.randomUUID(),
        ...action,
        createdAt: new Date().toISOString(),
      }])}::jsonb
    WHERE session_id = ${sessionId}
      AND status = 'active'
    RETURNING
      session_id,
      file_number,
      started_at,
      last_active_at,
      days_active,
      business_concept,
      story_state,
      events,
      decisions,
      milestones,
      status
  `

  return rows[0] ? normalize(rows[0] as Row) : null
}

export async function saveSystemSwitchDecision(
  sessionId: string,
  decision: Record<string, unknown>,
) {
  const rows = await sql`
    UPDATE system_switch_state
    SET
      last_active_at = NOW(),
      decisions = decisions || ${JSON.stringify([{
        id: crypto.randomUUID(),
        ...decision,
        createdAt: new Date().toISOString(),
      }])}::jsonb
    WHERE session_id = ${sessionId}
      AND status = 'active'
    RETURNING *
  `

  return rows[0] ? normalize(rows[0] as Row) : null
}

// Resolves the Witness chain for a System Switch session:
// session -> bridge -> bridger -> bridger's display name.
// Returns null if any link is missing (session not tied to a live bridge, etc).
async function resolveWitness(
  sessionId: string,
): Promise<{ bridgerId: string; bridgerName: string } | null> {
  const rows = await sql`
    SELECT u.id AS bridger_id, u.name AS bridger_name
    FROM bridge_sessions bs
    JOIN bridge_ais ba ON ba.id = bs.bridge_id
    JOIN users u ON u.id = ba.bridger_id
    WHERE bs.id = ${sessionId}
    LIMIT 1
  `
  const row = rows[0] as { bridger_id: string; bridger_name: string } | undefined
  if (!row) return null
  return { bridgerId: row.bridger_id, bridgerName: row.bridger_name || 'Bridger' }
}

// Milestones are the only source of posts to the Weave feed. Every milestone
// recorded here is, by definition, an extraordinary/unique moment in a
// Client's crossing — so every call posts to status_posts, with the
// session's Bridger credited as Witness. There is no separate "should we
// post this" filter: the caller deciding to call this function IS that
// decision. Routine interaction goes through recordSystemSwitchAction
// instead and never reaches the feed.
export async function addSystemSwitchMilestone(
  sessionId: string,
  milestone: Record<string, unknown>,
) {
  const milestoneTypeGuard = typeof milestone.type === 'string' ? milestone.type : 'milestone'

  // The crossing moment only counts once payment is actually confirmed.
  // Without an approved File Folder deposit tied to this session, this
  // is not a real crossing -- skip the write, the feed post, and every
  // notification entirely.
  if (milestoneTypeGuard === 'bridger_accepted') {
    const approvedDeposits = await sql`
      SELECT id FROM bridge_deposits
      WHERE session_id = ${sessionId}::uuid AND status = 'approved'
      LIMIT 1
    `
    if (approvedDeposits.length === 0) {
      console.error('bridger_accepted milestone blocked: no approved deposit for session', sessionId)
      return null
    }
  }

  const rows = await sql`
    UPDATE system_switch_state
    SET
      last_active_at = NOW(),
      milestones = milestones || ${JSON.stringify([{
        id: crypto.randomUUID(),
        ...milestone,
        createdAt: new Date().toISOString(),
      }])}::jsonb
    WHERE session_id = ${sessionId}
      AND status = 'active'
    RETURNING *
  `

  const state = rows[0] ? normalize(rows[0] as Row) : null
  if (!state) return null

  const witness = await resolveWitness(sessionId)

  const milestoneType = typeof milestone.type === 'string' ? milestone.type : 'milestone'

  if (milestoneType === 'bridger_accepted' && witness) {
    try {
      await sql`
        INSERT INTO notifications (user_id, type, title, content, from_user_name, link)
        VALUES (
          ${witness.bridgerId}::uuid,
          'crossing',
          'Your Client has crossed',
          ${'A Client you carry has purchased their File Folder and accepted you as their Bridger. File Number: ' + (state.fileNumber || 'pending') + '.'},
          'WEAVE',
          '/bridger/clients'
        )
      `
      await sql`
        INSERT INTO notifications (user_id, type, title, content, from_user_name, link)
        SELECT id, 'crossing', 'A Client has crossed',
          ${'A Client has accepted their Bridger, ' + witness.bridgerName + ', and begun building. File Number: ' + (state.fileNumber || 'pending') + '.'},
          'WEAVE', '/admin/file-number-engine'
        FROM users WHERE role = 'admin'
      `
    } catch (notifyError) {
      console.error('Failed to send bridger_accepted notifications:', notifyError)
    }
  }
  const milestoneContent =
    typeof milestone.content === 'string' && milestone.content.trim()
      ? milestone.content.trim()
      : `A Client crossing System Switch reached a milestone: ${milestoneType}.`

  await sql`
    INSERT INTO status_posts (
      user_id,
      author_name,
      author_role,
      author_avatar,
      content,
      media_url,
      media_type,
      session_id,
      witness_id,
      witness_name,
      milestone_type
    )
    VALUES (
      NULL,
      ${state.fileNumber || 'System Switch'},
      'system_switch',
      '✦',
      ${milestoneContent},
      NULL,
      NULL,
      ${sessionId},
      ${witness?.bridgerId ?? null},
      ${witness?.bridgerName ?? null},
      ${milestoneType}
    )
  `

  return state
}
