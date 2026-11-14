import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getAdminDoorDemands, getAdminDoorInterests, reviewDoorDemand } from '@/lib/unbuilt-door'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  return user?.role === 'admin' ? user : null
}
export async function GET(request: NextRequest) {
  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'Administrations access required.' }, { status: 403 })
  try {
    const [demands, interests] = await Promise.all([getAdminDoorDemands(), getAdminDoorInterests()])
    return NextResponse.json({ demands, interests }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[unbuilt-door] admin list failed', error)
    return NextResponse.json({ error: 'Unable to load reviews.' }, { status: 503 })
  }
}
export async function POST(request: NextRequest) {
  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'Administrations access required.' }, { status: 403 })
  try {
    const body = await request.json()
    if (!body || !['verify','reject','close'].includes(body.action) || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Valid reference and review action are required.' }, { status: 400 })
    }
    const demand = await reviewDoorDemand({
      id: body.id, action: body.action, basis: body.basis || '', adminId: user.id,
    })
    return NextResponse.json({ success: true, demand }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof Error && /Invalid demand|Record how|Request not found/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[unbuilt-door] admin review failed', error)
    return NextResponse.json({ error: 'Unable to complete review.' }, { status: 503 })
  }
}
