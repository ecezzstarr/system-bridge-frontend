import { NextRequest, NextResponse } from 'next/server'
import { getArtistProgramme } from '@/lib/music-artist'
import { ARTIST_TIME_ZONE } from '@/lib/music-artist-rules'
import { artistApiError } from '@/lib/music-artist-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get('date') || new Intl.DateTimeFormat('en-CA', { timeZone: ARTIST_TIME_ZONE }).format()
    return NextResponse.json({ success: true, date, timeZone: ARTIST_TIME_ZONE,
      performances: await getArtistProgramme(date, ARTIST_TIME_ZONE) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return artistApiError(error) }
}
