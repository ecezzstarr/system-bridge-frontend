
import Link from 'next/link'
import { Building2, Crown } from 'lucide-react'
import { ensureEnterpriseDreamSchema, getEnterpriseDreamDb } from '@/lib/enterprise-dream'
import { ensureClientGrowthWorldSchema } from '@/lib/client-growth-world'

export const dynamic='force-dynamic'

export default async function PublicEnterpriseTerritory(){
  const sql=getEnterpriseDreamDb()
  await ensureEnterpriseDreamSchema(sql)
  await ensureClientGrowthWorldSchema(sql)
  const enterprises=await sql`
    SELECT
      a.public_slug,a.enterprise_name,a.sector,a.requested_position,a.reviewed_at,
      u.name AS client_name,
      COALESCE((SELECT COUNT(*)::int FROM enterprise_legions l WHERE l.client_id=a.client_id AND l.active=true),0) AS legion_count,
      COALESCE((SELECT COUNT(*)::int FROM client_built_systems s WHERE s.client_id=a.client_id AND s.status='active'),0) AS system_count,
      EXISTS(
        SELECT 1 FROM client_built_systems s
        WHERE s.client_id=a.client_id
          AND s.system_type='enterprise_hall'
          AND s.status='active'
      ) AS hall_open
    FROM enterprise_applications a
    JOIN users u ON u.id=a.client_id
    WHERE a.status='approved'
      AND a.public_slug IS NOT NULL
      AND EXISTS(
        SELECT 1 FROM client_built_systems s
        WHERE s.client_id=a.client_id
          AND s.system_type='enterprise_door'
          AND s.status='active'
      )
    ORDER BY a.reviewed_at DESC NULLS LAST,a.updated_at DESC
    LIMIT 120
  `

  return <main className="min-h-screen bg-[#03050a] text-white">
    <header className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(245,158,11,.2),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(56,189,248,.1),transparent_30%),linear-gradient(180deg,#151005,#03050a)] px-5 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-7xl">
        <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-amber-300"><Crown className="h-4 w-4"/>WEAVE Enterprise Territory</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.04em] sm:text-6xl">Public enterprises that earned and constructed their door.</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">Only Administration-approved Lord/Lady enterprises with a completed Enterprise Door appear here. The territory grows as additional enterprise structures become real.</p>
      </div>
    </header>
    <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      {enterprises.length===0?<div className="rounded-[2rem] border border-dashed border-white/10 p-12 text-center text-sm text-slate-500">Approved enterprises are still constructing their first public doors.</div>:<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {enterprises.map((enterprise:any)=><Link key={enterprise.public_slug} href={'/enterprise/'+enterprise.public_slug} className="group relative min-h-[300px] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,.11),transparent_40%),linear-gradient(155deg,#151005,#06070b)] p-5 transition hover:-translate-y-1 hover:border-amber-200/20">
          <div className="flex items-start justify-between gap-3"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-300">{enterprise.requested_position} · {enterprise.sector}</p><span className="rounded-full border border-white/10 px-2.5 py-1 text-[8px] font-black uppercase text-slate-500">{enterprise.hall_open?'Enterprise Hall':'Enterprise Door'}</span></div>
          <div className="mt-8 flex h-24 items-center justify-center"><div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-400/[0.05]"><Building2 className="h-8 w-8 text-amber-300"/><span className="absolute -bottom-4 left-1/2 h-8 w-24 -translate-x-1/2 [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)] bg-gradient-to-b from-amber-200/10 to-transparent"/></div></div>
          <h2 className="mt-6 text-2xl font-black">{enterprise.enterprise_name}</h2>
          <p className="mt-2 text-xs text-slate-500">{enterprise.client_name}</p>
          <p className="mt-4 text-[9px] font-black uppercase tracking-wider text-slate-600">{enterprise.system_count} systems · {enterprise.legion_count} Legions</p>
        </Link>)}
      </div>}
    </section>
  </main>
}
