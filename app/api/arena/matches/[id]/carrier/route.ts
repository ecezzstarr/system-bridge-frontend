import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { createOrGetArenaCarrier } from '@/lib/arena-carrier'
import { requireLifestyleAccess } from '@/lib/weave-lifestyle'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await requireLifestyleAccess(user.id)
    const { id } = await params
    const carrier = await createOrGetArenaCarrier(id, user.id)
    return NextResponse.json({ success: true, carrier })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Carrier could not be formed' },
      { status: error?.status || 500 }
    )
  }
}
