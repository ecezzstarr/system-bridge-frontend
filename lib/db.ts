// ===========================================
// DATABASE CONFIGURATION FOR GOOGLE CLOUD SQL
// Standalone - No Neon dependency
// ===========================================

import { Pool } from 'pg'

// Cloud SQL Pool (singleton)
let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const isProduction = process.env.NODE_ENV === 'production'
    
    // In production on Cloud Run, use Unix socket
    // In development or other environments, use TCP
    const connectionConfig = isProduction && process.env.CLOUD_SQL_CONNECTION_NAME
      ? {
          user: process.env.CLOUD_SQL_USER || 'ssbnow_user',
          password: process.env.CLOUD_SQL_PASSWORD,
          database: process.env.CLOUD_SQL_DATABASE || 'ssbnow',
          host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
        }
      : {
          user: process.env.CLOUD_SQL_USER || 'ssbnow_user',
          password: process.env.CLOUD_SQL_PASSWORD,
          database: process.env.CLOUD_SQL_DATABASE || 'ssbnow',
          host: process.env.CLOUD_SQL_HOST || '127.0.0.1',
          port: parseInt(process.env.CLOUD_SQL_PORT || '5432'),
          ssl: process.env.CLOUD_SQL_SSL === 'true' ? { rejectUnauthorized: false } : false,
        }

    pool = new Pool({
      ...connectionConfig,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })

    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err)
    })
  }
  return pool
}

// Tagged template SQL function
async function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  const p = getPool()
  
  // Build parameterized query
  let queryText = strings[0]
  const params: any[] = []
  
  for (let i = 0; i < values.length; i++) {
    params.push(values[i])
    queryText += `$${i + 1}${strings[i + 1]}`
  }
  
  const result = await p.query(queryText, params)
  return result.rows
}

// Direct query function
async function query(text: string, params?: any[]): Promise<any[]> {
  const p = getPool()
  const result = await p.query(text, params)
  return result.rows
}

// Helper function to get SQL (for compatibility)
function getSql() {
  return sql
}

// Wallet tier based on balance
export function getWalletTier(balance: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' {
  if (balance >= 25000) return 'diamond'
  if (balance >= 10000) return 'platinum'
  if (balance >= 5000) return 'gold'
  if (balance >= 1000) return 'silver'
  return 'bronze'
}

// Format currency for display
export function formatTrx(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format date for display
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Format relative time
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateString)
}

// User functions
export async function getUserByUsername(username: string) {
  try {
    const result = await sql`SELECT * FROM users WHERE username = ${username} AND is_active = true`
    return result[0] || null
  } catch (error) {
    console.error('getUserByUsername error:', error)
    return null
  }
}

export async function getUserByEmail(email: string) {
  try {
    const result = await sql`SELECT * FROM users WHERE email = ${email} AND is_active = true`
    return result[0] || null
  } catch (error) {
    console.error('getUserByEmail error:', error)
    return null
  }
}

export async function getUserById(id: string) {
  const result = await sql`SELECT * FROM users WHERE id = ${id}::uuid AND is_active = true`
  return result[0] || null
}

export async function createUser(data: {
  email: string
  name: string
  username?: string
  passwordHash?: string
  googleId?: string
  tronWalletAddress?: string
  role?: string
  departmentalCode?: string
}) {
  const username = data.username || data.email.split('@')[0]
  const result = await sql`
    INSERT INTO users (email, name, username, password_hash, google_id, tron_wallet_address, role, departmental_code, is_active)
    VALUES (${data.email}, ${data.name}, ${username}, ${data.passwordHash || null}, ${data.googleId || null}, ${data.tronWalletAddress || null}, ${data.role || 'user'}, ${data.departmentalCode || null}, true)
    RETURNING *
  `
  return result[0]
}

export async function updateUserLastLogin(id: string) {
  try {
    await sql`UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = ${id}::uuid`
  } catch (error) {
    console.error('updateUserLastLogin error:', error)
  }
}

export async function getAllUsers() {
  return await sql`SELECT id, email, name, avatar_url, role, tron_wallet_address, created_at, last_login, is_active FROM users WHERE is_active = true ORDER BY created_at DESC`
}

// Wallet functions
export async function getWalletByUserId(userId: string) {
  const result = await sql`SELECT * FROM wallets WHERE user_id = ${userId}::uuid AND is_primary = true`
  return result[0] || null
}

export async function createWallet(userId: string, tronAddress: string) {
  const result = await sql`
    INSERT INTO wallets (user_id, tron_address)
    VALUES (${userId}::uuid, ${tronAddress})
    RETURNING *
  `
  return result[0]
}

export async function updateWalletBalance(walletId: string, balanceTrx: number, balanceUsdt: number) {
  const result = await sql`
    UPDATE wallets 
    SET balance_trx = ${balanceTrx}, balance_usdt = ${balanceUsdt}, updated_at = NOW()
    WHERE id = ${walletId}::uuid
    RETURNING *
  `
  return result[0]
}

export async function getAllWallets() {
  return await sql`
    SELECT w.*, u.email, u.name as user_name 
    FROM wallets w 
    JOIN users u ON w.user_id = u.id 
    WHERE u.is_active = true
    ORDER BY w.created_at DESC
  `
}

// Transaction functions
export async function createTransaction(data: {
  userId: string
  type: 'deposit' | 'withdrawal' | 'transfer' | 'sweep' | 'payment' | 'earning'
  amount: number
  currency?: string
  txHash?: string
  fromAddress?: string
  toAddress?: string
  description?: string
  metadata?: Record<string, unknown>
}) {
  const result = await sql`
    INSERT INTO transactions (user_id, type, amount, currency, tx_hash, from_address, to_address, description, metadata)
    VALUES (
      ${data.userId}::uuid, 
      ${data.type}, 
      ${data.amount}, 
      ${data.currency || 'TRX'}, 
      ${data.txHash || null}, 
      ${data.fromAddress || null}, 
      ${data.toAddress || null}, 
      ${data.description || null}, 
      ${data.metadata ? JSON.stringify(data.metadata) : null}
    )
    RETURNING *
  `
  return result[0]
}

export async function updateTransactionStatus(txId: string, status: 'pending' | 'completed' | 'failed' | 'cancelled', txHash?: string) {
  const result = await sql`
    UPDATE transactions 
    SET status = ${status}, tx_hash = COALESCE(${txHash || null}, tx_hash), completed_at = CASE WHEN ${status} = 'completed' THEN NOW() ELSE completed_at END
    WHERE id = ${txId}::uuid
    RETURNING *
  `
  return result[0]
}

export async function getTransactionsByUserId(userId: string, limit = 50) {
  return await sql`
    SELECT * FROM transactions 
    WHERE user_id = ${userId}::uuid 
    ORDER BY created_at DESC 
    LIMIT ${limit}
  `
}

export async function getAllTransactions(limit = 100) {
  return await sql`
    SELECT t.*, u.email, u.name as user_name 
    FROM transactions t 
    JOIN users u ON t.user_id = u.id 
    ORDER BY t.created_at DESC 
    LIMIT ${limit}
  `
}

// Session functions
export async function createSession(userId: string, token: string, expiresAt: Date) {
  const result = await sql`
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES (${userId}::uuid, ${token}, ${expiresAt.toISOString()})
    RETURNING *
  `
  return result[0]
}

export async function getSessionByToken(token: string) {
  const result = await sql`
    SELECT s.*, u.id as user_id, u.email, u.name, u.role, u.avatar_url, u.tron_wallet_address
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ${token} AND s.expires_at > NOW() AND u.is_active = true
  `
  return result[0] || null
}

export async function deleteSession(token: string) {
  await sql`DELETE FROM sessions WHERE token = ${token}`
}

// Admin stats
export async function getTotalStats() {
  const users = await sql`SELECT COUNT(*) as count FROM users WHERE is_active = true`
  const transactions = await sql`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'completed'`
  const wallets = await sql`SELECT COALESCE(SUM(balance_trx), 0) as total_trx, COALESCE(SUM(balance_usdt), 0) as total_usdt FROM wallets`
  
  return {
    totalUsers: parseInt(users[0]?.count || '0'),
    totalTransactions: parseInt(transactions[0]?.count || '0'),
    totalVolume: parseFloat(transactions[0]?.total || '0'),
    totalTrx: parseFloat(wallets[0]?.total_trx || '0'),
    totalUsdt: parseFloat(wallets[0]?.total_usdt || '0'),
  }
}

// Get database info
export function getDatabaseInfo() {
  return {
    provider: 'cloudsql',
    connectionName: process.env.CLOUD_SQL_CONNECTION_NAME || null,
  }
}

// Export for custom queries
export { getSql, query, getPool, sql }
