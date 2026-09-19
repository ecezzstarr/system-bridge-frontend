import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { generateNumberSeries } from '@/lib/market'

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser || authUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { sourceNumber, count } = await request.json()

    if (!sourceNumber || !count) {
      return NextResponse.json({ error: 'sourceNumber and count required' }, { status: 400 })
    }

    const result = await generateNumberSeries(authUser.id, sourceNumber, parseInt(count))

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('[Market Prospects Generate] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate series' }, { status: 500 })
  }
}
