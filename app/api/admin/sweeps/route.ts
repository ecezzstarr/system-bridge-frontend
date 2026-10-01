import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'

async function retired(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response

  return NextResponse.json(
    {
      error: 'The legacy in-memory sweep engine is retired. Use the Administration Infrastructure/EIGHT real sweep control.',
      retired: true,
    },
    { status: 410 },
  )
}

export async function GET(request: NextRequest) {
  return retired(request)
}

export async function POST(request: NextRequest) {
  return retired(request)
}
