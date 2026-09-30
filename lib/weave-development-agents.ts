import { readFile } from 'fs/promises'
import { join } from 'path'
import { sql } from '@/lib/db'
import { askEight } from '@/lib/eight-engine'

export type DevelopmentAgentKey =
  | 'eight'
  | 'presence-forge'
  | 'file-folder-builder'
  | 'movement-engineer'
  | 'infrastructure-sentinel'
  | 'verification-keeper'

export type DevelopmentWorkStatus =
  | 'queued'
  | 'working'
  | 'proposal'
  | 'approved'
  | 'rejected'
  | 'shipped'

export type DevelopmentAgentDefinition = {
  key: DevelopmentAgentKey
  name: string
  role: string
  mandate: string
  cadenceMinutes: number
  ownedPaths: string[]
  standingMission: string
}

export const WEAVE_DEVELOPMENT_AGENTS: DevelopmentAgentDefinition[] = [
  {
    key: 'eight',
    name: 'Eight',
    role: 'Lead Architect',
    mandate: 'Hold the architecture together, divide work across the engineering field, and reject changes that make WEAVE feel like a collection of pages instead of one operating world.',
    cadenceMinutes: 15,
    ownedPaths: [
      'lib/weave-architecture.ts',
      'components/world/weave-dashboard-world.tsx',
      'app/(app)/admin/dev-workshop/page.tsx',
    ],
    standingMission: 'Inspect the current architecture for fragmentation, duplicated interfaces, generic dashboard language, and weak system continuity. Produce one concrete development movement that makes WEAVE behave more like a persistent operating world.',
  },
  {
    key: 'presence-forge',
    name: 'Presence Forge',
    role: 'World Systems Engineer',
    mandate: 'Make WEAVE physically read as one live environment: movement, depth, routes, flame, river, arrival, interaction response and spatial continuity.',
    cadenceMinutes: 20,
    ownedPaths: [
      'components/world/weave-dashboard-world.tsx',
      'components/world/weave-environment-surface.tsx',
      'components/world/weave-live-flame-field.tsx',
      'components/world/interaction-motion-field.tsx',
    ],
    standingMission: 'Find the strongest remaining HUD, card, page-shell or decorative-world behavior and design a source-level change that turns it into spatial system behavior.',
  },
  {
    key: 'file-folder-builder',
    name: 'Folderwright',
    role: 'Client World Engineer',
    mandate: 'Develop the Main File Folder as a persistent construction territory where Clients build, commission and operate real systems.',
    cadenceMinutes: 20,
    ownedPaths: [
      'components/system-switch/client-file-folder-operating-environment.tsx',
      'components/system-switch/client-file-folder-3d.tsx',
      'components/system-switch/file-folder-open-world.tsx',
      'app/api/client/file-folder-world/route.ts',
    ],
    standingMission: 'Inspect the Client File Folder for anything that still behaves like a page, menu or detached card. Prepare one improvement to construction realism, customer-door operation, navigation or live-system behavior.',
  },
  {
    key: 'movement-engineer',
    name: 'Movement Engineer',
    role: 'Participation Systems Engineer',
    mandate: 'Keep Client, Bridger, Agent and customer movement causal: every action should change a real state, issue evidence and visibly move through WEAVE.',
    cadenceMinutes: 25,
    ownedPaths: [
      'app/api/bridger/numbers/route.ts',
      'components/bridger/daily-prospect-claim.tsx',
      'lib/weave-interaction-motion.ts',
    ],
    standingMission: 'Inspect participation flows for dead buttons, duplicated surfaces, hidden state transitions or actions that do not produce visible confirmed movement. Prepare one end-to-end repair or refinement.',
  },
  {
    key: 'infrastructure-sentinel',
    name: 'Infrastructure Sentinel',
    role: 'Runtime Engineer',
    mandate: 'Keep Cloud Run, Origin, Divine Shield, deployment gates and production recovery safe, observable and reversible.',
    cadenceMinutes: 30,
    ownedPaths: [
      'app/api/admin/infrastructure/route.ts',
      'app/(app)/admin/infrastructure/page.tsx',
      'scripts/deploy-weave.py',
      'lib/weave-integrity-engine.ts',
    ],
    standingMission: 'Inspect production runtime and deployment control for unsafe shortcuts, missing verification, weak rollback, hidden failure modes or dependencies that can freeze the live environment.',
  },
  {
    key: 'verification-keeper',
    name: 'Verification Keeper',
    role: 'Regression Engineer',
    mandate: 'Continuously challenge the implementation so tests protect the intended WEAVE behavior instead of freezing old metaphors such as HUDs, cards or pages.',
    cadenceMinutes: 30,
    ownedPaths: [
      'tests/environment-grade.cjs',
      'tests/recent-features.cjs',
      'tests/wiring.cjs',
      'PRODUCTION.md',
    ],
    standingMission: 'Inspect regression checks for assertions that preserve obsolete behavior. Prepare one test change that protects real operating behavior, production safety or world continuity.',
  },
]

const ROOT = process.cwd()

function definitionFor(key: string) {
  return WEAVE_DEVELOPMENT_AGENTS.find(agent => agent.key === key)
}

async function ensureDevelopmentFoundrySchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS weave_development_agents (
      agent_key varchar(80) PRIMARY KEY,
      name varchar(160) NOT NULL,
      role varchar(200) NOT NULL,
      mandate text NOT NULL,
      cadence_minutes integer NOT NULL DEFAULT 30,
      enabled boolean NOT NULL DEFAULT true,
      last_pulse_at timestamptz,
      next_pulse_at timestamptz NOT NULL DEFAULT NOW(),
      last_summary text,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS weave_development_work (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_key varchar(80) NOT NULL REFERENCES weave_development_agents(agent_key) ON DELETE CASCADE,
      requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
      source varchar(32) NOT NULL DEFAULT 'automatic',
      priority integer NOT NULL DEFAULT 50,
      title varchar(220) NOT NULL,
      brief text NOT NULL,
      target_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
      status varchar(32) NOT NULL DEFAULT 'queued',
      proposal text,
      verification text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      decided_at timestamptz,
      CONSTRAINT weave_development_work_status_check
        CHECK (status IN ('queued','working','proposal','approved','rejected','shipped'))
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS idx_weave_development_work_agent_status ON weave_development_work(agent_key,status,created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_weave_development_agents_next_pulse ON weave_development_agents(enabled,next_pulse_at)`

  for (const agent of WEAVE_DEVELOPMENT_AGENTS) {
    await sql`
      INSERT INTO weave_development_agents (
        agent_key,name,role,mandate,cadence_minutes,enabled,next_pulse_at
      ) VALUES (
        ${agent.key},${agent.name},${agent.role},${agent.mandate},${agent.cadenceMinutes},true,NOW()
      )
      ON CONFLICT (agent_key) DO UPDATE SET
        name=EXCLUDED.name,
        role=EXCLUDED.role,
        mandate=EXCLUDED.mandate,
        cadence_minutes=EXCLUDED.cadence_minutes,
        updated_at=NOW()
    `
  }
}

async function readOwnedContext(agent: DevelopmentAgentDefinition) {
  const slices: string[] = []
  for (const path of agent.ownedPaths.slice(0, 4)) {
    try {
      const content = await readFile(join(ROOT, path), 'utf8')
      const bounded = content.length > 9000
        ? `${content.slice(0, 6500)}\n\n/* ... bounded source snapshot ... */\n\n${content.slice(-1800)}`
        : content
      slices.push(`### ${path}\n\`\`\`\n${bounded}\n\`\`\``)
    } catch (error: any) {
      slices.push(`### ${path}\nUnavailable in this runtime: ${error?.message || 'read failed'}`)
    }
  }
  return slices.join('\n\n')
}

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

export async function getDevelopmentFoundryState() {
  await ensureDevelopmentFoundrySchema()
  const [agents, work] = await Promise.all([
    sql`
      SELECT a.*,
        COUNT(w.id) FILTER (WHERE w.status IN ('queued','working','proposal','approved'))::int AS open_work_count,
        COUNT(w.id) FILTER (WHERE w.status='proposal')::int AS awaiting_authority_count
      FROM weave_development_agents a
      LEFT JOIN weave_development_work w ON w.agent_key=a.agent_key
      GROUP BY a.agent_key
      ORDER BY
        CASE a.agent_key
          WHEN 'eight' THEN 0
          WHEN 'presence-forge' THEN 1
          WHEN 'file-folder-builder' THEN 2
          WHEN 'movement-engineer' THEN 3
          WHEN 'infrastructure-sentinel' THEN 4
          ELSE 5
        END
    `,
    sql`
      SELECT id,agent_key,source,priority,title,brief,target_paths,status,proposal,verification,created_at,updated_at,decided_at
      FROM weave_development_work
      ORDER BY
        CASE status WHEN 'working' THEN 0 WHEN 'proposal' THEN 1 WHEN 'queued' THEN 2 WHEN 'approved' THEN 3 ELSE 4 END,
        priority DESC,
        created_at DESC
      LIMIT 60
    `,
  ])

  return {
    success: true,
    agents,
    work,
    continuousRuntimeReady: Boolean(process.env.CRON_SECRET || process.env.WEAVE_DEVELOPMENT_AGENT_SECRET),
    pulseIntervalMinutes: 15,
  }
}

export async function queueDevelopmentWork(input: {
  requestedBy?: string | null
  agentKey: DevelopmentAgentKey
  title: string
  brief: string
  priority?: number
  targetPaths?: string[]
}) {
  await ensureDevelopmentFoundrySchema()
  const agent = definitionFor(input.agentKey)
  if (!agent) throw new Error('Unknown development agent')

  const title = cleanText(input.title).slice(0, 220)
  const brief = cleanText(input.brief)
  if (!title || !brief) throw new Error('Title and brief are required')

  const paths = (input.targetPaths || agent.ownedPaths).slice(0, 12)
  const result = await sql`
    INSERT INTO weave_development_work (
      agent_key,requested_by,source,priority,title,brief,target_paths,status
    ) VALUES (
      ${agent.key},${input.requestedBy || null}::uuid,'admin',
      ${Math.max(1, Math.min(100, Number(input.priority || 70)))},
      ${title},${brief},${JSON.stringify(paths)}::jsonb,'queued'
    )
    RETURNING *
  `
  await sql`
    UPDATE weave_development_agents
    SET next_pulse_at=NOW(),updated_at=NOW()
    WHERE agent_key=${agent.key}
  `
  return result[0]
}

export async function setDevelopmentAgentEnabled(agentKey: DevelopmentAgentKey, enabled: boolean) {
  await ensureDevelopmentFoundrySchema()
  if (!definitionFor(agentKey)) throw new Error('Unknown development agent')
  const result = await sql`
    UPDATE weave_development_agents
    SET enabled=${enabled},next_pulse_at=CASE WHEN ${enabled} THEN NOW() ELSE next_pulse_at END,updated_at=NOW()
    WHERE agent_key=${agentKey}
    RETURNING *
  `
  return result[0]
}

export async function decideDevelopmentWork(workId: string, decision: 'approved' | 'rejected' | 'shipped') {
  await ensureDevelopmentFoundrySchema()
  const result = await sql`
    UPDATE weave_development_work
    SET status=${decision},decided_at=NOW(),updated_at=NOW()
    WHERE id=${workId}::uuid
    RETURNING *
  `
  if (!result[0]) throw new Error('Development work item not found')
  return result[0]
}

async function runOneAgent(agent: DevelopmentAgentDefinition, force = false) {
  const agentRows = await sql`
    SELECT * FROM weave_development_agents
    WHERE agent_key=${agent.key}
    LIMIT 1
  `
  const state = agentRows[0]
  if (!state?.enabled) return { agentKey: agent.key, skipped: 'disabled' }

  if (!force && state.next_pulse_at && new Date(state.next_pulse_at).getTime() > Date.now()) {
    return { agentKey: agent.key, skipped: 'not_due' }
  }

  const existingProposal = await sql`
    SELECT id,title,status
    FROM weave_development_work
    WHERE agent_key=${agent.key} AND status IN ('working','proposal')
    ORDER BY created_at DESC
    LIMIT 1
  `
  if (existingProposal[0]) {
    await sql`
      UPDATE weave_development_agents
      SET last_pulse_at=NOW(),
          next_pulse_at=NOW() + (${agent.cadenceMinutes}::text || ' minutes')::interval,
          last_summary=${`Awaiting Administration on: ${existingProposal[0].title}`},
          updated_at=NOW()
      WHERE agent_key=${agent.key}
    `
    return { agentKey: agent.key, skipped: 'awaiting_authority', workId: existingProposal[0].id }
  }

  let workRows = await sql`
    SELECT *
    FROM weave_development_work
    WHERE agent_key=${agent.key} AND status='queued'
    ORDER BY priority DESC,created_at ASC
    LIMIT 1
  `

  if (!workRows[0]) {
    workRows = await sql`
      INSERT INTO weave_development_work (
        agent_key,source,priority,title,brief,target_paths,status
      ) VALUES (
        ${agent.key},'automatic',40,
        ${`${agent.name} continuous development cycle`},
        ${agent.standingMission},
        ${JSON.stringify(agent.ownedPaths)}::jsonb,
        'queued'
      )
      RETURNING *
    `
  }

  const work = workRows[0]
  await sql`
    UPDATE weave_development_work
    SET status='working',updated_at=NOW()
    WHERE id=${work.id}::uuid
  `

  try {
    const codeContext = await readOwnedContext(agent)
    const result = await askEight(
      `You are operating as ${agent.name}, the ${agent.role}, inside the WEAVE Development Foundry.

Mandate:
${agent.mandate}

Current development work:
${work.title}
${work.brief}

Produce one concrete source-level development proposal. It must be grounded in the code snapshot, name exact target files, describe the implementation precisely, and include verification that proves the behavior. Do not deploy, push, delete data, or claim a change is already live. Do not preserve a HUD/page/card metaphor when the intended behavior is a persistent operating world.

Return the strongest build movement first, not a generic review.`,
      {
        userRole: 'admin',
        currentCode: codeContext,
        systemState: {
          developmentAgent: agent.key,
          targetPaths: work.target_paths,
          authority: 'proposal_only_until_administration_approval',
        },
      },
    )

    const proposal = cleanText(result.code) || cleanText(result.message) || 'No proposal returned.'
    const verification = Array.isArray(result.suggestions) && result.suggestions.length
      ? result.suggestions.join('\n')
      : 'Verify syntax, regression coverage, production build and zero-traffic candidate before promotion.'

    await sql`
      UPDATE weave_development_work
      SET status='proposal',proposal=${proposal},verification=${verification},updated_at=NOW()
      WHERE id=${work.id}::uuid
    `
    await sql`
      UPDATE weave_development_agents
      SET last_pulse_at=NOW(),
          next_pulse_at=NOW() + (${agent.cadenceMinutes}::text || ' minutes')::interval,
          last_summary=${cleanText(result.message, `${agent.name} produced a proposal`).slice(0, 1800)},
          updated_at=NOW()
      WHERE agent_key=${agent.key}
    `

    return { agentKey: agent.key, workId: work.id, status: 'proposal' }
  } catch (error: any) {
    await sql`
      UPDATE weave_development_work
      SET status='queued',
          verification=${`Pulse failed: ${error?.message || 'unknown error'}`},
          updated_at=NOW()
      WHERE id=${work.id}::uuid
    `
    await sql`
      UPDATE weave_development_agents
      SET last_pulse_at=NOW(),
          next_pulse_at=NOW() + INTERVAL '10 minutes',
          last_summary=${`Pulse interrupted: ${error?.message || 'unknown error'}`},
          updated_at=NOW()
      WHERE agent_key=${agent.key}
    `
    return { agentKey: agent.key, workId: work.id, status: 'interrupted', error: error?.message || 'unknown error' }
  }
}

export async function runDevelopmentAgentPulse(options?: {
  agentKey?: DevelopmentAgentKey
  force?: boolean
  maxAgents?: number
}) {
  await ensureDevelopmentFoundrySchema()
  const requested = options?.agentKey
    ? WEAVE_DEVELOPMENT_AGENTS.filter(agent => agent.key === options.agentKey)
    : WEAVE_DEVELOPMENT_AGENTS
  if (options?.agentKey && requested.length === 0) throw new Error('Unknown development agent')

  const maxAgents = Math.max(1, Math.min(2, Number(options?.maxAgents || 1)))
  const results: any[] = []
  for (const agent of requested) {
    const result = await runOneAgent(agent, Boolean(options?.force))
    results.push(result)
    if (results.filter(item => item.status === 'proposal' || item.status === 'interrupted').length >= maxAgents) break
  }

  return { success: true, results }
}
