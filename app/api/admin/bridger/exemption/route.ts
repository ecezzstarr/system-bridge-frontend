import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'

export async function POST(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json({error:'Bridger Continuance is retired. No subscription exemption is needed.',retired:true},{status:410})
}
