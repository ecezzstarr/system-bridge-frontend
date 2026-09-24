import { sql } from '@/lib/db'

/**
 * Resolve the human Bridger supporting a Client player.
 * Player identity must never be passed directly into Bridger commission logic.
 */
export async function resolveBridgerForClient(clientId: string): Promise<string | null> {
  const users = await sql`
    SELECT COALESCE(referred_by_bridger_id, referred_by) AS bridger_id
    FROM users
    WHERE id = ${clientId}::uuid AND role = 'client'
    LIMIT 1
  `

  if (users[0]?.bridger_id) return users[0].bridger_id

  const clients = await sql`
    SELECT COALESCE(assigned_bridger_id, referred_by) AS bridger_id
    FROM clients
    WHERE id = ${clientId}::uuid
    LIMIT 1
  `

  return clients[0]?.bridger_id ?? null
}
