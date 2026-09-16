import { NextRequest, NextResponse } from 'next/server'
import { riverExternalReply } from '@/lib/river-outreach'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = typeof body?.token === 'string' ? body.token : ''
    const messages = Array.isArray(body?.messages) ? body.messages : []

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json({ error: 'Invalid River invitation' }, { status: 401 })
    }
    if (messages.length > 20) {
      return NextResponse.json({ error: 'Conversation history is too large' }, { status: 400 })
    }

    const safeMessages = messages.map((message: any) => ({
      role: message?.role === 'assistant' ? 'assistant' : 'user',
      content: typeof message?.content === 'string' ? message.content.slice(0, 6000) : '',
    })).filter((message: { content: string }) => message.content)

    const reply = await riverExternalReply(token, safeMessages)
    return NextResponse.json({ reply })
  } catch (error) {
    console.error('River external conversation error:', error)
    return NextResponse.json({ error: 'This River invitation is no longer active.' }, { status: 401 })
  }
}
