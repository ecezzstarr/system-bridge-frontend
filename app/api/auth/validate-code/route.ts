import { NextRequest, NextResponse } from 'next/server'
import { validateDepartmentalCode, Department } from '@/lib/departmental-codes'

export async function POST(request: NextRequest) {
  try {
    const { code, department } = await request.json()

    if (!code || !department) {
      return NextResponse.json({ error: 'Missing code or department' }, { status: 400 })
    }

    if (!['AGENT', 'BRIDGER'].includes(department)) {
      return NextResponse.json({ error: 'Invalid department' }, { status: 400 })
    }

    const validation = await validateDepartmentalCode(code, department as Department)

    if (validation.valid) {
      return NextResponse.json({ valid: true })
    } else {
      // Deliberately generic: never reveal which specific check failed
      // (exists / wrong department / used / expired / revoked) -- that
      // turns this endpoint into an oracle for guessing or probing codes.
      return NextResponse.json(
        { valid: false, error: 'Invalid or already-used code.' },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error('Validate code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
