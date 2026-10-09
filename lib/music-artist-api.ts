import { NextRequest, NextResponse } from 'next/server'
import { ArtistError } from '@/lib/music-artist-rules'

export async function readArtistBody(request: NextRequest): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ArtistError('A valid request is required.')
  return body
}

export function artistApiError(error: unknown) {
  if (error instanceof ArtistError) return NextResponse.json({ success: false, error: error.message }, { status: error.status })
  console.error('[music-artist]', error)
  return NextResponse.json({ success: false, error: 'Music Artist is temporarily unavailable. Please try again.' }, { status: 500 })
}
