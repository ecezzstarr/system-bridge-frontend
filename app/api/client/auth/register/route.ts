import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'Legacy Client registration has been retired. Register with an issued File Number.',
      register: '/client/register',
    },
    { status: 410 }
  )
}
