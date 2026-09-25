import { NextResponse } from 'next/server'

const message = 'Pre-client File Folder purchase has moved. Use /api/bridge/file-folder/purchase.'

export async function GET() {
  return NextResponse.json({ error: message }, { status: 410 })
}

export async function POST() {
  return NextResponse.json({ error: message }, { status: 410 })
}

export async function PATCH() {
  return NextResponse.json({ error: message }, { status: 410 })
}
