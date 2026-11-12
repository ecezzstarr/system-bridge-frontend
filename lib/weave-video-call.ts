import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { NextRequest } from 'next/server'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const VIDEO_CALL_LIMIT_MINUTES = 120
export const VIDEO_SIGNAL_TYPES = ['offer', 'answer', 'ice'] as const
export type CallRole = 'bridger' | 'guest'
export type CallAccess = { role: CallRole; room: any }

export function isVideoRoomId(id: string) { return UUID.test(id) }
export function newVideoSecret() { return randomBytes(32).toString('base64url') }
export function hashVideoSecret(value: string) { return createHash('sha256').update(value).digest('hex') }
export function sameVideoHash(a: string, b: string) {
  if (!/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b)) return false
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}

let schemaReady: Promise<void> | null = null

async function initializeVideoCallSchema() {
  const db = getPool()
  await db.query(`
    CREATE TABLE IF NOT EXISTS weave_hope_video_calls (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bridger_id uuid NOT NULL REFERENCES users(id),
      invite_hash char(64) NOT NULL,
      guest_hash char(64),
      guest_name varchar(100),
      status varchar(20) NOT NULL DEFAULT 'inviting',
      created_at timestamptz NOT NULL DEFAULT now(),
      joined_at timestamptz,
      ended_at timestamptz,
      expires_at timestamptz NOT NULL DEFAULT (now() + interval '120 minutes')
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS weave_hope_video_signals (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      call_id uuid NOT NULL REFERENCES weave_hope_video_calls(id) ON DELETE CASCADE,
      from_role varchar(10) NOT NULL CHECK (from_role IN ('bridger', 'guest')),
      kind varchar(10) NOT NULL CHECK (kind IN ('offer', 'answer', 'ice')),
      payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `)
  await db.query('CREATE INDEX IF NOT EXISTS idx_weave_hope_video_signals_call_id ON weave_hope_video_signals(call_id,id)')
  await db.query('CREATE INDEX IF NOT EXISTS idx_weave_hope_video_calls_owner ON weave_hope_video_calls(bridger_id,created_at DESC)')
}

export function ensureVideoCallSchema(): Promise<void> {
  if (!schemaReady) schemaReady = initializeVideoCallSchema().catch(error => {
    schemaReady = null
    throw error
  })
  return schemaReady
}

export async function videoCallAccess(request: NextRequest, id: string): Promise<CallAccess | null> {
  if (!isVideoRoomId(id)) return null
  const db = getPool()
  const result = await db.query('SELECT * FROM weave_hope_video_calls WHERE id=$1::uuid LIMIT 1',[id])
  const room = result.rows[0]
  if (!room) return null
  const auth = await getAuthUser(request)
  if (auth?.role === 'bridger' && auth.id === room.bridger_id) return { role:'bridger', room }
  const guest = request.headers.get('x-weave-video-guest') || ''
  if (guest.length < 32 || guest.length > 160 || !room.guest_hash) return null
  if (sameVideoHash(hashVideoSecret(guest), String(room.guest_hash).trim())) return { role:'guest', room }
  return null
}

export async function expireVideoRoom(id: string) {
  const db = getPool()
  await db.query(`
    UPDATE weave_hope_video_calls SET status='expired', ended_at=now()
    WHERE id=$1::uuid AND status IN ('inviting','joined') AND expires_at<=now()
  `,[id])
  await db.query(`
    DELETE FROM weave_hope_video_signals WHERE call_id=$1::uuid
      AND EXISTS (SELECT 1 FROM weave_hope_video_calls WHERE id=$1::uuid AND status IN ('expired','ended'))
  `,[id])
}

export function videoIceServers(callId: string, role: CallRole): RTCIceServer[] {
  const rawStun = (process.env.WEAVE_VIDEO_STUN_URLS || 'stun:stun.l.google.com:19302')
    .split(',').map(s => s.trim()).filter(s => s.startsWith('stun:'))
  const servers: RTCIceServer[] = rawStun.length ? [{ urls: rawStun }] : []
  const urls = (process.env.WEAVE_VIDEO_TURN_URLS || '').split(',')
    .map(s => s.trim()).filter(s => s.startsWith('turn:') || s.startsWith('turns:'))
  const secret = process.env.WEAVE_VIDEO_TURN_SHARED_SECRET || ''
  if (urls.length && secret) {
    // coturn use-auth-secret short-lived credentials; no permanent TURN password in the client.
    const username = String(Math.floor(Date.now()/1000)+VIDEO_CALL_LIMIT_MINUTES*60+300) + ':weave:' + callId + ':' + role
    const credential = createHmac('sha1',secret).update(username).digest('base64')
    servers.push({urls,username,credential})
  }
  return servers
}

export function videoCallSummary(room: any) {
  return {
    id:String(room.id), status:String(room.status),
    guestName:room.guest_name ? String(room.guest_name) : null,
    createdAt:room.created_at, joinedAt:room.joined_at, endedAt:room.ended_at,
    expiresAt:room.expires_at,
  }
}
