import { NextRequest, NextResponse } from 'next/server'
import { getPublicAceCarrier } from '@/lib/carrier'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  try {
    const carrier = await getPublicAceCarrier(matchId)
    if (!carrier) {
      return NextResponse.json({ error: 'This Carrier is not open' }, { status: 404 })
    }
    return NextResponse.json({ success: true, carrier })
  } catch (error) {
    console.error('Carrier public read failed:', error)
    return NextResponse.json({ error: 'Carrier could not load' }, { status: 500 })
  }
}
