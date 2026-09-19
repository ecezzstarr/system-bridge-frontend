import { NextRequest, NextResponse } from 'next/server'
import { getPendingSweeps, getAllSweeps, approveSweepRequest, executeSweep } from '@/lib/mock-db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'all'

    let sweeps = []
    if (status === 'pending') {
      sweeps = getPendingSweeps()
    } else {
      sweeps = getAllSweeps()
    }

    return NextResponse.json({ sweeps })
  } catch (error) {
    console.error('[v0] Get sweeps error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sweeps' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sweepId, adminId, action } = body

    if (!sweepId || !adminId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      const success = approveSweepRequest(sweepId, adminId)
      if (!success) {
        return NextResponse.json(
          { error: 'Sweep not found or already approved' },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, message: 'Sweep approved' })
    } else if (action === 'execute') {
      const success = executeSweep(sweepId)
      if (!success) {
        return NextResponse.json(
          { error: 'Sweep not approved or already executed' },
          { status: 400 }
        )
      }
      return NextResponse.json({ success: true, message: 'Sweep executed' })
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[v0] Sweep action error:', error)
    return NextResponse.json(
      { error: 'Failed to process sweep' },
      { status: 500 }
    )
  }
}
