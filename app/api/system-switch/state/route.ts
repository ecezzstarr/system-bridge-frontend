import { NextResponse } from 'next/server'

const message = 'Legacy System Switch state endpoint has moved. Use /client/system-switch.'

export async function GET() {
  return NextResponse.json({ error: message }, { status: 410 })
}

export async function POST() {
  return NextResponse.json({ error: message }, { status: 410 })
}

export async function PATCH() {
  return NextResponse.json({ error: message }, { status: 410 })
}
