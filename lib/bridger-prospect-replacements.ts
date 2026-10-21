import type { PoolClient } from 'pg'

/**
 * A "Not on WhatsApp" report may issue ONE unused replacement candidate.
 * Limit counts *issued* candidates, not taps, and resets at midnight in Lagos.
 * Use within the same transaction as the assignment, after locking the Bridger.
 */
export const DAILY_WHATSAPP_REPLACEMENT_LIMIT = 10

export async function getDailyWhatsAppReplacementCount(
  client: Pick<PoolClient, 'query'>,
  bridgerId: string,
): Promise<number> {
  const result = await client.query(
    `SELECT COUNT(*)::int AS used
     FROM market_prospect_audit
     WHERE actor_id = $1::uuid
       AND action = 'whatsapp_replacement_issued'
       AND (created_at AT TIME ZONE 'Africa/Lagos')::date =
           (NOW() AT TIME ZONE 'Africa/Lagos')::date`,
    [bridgerId],
  )
  return Number(result.rows[0]?.used || 0)
}
