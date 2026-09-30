import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    error: 'Client System Switch and File Folder environments are private to the Client. Enter public Client enterprises through the Customer Market or Flame Event Customer Door current.',
    customer_market: '/market',
    flame_event: '/event',
  }, { status: 403 })
}
