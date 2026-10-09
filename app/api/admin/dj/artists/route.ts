import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getAdminArtistState, reviewMusicArtist, scheduleArtistPerformances, updateArtistPerformance } from '@/lib/music-artist'
import { ArtistError } from '@/lib/music-artist-rules'
import { artistApiError, readArtistBody } from '@/lib/music-artist-api'

export const dynamic = 'force-dynamic'

async function adminUser(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) throw new ArtistError('Sign in to Administration.', 401)
  if (user.role !== 'admin') throw new ArtistError('Administration manages artist employment and scheduling.', 403)
  return user
}

export async function GET(request: NextRequest) {
  try {
    await adminUser(request)
    return NextResponse.json({ success: true, ...await getAdminArtistState() }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return artistApiError(error) }
}

export async function POST(request: NextRequest) {
  try {
    const user = await adminUser(request)
    const body = await readArtistBody(request)
    if (body.action === 'schedule') await scheduleArtistPerformances(user.id, body)
    else await reviewMusicArtist(user.id, body)
    return NextResponse.json({ success: true })
  } catch (error) { return artistApiError(error) }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await adminUser(request)
    await updateArtistPerformance(user.id, true, await readArtistBody(request))
    return NextResponse.json({ success: true })
  } catch (error) { return artistApiError(error) }
}
