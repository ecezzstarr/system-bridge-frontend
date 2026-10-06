import Link from 'next/link'
import { ArrowRight, Boxes, Download, ExternalLink, ShieldCheck, Store } from 'lucide-react'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { ensureWeaveSystemStoreSchema } from '@/lib/weave-system-store'
import { getWeaveFirstPartyVersion, WEAVE_FIRST_PARTY_SYSTEM } from '@/lib/weave-first-party-system'

export const dynamic='force-dynamic'

export default async function WeaveSystemStorePage(){
  const sql=getFileFolderDb()
  await ensureWeaveSystemStoreSchema(sql)
  const systems=await sql`
    SELECT p.public_slug,p.weave_system_id,p.system_name,p.summary,p.category,p.icon_url,p.price,p.currency,
      p.download_count,p.open_count,p.approved_at,v.version_name,v.package_type,v.entry_url,v.storage_object,v.package_url,
      u.name AS publisher_name,u.business_name AS publisher_business
    FROM weave_system_store_publications p
    JOIN weave_system_store_versions v ON v.id=p.current_version_id
    JOIN users u ON u.id=p.client_id
    WHERE p.status='approved' AND v.review_status='approved'
    ORDER BY p.approved_at DESC NULLS LAST,p.created_at DESC
    LIMIT 240
  `
  const weaveVersion=getWeaveFirstPartyVersion()

  return <main className="min-h-screen bg-[#030610] text-white" data-weave-system-store>
    <section className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,.16),transparent_34%),radial-gradient(circle_at_80%_5%,rgba(168,85,247,.13),transparent_30%),linear-gradient(180deg,#071321,#030610)] px-5 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-7xl">
        <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-cyan-300"><Boxes className="h-4 w-4"/>WEAVE System Store</p>
        <h1 className="mt-4 max-w-5xl text-4xl font-black tracking-tight sm:text-6xl">WEAVE distributes itself, then the systems built inside it.</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">Install the official live WEAVE release, then discover Administration-verified systems formed by Clients inside their File Folders. The official WEAVE installation remains connected to the current Cloud release instead of freezing on an old package.</p>
        <div className="mt-7 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-wider text-slate-400">
          <span className="rounded-full border border-white/10 px-4 py-2">Official WEAVE release</span>
          <span className="rounded-full border border-white/10 px-4 py-2">Publisher identity</span>
          <span className="rounded-full border border-white/10 px-4 py-2">Version history</span>
          <span className="rounded-full border border-white/10 px-4 py-2">Administration verification</span>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 pt-9 md:px-8">
      <div className="mb-4"><p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">WEAVE · Official</p><h2 className="mt-2 text-3xl font-black">Current WEAVE Release</h2></div>
      <Link href="/system-store/weave" className="group grid gap-5 rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,.13),transparent_36%),radial-gradient(circle_at_85%_20%,rgba(251,146,60,.10),transparent_32%),rgba(255,255,255,.025)] p-5 transition hover:-translate-y-1 hover:border-cyan-200/35 md:grid-cols-[auto_1fr_auto] md:items-center md:p-7" data-weave-official-store-release>
        <img src={WEAVE_FIRST_PARTY_SYSTEM.iconUrl} alt="WEAVE" className="h-20 w-20 rounded-[1.6rem] border border-white/10 bg-black/20 object-cover"/>
        <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-emerald-300/20 bg-emerald-300/[.05] px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-emerald-300">Official</span><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">PWA · live current release · {weaveVersion}</span></div><h3 className="mt-3 text-3xl font-black">{WEAVE_FIRST_PARTY_SYSTEM.systemName}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{WEAVE_FIRST_PARTY_SYSTEM.summary}</p><p className="mt-3 text-[10px] text-slate-500">Publisher · {WEAVE_FIRST_PARTY_SYSTEM.publisherName}</p></div>
        <div className="md:text-right"><p className="text-lg font-black">Free</p><span className="mt-2 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-cyan-300"><Download className="h-4 w-4"/>Install WEAVE<ArrowRight className="h-3.5 w-3.5"/></span></div>
      </Link>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-9 md:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-violet-300">Public distribution</p><h2 className="mt-2 text-3xl font-black">Published Client Systems</h2></div>
        <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-amber-200">WEAVE Enterprise Catalogue<ArrowRight className="h-3.5 w-3.5"/></Link>
      </div>

      {systems.length===0?<div className="rounded-[2rem] border border-dashed border-white/10 p-12 text-center"><Store className="mx-auto h-8 w-8 text-slate-600"/><p className="mt-4 text-sm text-slate-500">The official WEAVE release is live above. Client system versions will appear here after Administration approval.</p></div>:<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {systems.map((system:any)=>{
          const downloadable=Boolean(system.storage_object||system.package_url)
          const launchable=Boolean(system.entry_url)
          return <Link key={system.public_slug} href={`/system-store/${system.public_slug}`} className="group flex min-h-[300px] flex-col rounded-[1.8rem] border border-white/10 bg-white/[.025] p-5 transition hover:-translate-y-1 hover:border-cyan-300/25">
            <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3">{system.icon_url?<img src={system.icon_url} alt="" className="h-11 w-11 rounded-xl border border-white/10 object-cover"/>:<div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[.05]"><Boxes className="h-5 w-5 text-cyan-300"/></div>}<div><p className="text-[8px] font-black uppercase tracking-[.16em] text-cyan-300">{system.category}</p><p className="mt-1 text-[9px] text-slate-500">v{system.version_name} · {String(system.package_type).replaceAll('_',' ')}</p></div></div><ShieldCheck className="h-4 w-4 text-emerald-300"/></div>
            <h3 className="mt-5 text-2xl font-black">{system.system_name}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{system.summary}</p><p className="mt-4 text-[10px] text-slate-500">Publisher · {system.publisher_business||system.publisher_name}</p>
            <div className="mt-auto flex items-end justify-between gap-3 pt-5"><div><p className="text-lg font-black text-white">{Number(system.price||0)===0?'Free':`${system.currency} ${Number(system.price).toLocaleString()}`}</p><p className="mt-1 text-[9px] text-slate-600">{Number(system.download_count||0).toLocaleString()} downloads · {Number(system.open_count||0).toLocaleString()} opens</p></div><span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-cyan-300">{downloadable?<Download className="h-3.5 w-3.5"/>:launchable?<ExternalLink className="h-3.5 w-3.5"/>:null}Inspect<ArrowRight className="h-3.5 w-3.5"/></span></div>
          </Link>
        })}
      </div>}
    </section>
  </main>
}
