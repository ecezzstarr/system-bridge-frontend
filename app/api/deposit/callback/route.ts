import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY

function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('Database not configured')
  return neon(url)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('ref')
    const userId = searchParams.get('userId')
    const trxAmount = parseFloat(searchParams.get('trx') || '0')
    const transactionId = searchParams.get('transaction_id')
    const status = searchParams.get('status')

    // Redirect URL for the user
    const baseUrl = process.env.NEXTAUTH_URL || 'https://v0-live-site-deployment-pink.vercel.app'

    if (!reference || !userId || !trxAmount) {
      return NextResponse.redirect(`${baseUrl}/wallet/deposit-withdraw?error=invalid_params`)
    }

    // If status is not successful, redirect with error
    if (status !== 'successful' && status !== 'completed') {
      return NextResponse.redirect(`${baseUrl}/wallet/deposit-withdraw?error=payment_failed`)
    }

    // Verify the transaction with Flutterwave
    if (transactionId && FLUTTERWAVE_SECRET_KEY) {
      const verifyResponse = await fetch(
        `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          },
        }
      )

      const verifyData = await verifyResponse.json()

      if (verifyData.status !== 'success' || verifyData.data?.status !== 'successful') {
        return NextResponse.redirect(`${baseUrl}/wallet/deposit-withdraw?error=verification_failed`)
      }
    }

    // Credit the user's wallet
    const sql = getDb()
    
    // Update wallet balance
    await sql`
      UPDATE wallets 
      SET balance_trx = balance_trx + ${trxAmount}
      WHERE user_id = ${userId}::uuid
    `

    // Log the transaction
    await sql`
      INSERT INTO wallet_transactions (user_id, type, amount, reference, status, created_at)
      VALUES (${userId}::uuid, 'deposit', ${trxAmount}, ${reference}, 'completed', NOW())
    `.catch(() => {
      // Table might not exist
    })

    // Redirect to success page
    return NextResponse.redirect(`${baseUrl}/wallet/deposit-withdraw?success=true&amount=${trxAmount}`)
  } catch (error: any) {
    console.error('Deposit callback error:', error)
    const baseUrl = process.env.NEXTAUTH_URL || 'https://v0-live-site-deployment-pink.vercel.app'
    return NextResponse.redirect(`${baseUrl}/wallet/deposit-withdraw?error=processing_failed`)
  }
}
