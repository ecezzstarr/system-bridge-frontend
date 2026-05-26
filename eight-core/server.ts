#!/usr/bin/env node
/**
 * EIGHT Core - Standalone AI System Builder
 * Deploy this to Google Cloud Run for independent operation
 */

import express from 'express'
import cors from 'cors'
import pg from 'pg'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs/promises'
import path from 'path'

const { Pool } = pg
const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Database connection - Cloud SQL
let pool: pg.Pool | null = null
const getDb = (): pg.Pool => {
  if (!pool) {
    if (process.env.CLOUD_SQL_CONNECTION_NAME) {
      pool = new Pool({
        user: process.env.CLOUD_SQL_USER || 'postgres',
        password: process.env.CLOUD_SQL_PASSWORD,
        database: process.env.CLOUD_SQL_DATABASE || 'ssbnow',
        host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
      })
    } else if (process.env.DATABASE_URL) {
      pool = new Pool({ connectionString: process.env.DATABASE_URL })
    } else {
      throw new Error('No database configuration found')
    }
  }
  return pool
}

// AI Model - Using Google Gemini (free tier)
const getAI = () => {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY
  if (!apiKey) {
    return null
  }
  return new GoogleGenerativeAI(apiKey)
}

// Eight System Prompt
const EIGHT_SYSTEM_PROMPT = `You are EIGHT, the system builder AI for SSB Now ecosystem.

Your capabilities:
1. DATABASE: Create tables, run queries, modify schema
2. FILES: Read, write, delete, search files
3. USERS: List, update, fund wallets
4. SYSTEM: Stats, health checks, deployments
5. CODE: Generate and execute code blocks

When asked to do something, respond with executable actions in this format:
\`\`\`action:TYPE
{json payload}
\`\`\`

Action types: sql, create_table, write_file, read_file, fund_wallet, user_list, stats

Be direct and execute tasks. You are the builder.`

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'online', service: 'eight-core', timestamp: new Date().toISOString() })
})

// Main chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { messages, context } = req.body
    const ai = getAI()
    
    if (!ai) {
      return res.json({
        success: false,
        error: 'AI not configured. Set GOOGLE_AI_API_KEY environment variable'
      })
    }

    const systemPrompt = context 
      ? `${EIGHT_SYSTEM_PROMPT}\n\nContext: ${JSON.stringify(context)}`
      : EIGHT_SYSTEM_PROMPT

    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const chat = model.startChat({
      history: messages.slice(0, -1).map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }))
    })
    
    const lastMessage = messages[messages.length - 1]
    const result = await chat.sendMessage(`${systemPrompt}\n\n${lastMessage.content}`)
    const text = result.response.text()

    const actions = parseActions(text)

    res.json({
      success: true,
      response: text,
      actions,
    })
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Execute action endpoint
app.post('/execute', async (req, res) => {
  try {
    const { action, payload } = req.body
    const result = await executeAction(action, payload)
    res.json(result)
  } catch (error) {
    console.error('Execute error:', error)
    res.status(500).json({ success: false, error: String(error) })
  }
})

// SQL endpoint
app.post('/sql', async (req, res) => {
  try {
    const { query } = req.body
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query required' })
    }
    
    const db = getDb()
    const result = await db.query(query)
    
    res.json({
      success: true,
      rows: result.rows || [],
      rowCount: result.rowCount || 0,
    })
  } catch (error) {
    console.error('SQL error:', error)
    res.status(500).json({ success: false, error: String(error) })
  }
})

// File operations
app.post('/files', async (req, res) => {
  try {
    const { operation, path: filePath, content, directory } = req.body
    const basePath = process.env.PROJECT_ROOT || '/app'
    
    switch (operation) {
      case 'read': {
        const fullPath = path.join(basePath, filePath)
        const fileContent = await fs.readFile(fullPath, 'utf-8')
        return res.json({ success: true, content: fileContent })
      }
      case 'write': {
        const fullPath = path.join(basePath, filePath)
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        await fs.writeFile(fullPath, content, 'utf-8')
        return res.json({ success: true, message: `Written to ${filePath}` })
      }
      case 'list': {
        const fullPath = path.join(basePath, directory || '.')
        const entries = await fs.readdir(fullPath, { withFileTypes: true })
        const files = entries.map(e => ({
          name: e.name,
          path: path.join(directory || '.', e.name),
          isDirectory: e.isDirectory()
        }))
        return res.json({ success: true, files })
      }
      case 'delete': {
        const fullPath = path.join(basePath, filePath)
        await fs.unlink(fullPath)
        return res.json({ success: true, message: `Deleted ${filePath}` })
      }
      default:
        return res.status(400).json({ success: false, error: `Unknown operation: ${operation}` })
    }
  } catch (error) {
    console.error('File error:', error)
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Stats endpoint
app.get('/stats', async (req, res) => {
  try {
    const db = getDb()
    
    const [users, wallets, games] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users'),
      db.query('SELECT COALESCE(SUM(balance_trx), 0) as total FROM wallets'),
      db.query('SELECT COUNT(*) as count FROM casino_games'),
    ])
    
    res.json({
      success: true,
      stats: {
        totalUsers: Number(users.rows[0]?.count || 0),
        totalTrx: Number(wallets.rows[0]?.total || 0),
        casinoGames: Number(games.rows[0]?.count || 0),
      }
    })
  } catch (error) {
    console.error('Stats error:', error)
    res.status(500).json({ success: false, error: String(error) })
  }
})

// User management
app.get('/users', async (req, res) => {
  try {
    const { role } = req.query
    const db = getDb()
    
    let result
    if (role && role !== 'all') {
      result = await db.query(`
        SELECT u.id, u.email, u.username, u.name, u.role, u.is_active,
               COALESCE(w.balance_trx, 0) as balance_trx,
               COALESCE(w.play_balance, 0) as play_balance
        FROM users u
        LEFT JOIN wallets w ON u.id = w.user_id
        WHERE u.role = $1
        ORDER BY u.created_at DESC
        LIMIT 100
      `, [role])
    } else {
      result = await db.query(`
        SELECT u.id, u.email, u.username, u.name, u.role, u.is_active,
               COALESCE(w.balance_trx, 0) as balance_trx,
               COALESCE(w.play_balance, 0) as play_balance
        FROM users u
        LEFT JOIN wallets w ON u.id = w.user_id
        ORDER BY u.created_at DESC
        LIMIT 100
      `)
    }
    
    res.json({ success: true, users: result.rows })
  } catch (error) {
    console.error('Users error:', error)
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Fund wallet
app.post('/fund', async (req, res) => {
  try {
    const { userId, amount, target } = req.body
    if (!userId || !amount) {
      return res.status(400).json({ success: false, error: 'userId and amount required' })
    }
    
    const db = getDb()
    const column = target === 'play' ? 'play_balance' : 'balance_trx'
    
    await db.query(
      `UPDATE wallets SET ${column} = ${column} + $1, updated_at = NOW() WHERE user_id = $2::uuid`,
      [amount, userId]
    )
    
    res.json({ success: true, message: `Added ${amount} TRX to ${target || 'core'} wallet` })
  } catch (error) {
    console.error('Fund error:', error)
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Schema endpoint
app.get('/schema', async (req, res) => {
  try {
    const db = getDb()
    const result = await db.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `)
    
    const schema: Record<string, Array<{ column: string; type: string }>> = {}
    for (const row of result.rows) {
      if (!schema[row.table_name]) schema[row.table_name] = []
      schema[row.table_name].push({ column: row.column_name, type: row.data_type })
    }
    
    res.json({ success: true, schema })
  } catch (error) {
    console.error('Schema error:', error)
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Parse action blocks from AI response
function parseActions(text: string): Array<{ type: string; payload: any }> {
  const actions: Array<{ type: string; payload: any }> = []
  const regex = /```action:(\w+)\n([\s\S]*?)```/g
  let match
  
  while ((match = regex.exec(text)) !== null) {
    try {
      const type = match[1]
      const payload = JSON.parse(match[2])
      actions.push({ type, payload })
    } catch {
      // Skip invalid action blocks
    }
  }
  
  return actions
}

// Execute a parsed action
async function executeAction(action: string, payload: any) {
  const db = getDb()
  
  switch (action) {
    case 'sql':
      const sqlResult = await db.query(payload.query)
      return { success: true, rows: sqlResult.rows }
      
    case 'create_table':
      await db.query(payload.sql)
      return { success: true, message: `Table created` }
      
    case 'fund_wallet':
      const column = payload.target === 'play' ? 'play_balance' : 'balance_trx'
      await db.query(
        `UPDATE wallets SET ${column} = ${column} + $1 WHERE user_id = $2::uuid`,
        [payload.amount, payload.userId]
      )
      return { success: true, message: `Funded wallet` }
      
    case 'stats':
      const [users, wallets] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM users'),
        db.query('SELECT COALESCE(SUM(balance_trx), 0) as total FROM wallets'),
      ])
      return { success: true, stats: { users: users.rows[0]?.count, totalTrx: wallets.rows[0]?.total } }
      
    default:
      return { success: false, error: `Unknown action: ${action}` }
  }
}

// Start server
const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`EIGHT Core running on port ${PORT}`)
  console.log(`Health: http://localhost:${PORT}/health`)
})
