import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { acceptMusicArtistOffer, applyMusicArtist, getMusicArtistState } from '@/lib/music-artist'
import { ArtistError, ARTIST_DUTY } from '@/lib/music-artist-rules'
import { artistApiError, readArtistBody } from '@/lib/music-artist-api'

export const dynamic = 'force-dynamic'

async function artistUser(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) throw new ArtistError('Sign in to enter Music Artist Lifestyle.', 401)
  if (!['agent', 'bridger', 'client'].includes(user.role)) throw new ArtistError('Music Artist applications are open to Agents, Bridgers and Clients.', 403)
  return user
}

export async function GET(request: NextRequest) {
  try {
    const user = await artistUser(request)
    return NextResponse.json({ success: true, ...await getMusicArtistState(user.id), duty: ARTIST_DUTY }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return artistApiError(error) }
}

export async function POST(request: NextRequest) {
  try {
    const user = await artistUser(request)
    const body = await readArtistBody(request)
    if (body.action === 'apply') await applyMusicArtist(user.id, body)
    else if (body.action === 'accept_offer') await acceptMusicArtistOffer(user.id, body)
    else throw new ArtistError('Choose apply or accept offer.')
    return NextResponse.json({ success: true })
  } catch (error) { return artistApiError(error) }
}
