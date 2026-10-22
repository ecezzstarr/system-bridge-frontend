import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import {
  createEchoIdentity,
  getEchoLiveSignals,
  retrieveEchoContext,
  storeEchoInsight,
  listEchoInsights,
  hasActiveContinuance,
} from '@/lib/echo-db'
import { runEchoAnalysis } from '@/lib/echo-model'
import { buildImmediateEchoResult } from '@/lib/echo-immediate'

// GET: fetch stored insights for the dashboard
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const identity = await createEchoIdentity(authUser.id)
  const [insights,signals]=await Promise.all([
    listEchoInsights(identity.id),getEchoLiveSignals(authUser.id,identity.id),
  ])
  const immediate=buildImmediateEchoResult(authUser.role,signals)
  return NextResponse.json({success:true,insights,immediate},{headers:{'Cache-Control':'private, no-store'}})
}

// POST: trigger on-demand analysis. Same code path works from a scheduled
// job for periodic analysis — just call runEchoAnalysis server-side directly.
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const identity = await createEchoIdentity(authUser.id)

  const subscribed = await hasActiveContinuance(authUser.id)
  if (!subscribed) {
    return NextResponse.json({ error: 'Echo is unavailable' }, { status: 403 })
  }

  // Bounded retrieval, not a full-history dump — see retrieveEchoContext.
  const context = await retrieveEchoContext(identity.id, { recentDays: 30, maxItems: 300 })
  if (context.length === 0) {
    const signals=await getEchoLiveSignals(authUser.id,identity.id)
    return NextResponse.json({
      success:true,insights:await listEchoInsights(identity.id),
      immediate:buildImmediateEchoResult(authUser.role,signals),
      message:'Immediate guidance is available. Deeper AI findings require recorded activity, not months of waiting.',
      analysisStatus:'no_recorded_activity',
    },{headers:{'Cache-Control':'private, no-store'}})
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

  const signals=await getEchoLiveSignals(authUser.id,identity.id)
  return NextResponse.json({
    success:true,
    insights:await listEchoInsights(identity.id),
    immediate:buildImmediateEchoResult(authUser.role,signals),
    analysisStatus:stored.length?'completed':'no_new_findings',
    message:stored.length?'New recorded insights are ready.':'No new AI findings from the available activities. Immediate guidance remains ready.',
  },{status:200,headers:{'Cache-Control':'private, no-store'}})
}
