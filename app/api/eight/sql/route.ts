import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'

/**
 * EIGHT no longer exposes arbitrary SQL execution.
 * Database operations must be implemented as named, scoped Weave functions.
 */
export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response

  return NextResponse.json({
    success: false,
    error: 'Unrestricted SQL execution is disabled. Use an approved EIGHT action or a scoped server function.',
  }, { status: 410 })
}
