import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

/** Revoke exactly the presented bearer, including during maintenance/suspension. */
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
  if (!token || token.length > 1024) return NextResponse.json({error:'Session token required'}, {status:401,headers:{'Cache-Control':'no-store'}})
  try {
    await sql`DELETE FROM sessions WHERE token=${token}`
    return NextResponse.json({success:true}, {headers:{'Cache-Control':'private, no-store'}})
  } catch (error) {
    console.error('[logout] session revocation failed', error)
    return NextResponse.json({error:'Unable to revoke session'}, {status:503,headers:{'Cache-Control':'no-store'}})
  }
}
