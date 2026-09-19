import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getEngineRoute, callEngineAPI } from '@/lib/system-switch'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[v0] Getting engine route for user:', session.user.id)
    const route = await getEngineRoute(session.user.id)
    
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
