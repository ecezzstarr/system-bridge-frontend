import { NextRequest, NextResponse } from 'next/server'
import { recordSystemSwitchAction, addSystemSwitchMilestone } from '@/lib/world/system-switch'

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (!body.sessionId || !body.type) {
    return NextResponse.json(
      { success: false, error: 'sessionId and type required' },
      { status: 400 },
    )
  }

  // A milestone is an extraordinary/unique moment in the Client's crossing.
  // Recording one is the only way anything reaches the Weave feed, with the
  // session's Bridger credited as Witness — see addSystemSwitchMilestone.
  // Everything else (routine chat, minor interaction) stays a private event.
  const isMilestone = body.type === 'milestone' || body.isMilestone === true

  const state = isMilestone
    ? await addSystemSwitchMilestone(body.sessionId, {
        type: body.milestoneType || body.data?.milestoneType || 'milestone',
        content: body.content,
        data: body.data,
      })
    : await recordSystemSwitchAction(body.sessionId, {
        type: body.type,
        content: body.content,
        data: body.data,
      })

  if (!state) {
    return NextResponse.json(
      { success: false, error: 'System Switch session not active' },
      { status: 409 },
    )
  }

  return NextResponse.json({
    success: true,
    state,
  })
}
