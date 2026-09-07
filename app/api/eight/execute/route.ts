import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { neon } from '@/lib/pg-neon'

const getDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

const SAFE_ACTIONS = new Set(['schema', 'stats', 'wallet_summary', 'user_list', 'fund_wallet', 'deploy_status', 'env_vars'])

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response

  try {
    const { action, payload = {} } = await request.json()
    if (!SAFE_ACTIONS.has(action)) {
      return NextResponse.json({ success: false, error: `EIGHT action is not permitted: ${action}`, allowedActions: [...SAFE_ACTIONS] }, { status: 403 })
    }

    const sql = getDb()

    switch (action) {
      case 'schema': {
        const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
        const schema: Record<string, Array<{ column: string; type: string; nullable: boolean }>> = {}
        for (const table of tables) {
          const columns = await sql`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${table.table_name} ORDER BY ordinal_position`
          schema[table.table_name] = columns.map(c => ({ column: c.column_name, type: c.data_type, nullable: c.is_nullable === 'YES' }))
        }
        return NextResponse.json({ success: true, schema, tableCount: tables.length })
      }

      case 'stats': {
        const [users, wallets, matches, games, totals] = await Promise.all([
          sql`SELECT COUNT(*) AS count FROM users`,
          sql`SELECT COUNT(*) AS count FROM wallets`,
          sql`SELECT COUNT(*) AS count FROM arena_matches`,
          sql`SELECT COUNT(*) AS count FROM casino_games`,
          sql`SELECT COALESCE(SUM(balance_trx), 0) AS trx, COALESCE(SUM(play_balance), 0) AS play FROM wallets`,
        ])
        return NextResponse.json({ success: true, stats: {
          totalUsers: Number(users[0]?.count || 0), totalWallets: Number(wallets[0]?.count || 0),
          totalMatches: Number(matches[0]?.count || 0), totalGames: Number(games[0]?.count || 0),
          totalTRX: Number(totals[0]?.trx || 0), totalPlayBalance: Number(totals[0]?.play || 0),
        } })
      }

      case 'wallet_summary': {
        const summary = await sql`SELECT COUNT(*) AS total_wallets, COALESCE(SUM(balance_trx), 0) AS total_trx, COALESCE(SUM(balance_usdt), 0) AS total_usdt, COALESCE(SUM(play_balance), 0) AS total_play, COALESCE(AVG(balance_trx), 0) AS avg_trx FROM wallets`
        return NextResponse.json({ success: true, summary: summary[0] })
      }

      case 'user_list': {
        const limit = Math.min(Math.max(Number(payload.limit) || 50, 1), 100)
        const offset = Math.max(Number(payload.offset) || 0, 0)
        const users = payload.role
          ? await sql`SELECT u.id, u.email, u.username, u.name, u.role, u.is_active, u.created_at, COALESCE(w.balance_trx, 0) AS balance_trx, COALESCE(w.balance_usdt, 0) AS balance_usdt, COALESCE(w.play_balance, 0) AS play_balance FROM users u LEFT JOIN wallets w ON w.user_id = u.id WHERE u.role = ${String(payload.role)} ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`
          : await sql`SELECT u.id, u.email, u.username, u.name, u.role, u.is_active, u.created_at, COALESCE(w.balance_trx, 0) AS balance_trx, COALESCE(w.balance_usdt, 0) AS balance_usdt, COALESCE(w.play_balance, 0) AS play_balance FROM users u LEFT JOIN wallets w ON w.user_id = u.id ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`
        return NextResponse.json({ success: true, users })
      }

      case 'fund_wallet': {
        const userId = String(payload.userId || '')
        const amount = Number(payload.amount)
        const target = payload.target === 'play' ? 'play_balance' : 'balance_trx'
        const currency = target === 'play' ? 'TRX' : payload.currency === 'USDT' ? 'USDT' : 'TRX'
        if (!userId || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ success: false, error: 'Valid userId and positive amount required' }, { status: 400 })
        const result = await sql(`UPDATE wallets SET ${target} = ${target} + $1, updated_at = NOW() WHERE user_id = $2::uuid RETURNING *`, [amount, userId])
        if (!result.length) return NextResponse.json({ success: false, error: 'Wallet not found' }, { status: 404 })
        await sql`INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, balance_after, created_at) VALUES (gen_random_uuid(), ${userId}::uuid, 'admin_credit', ${amount}, ${currency}, ${'EIGHT funded ' + target}, ${result[0][target]}, NOW())`
        return NextResponse.json({ success: true, wallet: result[0] })
      }

      case 'deploy_status': {
        const services = {
          'api-server': 'https://api-server-823579957639.us-central1.run.app/health',
          'ssbnow-core': 'https://ssbnow-core-823579957639.us-central1.run.app/health',
          'ssbnowshop': 'https://ssbnowshop-823579957639.us-central1.run.app/health',
        }
        const results: Record<string, { status: string; latency: number }> = {}
        for (const [name, url] of Object.entries(services)) {
          const start = Date.now()
          try {
            const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
            results[name] = { status: response.ok ? 'online' : `error (${response.status})`, latency: Date.now() - start }
          } catch { results[name] = { status: 'offline', latency: Date.now() - start } }
        }
        return NextResponse.json({ success: true, services: results })
      }

      case 'env_vars': {
        const variables = Object.keys(process.env).filter(k => !/(SECRET|PASSWORD|KEY|TOKEN)/i.test(k))
        return NextResponse.json({ success: true, variables, hasDatabase: Boolean(process.env.DATABASE_URL), nodeEnv: process.env.NODE_ENV })
      }
    }
  } catch (error) {
    console.error('EIGHT execute error', error)
    return NextResponse.json({ success: false, error: 'EIGHT execution failed' }, { status: 500 })
  }
}
