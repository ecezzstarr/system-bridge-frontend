import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getResidentWorldState } from '@/lib/world/resident-state'

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)

  if (!authUser) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  try {
    const state = await getResidentWorldState(authUser.id)

    if (!state) {
      return NextResponse.json(
        { success: false, error: 'Resident not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, state })
  } catch (error) {
    console.error('[world state] failed to load resident state:', error)

    return NextResponse.json(
      { success: false, error: 'Unable to load world state' },
      { status: 500 },
    )
  }
}
