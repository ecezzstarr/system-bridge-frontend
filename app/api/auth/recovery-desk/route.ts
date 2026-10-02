import { NextRequest, NextResponse } from 'next/server'
import { requestAdministrationRecovery, recoveryRequestStatus } from '@/lib/access-recovery-requests'

export const runtime = 'nodejs'
const headers = { 'Cache-Control': 'private, no-store' }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (body.action === 'status') {
      const token = String(body.token || '')
      if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: 'Recovery request expired.' }, { status: 400, headers })
      return NextResponse.json(await recoveryRequestStatus(token), { headers })
    }
    const email = String(body.email || '').trim().toLowerCase()
    const details = String(body.details || '').trim().slice(0, 500)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255 || details.length < 6) {
      return NextResponse.json({ error: 'Enter your registered email and a brief note for Administration.' }, { status: 400, headers })
    }
    const network = request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || 'unknown'
    const result = await requestAdministrationRecovery(email, details, network)
    return NextResponse.json({ ...result, message: 'If this is an active account, Administration has been notified. Keep this desk open while your identity is verified.' }, { status: 202, headers })
  } catch (error) {
    const limited = error instanceof Error && error.message.startsWith('Too many recovery requests')
    return NextResponse.json({ error: limited ? error.message : 'Recovery desk is temporarily unavailable.' }, { status: limited ? 429 : 503, headers })
  }
}
