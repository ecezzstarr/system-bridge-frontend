import { notFound, redirect } from 'next/navigation'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'

function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('Database not configured')
  return neon(url)
}

export default async function BridgePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const sql = getDb()
  const rows = await sql`
    SELECT code
    FROM chatgpt_bridge_sessions
    WHERE code = ${code}
      AND expires_at > now()
    LIMIT 1
  `

  if (!rows.length) notFound()

  await sql`
    UPDATE chatgpt_bridge_sessions
    SET opened_at = COALESCE(opened_at, now())
    WHERE code = ${code}
  `

  redirect(`/system-switch?bridge=${encodeURIComponent(code)}`)
}
