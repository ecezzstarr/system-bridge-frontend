import { neon } from '@/lib/pg-neon'

export type Channel = 'whatsapp' | 'sms'
export type NumberStatus = 'provisioning' | 'active' | 'suspended' | 'released'

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

/**
 * Provider adapter. The database is the durable system record; an external
 * telecom/WhatsApp provider performs the actual delivery and inbound webhooking.
 * No fake delivery is reported when provider credentials are absent.
 */
async function providerRequest(path: string, init: RequestInit = {}) {
  const base = process.env.WEAVE_MESSAGING_BASE_URL
  const token = process.env.WEAVE_MESSAGING_TOKEN
  if (!base || !token) {
    throw new Error('Weave messaging provider is not configured')
  }
  const response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error || `Messaging provider returned ${response.status}`)
  return data
}

export async function getBridgerNumber(bridgerId: string) {
  const sql = getDb()
  const rows = await sql`
    SELECT * FROM weave_numbers
    WHERE bridger_id = ${bridgerId}::uuid AND status <> 'released'
    ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC
    LIMIT 1
  `
  return rows[0] || null
}

export async function getBridgerConversations(numberId: string) {
  const sql = getDb()
  return sql`
    SELECT c.*, COALESCE(c.prospect_phone, '') AS phone,
      (SELECT body FROM weave_number_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_body
    FROM weave_number_conversations c
    WHERE c.number_id = ${numberId}::uuid
    ORDER BY c.last_message_at DESC
    LIMIT 200
  `
}

export async function getConversationMessages(conversationId: string) {
  const sql = getDb()
  return sql`
    SELECT * FROM weave_number_messages
    WHERE conversation_id = ${conversationId}::uuid
    ORDER BY created_at ASC
    LIMIT 500
  `
}

export async function sendMessage(args: {
  numberId: string
  bridgerId: string
  to: string
  channel: Channel
  body: string
  prospectId?: string
}) {
  const sql = getDb()
  const numbers = await sql`
    SELECT * FROM weave_numbers
    WHERE id = ${args.numberId}::uuid AND bridger_id = ${args.bridgerId}::uuid AND status = 'active'
    LIMIT 1
  `
  const number = numbers[0]
  if (!number) throw new Error('Active Weave number not found')
  if (args.channel === 'whatsapp' && number.whatsapp_status !== 'active') throw new Error('WhatsApp is not active for this number')
  if (args.channel === 'sms' && number.sms_status !== 'active') throw new Error('SMS is not active for this number')
  if (!args.body.trim()) throw new Error('Message body is required')

  const provider = await providerRequest('/messages', {
    method: 'POST',
    body: JSON.stringify({
      channel: args.channel,
      from: number.phone_number,
      to: args.to,
      body: args.body,
      metadata: { bridgerId: args.bridgerId, prospectId: args.prospectId },
    }),
  })

  const conversationRows = await sql`
    INSERT INTO weave_number_conversations (number_id, prospect_phone, prospect_id, channel, last_message_at)
    VALUES (${number.id}::uuid, ${args.to}, ${args.prospectId || null}::uuid, ${args.channel}, NOW())
    ON CONFLICT (number_id, prospect_phone, channel)
    DO UPDATE SET last_message_at = NOW(), prospect_id = COALESCE(EXCLUDED.prospect_id, weave_number_conversations.prospect_id)
    RETURNING id
  `

  const message = await sql`
    INSERT INTO weave_number_messages
      (number_id, conversation_id, channel, direction, from_phone, to_phone, body, provider_message_id, status, metadata)
    VALUES
      (${number.id}::uuid, ${conversationRows[0].id}::uuid, ${args.channel}, 'outbound', ${number.phone_number}, ${args.to}, ${args.body}, ${provider?.id || provider?.message_id || null}, ${provider?.status || 'sent'}, ${JSON.stringify(provider)})
    RETURNING *
  `

  await sql`UPDATE weave_numbers SET last_used_at = NOW(), updated_at = NOW() WHERE id = ${number.id}::uuid`
  return message[0]
}

export async function handleInboundMessage(payload: {
  providerNumberId?: string
  to: string
  from: string
  channel: Channel
  body?: string
  providerMessageId?: string
  metadata?: Record<string, unknown>
}) {
  const sql = getDb()
  const numbers = await sql`
    SELECT * FROM weave_numbers
    WHERE (provider_number_id = ${payload.providerNumberId || null} AND ${payload.providerNumberId || null} IS NOT NULL)
       OR phone_number = ${payload.to}
    LIMIT 1
  `
  const number = numbers[0]
  if (!number) throw new Error('Inbound message number is not registered with Weave')

  const conversations = await sql`
    INSERT INTO weave_number_conversations (number_id, prospect_phone, channel, last_message_at)
    VALUES (${number.id}::uuid, ${payload.from}, ${payload.channel}, NOW())
    ON CONFLICT (number_id, prospect_phone, channel)
    DO UPDATE SET last_message_at = NOW()
    RETURNING id
  `

  const message = await sql`
    INSERT INTO weave_number_messages
      (number_id, conversation_id, channel, direction, from_phone, to_phone, body, provider_message_id, status, metadata)
    VALUES
      (${number.id}::uuid, ${conversations[0].id}::uuid, ${payload.channel}, 'inbound', ${payload.from}, ${payload.to}, ${payload.body || ''}, ${payload.providerMessageId || null}, 'received', ${JSON.stringify(payload.metadata || {})})
    ON CONFLICT DO NOTHING
    RETURNING *
  `

  return message[0] || null
}

export { providerRequest }
