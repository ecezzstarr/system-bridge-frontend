import { NextResponse } from 'next/server'

const message =
  'Legacy deposit endpoint retired. Use the active WEAVE funding rails: /api/deposit/opay for Administration, Agents and Bridgers, or /api/deposit/tron for Clients.'

export async function POST() {
  return NextResponse.json({ error: message }, { status: 410 })
}

export async function GET() {
  return NextResponse.json({ error: message }, { status: 410 })
}
