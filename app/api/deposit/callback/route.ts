import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'

const FLUTTERWAVE_SECRET_KEY = process.env.FLW_SECRET_KEY

function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('Database not configured')
  return neon(url)
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://system-bridge-frontend-823579957639.us-central1.run.app'
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('ref')
    const userId = searchParams.get('userId')
    const trxAmount = parseFloat(searchParams.get('trx') || '0')
    const transactionId = searchParams.get('transaction_id')
    const status = searchParams.get('status')
    const type = searchParams.get('type') || 'wallet'

    if (!reference || !trxAmount) return NextResponse.redirect(`${baseUrl}/system-switch?error=invalid_payment_params`)
    if (status !== 'successful' && status !== 'completed') return NextResponse.redirect(`${baseUrl}/system-switch?error=payment_failed`)
    if (!FLUTTERWAVE_SECRET_KEY || !transactionId) return NextResponse.redirect(`${baseUrl}/system-switch?error=verification_unavailable`)

    const verifyResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, { headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}` } })
    const verifyData = await verifyResponse.json()
    if (verifyData.status !== 'success' || verifyData.data?.status !== 'successful' || verifyData.data?.tx_ref !== reference) {
      return NextResponse.redirect(`${baseUrl}/system-switch?error=verification_failed`)
    }

    const sql = getDb()
    if (type === 'file_folder') {
      const [purchase] = await sql`SELECT * FROM file_folder_purchases WHERE payment_reference=${reference} LIMIT 1`
      if (!purchase) return NextResponse.redirect(`${baseUrl}/system-switch?error=purchase_not_found`)
      if (purchase.status === 'confirmed' || purchase.status === 'paid_pending_folder') return NextResponse.redirect(`${baseUrl}/system-switch?success=file_folder_payment_recorded&reference=${encodeURIComponent(reference)}`)

      const meta = verifyData.data?.meta || {}
      const fileNumber = purchase.file_number || meta.fileNumber || null
      const clientId = purchase.client_id || userId || null
      if (fileNumber && clientId) {
        const [folder] = await sql`SELECT * FROM client_file_folders WHERE file_number=${fileNumber} LIMIT 1`
        if (folder && (!folder.client_id || folder.client_id === clientId)) {
          await sql`UPDATE client_file_folders SET client_id=${clientId}::uuid,status='active',claimed_at=COALESCE(claimed_at,NOW()),updated_at=NOW() WHERE file_number=${fileNumber}`
          await sql`UPDATE file_folder_purchases SET status='confirmed',client_id=${clientId}::uuid,file_number=${fileNumber},confirmed_at=NOW() WHERE id=${purchase.id}::uuid`
          return NextResponse.redirect(`${baseUrl}/system-switch?success=file_folder_active&reference=${encodeURIComponent(reference)}`)
        }
      }
      await sql`UPDATE file_folder_purchases SET status='paid_pending_folder',confirmed_at=NOW() WHERE id=${purchase.id}::uuid`
      return NextResponse.redirect(`${baseUrl}/system-switch?success=file_folder_payment_recorded&reference=${encodeURIComponent(reference)}`)
    }

    if (!userId) return NextResponse.redirect(`${baseUrl}/wallet/deposit-withdraw?error=invalid_user`)
    await sql`UPDATE wallets SET balance_trx = balance_trx + ${trxAmount} WHERE user_id = ${userId}::uuid`
    await sql`INSERT INTO wallet_transactions (user_id, type, amount, reference, status, created_at) VALUES (${userId}::uuid, 'deposit', ${trxAmount}, ${reference}, 'completed', NOW())`.catch(() => {})
    return NextResponse.redirect(`${baseUrl}/wallet/deposit-withdraw?success=true&amount=${trxAmount}`)
  } catch (error: any) {
    return NextResponse.redirect(`${baseUrl}/system-switch?error=processing_failed`)
  }
}
