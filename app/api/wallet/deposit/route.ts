import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Legacy mock deposit endpoint retired. Use /api/deposit/opay or /api/deposit/tron.' },
    { status: 410 }
  )
}
