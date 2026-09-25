import { NextRequest, NextResponse } from 'next/server'
import { handleInboundMessage } from '@/lib/number-engine'

export async function GET(request: NextRequest) {
  // Generic verification hook for providers that use a challenge/token handshake.
  const params = new URL(request.url).searchParams
  const challenge = params.get('hub.challenge') || params.get('challenge')
  const verifyToken = params.get('hub.verify_token') || params.get('verify_token')
  if (challenge && verifyToken && verifyToken === process.env.WEAVE_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Webhook verification failed' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const message = payload?.message || payload
    const saved = await handleInboundMessage({
      providerNumberId: message.providerNumberId || message.numberId,
      to: String(message.to || message.recipient || ''),
      from: String(message.from || message.sender || ''),
      channel: message.channel === 'sms' ? 'sms' : 'whatsapp',
      body: message.body || message.text?.body || message.text || '',
      providerMessageId: message.providerMessageId || message.messageId || message.id,
      metadata: payload,
    })
    return NextResponse.json({ success: true, message: saved })
  } catch (error) {
    console.error('Number engine webhook error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 400 })
  }
}
