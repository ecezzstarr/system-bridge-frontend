import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { writeFile, readFile, mkdir, readdir, stat, unlink } from 'fs/promises'
import { dirname, join, relative, isAbsolute } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const PROJECT_ROOT = process.cwd()

// ==================== PATH SAFETY ====================
function safeResolve(userPath: string): { ok: true; fullPath: string; relPath: string } | { ok: false; error: string } {
  if (!userPath || typeof userPath !== 'string') {
    return { ok: false, error: 'path required' }
  }
  if (isAbsolute(userPath)) {
    return { ok: false, error: 'Absolute paths are not allowed' }
  }
  if (userPath.split(/[\\/]/).includes('..')) {
    return { ok: false, error: 'Path traversal is not allowed' }
  }
  const fullPath = join(/*turbopackIgnore: true*/ PROJECT_ROOT, userPath)
  const rel = relative(PROJECT_ROOT, fullPath)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    return { ok: false, error: 'Path escapes project root' }
  }
  if (/node_modules|(^|\/)\.git(\/|$)|(^|\/)\.next(\/|$)|\.env|secret|credential/i.test(rel)) {
    return { ok: false, error: 'Access to this path is restricted' }
  }
  return { ok: true, fullPath, relPath: rel }
}

const GIT_ALLOWED = new Set(['status', 'log', 'add', 'commit', 'push', 'rev-parse'])

async function runGit(args: string[]) {
  if (!GIT_ALLOWED.has(args[0])) {
    throw new Error(`Git subcommand not allowed: ${args[0]}`)
  }
  return execFileAsync('git', args, { cwd: PROJECT_ROOT })
}

const DESTRUCTIVE_ACTIONS = new Set(['delete_file', 'git_push', 'deploy', 'drop_column'])

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (authUser.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { action, payload } = await request.json()
    console.log(`[Eight execute] ${authUser.username} called:`, action)

    if (DESTRUCTIVE_ACTIONS.has(action) && !payload?.confirm) {
      return NextResponse.json({
        success: false,
        error: `Action "${action}" is destructive and requires confirmation. Resend with payload.confirm = true.`,
        requiresConfirmation: true,
      })
    }

    switch (action) {
      case 'sql': {
        const query = payload.query?.trim()
        if (!query) {
          return NextResponse.json({ success: false, error: 'No query provided' })
        }
        const firstWord = query.split(/\s+/)[0].toUpperCase()
        const allowedCommands = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'WITH', 'BEGIN', 'COMMIT', 'ROLLBACK']
        if (!allowedCommands.includes(firstWord)) {
          return NextResponse.json({ success: false, error: `Command not allowed: ${firstWord}` })
        }
        const result = await sql(query as any)
        return NextResponse.json({ success: true, rows: result, rowCount: result.length, command: firstWord })
      }

      case 'schema': {
        const tables = await sql`
          SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name
        `
        const schema: Record<string, Array<{ column: string; type: string; nullable: boolean; default_value: string | null }>> = {}
        for (const t of (tables as any[])) {
          const columns = await sql`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = ${t.table_name} AND table_schema = 'public'
            ORDER BY ordinal_position
          `
          schema[t.table_name] = (columns as any[]).map(c => ({
            column: c.column_name, type: c.data_type, nullable: c.is_nullable === 'YES', default_value: c.column_default
          }))
        }
        return NextResponse.json({ success: true, schema, tableCount: (tables as any[]).length })
      }

      case 'create_table': {
        const { tableName, columns } = payload
        if (!tableName || !columns || !Array.isArray(columns)) {
          return NextResponse.json({ success: false, error: 'Invalid table definition' })
        }
        const columnDefs = columns.map((col: { name: string; type: string; constraints?: string }) =>
          `${col.name} ${col.type}${col.constraints ? ' ' + col.constraints : ''}`
        ).join(', ')
        await sql(`CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})` as any)
        return NextResponse.json({ success: true, message: `Table ${tableName} created` })
      }

      case 'add_column': {
        const { tableName, columnName, columnType, defaultValue } = payload
        let queryText = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType}`
        if (defaultValue !== undefined) {
          queryText += ` DEFAULT ${defaultValue}`
        }
        await sql(queryText as any)
        return NextResponse.json({ success: true, message: `Column ${columnName} added to ${tableName}` })
      }

      case 'drop_column': {
        const { tableName, columnName } = payload
        await sql(`ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${columnName}` as any)
        return NextResponse.json({ success: true, message: `Column ${columnName} dropped from ${tableName}` })
      }

      case 'backup_table': {
        const { tableName } = payload
        const data = await sql(`SELECT * FROM ${tableName}` as any)
        return NextResponse.json({ success: true, table: tableName, rowCount: (data as any[]).length, data, exportedAt: new Date().toISOString() })
      }

      case 'write_file': {
        const { filename, content, type } = payload
        if (!filename || !content) {
          return NextResponse.json({ success: false, error: 'filename and content required' })
        }
        let filePath = filename
        if (!filename.startsWith('/') && !filename.startsWith('app/') && !filename.startsWith('components/') && !filename.startsWith('lib/')) {
          if (type === 'frontend' || filename.endsWith('.tsx') || filename.endsWith('.jsx')) {
            filePath = filename.includes('/') ? filename : `components/${filename}`
          } else if (type === 'backend' || filename.includes('route')) {
            filePath = filename.includes('/') ? filename : `app/api/${filename}`
          } else {
            filePath = filename.includes('/') ? filename : `lib/${filename}`
          }
        }
        const resolved = safeResolve(filePath)
        if (!resolved.ok) {
          return NextResponse.json({ success: false, error: resolved.error })
        }
        await mkdir(dirname(resolved.fullPath), { recursive: true })
        await writeFile(resolved.fullPath, content, 'utf-8')
        return NextResponse.json({ success: true, message: `File written: ${resolved.relPath}`, path: resolved.relPath })
      }

      case 'read_file': {
        const { filename } = payload
        if (!filename) {
          return NextResponse.json({ success: false, error: 'filename required' })
        }
        const resolved = safeResolve(filename)
        if (!resolved.ok) {
          return NextResponse.json({ success: false, error: resolved.error })
        }
        try {
          const content = await readFile(resolved.fullPath, 'utf-8')
          const stats = await stat(resolved.fullPath)
          return NextResponse.json({ success: true, content, path: resolved.relPath, size: stats.size, modified: stats.mtime })
        } catch {
          return NextResponse.json({ success: false, error: `File not found: ${resolved.relPath}` })
        }
      }

      case 'delete_file': {
        const { filename } = payload
        if (!filename) {
          return NextResponse.json({ success: false, error: 'filename required' })
        }
        const resolved = safeResolve(filename)
        if (!resolved.ok) {
          return NextResponse.json({ success: false, error: resolved.error })
        }
        try {
          await unlink(resolved.fullPath)
          return NextResponse.json({ success: true, message: `Deleted: ${resolved.relPath}` })
        } catch {
          return NextResponse.json({ success: false, error: `Cannot delete: ${resolved.relPath}` })
        }
      }

      case 'list_files': {
        const { directory = '.', recursive = false } = payload
        const listDir = async (dir: string, depth = 0): Promise<Array<{ name: string; path: string; isDirectory: boolean; size?: number }>> => {
          const dirResolved = safeResolve(dir === '' ? '.' : dir)
          if (!dirResolved.ok) return []
          const entries: Array<{ name: string; path: string; isDirectory: boolean; size?: number }> = []
          try {
            const files = await readdir(dirResolved.fullPath, { withFileTypes: true })
            for (const f of files) {
              if (f.name.startsWith('.') || f.name === 'node_modules' || f.name === '.next') continue
              const entryPath = dir === '.' ? f.name : `${dir}/${f.name}`
              const entry = { name: f.name, path: entryPath, isDirectory: f.isDirectory() }
              if (!f.isDirectory()) {
                const s = await stat(join(dirResolved.fullPath, f.name))
                Object.assign(entry, { size: s.size })
              }
              entries.push(entry)
              if (recursive && f.isDirectory() && depth < 3) {
                const subEntries = await listDir(entryPath, depth + 1)
                entries.push(...subEntries)
              }
            }
          } catch {}
          return entries
        }
        const files = await listDir(directory)
        return NextResponse.json({ success: true, files, directory })
      }

      case 'search_files': {
        const { pattern, directory = '.' } = payload
        if (!pattern) {
          return NextResponse.json({ success: false, error: 'pattern required' })
        }
        const searchDir = async (dir: string): Promise<Array<{ path: string; line: number; content: string }>> => {
          const dirResolved = safeResolve(dir === '' ? '.' : dir)
          if (!dirResolved.ok) return []
          const results: Array<{ path: string; line: number; content: string }> = []
          try {
            const files = await readdir(dirResolved.fullPath, { withFileTypes: true })
            for (const f of files) {
              if (f.name.startsWith('.') || f.name === 'node_modules' || f.name === '.next') continue
              const entryPath = dir === '.' ? f.name : `${dir}/${f.name}`
              if (f.isDirectory()) {
                results.push(...await searchDir(entryPath))
              } else if (f.name.match(/\.(tsx?|jsx?|json|md|css)$/)) {
                try {
                  const content = await readFile(join(dirResolved.fullPath, f.name), 'utf-8')
                  content.split('\n').forEach((line, idx) => {
                    if (line.toLowerCase().includes(pattern.toLowerCase())) {
                      results.push({ path: entryPath, line: idx + 1, content: line.trim() })
                    }
                  })
                } catch {}
              }
            }
          } catch {}
          return results.slice(0, 50)
        }
        const results = await searchDir(directory)
        return NextResponse.json({ success: true, pattern, matches: results, count: results.length })
      }

      case 'stats': {
        const PLATFORM_ADMIN_ID = 'be4f0618-d666-4e13-ae8f-13c986784ff7'
        const stats = await Promise.all([
          sql`SELECT COUNT(*) as count FROM users`,
          sql`SELECT COUNT(*) as count FROM wallets`,
          sql`SELECT COUNT(*) as count FROM arena_matches`,
          sql`SELECT COUNT(*) as count FROM casino_games`,
          sql`SELECT COALESCE(SUM(balance_trx), 0) as total FROM wallets`,
          sql`SELECT COALESCE(SUM(play_balance), 0) as total FROM wallets`,
          sql`SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL '24 hours'`,
          sql`SELECT COUNT(*) as count FROM casino_games WHERE created_at > NOW() - INTERVAL '24 hours'`,
          sql`SELECT COALESCE(balance_trx, 0) as balance FROM wallets WHERE user_id = ${PLATFORM_ADMIN_ID}::uuid`,
          sql`SELECT COALESCE(SUM(amount), 0) as total FROM escrow WHERE status = 'locked'`,
        ])
        return NextResponse.json({
          success: true,
          stats: {
            totalUsers: Number((stats[0] as any)[0].count),
            totalWallets: Number((stats[1] as any)[0].count),
            totalMatches: Number((stats[2] as any)[0].count),
            totalGames: Number((stats[3] as any)[0].count),
            totalTRX: Number((stats[4] as any)[0].total),
            totalPlayBalance: Number((stats[5] as any)[0].total),
            newUsersToday: Number((stats[6] as any)[0].count),
            gamesToday: Number((stats[7] as any)[0].count),
            platformVaultTrx: Number((stats[8] as any)[0]?.balance || 0),
            escrowPoolTrx: Number((stats[9] as any)[0].total),
          }
        })
      }

      case 'deploy_status': {
        const services = {
          'api-server': 'https://api-server-823579957639.us-central1.run.app/health',
          'ssbnow-core': 'https://ssbnow-core-823579957639.us-central1.run.app/health',
          'ssbnowshop': 'https://ssbnowshop-823579957639.us-central1.run.app/health',
          'cloudrun': 'https://ssbnow.shop/api/health',
        }
        const results: Record<string, { status: string; latency: number }> = {}
        for (const [name, url] of Object.entries(services)) {
          const start = Date.now()
          try {
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
            results[name] = { status: res.ok ? 'online' : `error (${res.status})`, latency: Date.now() - start }
          } catch {
            results[name] = { status: 'offline', latency: Date.now() - start }
          }
        }
        return NextResponse.json({ success: true, services: results })
      }

      case 'env_vars': {
        const envKeys = Object.keys(process.env).filter(k =>
          !k.includes('SECRET') && !k.includes('PASSWORD') && !k.includes('KEY') && !k.includes('TOKEN')
        )
        return NextResponse.json({ success: true, variables: envKeys, hasDatabase: !!process.env.DATABASE_URL, nodeEnv: process.env.NODE_ENV })
      }

      case 'wallet_summary': {
        const summary = await sql`
          SELECT COUNT(*) as total_wallets, SUM(balance_trx) as total_trx, SUM(balance_usdt) as total_usdt,
                 SUM(play_balance) as total_play, AVG(balance_trx) as avg_trx
          FROM wallets
        `
        return NextResponse.json({ success: true, summary: (summary as any[])[0] })
      }

      case 'user_list': {
        const { limit = 50, offset = 0, role } = payload
        let users
        if (role) {
          users = await sql`
            SELECT u.id, u.email, u.username, u.name, u.role, u.is_active, u.created_at,
                   w.balance_trx, w.balance_usdt, w.play_balance
            FROM users u LEFT JOIN wallets w ON w.user_id = u.id
            WHERE u.role = ${role} ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}
          `
        } else {
          users = await sql`
            SELECT u.id, u.email, u.username, u.name, u.role, u.is_active, u.created_at,
                   w.balance_trx, w.balance_usdt, w.play_balance
            FROM users u LEFT JOIN wallets w ON w.user_id = u.id
            ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}
          `
        }
        return NextResponse.json({ success: true, users, count: (users as any[]).length })
      }

      case 'user_update': {
        const { userId, data } = payload
        if (!userId || !data) {
          return NextResponse.json({ success: false, error: 'userId and data required' })
        }
        const allowedFields = ['name', 'username', 'role', 'is_active']
        const updates = Object.entries(data).filter(([k]) => allowedFields.includes(k))
        if (updates.length === 0) {
          return NextResponse.json({ success: false, error: 'No valid fields to update' })
        }
        const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`).join(', ')
        const values = [...updates.map(([, v]) => v), userId]
        const result = await sql(
          `UPDATE users SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length}::uuid RETURNING *` as any,
          values
        )
        return NextResponse.json({ success: true, user: (result as any[])[0] })
      }

      case 'arena_list': {
        const { status } = payload || {}
        const matches = status
          ? await sql`
              SELECT m.*, COUNT(p.id)::int as participant_count
              FROM arena_matches m LEFT JOIN arena_participants p ON p.match_id = m.id
              WHERE m.status = ${status} GROUP BY m.id ORDER BY m.scheduled_at DESC NULLS LAST LIMIT 50
            `
          : await sql`
              SELECT m.*, COUNT(p.id)::int as participant_count
              FROM arena_matches m LEFT JOIN arena_participants p ON p.match_id = m.id
              GROUP BY m.id ORDER BY m.created_at DESC LIMIT 50
            `
        return NextResponse.json({ success: true, matches })
      }

      case 'arena_set_status': {
        const { matchId, status, winnerId } = payload || {}
        if (!matchId || !status) {
          return NextResponse.json({ success: false, error: 'matchId and status required' })
        }
        const allowed = ['upcoming', 'active', 'completed', 'cancelled']
        if (!allowed.includes(status)) {
          return NextResponse.json({ success: false, error: `Invalid status: ${status}` })
        }
        const result = winnerId
          ? await sql`UPDATE arena_matches SET status = ${status}, winner_id = ${winnerId}, ended_at = NOW(), updated_at = NOW() WHERE id = ${matchId} RETURNING *`
          : await sql`UPDATE arena_matches SET status = ${status}, updated_at = NOW() WHERE id = ${matchId} RETURNING *`
        if ((result as any[]).length === 0) {
          return NextResponse.json({ success: false, error: 'Match not found' })
        }
        return NextResponse.json({ success: true, match: (result as any[])[0] })
      }

      case 'casino_stats': {
        const stats = await sql`
          SELECT game_type, COUNT(*)::int as game_count,
                 COALESCE(SUM(bet_amount), 0) as total_wagered,
                 COALESCE(SUM(payout), 0) as total_paid_out,
                 COALESCE(SUM(platform_fee), 0) as total_fees,
                 COALESCE(SUM(bet_amount) - SUM(payout), 0) as house_result
          FROM casino_games GROUP BY game_type ORDER BY total_wagered DESC
        `
        return NextResponse.json({ success: true, stats })
      }

      case 'casino_recent': {
        const { limit = 30 } = payload || {}
        const games = await sql`
          SELECT g.id, g.game_type, g.bet_amount, g.outcome, g.payout, g.created_at, u.email, u.username
          FROM casino_games g LEFT JOIN users u ON u.id = g.user_id
          ORDER BY g.created_at DESC LIMIT ${limit}
        `
        return NextResponse.json({ success: true, games })
      }

      case 'analyze_project': {
        const countFiles = async (dir: string, ext: string): Promise<number> => {
          let count = 0
          const resolved = safeResolve(dir)
          if (!resolved.ok) return 0
          try {
            const files = await readdir(resolved.fullPath, { withFileTypes: true })
            for (const f of files) {
              if (f.name.startsWith('.') || f.name === 'node_modules' || f.name === '.next') continue
              if (f.isDirectory()) {
                count += await countFiles(`${dir}/${f.name}`, ext)
              } else if (f.name.endsWith(ext)) {
                count++
              }
            }
          } catch {}
          return count
        }
        const analysis = {
          components: await countFiles('components', '.tsx'),
          pages: await countFiles('app', '.tsx'),
          apiRoutes: await countFiles('app/api', '.ts'),
          libraries: await countFiles('lib', '.ts'),
          hooks: await countFiles('lib', '.ts'),
        }
        return NextResponse.json({ success: true, analysis })
      }

      case 'json_validate': {
        const { content } = payload
        try {
          const parsed = JSON.parse(content)
          return NextResponse.json({ success: true, message: 'Valid JSON', data: parsed })
        } catch (err) {
          return NextResponse.json({ success: false, error: `Invalid JSON: ${err instanceof Error ? err.message : 'Parse error'}` })
        }
      }

      case 'git_status': {
        try {
          const { stdout } = await runGit(['status', '--porcelain'])
          const changes = stdout.trim().split('\n').filter(Boolean).map(line => ({
            status: line.substring(0, 2).trim(), file: line.substring(3)
          }))
          return NextResponse.json({ success: true, changes, hasChanges: changes.length > 0 })
        } catch {
          return NextResponse.json({ success: false, error: 'Git not available or not a git repository' })
        }
      }

      case 'git_log': {
        try {
          const { stdout } = await runGit(['log', '--oneline', '-20'])
          const commits = stdout.trim().split('\n').filter(Boolean).map(line => ({
            hash: line.substring(0, 7), message: line.substring(8)
          }))
          return NextResponse.json({ success: true, commits })
        } catch {
          return NextResponse.json({ success: false, error: 'Git not available' })
        }
      }

      case 'git_push': {
        const message = typeof payload?.message === 'string' && payload.message.trim()
          ? payload.message.trim() : 'EIGHT: Update ecosystem changes'
        try {
          await runGit(['rev-parse', '--is-inside-work-tree'])
          await runGit(['add', '.'])
          try {
            await runGit(['commit', '-m', message])
          } catch (e: any) {
            if (e.stdout?.includes('nothing to commit')) {
              return NextResponse.json({ success: true, message: 'Nothing to commit, repository up to date.' })
            }
            throw e
          }
          const { stdout, stderr } = await runGit(['push', 'origin', 'main'])
          return NextResponse.json({ success: true, message: 'Successfully pushed to GitHub', stdout, stderr })
        } catch (error: any) {
          console.error('Git push error:', error)
          return NextResponse.json({ success: false, error: 'Git push failed', details: error.message, stdout: error.stdout, stderr: error.stderr })
        }
      }

      case 'deploy': {
        return NextResponse.json({ success: false, error: 'Deploy the verified main source through the WEAVE preview and promotion workflow.' }, { status: 409 })
      }

      case 'debug_logs': {
        const { filter = 'all' } = payload
        try {
          const logs: Array<{ time: string; type: string; message: string }> = []
          if (filter === 'all' || filter === 'api') {
            const users = await sql`SELECT created_at, email, role FROM users ORDER BY created_at DESC LIMIT 5`
            for (const u of (users as any[])) {
              logs.push({ time: u.created_at, type: 'api', message: `User registered: ${u.email} (${u.role})` })
            }
          }
          if (filter === 'all' || filter === 'db') {
            const games = await sql`SELECT created_at, user_id, outcome, bet_amount FROM casino_games ORDER BY created_at DESC LIMIT 5`
            for (const g of (games as any[])) {
              logs.push({ time: g.created_at, type: 'db', message: `Casino ${g.outcome}: ${g.bet_amount} TRX` })
            }
          }
          if (filter === 'all' || filter === 'db') {
            const ledger = await sql`SELECT created_at, entry_type, amount FROM ledger_entries ORDER BY created_at DESC LIMIT 5`
            for (const l of (ledger as any[])) {
              logs.push({ time: l.created_at, type: 'db', message: `Ledger: ${l.entry_type} - ${l.amount} TRX` })
            }
          }
          logs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          return NextResponse.json({ success: true, logs: logs.slice(0, 20) })
        } catch (error) {
          return NextResponse.json({ success: false, error: `Failed to fetch logs: ${error}` })
        }
      }

      case 'health_check': {
        const checks: Record<string, { status: string; latency: number }> = {}
        const dbStart = Date.now()
        try {
          await sql`SELECT 1 as health`
          checks['database'] = { status: 'online', latency: Date.now() - dbStart }
        } catch {
          checks['database'] = { status: 'offline', latency: Date.now() - dbStart }
        }
        const services = {
          'api-server': 'https://api-server-823579957639.us-central1.run.app/health',
          'ssbnow-core': 'https://ssbnow-core-823579957639.us-central1.run.app/health',
        }
        for (const [name, url] of Object.entries(services)) {
          const start = Date.now()
          try {
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
            checks[name] = { status: res.ok ? 'online' : `error (${res.status})`, latency: Date.now() - start }
          } catch {
            checks[name] = { status: 'offline', latency: Date.now() - start }
          }
        }
        return NextResponse.json({ success: true, checks })
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` })
    }

  } catch (error) {
    console.error('Eight execute error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Execution failed' })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'Eight Execute API',
    version: '2.1',
    capabilities: [
      'sql', 'schema', 'create_table', 'add_column', 'drop_column', 'backup_table',
      'write_file', 'read_file', 'delete_file', 'list_files', 'search_files',
      'stats', 'deploy_status', 'env_vars',
      'wallet_summary',
      'user_list', 'user_update',
      'analyze_project', 'json_validate',
      'git_status', 'git_log', 'git_push',
      'deploy', 'debug_logs', 'health_check'
    ]
  })
}
