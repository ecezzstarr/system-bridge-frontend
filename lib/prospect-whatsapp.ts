import { neon } from '@/lib/pg-neon'

export type WhatsAppStatus = 'verified' | 'not_on_whatsapp' | 'pending' | 'failed'

/**
 * Provider-neutral WhatsApp eligibility layer.
 *
 * The Prospect Engine must never infer WhatsApp presence from phone-number
 * formatting. A real provider must supply the verification result through
 * verifyWhatsAppNumber(). Until a provider is configured, numbers remain
 * pending and are not marketplace-eligible.
 */
export async function ensureProspectWhatsAppSchema() {
  const sql = neon()
  await sql`
    ALTER TABLE prospects
      ADD COLUMN IF NOT EXISTS whatsapp_status varchar(32) NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS whatsapp_checked_at timestamptz,
      ADD COLUMN IF NOT EXISTS whatsapp_check_reference varchar(255),
      ADD COLUMN IF NOT EXISTS whatsapp_check_error text
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_prospects_whatsapp_status
    ON prospects(whatsapp_status)
  `
}

export function normalizePhoneNumber(value: string) {
  return value.replace(/[^0-9+]/g, '').replace(/^00/, '+')
}

/**
 * Provider adapter boundary. Do not mark a number verified without an actual
 * WhatsApp-capable provider response.
 */
export async function verifyWhatsAppNumber(phone: string): Promise<{
  status: WhatsAppStatus
  reference?: string
  error?: string
}> {
  const provider = process.env.WHATSAPP_VERIFICATION_PROVIDER

  if (!provider) {
    return {
      status: 'pending',
      error: 'WhatsApp verification provider is not configured.',
    }
  }

  // Keep provider-specific credentials/API calls outside the Prospect Engine.
  // This branch is deliberately conservative until the configured provider's
  // actual API contract is supplied.
  return {
    status: 'failed',
    error: `Unsupported WhatsApp verification provider: ${provider}`,
  }
}

export async function verifyAndStoreProspectWhatsApp(prospectId: string, phone: string) {
  const sql = neon()
  const normalized = normalizePhoneNumber(phone)
  const result = await verifyWhatsAppNumber(normalized)

  await sql`
    UPDATE prospects
    SET
      phone = ${normalized},
      whatsapp_status = ${result.status},
      whatsapp_checked_at = NOW(),
      whatsapp_check_reference = ${result.reference || null},
      whatsapp_check_error = ${result.error || null}
    WHERE id = ${prospectId}::uuid
  `

  return result
}

export function isMarketplaceEligibleWhatsApp(status: WhatsAppStatus) {
  return status === 'verified'
}
