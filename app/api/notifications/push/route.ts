import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensurePush, validPushEndpoint } from '@/lib/web-push'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  if (!await getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { publicKey } = await ensurePush()
    return NextResponse.json({ publicKey }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch { return NextResponse.json({ error: 'Phone notifications are temporarily unavailable' }, { status: 503 }) }
}
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { endpoint, keys } = await request.json()
    if (typeof endpoint !== 'string' || endpoint.length > 2048 || !validPushEndpoint(endpoint) ||
        typeof keys?.p256dh !== 'string' || !/^[\w-]{87}$/.test(keys.p256dh) ||
        typeof keys?.auth !== 'string' || !/^[\w-]{22}$/.test(keys.auth)) {
      return NextResponse.json({ error: 'Invalid phone subscription' }, { status: 400 })
    }
    await ensurePush()
    // Delete queued messages before transferring a shared phone to another account.
    const client = await getPool().connect()
    try {
      await client.query('BEGIN')
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [endpoint])
      await client.query(`DELETE FROM weave_push_subscriptions WHERE endpoint=$1 AND user_id<>$2::uuid`, [endpoint, user.id])
      await client.query(`INSERT INTO weave_push_subscriptions(endpoint,user_id,p256dh,auth) VALUES($1,$2,$3,$4)
        ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth`,
        [endpoint, user.id, keys.p256dh, keys.auth])
      await client.query('COMMIT')
    } catch(error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Could not enable phone notifications' }, { status: 503 }) }
}
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { endpoint } = await request.json()
    await ensurePush()
    await getPool().query('DELETE FROM weave_push_subscriptions WHERE endpoint=$1 AND user_id=$2', [endpoint, user.id])
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Could not disable phone notifications' }, { status: 503 }) }
}
