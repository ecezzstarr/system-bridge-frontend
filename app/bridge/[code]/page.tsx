import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import { ensureFlameSchema } from '@/lib/flame-schema'
import LegacyBridgePage from '@/components/legacy-bridge-page'
export const dynamic = 'force-dynamic'
export default async function BridgePage({params}:{params:Promise<{code:string}>}) {
 const {code}=await params
 await ensureFlameSchema()
 const [crossing]=await sql`SELECT code FROM chatgpt_bridge_sessions WHERE code=${code} AND expires_at>NOW() LIMIT 1`
 if(crossing) {
  await sql`UPDATE chatgpt_bridge_sessions SET opened_at=COALESCE(opened_at,NOW()) WHERE code=${code}`
  redirect(`/system-switch?bridge=${encodeURIComponent(code)}`)
 }
 return <LegacyBridgePage />
}
