import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { callEngineAPI } from '@/lib/system-switch'

export async function GET(
  request: Request,
  { params }: { params: { engine: 'arena' | 'marketplace' | 'role' } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(`/api/engine/${params.engine}`, '')
    const query = url.search

    console.log('[v0] Proxying to engine:', params.engine, path)
    
    const result = await callEngineAPI(params.engine, `${path}${query}`)
    
    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('[v0] Engine proxy error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Engine request failed' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { engine: 'arena' | 'marketplace' | 'role' } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const url = new URL(request.url)
    const path = url.pathname.replace(`/api/engine/${params.engine}`, '')

    console.log('[v0] POST to engine:', params.engine, path)
    
    const result = await callEngineAPI(params.engine, path, 'POST', body)
    
    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('[v0] Engine proxy error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Engine request failed' },
      { status: 500 }
    )
  }
}
