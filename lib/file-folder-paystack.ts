import { sql } from '@/lib/db'
import { verifyPaystackTransaction, paystackTransactionMatches } from '@/lib/paystack'
import { notifyAdminOrder } from '@/lib/admin-order-notifications'

async function ensureFileFolderPaystackSchema() {
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS amount_ngn numeric(18,2)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz`
}

/** Verify a File Folder Paystack payment; Administration still approves the purchase. */
export async function settleFileFolderPaystackPurchase(reference: string) {
  await ensureFileFolderPaystackSchema()
  const rows = await sql`
    SELECT * FROM file_folder_purchases
    WHERE payment_method='paystack' AND payment_reference=${reference}
    LIMIT 1
  `
  const purchase = rows[0]
  if (!purchase) return { matched: false, settled: false }
  if (purchase.payment_verified_at && ['pending_admin_confirmation','confirmed'].includes(String(purchase.status))) {
    return { matched: true, settled: true, purchaseId: String(purchase.id), bridgeCode: purchase.bridge_code || null }
  }
  if (purchase.status !== 'pending_payment' || !purchase.amount_ngn) return { matched: true, settled: false, purchaseId: String(purchase.id), bridgeCode: purchase.bridge_code || null }
  const transaction = await verifyPaystackTransaction(reference)
  const expectedAmountKobo = Math.round(Number(purchase.amount_ngn) * 100)
  if (!paystackTransactionMatches({
    transaction,
    expectedReference: String(purchase.payment_reference),
    expectedAmountKobo,
    expectedEmail: purchase.buyer_email || undefined,
  })) throw new Error('Paystack transaction does not match the File Folder amount, currency, reference, or payer email.')
  const updated = await sql`
    UPDATE file_folder_purchases
    SET status='pending_admin_confirmation', payment_verified_at=NOW()
    WHERE id=${purchase.id}::uuid AND status='pending_payment' AND payment_reference=${reference} AND payment_verified_at IS NULL
    RETURNING id
  `
  if (updated[0]) {
    await notifyAdminOrder({
      orderId: String(purchase.id),
      event: 'placed',
      department: purchase.bridger_id ? 'bridger' : 'client',
      subject: 'File Folder Paystack payment verified',
      detail: `Paystack verified ₦${Number(purchase.amount_ngn).toLocaleString()} for ${purchase.file_folder_tier || 'File Folder'} purchase ${purchase.id}. Administration approval is still required before issuing the File Number.`,
      adminPath: '/admin/file-folder-sales-manager',
      actorId: purchase.bridger_id || purchase.client_id || null,
      actorName: 'WEAVE Paystack',
    })
  }
  return { matched: true, settled: Boolean(updated[0]), purchaseId: String(purchase.id), bridgeCode: purchase.bridge_code || null }
}
