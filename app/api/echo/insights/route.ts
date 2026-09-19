import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import {
  getEchoIdentity,
  retrieveEchoContext,
  storeEchoInsight,
  listEchoInsights,
  hasActiveContinuance,
} from '@/lib/echo-db'
import { runEchoAnalysis } from '@/lib/echo-model'

// GET: fetch stored insights for the dashboard
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const identity = await getEchoIdentity(authUser.id)
  if (!identity) return NextResponse.json({ error: 'No Echo Identity' }, { status: 404 })

  const insights = await listEchoInsights(identity.id)
  return NextResponse.json({ insights })
}

// POST: trigger on-demand analysis. Same code path works from a scheduled
// job for periodic analysis — just call runEchoAnalysis server-side directly.
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const identity = await getEchoIdentity(authUser.id)
  if (!identity) return NextResponse.json({ error: 'No Echo Identity' }, { status: 404 })

  const subscribed = await hasActiveContinuance(authUser.id)
  if (!subscribed) {
    return NextResponse.json({ error: 'Echo is locked; subscription inactive' }, { status: 403 })
  }

  // Bounded retrieval, not a full-history dump — see retrieveEchoContext.
  const context = await retrieveEchoContext(identity.id, { recentDays: 30, maxItems: 300 })
  if (context.length === 0) {
    return NextResponse.json({ insights: [] })
  }

  const results = await runEchoAnalysis(context as any)

  const stored = []
  for (const insight of results) {
    const row = await storeEchoInsight(
      identity.id,
      insight.summary,
      insight.category ?? null,
      insight.evidenceIds ?? [],
      insight.confidence ?? null,
      insight.reasoning ?? null,
      insight.recommendedAction ?? null,
      insight.evidenceType ?? null,
      insight.confidenceLabel ?? null
    )
    stored.push(row)
  }

  return NextResponse.json({ insights: stored }, { status: 201 })
}
