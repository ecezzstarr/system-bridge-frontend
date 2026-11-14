import { NextRequest, NextResponse } from 'next/server'
import { getPublicDoorDemands, submitDoorDemand, submitDoorInterest } from '@/lib/unbuilt-door'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const demands = await getPublicDoorDemands()
    return NextResponse.json({ demands, verifiedCount: demands.length }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('[unbuilt-door] public demand list failed', error)
    return NextResponse.json({ error: 'Unable to load verified needs.' }, { status: 503 })
  }
}
export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') || '0')
    if (contentLength > 4096) {
      return NextResponse.json({ error: 'Request is too large.' }, { status: 413 })
    }
    const raw = await request.text()
    if (raw.length > 4096) {
      return NextResponse.json({ error: 'Request is too large.' }, { status: 413 })
    }
    const body = JSON.parse(raw)
    if (!body || typeof body !== 'object' || typeof body.website === 'string' && body.website.trim()) {
      return NextResponse.json({ error: 'Unable to accept this request.' }, { status: 400 })
    }
    if (body.action === 'interest') { 
      const interest = await submitDoorInterest(body)
      return NextResponse.json({ success: true, id: interest.id, status: 'requested', message: 'Your business proposal is privately recorded. Administrations can review it; no customer allocation or revenue is guaranteed.' }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
    }
    const item = await submitDoorDemand(body)
    return NextResponse.json({
      success: true, id: item.id, status: 'pending',
      message: 'Request received for private Administrations review. It is not yet verified or published.',
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    if (error instanceof Error && /Provide your|already submitted|opportunity is no longer|weekly interest limit/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[unbuilt-door] submission failed', error)
    return NextResponse.json({ error: 'Unable to receive your request.' }, { status: 503 })
  }
}
