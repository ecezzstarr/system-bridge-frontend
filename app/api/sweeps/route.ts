import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'Legacy creator sweep endpoint retired. Use Administration sweep controls.' },
    { status: 410 }
  )
}

export async function POST() {
  return NextResponse.json(
    { error: 'Legacy creator sweep endpoint retired. Use Administration sweep controls.' },
    { status: 410 }
  )
}
