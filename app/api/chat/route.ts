import { NextRequest, NextResponse } from 'next/server'
import { chatWithRiver, getPageHelp, RiverContext } from '@/lib/river-assistant'
import { requireApiUser } from '@/lib/api-auth'

const SYSTEM_NAME = 'SSBNOW.SHOP — Weave of Presence'

function getSystemArea(pathname?: unknown): string {
  if (typeof pathname !== 'string') return 'dashboard'

  const path = pathname.split('?')[0].slice(0, 160)
  if (path === '/dashboard' || path === '/') return 'dashboard'
  if (path.startsWith('/admin/dashboard')) return 'admin dashboard'
  if (path.startsWith('/agent/dashboard')) return 'agent dashboard'
  if (path.startsWith('/bridger/dashboard')) return 'bridger dashboard'
  if (path.startsWith('/wallet')) return 'wallet'
  if (path.startsWith('/places')) return 'places'
  if (path.startsWith('/admin')) return 'admin system'
  if (path.startsWith('/agent')) return 'agent system'
  if (path.startsWith('/bridger')) return 'bridger system'
  if (path.startsWith('/authority')) return 'ecosystem authority'
  if (path.startsWith('/workshop')) return 'authority workshop'
  if (path.startsWith('/client-interactions')) return 'client interactions'
  return 'system area'
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    const session = user ? { user } : null
    const body = await request.json()
    const { messages, page, pathname } = body

    const userContext: RiverContext | undefined = session?.user
      ? {
          systemName: SYSTEM_NAME,
          systemArea: getSystemArea(pathname || page),
          userId: (session.user as { id?: string }).id,
          userName: session.user.name || undefined,
        }
      : {
          systemName: SYSTEM_NAME,
          systemArea: getSystemArea(pathname || page),
        }

    if (page && !messages) {
      const help = await getPageHelp(getSystemArea(pathname || page), userContext)
      return NextResponse.json({ success: true, response: help })
    }

    if (!messages || !Array.isArray(messages) || messages.length > 100) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 })
    }

    const safeMessages = messages
      .filter((message: unknown): message is { role: 'user' | 'assistant'; content: string } => {
        if (!message || typeof message !== 'object') return false
        const candidate = message as { role?: unknown; content?: unknown }
        return (candidate.role === 'user' || candidate.role === 'assistant') && typeof candidate.content === 'string'
      })
      .slice(-20)
      .map(message => ({ role: message.role, content: message.content.slice(0, 12000) }))

    if (safeMessages.length === 0) {
      return NextResponse.json({ error: 'Valid messages required' }, { status: 400 })
    }

    const response = await chatWithRiver(safeMessages, userContext)
    return NextResponse.json({ success: true, response })
  } catch (error) {
    console.error('River chat error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ success: false, response: "I'm having trouble right now. Please try again." }, { status: 500 })
  }
}
