import { NextRequest, NextResponse } from 'next/server'
import {
  getSystemSwitchState,
  createSystemSwitchState,
} from '@/lib/world/system-switch'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: 'sessionId required' },
      { status: 400 },
    )
  }

  const state = await getSystemSwitchState(sessionId)

  return NextResponse.json({
    success: true,
    state,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (!body.sessionId) {
    return NextResponse.json(
      { success: false, error: 'sessionId required' },
      { status: 400 },
    )
  }

  const state = await createSystemSwitchState(
    body.sessionId,
    body.fileNumber ?? null,
    body.businessConcept ?? {},
  )

  return NextResponse.json({
    success: true,
    state,
  })
}
