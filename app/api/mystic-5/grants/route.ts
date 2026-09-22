import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import {
  createMystic5Grant,
  listMystic5Grants,
  revokeMystic5Grant,
  type Mystic5GrantSurface,
} from '@/lib/mystic-5-grants'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const grants = await listMystic5Grants(user.id)
  return NextResponse.json({ grants })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    if (body.approved !== true) {
      return NextResponse.json(
        { error: 'Explicit user approval is required.' },
        { status: 400 }
      )
    }

    const result = await createMystic5Grant({
      userId: user.id,
      surface: String(body.surface || 'other') as Mystic5GrantSurface,
      purpose: typeof body.purpose === 'string' ? body.purpose : '',
      approved: true,
      expiresInHours: Number(body.expiresInHours) || 72,
    })

    return NextResponse.json({
      grant: result.grant,
      token: result.token,
      message: 'Mystic 5 may extend only through this user-approved grant. The token is shown once.',
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create Mystic 5 grant.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const grantId = typeof body?.grantId === 'string' ? body.grantId : ''
    if (!grantId) return NextResponse.json({ error: 'grantId is required' }, { status: 400 })

    const grant = await revokeMystic5Grant(user.id, grantId)
    if (!grant) return NextResponse.json({ error: 'Grant not found' }, { status: 404 })

    return NextResponse.json({ grant })
  } catch (error) {
    console.error('[mystic-5] revoke error:', error)
    return NextResponse.json({ error: 'Unable to revoke Mystic 5 grant.' }, { status: 500 })
  }
}
