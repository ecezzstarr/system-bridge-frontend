import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { callEngineAPI } from '@/lib/system-switch'

const ENGINES = ['arena', 'marketplace', 'role'] as const
type Engine = typeof ENGINES[number]

function parseEngine(value: string): Engine | null {
  return (ENGINES as readonly string[]).includes(value) ? value as Engine : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ engine: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { engine: rawEngine } = await params
    const engine = parseEngine(rawEngine)
    if (!engine) {
      return NextResponse.json({ success: false, error: 'Unknown engine' }, { status: 404 })
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
  { params }: { params: Promise<{ engine: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { engine: rawEngine } = await params
    const engine = parseEngine(rawEngine)
    if (!engine) {
      return NextResponse.json({ success: false, error: 'Unknown engine' }, { status: 404 })
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
