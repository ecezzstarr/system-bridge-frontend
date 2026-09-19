import { NextRequest, NextResponse } from 'next/server'
import { chatWithRiver, getPageHelp } from '@/lib/river-assistant'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    const body = await request.json()
    const { messages, page } = body

    // If requesting page help
    if (page && !messages) {
      const help = await getPageHelp(page)
      return NextResponse.json({
        success: true,
        response: help,
      })
    }

    // Chat with River
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 })
    }

    const userContext = session?.user ? {
      userId: (session.user as { id?: string }).id,
      userName: session.user.name || undefined,
    } : undefined

    const response = await chatWithRiver(messages, userContext)

    return NextResponse.json({
      success: true,
      response,
    })
  } catch (error) {
    console.error('River chat error:', error)
    return NextResponse.json({ 
      success: false,
      response: "I'm having trouble right now. Please try again.",
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
