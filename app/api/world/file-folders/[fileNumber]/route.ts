import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    error: 'Client System Switch and File Folder environments are private to the Client. Logged-in staff meet public Client Customer Doors inside Flame Event.',
    flame_event: '/event',
  }, { status: 403 })
}
