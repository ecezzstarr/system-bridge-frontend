import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { FILE_FOLDER_PRICING } from '@/lib/file-folder-pricing'

const FLUTTERWAVE_SECRET_KEY = process.env.FLW_SECRET_KEY
function getDb() { const url = process.env.DATABASE_URL || process.env.POSTGRES_URL; if (!url) throw new Error('Database not configured'); return neon(url) }

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://system-bridge-frontend-823579957639.us-central1.run.app'
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('ref')
    const transactionId = searchParams.get('transaction_id')
    const status = searchParams.get('status')
    const type = searchParams.get('type') || 'wallet'
    if (!reference) return NextResponse.redirect(`${baseUrl}/system-switch?error=invalid_payment_params`)
    if (status !== 'successful' && status !== 'completed') return NextResponse.redirect(`${baseUrl}/system-switch?error=payment_failed`)
    if (!FLUTTERWAVE_SECRET_KEY || !transactionId) return NextResponse.redirect(`${baseUrl}/system-switch?error=verification_unavailable`)

    const verifyResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, { headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}` } })
    const verifyData = await verifyResponse.json()
    if (verifyData.status !== 'success' || verifyData.data?.status !== 'successful' || verifyData.data?.tx_ref !== reference) return NextResponse.redirect(`${baseUrl}/system-switch?error=verification_failed`)

    const sql = getDb()
    if (type === 'file_folder') {
      const [purchase] = await sql`SELECT * FROM file_folder_purchases WHERE payment_reference=${reference} LIMIT 1`
      if (!purchase) return NextResponse.redirect(`${baseUrl}/system-switch?error=purchase_not_found`)
      if (purchase.status === 'folder_issued' || purchase.status === 'confirmed') return NextResponse.redirect(`${baseUrl}/system-switch?success=file_folder_payment_recorded&reference=${encodeURIComponent(reference)}`)
      const paidTrx = Number(purchase.amount_trx)
      const verifiedUsd = Number(verifyData.data?.amount || 0)
      if (!Number.isFinite(verifiedUsd) || Math.abs(verifiedUsd * FILE_FOLDER_PRICING.trxPerUsd - paidTrx) > 0.000001) return NextResponse.redirect(`${baseUrl}/system-switch?error=payment_amount_mismatch`)
      const fileNumber = purchase.file_number || verifyData.data?.meta?.fileNumber || null
      const clientId = purchase.client_id || null
      if (fileNumber && clientId) {
        const [folder] = await sql`SELECT * FROM client_file_folders WHERE file_number=${fileNumber} LIMIT 1`
        if (folder && (!folder.client_id || String(folder.client_id) === String(clientId))) {
          await sql`UPDATE client_file_folders SET client_id=${clientId}::uuid,status='active',claimed_at=COALESCE(claimed_at,NOW()),updated_at=NOW() WHERE file_number=${fileNumber}`
          await sql`UPDATE file_folder_purchases SET status='confirmed',client_id=${clientId}::uuid,file_number=${fileNumber},confirmed_at=NOW() WHERE id=${purchase.id}::uuid`
          return NextResponse.redirect(`${baseUrl}/system-switch?success=file_folder_active&reference=${encodeURIComponent(reference)}`)
        }
      }
      await sql`UPDATE file_folder_purchases SET status='paid_pending_folder',confirmed_at=NOW() WHERE id=${purchase.id}::uuid`
      return NextResponse.redirect(`${baseUrl}/system-switch?success=file_folder_payment_recorded&reference=${encodeURIComponent(reference)}`)
    }

    const [pending] = await sql`UPDATE pending_deposits SET status='completed',completed_at=NOW() WHERE reference=${reference} AND status='pending' RETURNING user_id,amount_trx`
    if (!pending?.user_id) return NextResponse.redirect(`${baseUrl}/wallet/deposit-withdraw?error=deposit_not_pending`)
    const amount = Number(pending.amount_trx)
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.redirect(`${baseUrl}/wallet/deposit-withdraw?error=invalid_deposit_amount`)
    await sql`UPDATE wallets SET balance_trx=balance_trx+${amount},updated_at=NOW() WHERE user_id=${pending.user_id}::uuid`
    await sql`INSERT INTO wallet_transactions (user_id,type,amount,reference,status,created_at) VALUES (${pending.user_id}::uuid,'deposit',${amount},${reference},'completed',NOW())`.catch(() => {})
    return NextResponse.redirect(`${baseUrl}/wallet/deposit-withdraw?success=true&amount=${amount}`)
  } catch {
    return NextResponse.redirect(`${baseUrl}/system-switch?error=processing_failed`)
  }
}
