import { NextRequest, NextResponse } from 'next/server'
import { getUserById } from '@/lib/db'
import { getBridgerConversations, getConversationMessages, sendMessage } from '@/lib/number-engine'

async function requireBridger(bridgerId: string) {
  const user = await getUserById(bridgerId)
  if (!user || user.role !== 'bridger' || !user.is_active) throw new Error('Bridger account required')
  return user
}

export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams
    const bridgerId = params.get('bridgerId')
    const numberId = params.get('numberId')
    const conversationId = params.get('conversationId')
    if (!bridgerId) return NextResponse.json({ error: 'Bridger ID required' }, { status: 400 })
    await requireBridger(bridgerId)
    if (conversationId) return NextResponse.json({ success: true, messages: await getConversationMessages(conversationId) })
    if (!numberId) return NextResponse.json({ error: 'Number ID required' }, { status: 400 })
    return NextResponse.json({ success: true, conversations: await getBridgerConversations(numberId) })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const bridgerId = String(body.bridgerId || '')
    if (!bridgerId) return NextResponse.json({ error: 'Bridger ID required' }, { status: 400 })
    await requireBridger(bridgerId)
    const message = await sendMessage({
      numberId: String(body.numberId || ''),
      bridgerId,
      to: String(body.to || ''),
      channel: body.channel === 'sms' ? 'sms' : 'whatsapp',
      body: String(body.body || ''),
      prospectId: body.prospectId ? String(body.prospectId) : undefined,
    })
    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('Number engine send error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 400 })
  }
}
