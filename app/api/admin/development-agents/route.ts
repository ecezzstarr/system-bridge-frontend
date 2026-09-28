import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { logAudit } from '@/lib/db'
import {
  decideDevelopmentWork,
  getDevelopmentFoundryState,
  queueDevelopmentWork,
  runDevelopmentAgentPulse,
  setDevelopmentAgentEnabled,
  type DevelopmentAgentKey,
} from '@/lib/weave-development-agents'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function hasSchedulerAuthority(request: NextRequest) {
  const expected = process.env.WEAVE_DEVELOPMENT_AGENT_SECRET
  const supplied = request.headers.get('x-weave-development-agent-secret')
  return Boolean(expected && supplied && supplied === expected)
}

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Administration access required' }, { status: 403 }) }
  return { user }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  try {
    const state = await getDevelopmentFoundryState()
    return NextResponse.json(state, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error: any) {
    console.error('[Development Foundry GET]', error)
    return NextResponse.json({ success: false, error: error?.message || 'Unable to load Development Foundry' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const action = String(body.action || 'pulse')

  const scheduler = action === 'pulse' && hasSchedulerAuthority(request)
  const auth = scheduler ? null : await requireAdmin(request)
  if (auth && 'error' in auth) return auth.error
  const admin = auth && 'user' in auth ? auth.user : null

  try {
    if (action === 'pulse') {
      const result = await runDevelopmentAgentPulse({
        agentKey: body.agentKey ? String(body.agentKey) as DevelopmentAgentKey : undefined,
        force: Boolean(body.force),
        maxAgents: Number(body.maxAgents || 1),
      })
      if (admin) {
        await logAudit(admin.id, 'development_foundry.pulse', {
          agentKey: body.agentKey || null,
          force: Boolean(body.force),
          results: result.results,
        })
      }
      return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
    }

    if (!admin) {
      return NextResponse.json({ success: false, error: 'Administration access required' }, { status: 403 })
    }

    if (action === 'queue') {
      const work = await queueDevelopmentWork({
        requestedBy: admin.id,
        agentKey: String(body.agentKey || 'eight') as DevelopmentAgentKey,
        title: String(body.title || ''),
        brief: String(body.brief || ''),
        priority: Number(body.priority || 70),
        targetPaths: Array.isArray(body.targetPaths) ? body.targetPaths.map(String) : undefined,
      })
      await logAudit(admin.id, 'development_foundry.queue', {
        workId: work.id,
        agentKey: work.agent_key,
        title: work.title,
      })
      return NextResponse.json({ success: true, work })
    }

    if (action === 'set_enabled') {
      const agent = await setDevelopmentAgentEnabled(
        String(body.agentKey || '') as DevelopmentAgentKey,
        Boolean(body.enabled),
      )
      await logAudit(admin.id, 'development_foundry.set_enabled', {
        agentKey: agent.agent_key,
        enabled: agent.enabled,
      })
      return NextResponse.json({ success: true, agent })
    }

    if (action === 'decide') {
      const decision = String(body.decision || '')
      if (!['approved', 'rejected', 'shipped'].includes(decision)) {
        return NextResponse.json({ success: false, error: 'Decision must be approved, rejected or shipped' }, { status: 400 })
      }
      const work = await decideDevelopmentWork(String(body.workId || ''), decision as 'approved' | 'rejected' | 'shipped')
      await logAudit(admin.id, 'development_foundry.decide', {
        workId: work.id,
        decision,
        agentKey: work.agent_key,
      })
      return NextResponse.json({ success: true, work })
    }

    return NextResponse.json({ success: false, error: 'Unknown Development Foundry action' }, { status: 400 })
  } catch (error: any) {
    console.error('[Development Foundry POST]', error)
    return NextResponse.json({ success: false, error: error?.message || 'Development Foundry action failed' }, { status: 500 })
  }
}
