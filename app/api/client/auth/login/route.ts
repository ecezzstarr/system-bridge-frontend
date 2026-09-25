import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'Legacy Client email login has been retired. Use the File Number Client Portal.',
      login: '/client/login',
    },
    { status: 410 }
  )
}
