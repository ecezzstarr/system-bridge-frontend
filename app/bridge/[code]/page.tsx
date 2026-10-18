import { sql } from '@/lib/db'
import { ensureFlameSchema } from '@/lib/flame-schema'
import LegacyBridgePage from '@/components/legacy-bridge-page'
import ChatGptBridgeArrival from '@/components/bridge/chatgpt-bridge-arrival'
import BridgerBridgeRadianceArrival from '@/components/bridge/bridger-bridge-radiance-arrival'

export const dynamic = 'force-dynamic'

export default async function BridgePage({
  params,searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams?: Promise<{chat?:string}>
}) {
  const { code } = await params
  const query=await searchParams

  // Bridger Bridge AI links own /bridge/:code too. Resolve them first so a
  // visitor can enter System Switch — Bridge of Radiance without depending on
  // the separate ChatGPT/Flame bridge schema being available.
  try {
    const [bridgerBridge] = await sql`
      SELECT b.id,b.custom_welcome_message,u.name AS bridger_name
      FROM bridge_ais b
      JOIN users u ON u.id=b.bridger_id
      WHERE b.bridge_code=${code}
        AND b.status='active'
        AND u.role='bridger'
        AND u.is_active=true
      LIMIT 1
    `

    if (bridgerBridge) {
      if(query?.chat==='1') return <LegacyBridgePage/>
      return <BridgerBridgeRadianceArrival
        code={code}
        bridgerName={String(bridgerBridge.bridger_name||'My Bridger')}
        welcomeMessage={bridgerBridge.custom_welcome_message||null}
      />
    }
  } catch (error) {
    console.error('[bridge page] Bridger Bridge AI lookup failed:', error)
  }

  // ChatGPT bridge arrivals are a separate crossing mechanism. Keep failures
  // here isolated so they cannot prevent a normal Bridger visitor link from
  // rendering its public System Switch environment.
  try {
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
  } catch (error) {
    console.error('[bridge page] ChatGPT bridge lookup failed:', error)
  }

  return <LegacyBridgePage />
}
