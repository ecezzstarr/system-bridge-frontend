import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { callEngineAPI } from '@/lib/system-switch'

type Engine = 'arena' | 'marketplace' | 'role'
type EngineParams = Promise<{ engine: string }>

function resolveEngine(engine: string): Engine | null {
  return ['arena', 'marketplace', 'role'].includes(engine) ? (engine as Engine) : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: EngineParams }
) {
  try {
    const { engine: rawEngine } = await params
    const engine = resolveEngine(rawEngine)
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    if (!engine) {
      return NextResponse.json({ success: false, error: 'Invalid engine' }, { status: 400 })
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(`/api/engine/${engine}`, '')
    const query = url.search

    console.log('[v0] Proxying to engine:', engine, path)
    
    const result = await callEngineAPI(engine, `${path}${query}`)
    
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
  request: NextRequest,
  { params }: { params: EngineParams }
) {
  try {
    const { engine: rawEngine } = await params
    const engine = resolveEngine(rawEngine)
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    if (!engine) {
      return NextResponse.json({ success: false, error: 'Invalid engine' }, { status: 400 })
    }

    const body = await request.json()
    const url = new URL(request.url)
    const path = url.pathname.replace(`/api/engine/${engine}`, '')

    console.log('[v0] POST to engine:', engine, path)
    
    const result = await callEngineAPI(engine, path, 'POST', body)
    
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
