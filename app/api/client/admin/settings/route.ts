import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'Legacy mock Client Administrations settings endpoint retired. Use authenticated WEAVE Settings.',
      retired: true,
    },
    { status: 410 },
  )
}
