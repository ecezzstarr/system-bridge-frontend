import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { FILE_FOLDER_PRICING, isValidFileFolderAmount } from '@/lib/file-folder-pricing'

const FLUTTERWAVE_SECRET_KEY = process.env.FLW_SECRET_KEY

function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('Database not configured')
  return neon(url)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, name, userType, fileNumber, buyerName, buyerPhone } = body
    const isFileFolder = userType === 'file_folder'
    const amountUSD = Number(body.amountUSD ?? body.amount)
    const trxAmount = amountUSD * (isFileFolder ? FILE_FOLDER_PRICING.trxPerUsd : FILE_FOLDER_PRICING.trxPerUsd)
    if (!Number.isFinite(amountUSD) || amountUSD <= 0) return NextResponse.json({ success: false, error: 'Valid payment amount required' }, { status: 400 })
    if (isFileFolder && !isValidFileFolderAmount(trxAmount)) return NextResponse.json({ success: false, error: `File Folder value must be at least ${FILE_FOLDER_PRICING.minimumTrx} TRX` }, { status: 400 })
    if (!email && !isFileFolder) return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 })
    if (!FLUTTERWAVE_SECRET_KEY) return NextResponse.json({ success: false, error: 'Flutterwave is not configured' }, { status: 500 })

    const reference = `SSB-${isFileFolder ? 'FOLDER' : (userId || 'USER').toString().substring(0, 8)}-${Date.now()}`
    const baseUrl = process.env.NEXTAUTH_URL || 'https://system-bridge-frontend-823579957639.us-central1.run.app'
    const redirectUrl = `${baseUrl}/api/deposit/callback?ref=${encodeURIComponent(reference)}&userId=${encodeURIComponent(userId || '')}&trx=${trxAmount}&type=${isFileFolder ? 'file_folder' : 'wallet'}`

    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref: reference, amount: amountUSD, currency: 'USD', payment_options: 'card,banktransfer,ussd,mobilemoney', redirect_url: redirectUrl,
        customer: { email: email || 'file-folder-purchase@ssbnow.shop', name: name || buyerName || 'File Folder Purchase', phonenumber: buyerPhone || '' },
        customizations: { title: 'SSBNOW.SHOP', description: `${trxAmount} TRX File Folder purchase`, logo: '' },
        meta: { userId: userId || null, fileNumber: fileNumber || null, trxAmount, type: isFileFolder ? 'file_folder_purchase' : 'wallet_deposit' },
      }),
    })
    const data = await response.json()
    if (data.status !== 'success') return NextResponse.json({ success: false, error: data.message || 'Failed to initialize payment' }, { status: 400 })

    const sql = getDb()
    if (isFileFolder) {
      await sql`CREATE TABLE IF NOT EXISTS file_folder_purchases (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),file_number varchar(120),client_id uuid,buyer_name varchar(255),buyer_email varchar(255),buyer_phone varchar(80),amount_trx numeric(30,8) NOT NULL,payment_method varchar(40) NOT NULL,payment_reference varchar(255) NOT NULL UNIQUE,status varchar(40) NOT NULL DEFAULT 'pending_flutterwave',created_at timestamptz NOT NULL DEFAULT NOW(),confirmed_at timestamptz,confirmed_by uuid)`
      await sql`INSERT INTO file_folder_purchases (file_number,client_id,buyer_name,buyer_email,buyer_phone,amount_trx,payment_method,payment_reference,status) VALUES (${fileNumber || null},${userId || null},${buyerName || name || null},${email || null},${buyerPhone || null},${trxAmount},'flutterwave',${reference},'pending_flutterwave') ON CONFLICT (payment_reference) DO NOTHING`
    } else {
      await sql`INSERT INTO pending_deposits (reference, user_id, amount_usd, amount_trx, status, created_at) VALUES (${reference}, ${userId}::uuid, ${amountUSD}, ${trxAmount}, 'pending', NOW()) ON CONFLICT DO NOTHING`.catch(() => {})
    }
    return NextResponse.json({ success: true, paymentLink: data.data.link, reference, trxAmount })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Payment initialization failed' }, { status: 500 })
  }
}
