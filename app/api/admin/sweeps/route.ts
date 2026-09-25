import { NextRequest, NextResponse } from 'next/server'
import { getPendingSweeps, getAllSweeps, approveSweepRequest, executeSweep } from '@/lib/mock-db'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'

export async function GET(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const status = request.nextUrl.searchParams.get('status') || 'all'
    const sweeps = status === 'pending' ? getPendingSweeps() : getAllSweeps()
    return NextResponse.json({ sweeps }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Get sweeps error:', error)
    return NextResponse.json({ error: 'Failed to fetch sweeps' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const { sweepId, action } = await request.json()
    if (!sweepId || !action) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    if (action === 'approve') {
      const success = approveSweepRequest(sweepId, auth.session.user.id)
      if (!success) return NextResponse.json({ error: 'Sweep not found or already approved' }, { status: 404 })
      return NextResponse.json({ success: true, message: 'Sweep approved' })
    }
    if (action === 'execute') {
      const success = executeSweep(sweepId)
      if (!success) return NextResponse.json({ error: 'Sweep not approved or already executed' }, { status: 400 })
      return NextResponse.json({ success: true, message: 'Sweep executed' })
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Sweep action error:', error)
    return NextResponse.json({ error: 'Failed to process sweep' }, { status: 500 })
  }
}
