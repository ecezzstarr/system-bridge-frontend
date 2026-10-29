import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const PAYSTACK_API = 'https://api.paystack.co'
export type PaystackInitializeInput = { email: string; amountKobo: number; reference?: string; callbackUrl: string; metadata: Record<string, unknown> }
export type PaystackTransaction = { status: string; reference: string; amount: number; currency: string; metadata?: unknown; customer?: { email?: string }; channel?: string; paid_at?: string | null }

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim()
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not configured')
  return key
}

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
    headers: { Authorization: 'Bearer ' + secretKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: input.email, amount: input.amountKobo, currency: 'NGN', reference, callback_url: input.callbackUrl, metadata: input.metadata }),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.status !== true || !payload?.data?.authorization_url || payload?.data?.reference !== reference) throw new Error('Paystack could not initialize this payment')
  return { reference, authorizationUrl: String(payload.data.authorization_url), accessCode: String(payload.data.access_code || '') }
}

export async function verifyPaystackTransaction(reference: string): Promise<PaystackTransaction> {
  if (!/^[a-zA-Z0-9.=-]{1,100}$/.test(reference)) throw new Error('Invalid Paystack reference')
  const response = await fetch(PAYSTACK_API + '/transaction/verify/' + encodeURIComponent(reference), { headers: { Authorization: 'Bearer ' + secretKey() }, cache: 'no-store' })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.status !== true || !payload?.data) throw new Error('Paystack transaction verification failed')
  return payload.data as PaystackTransaction
}

export function verifyPaystackWebhookSignature(rawBody: string | Buffer, signature: string | null) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!signature || !secret || !/^[a-f0-9]{128}$/i.test(signature)) return false
  const expected = createHmac('sha512', secret).update(rawBody).digest()
  const received = Buffer.from(signature, 'hex')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export function paystackTransactionMatches(input: { transaction: PaystackTransaction; expectedReference: string; expectedAmountKobo: number; expectedEmail?: string }) {
  const tx = input.transaction
  return tx.status === 'success' && tx.reference === input.expectedReference && tx.currency === 'NGN' && Number.isSafeInteger(tx.amount) && tx.amount === input.expectedAmountKobo && (!input.expectedEmail || tx.customer?.email?.toLowerCase() === input.expectedEmail.toLowerCase())
}