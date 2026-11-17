import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { getBridgerDoorInterests, updateBridgerDoorInterest } from '@/lib/unbuilt-door'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request)
  if (!user || user.role !== 'bridger') {
    return NextResponse.json({ error: 'An active Hope Bridger account is required.' }, { status: 403 })
  }
  try {
    return NextResponse.json({ interests: await getBridgerDoorInterests(user.id) }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('[unbuilt-door] Bridger register failed',error)
    return NextResponse.json({ error: 'Unable to load Bridger prospects.' }, { status: 503 })
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireApiUser(request)
  if (!user || user.role !== 'bridger') {
    return NextResponse.json({ error: 'An active Hope Bridger account is required.' }, { status: 403 })
  }
  try {
    const body = await request.json().catch(()=>null)
    if (!body || !['contacted','qualified','closed'].includes(body.status) || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Choose a valid prospect and outreach stage.' }, { status: 400 })
    }
    const interest = await updateBridgerDoorInterest({ bridgerId:user.id,interestId:body.id,status:body.status })
    return NextResponse.json({ success:true,interest }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof Error && /Invalid opportunity|Prospect not found/.test(error.message)) {
      return NextResponse.json({ error:error.message }, { status: 400 })
    }
    console.error('[unbuilt-door] Bridger stage update failed',error)
    return NextResponse.json({ error: 'Unable to update the outreach stage.' }, { status: 503 })
  }
}
