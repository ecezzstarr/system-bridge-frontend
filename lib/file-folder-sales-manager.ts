import { getPool } from '@/lib/db'
import { ensureEmailOutreachSchema } from '@/lib/email-outreach'
import { ensureFlameSchema } from '@/lib/flame-schema'
import { ensureMarketTables } from '@/lib/market'
import { askEight } from '@/lib/eight-engine'
import { runEchoSalesCoordination, type EchoSalesCandidate, type EchoSalesCoordination } from '@/lib/echo-model'
import { notifyUser } from '@/lib/deposit-notifications'

export const FILE_FOLDER_WEEKLY_SALES_TARGET_DEFAULT = 1
export const FILE_FOLDER_SALES_MANAGER_TIMEZONE = 'Africa/Lagos'

type SalesManagerConfig = {
  enabled: boolean
  weekly_target: number
  echo_active: boolean
  updated_at?: string
}

export type FileFolderSalesMetrics = {
  weekStart: string
  weekEnd: string
  daysRemaining: number
  confirmedSales: number
  confirmedValueFlameCoin: number
  remainingSales: number
  directPurchasesPending: number
  bridgeDepositsPending: number
  emailSent: number
  emailReplied: number
  emailFailed: number
  whatsappPending: number
  whatsappSent: number
  whatsappOpened: number
  whatsappResponded: number
  whatsappConverted: number
  contactableEmailLeads: number
  availableWhatsappProspects: number
  activeBridgers: number
  crossingsOpened: number
}

export async function ensureFileFolderSalesManagerSchema() {
  await ensureFlameSchema()
  await ensureEmailOutreachSchema()
  await ensureMarketTables()
  const pool = getPool()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS weave_file_folder_sales_manager (
      id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      enabled boolean NOT NULL DEFAULT true,
      weekly_target integer NOT NULL DEFAULT 1 CHECK (weekly_target >= 1 AND weekly_target <= 1000),
      echo_active boolean NOT NULL DEFAULT true,
      updated_by uuid,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`
    INSERT INTO weave_file_folder_sales_manager (id,enabled,weekly_target,echo_active)
    VALUES (1,true,$1,true)
    ON CONFLICT (id) DO NOTHING
  `, [FILE_FOLDER_WEEKLY_SALES_TARGET_DEFAULT])

  await pool.query(`
    CREATE TABLE IF NOT EXISTS weave_file_folder_sales_reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      week_start date NOT NULL,
      report_date date NOT NULL,
      status varchar(24) NOT NULL,
      weekly_target integer NOT NULL,
      confirmed_sales integer NOT NULL DEFAULT 0,
      remaining_sales integer NOT NULL DEFAULT 0,
      metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
      echo_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
      eight_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE (report_date)
    )
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_weave_file_folder_sales_reports_week
    ON weave_file_folder_sales_reports(week_start,report_date DESC)
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS weave_file_folder_sales_actions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      week_start date NOT NULL,
      action_key varchar(255) NOT NULL,
      priority varchar(16) NOT NULL DEFAULT 'normal',
      channel varchar(24) NOT NULL,
      action_type varchar(64) NOT NULL,
      owner_role varchar(24) NOT NULL,
      owner_id uuid,
      target_ref varchar(255),
      reason text NOT NULL,
      instruction text NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'open',
      due_at timestamptz,
      completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE (week_start,action_key)
    )
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_weave_file_folder_sales_actions_open
    ON weave_file_folder_sales_actions(status,priority,due_at,created_at)
  `)
}

export async function getFileFolderSalesManagerConfig(): Promise<SalesManagerConfig> {
  await ensureFileFolderSalesManagerSchema()
  const result = await getPool().query(
    `SELECT enabled,weekly_target,echo_active,updated_at
     FROM weave_file_folder_sales_manager
     WHERE id=1`,
  )
  return result.rows[0] || {
    enabled: true,
    weekly_target: FILE_FOLDER_WEEKLY_SALES_TARGET_DEFAULT,
    echo_active: true,
  }
}

async function salesClock() {
  const result = await getPool().query(
    `SELECT
       date_trunc('week', timezone($1,now()))::date AS week_start,
       (date_trunc('week', timezone($1,now()))::date + 6) AS week_end,
       GREATEST(0,((date_trunc('week', timezone($1,now()))::date + 6) - timezone($1,now())::date))::int AS days_remaining`,
    [FILE_FOLDER_SALES_MANAGER_TIMEZONE],
  )
  return result.rows[0]
}

export async function collectFileFolderSalesMetrics(weeklyTarget?: number): Promise<FileFolderSalesMetrics> {
  await ensureFileFolderSalesManagerSchema()
  const pool = getPool()
  const config = await getFileFolderSalesManagerConfig()
  const target = Math.max(1, Number(weeklyTarget || config.weekly_target || FILE_FOLDER_WEEKLY_SALES_TARGET_DEFAULT))
  const clock = await salesClock()
  const weekStart = String(clock.week_start)
  const weekEnd = String(clock.week_end)

  const [sales, directPending, bridgePending, email, whatsapp, supply, bridgers, crossings] = await Promise.all([
    pool.query(
      `WITH sales AS (
         SELECT
           COALESCE(file_number,id::text) AS sale_key,
           amount_trx::numeric AS amount,
           COALESCE(confirmed_at,created_at) AS sold_at
         FROM file_folder_purchases
         WHERE status='confirmed'
         UNION ALL
         SELECT
           COALESCE(file_number,id::text) AS sale_key,
           tier_trx::numeric AS amount,
           COALESCE(verified_at,created_at) AS sold_at
         FROM bridge_deposits
         WHERE status='approved'
       )
       SELECT
         COUNT(DISTINCT sale_key)::int AS confirmed_sales,
         COALESCE(SUM(amount),0)::numeric AS confirmed_value
       FROM sales
       WHERE (sold_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date`,
      [FILE_FOLDER_SALES_MANAGER_TIMEZONE, weekStart, weekEnd],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM file_folder_purchases
       WHERE status='pending_admin_confirmation'`,
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM bridge_deposits
       WHERE status='pending'`,
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='sent' AND (sent_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date)::int AS sent,
         COUNT(*) FILTER (WHERE replied_at IS NOT NULL AND (replied_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date)::int AS replied,
         COUNT(*) FILTER (WHERE status='failed' AND (created_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date)::int AS failed
       FROM weave_email_outreach`,
      [FILE_FOLDER_SALES_MANAGER_TIMEZONE, weekStart, weekEnd],
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='pending')::int AS pending,
         COUNT(*) FILTER (WHERE status='sent')::int AS sent,
         COUNT(*) FILTER (WHERE status='opened')::int AS opened,
         COUNT(*) FILTER (WHERE status='responded')::int AS responded,
         COUNT(*) FILTER (WHERE status='converted' AND (last_activity_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date)::int AS converted
       FROM market_prospect_outreach`,
      [FILE_FOLDER_SALES_MANAGER_TIMEZONE, weekStart, weekEnd],
    ),
    pool.query(
      `SELECT
         (SELECT COUNT(*)::int
          FROM weave_email_prospect_leads
          WHERE contactable=true
            AND status IN ('available','contacted')) AS email_leads,
         (SELECT COUNT(*)::int
          FROM market_prospect_contacts c
          WHERE c.status='available'
            AND COALESCE(NULLIF(TRIM(c.whatsapp_number),''),NULLIF(TRIM(c.phone),'')) IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM market_prospect_outreach o WHERE o.contact_id=c.id)) AS whatsapp_prospects`,
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM users
       WHERE role='bridger'
         AND COALESCE(is_active,true)=true`,
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM chatgpt_bridge_sessions
       WHERE opened_at IS NOT NULL
         AND (opened_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date`,
      [FILE_FOLDER_SALES_MANAGER_TIMEZONE, weekStart, weekEnd],
    ),
  ])

  const confirmedSales = Number(sales.rows[0]?.confirmed_sales || 0)
  return {
    weekStart,
    weekEnd,
    daysRemaining: Number(clock.days_remaining || 0),
    confirmedSales,
    confirmedValueFlameCoin: Number(sales.rows[0]?.confirmed_value || 0),
    remainingSales: Math.max(0, target - confirmedSales),
    directPurchasesPending: Number(directPending.rows[0]?.count || 0),
    bridgeDepositsPending: Number(bridgePending.rows[0]?.count || 0),
    emailSent: Number(email.rows[0]?.sent || 0),
    emailReplied: Number(email.rows[0]?.replied || 0),
    emailFailed: Number(email.rows[0]?.failed || 0),
    whatsappPending: Number(whatsapp.rows[0]?.pending || 0),
    whatsappSent: Number(whatsapp.rows[0]?.sent || 0),
    whatsappOpened: Number(whatsapp.rows[0]?.opened || 0),
    whatsappResponded: Number(whatsapp.rows[0]?.responded || 0),
    whatsappConverted: Number(whatsapp.rows[0]?.converted || 0),
    contactableEmailLeads: Number(supply.rows[0]?.email_leads || 0),
    availableWhatsappProspects: Number(supply.rows[0]?.whatsapp_prospects || 0),
    activeBridgers: Number(bridgers.rows[0]?.count || 0),
    crossingsOpened: Number(crossings.rows[0]?.count || 0),
  }
}

async function collectEchoSalesCandidates(): Promise<EchoSalesCandidate[]> {
  const pool = getPool()
  const candidates: EchoSalesCandidate[] = []

  const [directPurchases, bridgeDeposits, whatsapp, email] = await Promise.all([
    pool.query(
      `SELECT id,buyer_name,buyer_email,created_at,
         EXTRACT(EPOCH FROM (NOW()-created_at))/3600 AS age_hours
       FROM file_folder_purchases
       WHERE status='pending_admin_confirmation'
       ORDER BY created_at ASC
       LIMIT 12`,
    ),
    pool.query(
      `SELECT id,prospect_name,bridger_id,created_at,
         EXTRACT(EPOCH FROM (NOW()-created_at))/3600 AS age_hours
       FROM bridge_deposits
       WHERE status='pending'
       ORDER BY created_at ASC
       LIMIT 12`,
    ),
    pool.query(
      `SELECT
         o.id,o.status,o.bridger_id,o.last_activity_at,c.name,c.phone,
         EXTRACT(EPOCH FROM (NOW()-o.last_activity_at))/3600 AS age_hours
       FROM market_prospect_outreach o
       JOIN market_prospect_contacts c ON c.id=o.contact_id
       WHERE o.status IN ('sent','opened','responded')
         AND (
           (o.status='responded' AND o.last_activity_at < NOW()-INTERVAL '6 hours')
           OR (o.status='opened' AND o.last_activity_at < NOW()-INTERVAL '24 hours')
           OR (o.status='sent' AND o.last_activity_at < NOW()-INTERVAL '48 hours')
         )
       ORDER BY
         CASE o.status WHEN 'responded' THEN 0 WHEN 'opened' THEN 1 ELSE 2 END,
         o.last_activity_at ASC
       LIMIT 24`,
    ),
    pool.query(
      `SELECT
         o.id,o.status,o.actor_id,u.role AS actor_role,o.sent_at,o.replied_at,
         l.lead_code,l.name,l.email,
         EXTRACT(EPOCH FROM (NOW()-COALESCE(o.replied_at,o.sent_at,o.created_at)))/3600 AS age_hours
       FROM weave_email_outreach o
       JOIN weave_email_prospect_leads l ON l.id=o.lead_id
       JOIN users u ON u.id=o.actor_id
       WHERE (
         o.replied_at IS NOT NULL
         OR (o.status='sent' AND o.sent_at < NOW()-INTERVAL '72 hours')
       )
       ORDER BY
         CASE WHEN o.replied_at IS NOT NULL THEN 0 ELSE 1 END,
         COALESCE(o.replied_at,o.sent_at,o.created_at) ASC
       LIMIT 24`,
    ),
  ])

  for (const row of directPurchases.rows) {
    candidates.push({
      key: `purchase:${row.id}:verify`,
      channel: 'admin',
      stage: 'purchase_pending_verification',
      ownerRole: 'admin',
      targetRef: String(row.id),
      ageHours: Number(row.age_hours || 0),
      evidence: `A File Folder purchase from ${row.buyer_name || row.buyer_email || 'a prospect'} is waiting for Administration verification.`,
    })
  }
  for (const row of bridgeDeposits.rows) {
    candidates.push({
      key: `bridge-deposit:${row.id}:verify`,
      channel: 'admin',
      stage: 'bridge_payment_pending',
      ownerRole: 'admin',
      targetRef: String(row.id),
      ageHours: Number(row.age_hours || 0),
      evidence: `A Bridger-guided File Folder payment for ${row.prospect_name || 'a prospect'} is waiting for Administration verification.`,
    })
  }
  for (const row of whatsapp.rows) {
    candidates.push({
      key: `whatsapp:${row.id}:${row.status}`,
      channel: 'whatsapp',
      stage: String(row.status),
      ownerRole: 'bridger',
      ownerId: row.bridger_id ? String(row.bridger_id) : null,
      targetRef: String(row.id),
      ageHours: Number(row.age_hours || 0),
      evidence: `Existing WhatsApp prospect ${row.name || row.phone || row.id} is at ${row.status} with no later movement recorded.`,
    })
  }
  for (const row of email.rows) {
    const role = row.actor_role === 'bridger' ? 'bridger' : 'admin'
    candidates.push({
      key: `email:${row.id}:${row.replied_at ? 'replied' : 'stale'}`,
      channel: 'email',
      stage: row.replied_at ? 'replied' : 'sent_no_reply',
      ownerRole: role,
      ownerId: row.actor_id ? String(row.actor_id) : null,
      targetRef: String(row.id),
      ageHours: Number(row.age_hours || 0),
      evidence: row.replied_at
        ? `Existing email prospect ${row.name || row.email || row.lead_code} has replied and needs a human continuation.`
        : `Existing email prospect ${row.name || row.email || row.lead_code} was contacted at least 72 hours ago with no reply recorded.`,
    })
  }

  return candidates.slice(0, 60)
}

function managerStatus(metrics: FileFolderSalesMetrics, weeklyTarget: number) {
  if (metrics.confirmedSales >= weeklyTarget) return 'target_met'
  if (metrics.daysRemaining <= 1) return 'critical'
  if (metrics.daysRemaining <= 3) return 'at_risk'
  if (metrics.emailReplied + metrics.whatsappResponded + metrics.directPurchasesPending + metrics.bridgeDepositsPending > 0) return 'on_track'
  return 'needs_pipeline'
}

async function persistEchoActions(weekStart: string, echo: EchoSalesCoordination) {
  const pool = getPool()
  const newlyInserted: Array<{id:string;owner_id:string|null;owner_role:string;priority:string;instruction:string}> = []

  for (const action of echo.actions) {
    const result = await pool.query(
      `INSERT INTO weave_file_folder_sales_actions (
         week_start,action_key,priority,channel,action_type,owner_role,owner_id,target_ref,
         reason,instruction,status,due_at,updated_at
       )
       VALUES ($1::date,$2,$3,$4,$5,$6,$7::uuid,$8,$9,$10,'open',
         CASE WHEN $3 IN ('urgent','high') THEN NOW()+INTERVAL '6 hours' ELSE NOW()+INTERVAL '24 hours' END,
         NOW()
       )
       ON CONFLICT (week_start,action_key) DO UPDATE SET
         priority=EXCLUDED.priority,
         reason=EXCLUDED.reason,
         instruction=EXCLUDED.instruction,
         due_at=CASE
           WHEN weave_file_folder_sales_actions.status='open' THEN LEAST(weave_file_folder_sales_actions.due_at,EXCLUDED.due_at)
           ELSE weave_file_folder_sales_actions.due_at
         END,
         updated_at=NOW()
       RETURNING id,owner_id,owner_role,priority,instruction,(xmax=0) AS inserted`,
      [
        weekStart,
        action.key,
        action.priority,
        action.channel,
        action.actionType,
        action.ownerRole,
        action.ownerId || null,
        action.targetRef || null,
        action.reason,
        action.instruction,
      ],
    )
    const row = result.rows[0]
    if (row?.inserted) newlyInserted.push(row)
  }

  const activeAdmins = newlyInserted.some(row => !row.owner_id && row.owner_role === 'admin')
    ? (await pool.query(`SELECT id FROM users WHERE role='admin' AND COALESCE(is_active,true)=true`)).rows
    : []

  for (const action of newlyInserted) {
    const recipients = action.owner_id
      ? [String(action.owner_id)]
      : action.owner_role === 'admin'
        ? activeAdmins.map(row => String(row.id))
        : []

    for (const recipient of recipients) {
      await notifyUser(recipient, {
        type: 'echo_sales_manager_action',
        title: action.priority === 'urgent' ? 'Echo: urgent File Folder movement' : 'Echo: File Folder follow-up',
        content: String(action.instruction).slice(0, 500),
        link: action.owner_role === 'admin' ? '/admin/file-folder-sales-manager' : '/bridger/presence',
        fromUserName: 'Echo',
      })
    }
  }
}

async function runEightSalesIntelligence(
  weeklyTarget: number,
  metrics: FileFolderSalesMetrics,
  echo: EchoSalesCoordination,
) {
  return askEight(
    `Act as the WEAVE File Folder commercial intelligence manager.

Review only the supplied evidence. The weekly target is ${weeklyTarget} confirmed File Folder sale(s). Echo is the active movement coordinator; your role is to diagnose the funnel and tell Administration where the constraint is.

Required output:
- state the current pace without claiming sales can be guaranteed;
- identify the single largest measurable bottleneck;
- give the top three priorities for the next 24 hours;
- distinguish acquisition supply, outreach activity, warm response, verification, and conversion;
- if the target is already met, recommend how to preserve quality and build next week's pipeline;
- never invent numbers, prospects or causes not supported by the metrics.

Current metrics:
${JSON.stringify(metrics)}

Echo coordination:
${JSON.stringify(echo)}`,
    {
      userRole: 'admin',
      systemState: {
        operation: 'file_folder_weekly_sales_intelligence',
        weeklyTarget,
        metrics,
      },
    },
  )
}

export async function runFileFolderSalesManager() {
  await ensureFileFolderSalesManagerSchema()
  const config = await getFileFolderSalesManagerConfig()
  const metrics = await collectFileFolderSalesMetrics(config.weekly_target)

  if (!config.enabled) {
    return { enabled: false, config, metrics, status: 'paused' }
  }

  const candidates = await collectEchoSalesCandidates()
  const echo = config.echo_active
    ? await runEchoSalesCoordination({
        weeklyTarget: config.weekly_target,
        confirmedSales: metrics.confirmedSales,
        remainingSales: metrics.remainingSales,
        daysRemaining: metrics.daysRemaining,
        metrics,
        candidates,
      })
    : { summary: 'Echo sales coordination is paused by Administration.', actions: [] }

  await persistEchoActions(metrics.weekStart, echo)
  const eight = await runEightSalesIntelligence(config.weekly_target, metrics, echo)
  const status = managerStatus(metrics, config.weekly_target)

  const pool = getPool()
  await pool.query(
    `INSERT INTO weave_file_folder_sales_reports (
       week_start,report_date,status,weekly_target,confirmed_sales,remaining_sales,
       metrics,echo_summary,eight_analysis,updated_at
     )
     VALUES (
       $1::date,(timezone($2,now()))::date,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,NOW()
     )
     ON CONFLICT (report_date) DO UPDATE SET
       week_start=EXCLUDED.week_start,
       status=EXCLUDED.status,
       weekly_target=EXCLUDED.weekly_target,
       confirmed_sales=EXCLUDED.confirmed_sales,
       remaining_sales=EXCLUDED.remaining_sales,
       metrics=EXCLUDED.metrics,
       echo_summary=EXCLUDED.echo_summary,
       eight_analysis=EXCLUDED.eight_analysis,
       updated_at=NOW()`,
    [
      metrics.weekStart,
      FILE_FOLDER_SALES_MANAGER_TIMEZONE,
      status,
      config.weekly_target,
      metrics.confirmedSales,
      metrics.remainingSales,
      JSON.stringify(metrics),
      JSON.stringify(echo),
      JSON.stringify(eight),
    ],
  )

  return {
    enabled: true,
    config,
    status,
    metrics,
    echo,
    eight,
    candidateCount: candidates.length,
  }
}

export async function getFileFolderSalesManagerSnapshot() {
  await ensureFileFolderSalesManagerSchema()
  const config = await getFileFolderSalesManagerConfig()
  const metrics = await collectFileFolderSalesMetrics(config.weekly_target)
  const pool = getPool()

  const [reports, actions] = await Promise.all([
    pool.query(
      `SELECT *
       FROM weave_file_folder_sales_reports
       ORDER BY report_date DESC
       LIMIT 14`,
    ),
    pool.query(
      `SELECT *
       FROM weave_file_folder_sales_actions
       WHERE week_start=$1::date
       ORDER BY
         CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
         CASE status WHEN 'open' THEN 0 ELSE 1 END,
         due_at ASC NULLS LAST,
         created_at DESC
       LIMIT 100`,
      [metrics.weekStart],
    ),
  ])

  return {
    config,
    status: managerStatus(metrics, config.weekly_target),
    metrics,
    latestReport: reports.rows[0] || null,
    reports: reports.rows,
    actions: actions.rows,
  }
}

export async function updateFileFolderSalesManagerConfig(input: {
  weeklyTarget?: number
  enabled?: boolean
  echoActive?: boolean
  updatedBy?: string | null
}) {
  await ensureFileFolderSalesManagerSchema()
  const current = await getFileFolderSalesManagerConfig()
  const weeklyTarget = input.weeklyTarget == null
    ? Number(current.weekly_target)
    : Math.max(1, Math.min(1000, Math.trunc(Number(input.weeklyTarget) || 1)))
  const enabled = input.enabled == null ? Boolean(current.enabled) : Boolean(input.enabled)
  const echoActive = input.echoActive == null ? Boolean(current.echo_active) : Boolean(input.echoActive)

  const result = await getPool().query(
    `UPDATE weave_file_folder_sales_manager
     SET weekly_target=$1,enabled=$2,echo_active=$3,updated_by=$4::uuid,updated_at=NOW()
     WHERE id=1
     RETURNING enabled,weekly_target,echo_active,updated_at`,
    [weeklyTarget, enabled, echoActive, input.updatedBy || null],
  )
  return result.rows[0]
}

export async function updateSalesActionStatus(actionId: string, status: 'completed' | 'dismissed') {
  await ensureFileFolderSalesManagerSchema()
  const result = await getPool().query(
    `UPDATE weave_file_folder_sales_actions
     SET status=$2,
         completed_at=CASE WHEN $2='completed' THEN NOW() ELSE completed_at END,
         updated_at=NOW()
     WHERE id=$1::uuid
     RETURNING *`,
    [actionId, status],
  )
  return result.rows[0] || null
}
