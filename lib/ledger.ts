// Ledger System - Financial tracking and escrow management
// Handles all balance changes, transactions, and escrow operations

import { getSql } from './db'

export interface LedgerEntry {
  id: string
  user_id: string
  transaction_id?: string
  escrow_id?: string
  entry_type: 'deposit' | 'withdrawal' | 'transfer' | 'escrow_lock' | 'escrow_release' | 'earning' | 'fee'
  amount: number
  currency: string
  balance_before?: number
  balance_after?: number
  description?: string
  created_at: Date
}

export interface EscrowRecord {
  id: string
  transaction_id: string
  user_id: string
  amount: number
  currency: string
  status: 'locked' | 'released' | 'refunded'
  locked_at: Date
  released_at?: Date
  reason?: string
}

// Create a ledger entry and update wallet balance
export async function createLedgerEntry(data: {
  userId: string
  transactionId?: string
  escrowId?: string
  entryType: LedgerEntry['entry_type']
  amount: number
  currency?: string
  description?: string
  metadata?: Record<string, unknown>
}): Promise<LedgerEntry> {
  try {
    const sql = getSql()
    
    // Get current balance
    const walletResult = await sql`
      SELECT balance_trx, balance_usdt FROM wallets 
      WHERE user_id = ${data.userId}::uuid 
      AND is_primary = true
    `
    
    const currentBalance = data.currency === 'USDT' 
      ? walletResult[0]?.balance_usdt || 0 
      : walletResult[0]?.balance_trx || 0

    const newBalance = data.entryType === 'deposit' || data.entryType === 'earning' || data.entryType === 'escrow_release'
      ? currentBalance + data.amount
      : currentBalance - data.amount

    // Create ledger entry
    const result = await sql`
      INSERT INTO ledger_entries (
        user_id, transaction_id, escrow_id, entry_type, amount, currency, 
        balance_before, balance_after, description, metadata
      )
      VALUES (
        ${data.userId}::uuid,
        ${data.transactionId ? data.transactionId + '::uuid' : null},
        ${data.escrowId ? data.escrowId + '::uuid' : null},
        ${data.entryType},
        ${data.amount},
        ${data.currency || 'TRX'},
        ${currentBalance},
        ${newBalance},
        ${data.description || null},
        ${data.metadata ? JSON.stringify(data.metadata) : null}
      )
      RETURNING *
    `

    // Update wallet balance
    if (data.currency === 'USDT') {
      await sql`UPDATE wallets SET balance_usdt = ${newBalance} WHERE user_id = ${data.userId}::uuid AND is_primary = true`
    } else {
      await sql`UPDATE wallets SET balance_trx = ${newBalance} WHERE user_id = ${data.userId}::uuid AND is_primary = true`
    }

    console.log('[v0] Ledger entry created:', result[0]?.id)
    return result[0]
  } catch (error) {
    console.error('[v0] Error creating ledger entry:', error)
    throw error
  }
}

// Lock funds in escrow
export async function createEscrow(data: {
  transactionId: string
  userId: string
  amount: number
  currency?: string
  reason?: string
}): Promise<EscrowRecord> {
  try {
    const sql = getSql()
    
    // Create escrow record
    const escrowResult = await sql`
      INSERT INTO escrow (transaction_id, user_id, amount, currency, reason)
      VALUES (
        ${data.transactionId}::uuid,
        ${data.userId}::uuid,
        ${data.amount},
        ${data.currency || 'TRX'},
        ${data.reason || null}
      )
      RETURNING *
    `

    const escrowId = escrowResult[0]?.id

    // Create ledger entry for escrow lock
    await createLedgerEntry({
      userId: data.userId,
      escrowId,
      transactionId: data.transactionId,
      entryType: 'escrow_lock',
      amount: data.amount,
      currency: data.currency,
      description: `Escrow locked for transaction ${data.transactionId}`,
    })

    console.log('[v0] Escrow created:', escrowId)
    return escrowResult[0]
  } catch (error) {
    console.error('[v0] Error creating escrow:', error)
    throw error
  }
}

// Release escrow funds
export async function releaseEscrow(escrowId: string): Promise<EscrowRecord> {
  try {
    const sql = getSql()
    
    // Get escrow record
    const escrowResult = await sql`SELECT * FROM escrow WHERE id = ${escrowId}::uuid`
    const escrow = escrowResult[0]

    if (!escrow) throw new Error('Escrow not found')

    // Update escrow status
    const updated = await sql`
      UPDATE escrow 
      SET status = 'released', released_at = NOW()
      WHERE id = ${escrowId}::uuid
      RETURNING *
    `

    // Create ledger entry for escrow release
    await createLedgerEntry({
      userId: escrow.user_id,
      escrowId,
      transactionId: escrow.transaction_id,
      entryType: 'escrow_release',
      amount: escrow.amount,
      currency: escrow.currency,
      description: `Escrow released from transaction ${escrow.transaction_id}`,
    })

    console.log('[v0] Escrow released:', escrowId)
    return updated[0]
  } catch (error) {
    console.error('[v0] Error releasing escrow:', error)
    throw error
  }
}

// Get user ledger history
export async function getUserLedger(userId: string, limit = 50): Promise<LedgerEntry[]> {
  try {
    const sql = getSql()
    const result = await sql`
      SELECT * FROM ledger_entries 
      WHERE user_id = ${userId}::uuid
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return result
  } catch (error) {
    console.error('[v0] Error fetching user ledger:', error)
    return []
  }
}

// Get user's active escrow
export async function getUserEscrow(userId: string): Promise<EscrowRecord[]> {
  try {
    const sql = getSql()
    const result = await sql`
      SELECT * FROM escrow 
      WHERE user_id = ${userId}::uuid 
      AND status = 'locked'
      ORDER BY locked_at DESC
    `
    return result
  } catch (error) {
    console.error('[v0] Error fetching user escrow:', error)
    return []
  }
}

// Get total balance including escrow
export async function getUserTotalBalance(userId: string): Promise<{ available: number; locked: number; total: number }> {
  try {
    const sql = getSql()
    
    const wallet = await sql`
      SELECT balance_trx FROM wallets 
      WHERE user_id = ${userId}::uuid 
      AND is_primary = true
    `
    
    const escrowResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total FROM escrow 
      WHERE user_id = ${userId}::uuid 
      AND status = 'locked'
    `

    const available = wallet[0]?.balance_trx || 0
    const locked = escrowResult[0]?.total || 0

    return {
      available,
      locked,
      total: available + locked,
    }
  } catch (error) {
    console.error('[v0] Error calculating total balance:', error)
    return { available: 0, locked: 0, total: 0 }
  }
}
