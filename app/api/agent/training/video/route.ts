import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getAuthUser } from '@/lib/auth-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Agent Stability training video is deliberately outside /public.
 * Every request is authenticated against the server-side user/legion position.
 * Do not redirect to a public static file or cache personalized responses.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
  if (user.role !== 'agent') {
    return NextResponse.json(
      { success: false, error: 'Agent account required' },
      { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  try {
    const pathname = join(process.cwd(), 'private', 'agent-training', 'agent-outlet-training.mp4')
    const content = await readFile(pathname)
    return new NextResponse(new Uint8Array(content), {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(content.length),
        'Content-Disposition': 'inline; filename="agent-outlet-training.mp4"',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('[Agent Training] unable to read protected video asset', error)
    return NextResponse.json(
      { success: false, error: 'Training video is temporarily unavailable' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}
