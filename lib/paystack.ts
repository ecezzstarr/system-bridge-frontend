import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { getPaystackSecretKey, getPaystackWebhookSigningSecret } from '@/lib/paystack-config'

const PAYSTACK_API = 'https://api.paystack.co'
export type PaystackInitializeInput = { email: string; amountKobo: number; reference?: string; callbackUrl: string; metadata: Record<string, unknown> }
export type PaystackTransaction = { status: string; reference: string; amount: number; currency: string; metadata?: unknown; customer?: { email?: string }; channel?: string; paid_at?: string | null }

async function secretKey() { return getPaystackSecretKey() }

export function createPaystackReference(prefix = 'WEAVE') {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9.-]/g, '').slice(0, 18) || 'WEAVE'
  return safePrefix + '-' + Date.now().toString(36) + '-' + randomBytes(12).toString('hex')
}

export async function initializePaystackTransaction(input: PaystackInitializeInput) {
  if (!/^\S+@\S+\.\S+$/.test(input.email)) throw new Error('A valid payer email is required')
  if (!Number.isSafeInteger(input.amountKobo) || input.amountKobo < 100) throw new Error('Paystack NGN amount must be a positive integer in kobo')
  if (!input.callbackUrl.startsWith('https://')) throw new Error('Paystack callback URL must use HTTPS')
  const reference = input.reference || createPaystackReference()
  const response = await fetch(PAYSTACK_API + '/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + await secretKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: input.email, amount: input.amountKobo, currency: 'NGN', reference, callback_url: input.callbackUrl, metadata: input.metadata }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.status !== true || !payload?.data?.authorization_url || payload?.data?.reference !== reference) throw new Error('Paystack could not initialize this payment')
  return { reference, authorizationUrl: String(payload.data.authorization_url), accessCode: String(payload.data.access_code || '') }
}

export async function verifyPaystackTransaction(reference: string): Promise<PaystackTransaction> {
  if (!/^[a-zA-Z0-9.=-]{1,100}$/.test(reference)) throw new Error('Invalid Paystack reference')
  const response = await fetch(PAYSTACK_API + '/transaction/verify/' + encodeURIComponent(reference), { headers: { Authorization: 'Bearer ' + await secretKey() }, cache: 'no-store', signal: AbortSignal.timeout(10000) })
  const payload = await response.json().catch(() => null)
  if (response.status === 404) throw new Error('Reference not found in the configured Paystack merchant account. Verify the original merchant and live/test mode.')
  if (!response.ok || payload?.status !== true || !payload?.data) throw new Error('Paystack verification unavailable. Check merchant account credentials and retry.')
  return payload.data as PaystackTransaction
}

/**
 * Verify the current timestamped Paystack-Signature header using whsec_,
 * or the legacy x-paystack-signature HMAC for accounts not migrated yet.
 * Never downgrade a present but invalid modern header to the legacy path.
 */
export async function verifyPaystackWebhookSignature(
  rawBody: string | Buffer, legacySignature: string | null, modernHeader?: string | null,
) {
  if (modernHeader) {
    let secret: string
    try { secret = await getPaystackWebhookSigningSecret() } catch { return false }
    if (!secret.startsWith('whsec_')) return false
    const fields = modernHeader.split(',').map(part => part.trim())
    const timestampField = fields.find(part => part.startsWith('t='))
    const timestamp = timestampField?.slice(2) || ''
    if (!/^\\d{10}$/.test(timestamp)) return false
    const seconds = Number(timestamp)
    if (!Number.isSafeInteger(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false
    const expected = createHmac('sha512', secret)
      .update(timestamp).update('.').update(rawBody).digest()
    const signatures = fields.filter(part => part.startsWith('v1='))
    for (const candidate of signatures) {
      const pair = candidate.slice(3)
      const colon = pair.indexOf(':')
      if (colon < 1 || !/^whk_[A-Za-z0-9_-]+$/.test(pair.slice(0, colon))) continue
      const hex = pair.slice(colon + 1)
      if (!/^[a-f0-9]{128}$/i.test(hex)) continue
      if (timingSafeEqual(expected, Buffer.from(hex, 'hex'))) return true
    }
    return false
  }
  if (!legacySignature || !/^[a-f0-9]{128}$/i.test(legacySignature)) return false
  let secret: string
  try { secret = await getPaystackSecretKey() } catch { return false }
  const expected = createHmac('sha512', secret).update(rawBody).digest()
  const received = Buffer.from(legacySignature, 'hex')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export type PaystackMatchInput = {
  transaction: PaystackTransaction
  expectedReference: string
  expectedAmountKobo: number
  expectedEmail?: string
  expectedDepositId?: string
  expectedUserId?: string
}

/** Confirm amount, reference, currency and the original checkout's identity. */
export function paystackMismatchReason(input: PaystackMatchInput): string | null {
  const tx = input.transaction
  if (tx.status !== 'success') return 'Paystack has not confirmed a successful charge.'
  if (tx.reference !== input.expectedReference) return 'Paystack returned a different reference.'
  if (tx.currency !== 'NGN') return 'Paystack returned a different currency.'
  if (!Number.isSafeInteger(tx.amount) || tx.amount !== input.expectedAmountKobo) {
    return 'The amount Paystack received does not match the recorded checkout.'
  }
  const meta = tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
    ? tx.metadata as Record<string, unknown> : null
  // The checkout stores original user+deposit IDs in provider metadata.
  // This is stronger than comparing against a possibly changed account email.
  if (input.expectedDepositId && input.expectedUserId && meta &&
      (meta.deposit_id !== undefined || meta.user_id !== undefined)) {
    if (String(meta.deposit_id || '').toLowerCase() !== input.expectedDepositId.toLowerCase() ||
        String(meta.user_id || '').toLowerCase() !== input.expectedUserId.toLowerCase()) {
      return 'Paystack checkout identity does not match the Weave deposit.'
    }
    return null
  }
  if (input.expectedEmail && tx.customer?.email?.toLowerCase() !== input.expectedEmail.toLowerCase()) {
    return 'Legacy payer email differs from the current Weave account. Review the original checkout evidence.'
  }
  return null
}

export function paystackTransactionMatches(input: PaystackMatchInput) {
  const tx = input.transaction
  return tx.status === 'success' && paystackMismatchReason(input) === null
}
