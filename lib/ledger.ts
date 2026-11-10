// Ledger System - Financial tracking and escrow management
// Handles all balance changes, transactions, and escrow operations

import { getSql, getPool } from './db'

function moneyNumber(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

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
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error('Financial ledger amount must be a positive finite number')
  }
  const currency = data.currency || 'Flame Coin'
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const wallet = await client.query(
      `SELECT balance_trx,balance_usdt FROM wallets
       WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE`,
      [data.userId],
    )
    if (wallet.rowCount !== 1) throw new Error('A unique primary wallet is required before recording funds')
    const before = moneyNumber(currency === 'USDT'
      ? wallet.rows[0].balance_usdt : wallet.rows[0].balance_trx)
    const incoming = ['deposit','earning','escrow_release'].includes(data.entryType)
    const after = Math.round((before + (incoming ? data.amount : -data.amount))*1e6)/1e6
    if (!Number.isFinite(after) || after < 0) {
      throw new Error('Wallet has insufficient recorded funds for this movement')
    }
    const field = currency === 'USDT' ? 'balance_usdt' : 'balance_trx'
    const updated = await client.query(
      `UPDATE wallets SET ${field}=$2,updated_at=NOW()
       WHERE user_id=$1::uuid AND is_primary=true RETURNING id`,
      [data.userId,after],
    )
    if (updated.rowCount !== 1) throw new Error('Wallet update did not persist')
    const entry = await client.query(
      `INSERT INTO ledger_entries(
        user_id,transaction_id,escrow_id,entry_type,amount,currency,
        balance_before,balance_after,description,metadata
      ) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10::jsonb)
      RETURNING *`,
      [data.userId,data.transactionId||null,data.escrowId||null,data.entryType,
       data.amount,currency,before,after,data.description||null,
       JSON.stringify(data.metadata || {})],
    )
    await client.query('COMMIT')
    return {
      ...entry.rows[0],amount:Number(entry.rows[0].amount),
      balance_before:Number(entry.rows[0].balance_before),
      balance_after:Number(entry.rows[0].balance_after),
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
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
        ${data.currency || 'Flame Coin'},
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

    console.log('[WEAVE] Escrow created:', escrowId)
    return escrowResult[0]
  } catch (error) {
    console.error('[WEAVE] Error creating escrow:', error)
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

    console.log('[WEAVE] Escrow released:', escrowId)
    return updated[0]
  } catch (error) {
    console.error('[WEAVE] Error releasing escrow:', error)
    throw error
  }
}

// Financial reads must never convert database failures into fictitious zero
// balances or an empty transaction history.
export async function getUserLedger(userId: string, limit = 50): Promise<LedgerEntry[]> {
  const sql = getSql()
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)))
  const rows = await sql`
    SELECT * FROM ledger_entries
    WHERE user_id=${userId}::uuid
    ORDER BY created_at DESC,id DESC LIMIT ${safeLimit}
  `
  return rows.map((entry:any) => ({
    ...entry,
    amount:Number(entry.amount),
    balance_before:entry.balance_before == null ? undefined : Number(entry.balance_before),
    balance_after:entry.balance_after == null ? undefined : Number(entry.balance_after),
  }))
}

export async function getUserEscrow(userId: string): Promise<EscrowRecord[]> {
  const sql = getSql()
  const rows = await sql`
    SELECT * FROM escrow WHERE user_id=${userId}::uuid
      AND status='locked' ORDER BY locked_at DESC,id DESC
  `
  return rows.map((entry:any) => ({...entry,amount:Number(entry.amount)}))
}

export async function getUserTotalBalance(userId: string): Promise<{
  available:number;locked:number;total:number
}> {
  const sql = getSql()
  const [wallet] = await sql`
    SELECT balance_trx FROM wallets WHERE user_id=${userId}::uuid AND is_primary=true
  `
  if (!wallet) throw new Error('No primary wallet exists for this account')
  const [held] = await sql`
    SELECT COALESCE(SUM(amount),0) AS total FROM escrow
    WHERE user_id=${userId}::uuid AND status='locked'
      AND currency IN ('Flame Coin','TRX')
  `
  const available=Number(wallet.balance_trx)
  const locked=Number(held.total)
  if (!Number.isFinite(available) || !Number.isFinite(locked)) {
    throw new Error('Recorded wallet or escrow value is invalid')
  }
  return {available,locked,total:available+locked}
}

function decodeRecordCursor(cursor:string|null) {
  if (!cursor) return null
  if (cursor.length > 256) throw new Error('Invalid record page cursor')
  let parts:string[]
  try { parts=Buffer.from(cursor,'base64url').toString('utf8').split('|') }
  catch { throw new Error('Invalid record page cursor') }
  if (parts.length !== 2 || !/^\d{4}-\d{2}-\d{2}T/.test(parts[0]) ||
      !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(parts[1]) ||
      !Number.isFinite(Date.parse(parts[0]))) {
    throw new Error('Invalid record page cursor')
  }
  return {createdAt:parts[0],id:parts[1]}
}

/** 
 * Keep each surviving financial section available when a legacy deployment
 * lacks escrow or a particular account has an incomplete wallet. None of these
 * cases permits inventing a zero balance or silently hiding a real ledger.
 * Every section is queried from the SAME repeatable-read PostgreSQL snapshot.
 */
export async function getFinancialRecordPage(
  userId:string,limit=50,cursor:string|null=null,
) {
  const pageSize=Math.max(1,Math.min(100,Math.floor(limit)))
  const previous=decodeRecordCursor(cursor)
  const client=await getPool().connect()
  const warnings:string[]=[]
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    type ReadSection='wallet'|'escrow'|'escrowTotal'|'ledger'
    const optional=async(section:ReadSection,query:string,params:unknown[])=>{
      // SAVEPOINT is essential: PostgreSQL aborts a transaction after a
      // missing-table/column error unless the failed query is rolled back.
      const marker='record_'+section.toLowerCase()
      await client.query('SAVEPOINT '+marker)
      try {
        const result=await client.query(query,params)
        await client.query('RELEASE SAVEPOINT '+marker)
        return result
      } catch(error) {
        await client.query('ROLLBACK TO SAVEPOINT '+marker)
        await client.query('RELEASE SAVEPOINT '+marker)
        const code=typeof error==='object'&&error!==null&&'code' in error
          ? String(error.code) : 'unknown'
        console.error('[WEAVE Record] unreadable '+section+' section (SQLSTATE '+code+')',error)
        return null
      }
    }

    let walletStatus:'available'|'legacy_wallet'|'missing'|'ambiguous'|'unavailable'='unavailable'
    let available:number|null=null
    // The registration path creates primary wallets, but older accounts may
    // have exactly one wallet marked false/null. Read its existing value
    // without changing it; never sum or arbitrarily select multiple wallets.
    let wallet=await optional('wallet',
      'SELECT id,balance_trx,is_primary FROM wallets WHERE user_id=$1::uuid ORDER BY created_at ASC,id ASC',
      [userId])
    if (!wallet) {
      warnings.push('Main wallet could not be read. Its balance is unavailable, not zero.')
    } else {
      const primary=wallet.rows.filter(row=>row.is_primary===true)
      const selected=primary.length===1?primary[0]:
        primary.length===0&&wallet.rows.length===1?wallet.rows[0]:null
      if (selected) {
        available=Number(selected.balance_trx)
        if (!Number.isFinite(available)) {
          available=null
          warnings.push('Stored wallet amount is invalid; no balance was assumed.')
        } else {
          walletStatus=primary.length===1?'available':'legacy_wallet'
          if (walletStatus==='legacy_wallet') {
            warnings.push('A legacy wallet balance is displayed. Administration should review its missing primary-wallet designation; no funds were moved.')
          }
        }
      } else if (wallet.rows.length===0) {
        walletStatus='missing'
        warnings.push('No wallet record exists for this account. Ledger history may still be available; Administration must investigate without creating a replacement zero balance.')
      } else {
        walletStatus='ambiguous'
        warnings.push('More than one wallet could be primary. Administration must reconcile wallet identity; balances were not combined.')
      }
    }

    let escrowStatus:'available'|'unavailable'='unavailable'
    let locked:number|null=null
    let escrowEntries:any[]=[]
    const escrow=await optional('escrow',
      "SELECT * FROM escrow WHERE user_id=$1::uuid AND status='locked' ORDER BY locked_at DESC,id DESC",
      [userId])
    if (!escrow) {
      warnings.push('Escrow records could not be read; locked funds and combined total are unavailable.')
    } else {
      const held=await optional('escrowTotal',
        "SELECT COALESCE(SUM(amount),0) AS total FROM escrow WHERE user_id=$1::uuid AND status='locked' AND currency IN ('Flame Coin','TRX')",
        [userId])
      const amount=held?Number(held.rows[0]?.total):NaN
      if (Number.isFinite(amount)) {
        escrowStatus='available'
        locked=amount
        escrowEntries=escrow.rows.map(row=>({...row,amount:Number(row.amount)}))
      } else {
        warnings.push('Escrow total could not be validated; locked funds were not assumed to be zero.')
      }
    }

    let ledgerStatus:'available'|'unavailable'='unavailable'
    let historyEntries:any[]=[]
    let hasMore=false
    let nextCursor:string|null=null
    const history=await optional('ledger',
      "SELECT * FROM ledger_entries WHERE user_id=$1::uuid AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::uuid)) ORDER BY created_at DESC,id DESC LIMIT $4",
      [userId,previous?.createdAt||null,previous?.id||null,pageSize+1])
    if (history) {
      ledgerStatus='available'
      hasMore=history.rows.length>pageSize
      const entries=history.rows.slice(0,pageSize)
      const last=entries[entries.length-1]
      nextCursor=hasMore&&last
        ?Buffer.from(new Date(last.created_at).toISOString()+'|'+last.id).toString('base64url')
        :null
      historyEntries=entries.map(row=>({
        ...row,amount:Number(row.amount),
        balance_before:row.balance_before==null?null:Number(row.balance_before),
        balance_after:row.balance_after==null?null:Number(row.balance_after),
      }))
    } else {
      warnings.push('Transaction ledger could not be read. Existing transaction records have not been erased.')
    }

    if (walletStatus==='unavailable'&&escrowStatus==='unavailable'&&ledgerStatus==='unavailable') {
      throw new Error('No financial data source could be read')
    }
    const clock=await client.query('SELECT NOW() AS read_at')
    await client.query('COMMIT')
    return {
      ledger:historyEntries,
      escrow:escrowEntries,
      balance:{available,locked,total:available===null||locked===null?null:available+locked},
      sections:{wallet:walletStatus,escrow:escrowStatus,ledger:ledgerStatus},
      warnings,hasMore,nextCursor,readAt:clock.rows[0].read_at,
    }
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  } finally {
    client.release()
  }
}
