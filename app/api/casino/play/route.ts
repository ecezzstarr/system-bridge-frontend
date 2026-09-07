import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { requireApiUser } from '@/lib/api-auth'

const getDb = () => neon(process.env.DATABASE_URL!)
const PLATFORM_WALLET_USER_ID = process.env.PLATFORM_WALLET_USER_ID || 'be4f0618-d666-4e13-ae8f-13c986784ff7'

function rollDice(): [number, number] {
  const cryptoApi = globalThis.crypto
  const die = () => {
    const bytes = new Uint32Array(1)
    cryptoApi.getRandomValues(bytes)
    return (bytes[0] % 6) + 1
  }
  return [die(), die()]
}

function calculateResult(die1: number, die2: number): { outcome: 'win' | 'lose' | 'push'; multiplier: number } {
  const total = die1 + die2
  if (total === 7 || total === 11) return { outcome: 'win', multiplier: 2 }
  if (total === 2 || total === 3 || total === 12) return { outcome: 'lose', multiplier: 0 }
  return { outcome: 'push', multiplier: 1 }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const betAmount = Number(body.betAmount)
    const gameType = typeof body.gameType === 'string' ? body.gameType.slice(0, 32) : 'dice'
    if (!Number.isFinite(betAmount) || betAmount < 1 || betAmount > 1000) {
      return NextResponse.json({ error: 'Bet must be between 1 and 1000 TRX' }, { status: 400 })
    }

    const sql = getDb()
    const wallets = await sql`SELECT id, balance_trx, play_balance FROM wallets WHERE user_id = ${user.id}::uuid AND is_primary = true LIMIT 1`
    if (!wallets.length) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })

    const wallet = wallets[0]
    const playBalance = Number(wallet.play_balance) || 0
    const coreBalance = Number(wallet.balance_trx) || 0
    if (playBalance < betAmount) return NextResponse.json({ error: 'Insufficient play balance', playBalance, coreBalance, required: betAmount }, { status: 400 })

    const [die1, die2] = rollDice()
    const { outcome, multiplier } = calculateResult(die1, die2)
    const payout = outcome === 'win' ? betAmount * multiplier : outcome === 'push' ? betAmount : 0
    const netChange = payout - betAmount
    const newPlayBalance = playBalance + netChange

    await sql`UPDATE wallets SET play_balance = ${newPlayBalance}, updated_at = NOW() WHERE id = ${wallet.id} AND user_id = ${user.id}::uuid AND play_balance >= ${betAmount}`

    if (outcome === 'win') {
      const winnings = payout - betAmount
      await sql`UPDATE wallets SET balance_trx = balance_trx - ${winnings}, updated_at = NOW() WHERE user_id = ${PLATFORM_WALLET_USER_ID}::uuid AND balance_trx >= ${winnings}`
    } else if (outcome === 'lose') {
      await sql`UPDATE wallets SET balance_trx = balance_trx + ${betAmount}, updated_at = NOW() WHERE user_id = ${PLATFORM_WALLET_USER_ID}::uuid`
    }

    await sql`
      INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, balance_before, balance_after, created_at)
      VALUES (gen_random_uuid(), ${user.id}::uuid, ${outcome === 'win' ? 'casino_win' : outcome === 'lose' ? 'casino_loss' : 'casino_push'}, ${netChange}, 'TRX', ${'Casino dice: ' + die1 + ' + ' + die2 + ' = ' + (die1 + die2) + ' - Platform hosted'}, ${playBalance}, ${newPlayBalance}, NOW())
    `

    await sql`
      INSERT INTO casino_games (id, user_id, game_type, bet_amount, outcome, payout, dice_result, created_at)
      VALUES (gen_random_uuid(), ${user.id}::uuid, ${gameType}, ${betAmount}, ${outcome}, ${payout}, ${JSON.stringify([die1, die2])}, NOW())
    `

    return NextResponse.json({
      success: true, dice: [die1, die2], total: die1 + die2, outcome,
      betAmount, payout, netChange, newBalance: newPlayBalance, playBalance: newPlayBalance, coreBalance,
      hostedBy: 'Platform',
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Casino play error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Game error - please try again' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit')) || 10, 1), 50)
    const sql = getDb()
    const history = await sql`SELECT id, entry_type AS type, amount, description, created_at FROM ledger_entries WHERE user_id = ${user.id}::uuid AND entry_type IN ('casino_win','casino_loss','casino_push') ORDER BY created_at DESC LIMIT ${limit}`
    const wallets = await sql`SELECT balance_trx, play_balance FROM wallets WHERE user_id = ${user.id}::uuid AND is_primary = true LIMIT 1`
    return NextResponse.json({ history, playBalance: wallets.length ? Number(wallets[0].play_balance) : 0, coreBalance: wallets.length ? Number(wallets[0].balance_trx) : 0 }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Casino history error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
