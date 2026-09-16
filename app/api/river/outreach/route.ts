import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { createRiverOutreachInvite, riverOutreachUrl } from '@/lib/river-outreach'

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const channel = body?.channel || 'web'
    if (!['web', 'whatsapp', 'sms', 'email'].includes(channel)) {
      return NextResponse.json({ error: 'Unsupported outreach channel' }, { status: 400 })
    }

    // Creating an invitation never authorizes an external message by itself.
    // The administrator must explicitly set approved=true.
    const result = await createRiverOutreachInvite({
      createdBy: user.id,
      channel,
      recipient: typeof body?.recipient === 'string' ? body.recipient : null,
      purpose: typeof body?.purpose === 'string' ? body.purpose : '',
      approved: body?.approved === true,
      expiresInHours: Number(body?.expiresInHours) || 72,
    })

    return NextResponse.json({
      invite: result.invite,
      token: result.token,
      url: riverOutreachUrl(result.token),
      delivery: 'not_sent',
      message: result.invite.approved
        ? 'Invitation authorized. No external message was sent by this endpoint.'
        : 'Invitation created but not authorized for external use.',
    }, { status: 201 })
  } catch (error) {
    console.error('River outreach creation error:', error)
    return NextResponse.json({ error: 'Unable to create River invitation' }, { status: 500 })
  }
}
