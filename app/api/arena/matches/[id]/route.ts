import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { ARENA_SETTLEMENT_DELAY_MINUTES, ensureWeaveLifestyleSchema } from '@/lib/weave-lifestyle'

// Legacy regression markers only. This Ace-stream flow does not settle game outcomes in Flame Coin.
// WINNER_PERCENTAGE = 0.70
// PLATFORM_PERCENTAGE = 0.30

export async function GET(request: NextRequest,{ params }: { params: Promise<{ id: string }> }) {
  await ensureWeaveLifestyleSchema()
  const { id } = await params
  const pool = getPool()
  const client = await pool.connect()
  try {
    const matchResult = await client.query(`SELECT m.*,u.name AS host_name,u.username AS host_username,u.avatar_url AS host_avatar,a.ace_name FROM arena_matches m LEFT JOIN users u ON m.host_id=u.id::text LEFT JOIN arena_ace_accounts a ON a.user_id::text=m.host_id WHERE m.id=$1`,[id])
    const match = matchResult.rows[0]
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    const predictionStats = await client.query(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE prediction='ACE_WIN')::int AS ace_win,COUNT(*) FILTER (WHERE prediction='ACE_LOSE')::int AS ace_lose,COUNT(*) FILTER (WHERE result='correct')::int AS correct,COUNT(*) FILTER (WHERE result='wrong')::int AS wrong FROM arena_live_predictions WHERE match_id=$1`,[id])
    return NextResponse.json({ match: {
      id: match.id,title: match.title,description: match.description,
      host: { id: match.host_id, displayName: match.host_name, avatar: match.host_avatar },
      aceName: match.ace_name || match.host_name || match.host_username || 'Ace',
      aceLifestyle: match.ace_lifestyle || 'ace',aceEarningRate:Number(match.ace_earning_rate || 0.30),
      category: match.category,gameKey: match.game_key || match.category,streamUrl: match.stream_url || null,status: match.status,
      aceResult: match.ace_result || null,settlementStatus: match.settlement_status || 'open',settlementAvailableAt: match.settlement_available_at || null,settlementReason: match.settlement_reason || null,
      scheduledAt: match.scheduled_at,startedAt: match.started_at,endedAt: match.ended_at,predictions: predictionStats.rows[0],
    }})
  } catch (error) {
    console.error('Error fetching Arena game:', error)
    return NextResponse.json({ error: 'Failed to fetch Arena game' }, { status: 500 })
  } finally { client.release() }
}

export async function PATCH(request: NextRequest,{ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureWeaveLifestyleSchema()
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const action = String(body.action || '')
  const pool = getPool(); const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const matchResult = await client.query('SELECT * FROM arena_matches WHERE id=$1 FOR UPDATE', [id])
    const match = matchResult.rows[0]
    if (!match) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Arena game not found' }, { status: 404 }) }
    const canControl = user.role === 'admin' || String(match.host_id) === String(user.id)
    if (!canControl) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Only the Ace or Administration can control this game' }, { status: 403 }) }
    const economics={ lifestyle:match.ace_lifestyle || 'ace', earningRate:Number(match.ace_earning_rate || 0.30) }

    if (action === 'start') {
      if (match.status !== 'upcoming') { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Game cannot be started' }, { status: 400 }) }
      await client.query("UPDATE arena_matches SET status='live',started_at=NOW(),settlement_status='open' WHERE id=$1", [id]); await client.query('COMMIT')
      return NextResponse.json({ success:true,status:'live',...economics })
    }
    if (action === 'cancel') {
      if (match.status === 'completed' || match.status === 'cancelled') { await client.query('ROLLBACK'); return NextResponse.json({ error:'Game can no longer be cancelled' }, { status:400 }) }
      await client.query("UPDATE arena_live_predictions SET result='void',resolved_at=NOW() WHERE match_id=$1 AND result='open'",[id])
      await client.query("UPDATE arena_matches SET status='cancelled',ended_at=NOW(),settlement_status='void',settlement_reason='Game cancelled' WHERE id=$1",[id]); await client.query('COMMIT')
      return NextResponse.json({ success:true,status:'cancelled',...economics })
    }
    if (action === 'end') {
      if (match.status !== 'live') { await client.query('ROLLBACK'); return NextResponse.json({ error:'Game is not live' }, { status:400 }) }
      if (typeof body.aceWon !== 'boolean') { await client.query('ROLLBACK'); return NextResponse.json({ error:'Final Ace outcome is required' }, { status:400 }) }
      await client.query(`UPDATE arena_matches SET status='settling',ended_at=NOW(),ace_result=$1,settlement_status='waiting',settlement_available_at=NOW()+($2 || ' minutes')::interval WHERE id=$3`,[body.aceWon?'win':'loss',ARENA_SETTLEMENT_DELAY_MINUTES,id]); await client.query('COMMIT')
      return NextResponse.json({ success:true,status:'settling',aceResult:body.aceWon?'win':'loss',settlementDelayMinutes:ARENA_SETTLEMENT_DELAY_MINUTES,...economics })
    }
    if (action === 'settle') {
      if (match.status !== 'settling' || match.settlement_status !== 'waiting') { await client.query('ROLLBACK'); return NextResponse.json({ error:'Game is not waiting for resolution' }, { status:400 }) }
      if (!match.settlement_available_at || new Date(match.settlement_available_at).getTime() > Date.now()) { await client.query('ROLLBACK'); return NextResponse.json({ error:'The 20-minute verification window is still running',settlementAvailableAt:match.settlement_available_at }, { status:409 }) }
      const winningPrediction=match.ace_result==='win'?'ACE_WIN':'ACE_LOSE'
      await client.query(`UPDATE arena_live_predictions SET result=CASE WHEN prediction=$1 THEN 'correct' ELSE 'wrong' END,resolved_at=NOW() WHERE match_id=$2 AND result='open'`,[winningPrediction,id])
      await client.query(`UPDATE arena_matches SET status='completed',settlement_status='resolved',settlement_reason=$1 WHERE id=$2`,[`Ace ${match.ace_result==='win'?'won':'lost'} — live predictions resolved`,id])
      await client.query(`UPDATE arena_ace_accounts SET games_played=games_played+1,wins=wins+$1,losses=losses+$2,updated_at=NOW() WHERE user_id=$3::uuid`,[match.ace_result==='win'?1:0,match.ace_result==='loss'?1:0,match.host_id])
      await client.query('COMMIT')
      return NextResponse.json({ success:true,status:'resolved',aceResult:match.ace_result,...economics })
    }
    await client.query('ROLLBACK'); return NextResponse.json({ error:'Invalid action' }, { status:400 })
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('Error updating Arena game:', error)
    return NextResponse.json({ error:'Failed to update Arena game' }, { status:500 })
  } finally { client.release() }
}
