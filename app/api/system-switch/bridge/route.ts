import { NextResponse } from 'next/server'

const message = 'Legacy Prospect bridge read has moved. Use /bridge/{code}.'

export async function GET() {
  return NextResponse.json({ error: message }, { status: 410 })
}

export async function POST() {
  return NextResponse.json({ error: message }, { status: 410 })
}

export async function PATCH() {
  return NextResponse.json({ error: message }, { status: 410 })
}
