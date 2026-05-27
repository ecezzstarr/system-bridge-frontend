import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'

const FLUTTERWAVE_SECRET_KEY = process.env.FLW_SECRET_KEY
const TRX_RATE = 10 // 1 USD = 10 TRX

function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('Database not configured')
  return neon(url)
}

export async function POST(request: NextRequest) {
  try {
    const { userId, email, name, amountUSD } = await request.json()

    if (!userId || !email || !amountUSD) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    if (amountUSD < 1) {
      return NextResponse.json({ success: false, error: 'Minimum deposit is $1' }, { status: 400 })
    }

    const reference = `SSB-${userId.substring(0, 8)}-${Date.now()}`
    const trxAmount = amountUSD * TRX_RATE
    const redirectUrl = `${process.env.NEXTAUTH_URL || 'https://v0-live-site-deployment-pink.vercel.app'}/api/deposit/callback?ref=${reference}&userId=${userId}&trx=${trxAmount}`

    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: reference,
        amount: amountUSD,
        currency: 'USD',
        payment_options: 'card,banktransfer,ussd,mobilemoney',
        redirect_url: redirectUrl,
        customer: {
          email,
          name: name || email,
          phonenumber: '',
        },
        customizations: {
          title: 'SSBNOW.SHOP',
          description: `Deposit ${trxAmount} TRX to your wallet`,
          logo: 'https://v0-live-site-deployment-pink.vercel.app/logo.png',
        },
        meta: {
          userId,
          trxAmount,
          type: 'wallet_deposit',
        },
      }),
    })

    const data = await response.json()

    if (data.status === 'success') {
      // Store pending deposit
      const sql = getDb()
      await sql`
        INSERT INTO pending_deposits (reference, user_id, amount_usd, amount_trx, status, created_at)
        VALUES (${reference}, ${userId}::uuid, ${amountUSD}, ${trxAmount}, 'pending', NOW())
        ON CONFLICT DO NOTHING
      `.catch(() => {
        // Table might not exist, that's ok for now
      })

      return NextResponse.json({
        success: true,
        paymentLink: data.data.link,
        reference,
        trxAmount,
      })
    }

    return NextResponse.json({
      success: false,
      error: data.message || 'Failed to initialize payment',
    }, { status: 400 })
  } catch (error: any) {
    console.error('Flutterwave init error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Payment initialization failed',
    }, { status: 500 })
  }
}
