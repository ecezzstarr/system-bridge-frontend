import { sql } from '@/lib/db'
import { ensureFlameSchema } from '@/lib/flame-schema'
import LegacyBridgePage from '@/components/legacy-bridge-page'
import ChatGptBridgeArrival from '@/components/bridge/chatgpt-bridge-arrival'

export const dynamic = 'force-dynamic'

export default async function BridgePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  await ensureFlameSchema()

  const [crossing] = await sql`
    SELECT
      code,
      message,
      topic,
      context,
      flame_name,
      flame_presence,
      crossing_state,
      provider_key,
      provider_name
    FROM chatgpt_bridge_sessions
    WHERE code=${code}
      AND expires_at>NOW()
    LIMIT 1
  `

  if (crossing) {
    await sql`
      UPDATE chatgpt_bridge_sessions
      SET opened_at=COALESCE(opened_at,NOW())
      WHERE code=${code}
    `

    return (
      <ChatGptBridgeArrival
        code={code}
        crossing={{
          message: String(crossing.message || ''),
          topic: String(crossing.topic || 'interaction'),
          context: crossing.context || null,
          flame_name: crossing.flame_name || null,
          flame_presence: crossing.flame_presence || null,
          crossing_state: crossing.crossing_state || null,
          provider_key: crossing.provider_key || null,
          provider_name: crossing.provider_name || null,
        }}
      />
    )
  }

  return <LegacyBridgePage />
}
