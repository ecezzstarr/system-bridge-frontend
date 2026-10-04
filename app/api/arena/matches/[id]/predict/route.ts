import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { ensureWeaveLifestyleSchema } from '@/lib/weave-lifestyle'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureWeaveLifestyleSchema()
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const prediction = String(body.prediction || '').toUpperCase()

  if (prediction !== 'ACE_WIN' && prediction !== 'ACE_LOSE') {
    return NextResponse.json({ error: 'Choose ACE_WIN or ACE_LOSE' }, { status: 400 })
  }

  const pool = getPool()
  const client = await pool.connect()
  try {
    const matchResult = await client.query('SELECT id,host_id,status FROM arena_matches WHERE id=$1', [id])
    const match = matchResult.rows[0]
    if (!match) return NextResponse.json({ error: 'Arena game not found' }, { status: 404 })
    if (match.status !== 'live') {
      return NextResponse.json({ error: 'Predictions are available only while the game is live' }, { status: 400 })
    }
    if (String(match.host_id) === String(user.id)) {
      return NextResponse.json({ error: 'The Ace cannot predict their own game' }, { status: 400 })
    }

    const result = await client.query(
      `INSERT INTO arena_live_predictions (match_id,user_id,prediction)
       VALUES ($1,$2::uuid,$3)
       RETURNING id,match_id,prediction,result,created_at`,
      [id, user.id, prediction]
    )

    return NextResponse.json({ success: true, prediction: result.rows[0] })
  } catch (error) {
    console.error('Arena prediction failed:', error)
    return NextResponse.json({ error: 'Failed to record Arena prediction' }, { status: 500 })
  } finally {
    client.release()
  }
}
