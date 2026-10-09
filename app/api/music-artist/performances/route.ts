import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { updateArtistPerformance } from '@/lib/music-artist'
import { ArtistError } from '@/lib/music-artist-rules'
import { artistApiError, readArtistBody } from '@/lib/music-artist-api'

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) throw new ArtistError('Sign in to operate your performance.', 401)
    if (!['agent', 'bridger', 'client'].includes(user.role)) throw new ArtistError('Artist account required.', 403)
    await updateArtistPerformance(user.id, false, await readArtistBody(request))
    return NextResponse.json({ success: true })
  } catch (error) { return artistApiError(error) }
}
