import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getEngineRoute } from '@/lib/system-switch'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[v0] Getting engine route for user:', user.id)
    const route = await getEngineRoute(user.id)

    return NextResponse.json({
      success: true,
      data: route,
    })
  } catch (error) {
    console.error('[v0] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get engine route' },
      { status: 500 }
    )
  }
}
