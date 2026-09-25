import { NextRequest, NextResponse } from 'next/server'
import { getFileFolders } from '@/lib/fne'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'

export async function GET(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const folders = await getFileFolders()
    return NextResponse.json({ success: true, folders }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('FNE list error:', error)
    return NextResponse.json({ error: 'Failed to list file folders' }, { status: 500 })
  }
}
