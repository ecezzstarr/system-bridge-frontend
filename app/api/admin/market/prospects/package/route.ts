import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { createProspectPackage } from '@/lib/market'

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser || authUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { contactIds, priceTrx } = await request.json()

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: 'contactIds array required' }, { status: 400 })
    }

    const pkg = await createProspectPackage(
      authUser.id,
      contactIds,
      priceTrx
    )

    return NextResponse.json({ success: true, package: pkg })
  } catch (error) {
    console.error('[Market Prospects Package] Error:', error)
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 })
  }
}
