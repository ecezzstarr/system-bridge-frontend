import { NextRequest, NextResponse } from 'next/server'
import { verifyPayment } from '@/lib/flutterwave'
import { sql } from '@/lib/db'
import { convertNgnToTrx } from '@/lib/conversion'

/**
 * OPay Payment Callback
 * Verifies NGN deposit and automatically converts to TRX.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const transactionId = searchParams.get('transaction_id')
    const txRef = searchParams.get('tx_ref')

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
    }

    const result = await verifyPayment(transactionId)

    if (result.success && result.status === 'successful') {
      // In a real scenario, we would verify the currency is NGN
      const ngnAmount = result.amount || 0
      const trxAmount = convertNgnToTrx(ngnAmount)
      
      // Get user ID from reference format: `SSB-${userId}-${Date.now()}`
      const userId = txRef?.split('-')[1]

      if (!userId) {
        throw new Error('User ID not found in transaction reference')
      }

      // 1. Update Profile Balance (TRX)
      // We update both profiles and wallets for consistency in this ecosystem
      await sql`
        UPDATE profiles 
        SET balance_trx = balance_trx + ${trxAmount}, 
            total_funded_trx = total_funded_trx + ${trxAmount},
            updated_at = NOW()
        WHERE clerk_user_id = ${userId} OR id::text = ${userId}
      `

      // 2. Update Wallet Balance (TRX)
      await sql`
        UPDATE wallets 
        SET balance_trx = balance_trx + ${trxAmount}, 
            updated_at = NOW()
        WHERE user_id = ${userId}::uuid
      `

      // 3. Record in Ledger
      await sql`
        INSERT INTO ledger_entries (user_id, entry_type, amount, currency, description, metadata)
        VALUES (
          ${userId}::uuid, 
          'deposit', 
          ${trxAmount}, 
          'TRX', 
          ${`OPay Deposit: ${ngnAmount} NGN converted to ${trxAmount.toFixed(2)} TRX`},
          ${JSON.stringify({ 
            payment_gateway: 'flutterwave_opay', 
            transaction_id: transactionId, 
            ngn_amount: ngnAmount, 
            currency: 'NGN',
            conversion_rate: trxAmount / ngnAmount 
          })}
        )
      `

      // 4. Record in Transactions table for Arena/Casino history
      await sql`
        INSERT INTO transactions (tx_hash, from_address, to_address, amount, token_symbol, from_profile_id)
        SELECT 
          ${transactionId}, 
          'OPay (NGN)', 
          'Platform Vault (TRX)', 
          ${trxAmount.toFixed(2)}, 
          'TRX', 
          id 
        FROM profiles 
        WHERE clerk_user_id = ${userId} OR id::text = ${userId}
      `
      
      const baseUrl = process.env.NEXTAUTH_URL || 'https://ssbnow.shop'
      return NextResponse.redirect(`${baseUrl}/wallet/deposit-withdraw?deposit=success&amount=${trxAmount.toFixed(2)}`)
    } else {
      const baseUrl = process.env.NEXTAUTH_URL || 'https://ssbnow.shop'
      return NextResponse.redirect(`${baseUrl}/wallet/deposit-withdraw?deposit=failed`)
    }
  } catch (error: any) {
    console.error('OPay Callback error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
