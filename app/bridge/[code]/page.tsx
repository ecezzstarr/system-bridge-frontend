import Link from 'next/link'
import { notFound } from 'next/navigation'
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
    SELECT code, topic, created_at, expires_at
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

  const topic = String(rows[0].topic || 'interaction')

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
      <section className="w-full max-w-xl rounded-2xl border border-white/15 bg-white/[0.04] p-8 shadow-2xl">
        <div className="text-xs uppercase tracking-[0.3em] text-white/50">Weave of Presence</div>
        <h1 className="mt-4 text-3xl font-semibold">Bridge AI</h1>
        <p className="mt-3 text-white/70 leading-7">
          A Bridge AI crossing has been opened from ChatGPT for this movement.
        </p>
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-widest text-white/40">Recognized movement</div>
          <div className="mt-2 capitalize text-lg">{topic.replace('_', ' ')}</div>
        </div>
        <p className="mt-6 text-sm text-white/60 leading-6">
          Continue into Weave when you are ready. The Bridge carries this crossing into the Weave space.
        </p>
        <Link
          href={`/system-switch?bridge=${encodeURIComponent(code)}`}
          className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-white px-5 py-3 font-medium text-black transition hover:bg-white/90"
        >
          Continue into Weave
        </Link>
      </section>
    </main>
  )
}
