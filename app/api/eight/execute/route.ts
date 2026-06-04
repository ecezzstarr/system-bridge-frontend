import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { neon } from '@/lib/pg-neon'
import { writeFile, readFile, mkdir, readdir, stat, unlink } from 'fs/promises'
import { dirname, join, relative } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

const PROJECT_ROOT = process.cwd()

export async function POST(request: NextRequest) {
    const auth = await requireWorkshopAuthorization(request)
    if (!auth.authorized) return auth.response

  try {
    const { action, payload } = await request.json()
    console.log('[v0] Eight execute API called:', action)

    switch (action) {
      // ==================== DATABASE OPERATIONS ====================
      case 'sql': {
        const sql = getDb()
        const query = payload.query?.trim()
        
        if (!query) {
          return NextResponse.json({ success: false, error: 'No query provided' })
        }

        const firstWord = query.split(/\s+/)[0].toUpperCase()
        const allowedCommands = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'WITH', 'BEGIN', 'COMMIT', 'ROLLBACK']
        
        if (!allowedCommands.includes(firstWord)) {
          return NextResponse.json({ success: false, error: `Command not allowed: ${firstWord}` })
        }

        const result = await sql(query)
        return NextResponse.json({ 
          success: true, 
          rows: result,
          rowCount: result.length,
          command: firstWord
        })
      }

      case 'schema': {
        // Get full database schema
        const sql = getDb()
        const tables = await sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `
        
        const schema: Record<string, Array<{ column: string; type: string; nullable: boolean; default_value: string | null }>> = {}
        
        for (const t of tables) {
          const columns = await sql`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = ${t.table_name} AND table_schema = 'public'
            ORDER BY ordinal_position
          `
          schema[t.table_name] = columns.map(c => ({
            column: c.column_name,
            type: c.data_type,
            nullable: c.is_nullable === 'YES',
            default_value: c.column_default
          }))
        }
        
        return NextResponse.json({ success: true, schema, tableCount: tables.length })
      }

      case 'create_table': {
        const sql = getDb()
        const { tableName, columns } = payload
        
        if (!tableName || !columns || !Array.isArray(columns)) {
          return NextResponse.json({ success: false, error: 'Invalid table definition' })
        }

        const columnDefs = columns.map((col: { name: string; type: string; constraints?: string }) => 
          `${col.name} ${col.type}${col.constraints ? ' ' + col.constraints : ''}`
        ).join(', ')

        await sql(`CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`)
        return NextResponse.json({ success: true, message: `Table ${tableName} created` })
      }

      case 'add_column': {
        const sql = getDb()
        const { tableName, columnName, columnType, defaultValue } = payload
        
        let query = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType}`
        if (defaultValue !== undefined) {
          query += ` DEFAULT ${defaultValue}`
        }

        await sql(query)
        return NextResponse.json({ success: true, message: `Column ${columnName} added to ${tableName}` })
      }

      case 'drop_column': {
        const sql = getDb()
        const { tableName, columnName } = payload
        await sql(`ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${columnName}`)
        return NextResponse.json({ success: true, message: `Column ${columnName} dropped from ${tableName}` })
      }

      case 'backup_table': {
        const sql = getDb()
        const { tableName } = payload
        const data = await sql(`SELECT * FROM ${tableName}`)
        return NextResponse.json({ 
          success: true, 
          table: tableName,
          rowCount: data.length,
          data,
          exportedAt: new Date().toISOString()
        })
      }

      // ==================== FILE SYSTEM OPERATIONS ====================
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

        const fullPath = join(PROJECT_ROOT, filePath)
        
        await mkdir(dirname(fullPath), { recursive: true })
        await writeFile(fullPath, content, 'utf-8')
        return NextResponse.json({ 
          success: true, 
          message: `File written: ${filePath}`,
          path: filePath
        })
      }

      case 'read_file': {
        const { filename } = payload
        
        if (!filename) {
          return NextResponse.json({ success: false, error: 'filename required' })
        }

        try {
          const fullPath = join(PROJECT_ROOT, filename)
          const content = await readFile(fullPath, 'utf-8')
          const stats = await stat(fullPath)
          return NextResponse.json({ 
            success: true, 
            content, 
            path: filename,
            size: stats.size,
            modified: stats.mtime
          })
        } catch {
          return NextResponse.json({ success: false, error: `File not found: ${filename}` })
        }
      }

      case 'delete_file': {
        const { filename } = payload
        
        if (!filename) {
          return NextResponse.json({ success: false, error: 'filename required' })
        }

        try {
          const fullPath = join(PROJECT_ROOT, filename)
          await unlink(fullPath)
          return NextResponse.json({ success: true, message: `Deleted: ${filename}` })
        } catch {
          return NextResponse.json({ success: false, error: `Cannot delete: ${filename}` })
        }
      }

      case 'list_files': {
        const { directory = '.', recursive = false } = payload
        
        const listDir = async (dir: string, depth = 0): Promise<Array<{ name: string; path: string; isDirectory: boolean; size?: number }>> => {
          const fullPath = join(PROJECT_ROOT, dir)
          const entries: Array<{ name: string; path: string; isDirectory: boolean; size?: number }> = []
          
          try {
            const files = await readdir(fullPath, { withFileTypes: true })
            for (const f of files) {
              if (f.name.startsWith('.') || f.name === 'node_modules' || f.name === '.next') continue
              
              const entryPath = `${dir}/${f.name}`.replace(/^\.\//, '')
              const entry = {
                name: f.name,
                path: entryPath,
                isDirectory: f.isDirectory(),
              }
              
              if (!f.isDirectory()) {
                const s = await stat(join(fullPath, f.name))
                Object.assign(entry, { size: s.size })
              }
              
              entries.push(entry)
              
              if (recursive && f.isDirectory() && depth < 3) {
                const subEntries = await listDir(entryPath, depth + 1)
                entries.push(...subEntries)
              }
            }
          } catch {
            // Directory doesn't exist
          }
          
          return entries
        }
        
        const files = await listDir(directory)
        return NextResponse.json({ success: true, files, directory })
      }

      case 'search_files': {
        const { pattern, directory = '.' } = payload
        
        const searchDir = async (dir: string): Promise<Array<{ path: string; line: number; content: string }>> => {
          const results: Array<{ path: string; line: number; content: string }> = []
          const fullPath = join(PROJECT_ROOT, dir)
          
          try {
            const files = await readdir(fullPath, { withFileTypes: true })
            for (const f of files) {
              if (f.name.startsWith('.') || f.name === 'node_modules' || f.name === '.next') continue
              
              const entryPath = `${dir}/${f.name}`.replace(/^\.\//, '')
              
              if (f.isDirectory()) {
                const subResults = await searchDir(entryPath)
                results.push(...subResults)
              } else if (f.name.match(/\.(tsx?|jsx?|json|md|css)$/)) {
                try {
                  const content = await readFile(join(fullPath, f.name), 'utf-8')
                  const lines = content.split('\n')
                  lines.forEach((line, idx) => {
                    if (line.toLowerCase().includes(pattern.toLowerCase())) {
                      results.push({ path: entryPath, line: idx + 1, content: line.trim() })
                    }
                  })
                } catch {
                  // Can't read file
                }
              }
            }
          } catch {
            // Can't read directory
          }
          
          return results.slice(0, 50) // Limit results
        }
        
        const results = await searchDir(directory)
        return NextResponse.json({ success: true, pattern, matches: results, count: results.length })
      }

      // ==================== SYSTEM OPERATIONS ====================
      case 'stats': {
        const sql = getDb()
        const stats = await Promise.all([
          sql`SELECT COUNT(*) as count FROM users`,
          sql`SELECT COUNT(*) as count FROM wallets`,
          sql`SELECT COUNT(*) as count FROM arena_matches`,
          sql`SELECT COUNT(*) as count FROM casino_games`,
          sql`SELECT COALESCE(SUM(balance_trx), 0) as total FROM wallets`,
          sql`SELECT COALESCE(SUM(play_balance), 0) as total FROM wallets`,
          sql`SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL '24 hours'`,
          sql`SELECT COUNT(*) as count FROM casino_games WHERE created_at > NOW() - INTERVAL '24 hours'`,
        ])

        return NextResponse.json({
          success: true,
          stats: {
            totalUsers: Number(stats[0][0].count),
            totalWallets: Number(stats[1][0].count),
            totalMatches: Number(stats[2][0].count),
            totalGames: Number(stats[3][0].count),
            totalTRX: Number(stats[4][0].total),
            totalPlayBalance: Number(stats[5][0].total),
            newUsersToday: Number(stats[6][0].count),
            gamesToday: Number(stats[7][0].count),
          }
        })
      }

      case 'deploy_status': {
        const services = {
          'api-server': 'https://api-server-823579957639.us-central1.run.app/health',
          'ssbnow-core': 'https://ssbnow-core-823579957639.us-central1.run.app/health',
          'ssbnowshop': 'https://ssbnowshop-823579957639.us-central1.run.app/health',
          'vercel': 'https://v0-live-site-deployment-pink.vercel.app/api/health',
        }

        const results: Record<string, { status: string; latency: number }> = {}
        
        for (const [name, url] of Object.entries(services)) {
          const start = Date.now()
          try {
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
            results[name] = { 
              status: res.ok ? 'online' : `error (${res.status})`, 
              latency: Date.now() - start 
            }
          } catch {
            results[name] = { status: 'offline', latency: Date.now() - start }
          }
        }

        return NextResponse.json({ success: true, services: results })
      }

      case 'env_vars': {
        // Return available env vars (names only, not values for security)
        const envKeys = Object.keys(process.env).filter(k => 
          !k.includes('SECRET') && !k.includes('PASSWORD') && !k.includes('KEY') && !k.includes('TOKEN')
        )
        return NextResponse.json({ 
          success: true, 
          variables: envKeys,
          hasDatabase: !!process.env.DATABASE_URL,
          nodeEnv: process.env.NODE_ENV
        })
      }

      // ==================== WALLET OPERATIONS ====================
      case 'fund_wallet': {
        const sql = getDb()
        const { userId, amount, currency = 'TRX', target = 'core' } = payload
        
        if (!userId || !amount) {
          return NextResponse.json({ success: false, error: 'userId and amount required' })
        }

        const column = target === 'play' ? 'play_balance' : 
                       currency === 'USDT' ? 'balance_usdt' : 'balance_trx'
        
        const result = await sql(`
          UPDATE wallets SET ${column} = ${column} + $1, updated_at = NOW()
          WHERE user_id = $2::uuid
          RETURNING *
        `, [amount, userId])

        if (result.length === 0) {
          return NextResponse.json({ success: false, error: 'Wallet not found' })
        }

        await sql`
          INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, balance_after, created_at)
          VALUES (gen_random_uuid(), ${userId}::uuid, 'admin_credit', ${amount}, ${currency}, ${'Eight funded ' + target + ' balance'}, ${result[0][column]}, NOW())
        `

        return NextResponse.json({ 
          success: true, 
          wallet: result[0],
          message: `Funded ${amount} ${currency} to ${target} balance` 
        })
      }

      case 'wallet_summary': {
        const sql = getDb()
        const summary = await sql`
          SELECT 
            COUNT(*) as total_wallets,
            SUM(balance_trx) as total_trx,
            SUM(balance_usdt) as total_usdt,
            SUM(play_balance) as total_play,
            AVG(balance_trx) as avg_trx
          FROM wallets
        `
        return NextResponse.json({ success: true, summary: summary[0] })
      }

      // ==================== USER OPERATIONS ====================
      case 'user_list': {
        const sql = getDb()
        const { limit = 50, offset = 0, role } = payload
        
        let users
        if (role) {
          users = await sql`
            SELECT u.id, u.email, u.username, u.name, u.role, u.is_active, u.created_at,
                   w.balance_trx, w.balance_usdt, w.play_balance
            FROM users u
            LEFT JOIN wallets w ON w.user_id = u.id
            WHERE u.role = ${role}
            ORDER BY u.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `
        } else {
          users = await sql`
            SELECT u.id, u.email, u.username, u.name, u.role, u.is_active, u.created_at,
                   w.balance_trx, w.balance_usdt, w.play_balance
            FROM users u
            LEFT JOIN wallets w ON w.user_id = u.id
            ORDER BY u.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `
        }
        
        return NextResponse.json({ success: true, users, count: users.length })
      }

      case 'user_update': {
        const sql = getDb()
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
          `UPDATE users SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length}::uuid RETURNING *`,
          values
        )
        
        return NextResponse.json({ success: true, user: result[0] })
      }

      // ==================== PROJECT ANALYSIS ====================
      case 'analyze_project': {
        const countFiles = async (dir: string, ext: string): Promise<number> => {
          let count = 0
          try {
            const files = await readdir(join(PROJECT_ROOT, dir), { withFileTypes: true })
            for (const f of files) {
              if (f.name.startsWith('.') || f.name === 'node_modules' || f.name === '.next') continue
              if (f.isDirectory()) {
                count += await countFiles(`${dir}/${f.name}`, ext)
              } else if (f.name.endsWith(ext)) {
                count++
              }
            }
          } catch {
            // Directory doesn't exist
          }
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

      // ==================== GIT OPERATIONS (if available) ====================
      case 'git_status': {
        try {
          const { stdout } = await execAsync('git status --porcelain', { cwd: PROJECT_ROOT })
          const changes = stdout.trim().split('\n').filter(Boolean).map(line => ({
            status: line.substring(0, 2).trim(),
            file: line.substring(3)
          }))
          return NextResponse.json({ success: true, changes, hasChanges: changes.length > 0 })
        } catch {
          return NextResponse.json({ success: false, error: 'Git not available or not a git repository' })
        }
      }

      case 'git_log': {
        try {
          const { stdout } = await execAsync('git log --oneline -20', { cwd: PROJECT_ROOT })
          const commits = stdout.trim().split('\n').map(line => ({
            hash: line.substring(0, 7),
            message: line.substring(8)
          }))
          return NextResponse.json({ success: true, commits })
        } catch {
          return NextResponse.json({ success: false, error: 'Git not available' })
        }
      }

      // ==================== DEBUG OPERATIONS ====================
      case 'debug_logs': {
        const { filter = 'all' } = payload
        try {
          const sql = getDb()
          const logs: Array<{ time: string; type: string; message: string }> = []

          // Get recent user registrations
          if (filter === 'all' || filter === 'api') {
            const users = await sql`SELECT created_at, email, role FROM users ORDER BY created_at DESC LIMIT 5`
            for (const u of users) {
              logs.push({ time: u.created_at, type: 'api', message: `User registered: ${u.email} (${u.role})` })
            }
          }

          // Get recent casino games
          if (filter === 'all' || filter === 'db') {
            const games = await sql`SELECT created_at, user_id, outcome, bet_amount FROM casino_games ORDER BY created_at DESC LIMIT 5`
            for (const g of games) {
              logs.push({ time: g.created_at, type: 'db', message: `Casino ${g.outcome}: ${g.bet_amount} TRX` })
            }
          }

          // Get recent ledger entries
          if (filter === 'all' || filter === 'db') {
            const ledger = await sql`SELECT created_at, entry_type, amount FROM ledger_entries ORDER BY created_at DESC LIMIT 5`
            for (const l of ledger) {
              logs.push({ time: l.created_at, type: 'db', message: `Ledger: ${l.entry_type} - ${l.amount} TRX` })
            }
          }

          // Sort by time descending
          logs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

          return NextResponse.json({ success: true, logs: logs.slice(0, 20) })
        } catch (error) {
          return NextResponse.json({ success: false, error: `Failed to fetch logs: ${error}` })
        }
      }

      case 'health_check': {
        const checks: Record<string, { status: string; latency: number }> = {}
        
        // Check database
        const dbStart = Date.now()
        try {
          const sql = getDb()
          await sql`SELECT 1 as health`
          checks['database'] = { status: 'online', latency: Date.now() - dbStart }
        } catch {
          checks['database'] = { status: 'offline', latency: Date.now() - dbStart }
        }

        // Check Cloud Run services
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
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Execution failed' 
    })
  }
}

// GET endpoint for quick health/status checks
export async function GET() {
  return NextResponse.json({ 
    status: 'online',
    service: 'Eight Execute API',
    version: '2.0',
    capabilities: [
      'sql', 'schema', 'create_table', 'add_column', 'drop_column', 'backup_table',
      'write_file', 'read_file', 'delete_file', 'list_files', 'search_files',
      'stats', 'deploy_status', 'env_vars',
      'fund_wallet', 'wallet_summary',
      'user_list', 'user_update',
      'analyze_project', 'json_validate',
      'git_status', 'git_log'
    ]
  })
}
