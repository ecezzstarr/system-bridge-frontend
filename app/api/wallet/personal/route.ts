import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Legacy demo personal-wallet endpoint retired.' },
    { status: 410 }
  )
}
