
import Link from 'next/link'
import { Radio, TowerControl } from 'lucide-react'
import { ensureClientGrowthWorldSchema, getClientGrowthDb } from '@/lib/client-growth-world'

export const dynamic='force-dynamic'

export default async function PublicStreamNetwork(){
  const sql=getClientGrowthDb()
  await ensureClientGrowthWorldSchema(sql)
  const channels=await sql`
    SELECT
      c.public_slug,c.name,c.description,c.tagline,c.is_live,c.live_title,c.updated_at,
      EXISTS(
        SELECT 1 FROM client_built_systems s
        WHERE s.client_id=c.client_id
          AND s.file_number=c.file_number
          AND s.system_type='media_network'
          AND s.status='active'
      ) AS media_network_open,
      COALESCE((
        SELECT COUNT(*)::int FROM client_stream_programs p
        WHERE p.channel_id=c.id AND p.status IN ('scheduled','live','replay')
      ),0) AS program_count
    FROM client_stream_channels c
    WHERE c.enabled=true
      AND EXISTS(
        SELECT 1 FROM client_built_systems s
        WHERE s.client_id=c.client_id
          AND s.file_number=c.file_number
          AND s.system_type='streaming_gate'
          AND s.status='active'
      )
    ORDER BY c.is_live DESC,c.updated_at DESC
    LIMIT 120
  `

  return <main className="min-h-screen bg-[#02040a] text-white">
    <header className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(244,63,94,.18),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(139,92,246,.14),transparent_28%),linear-gradient(180deg,#100510,#030611)] px-5 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-7xl">
        <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-rose-300"><TowerControl className="h-4 w-4"/>WEAVE Stream Network</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.04em] sm:text-6xl">Public channels built inside Client File Folders.</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">A channel appears here only after its Client finishes Creator Booth, Broadcast Studio and Streaming Open Gate construction. Visitors do not need a WEAVE account.</p>
      </div>
    </header>
    <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      {channels.length===0?<div className="rounded-[2rem] border border-dashed border-white/10 p-12 text-center text-sm text-slate-500">The first public Streaming Gates are still under construction.</div>:<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {channels.map((channel:any)=><Link key={channel.public_slug} href={'/stream/'+channel.public_slug} className="group relative min-h-[280px] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(244,63,94,.12),transparent_38%),linear-gradient(155deg,#100914,#050610)] p-5 transition hover:-translate-y-1 hover:border-rose-200/20">
          <div className="flex items-start justify-between gap-3"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-rose-300">{channel.media_network_open?'Media Network':'Streaming Gate'}</p><span className={'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase '+(channel.is_live?'border-rose-300/20 bg-rose-400/10 text-rose-200':'border-white/10 text-slate-500')}><span className={'h-1.5 w-1.5 rounded-full '+(channel.is_live?'bg-rose-400':'bg-slate-600')}/>{channel.is_live?'Live':'Open'}</span></div>
          <div className="mt-8 flex h-24 items-center justify-center"><div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-rose-300/15 bg-rose-400/[0.05]"><Radio className="h-8 w-8 text-rose-300"/><span className="absolute inset-[-16px] rounded-full border border-violet-300/10"/></div></div>
          <h2 className="mt-6 text-2xl font-black">{channel.name}</h2>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{channel.description||channel.tagline}</p>
          <p className="mt-4 text-[9px] font-black uppercase tracking-wider text-slate-600">{channel.program_count} programs{channel.live_title?' · '+channel.live_title:''}</p>
        </Link>)}
      </div>}
    </section>
  </main>
}
