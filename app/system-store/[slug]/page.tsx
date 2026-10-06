import Link from 'next/link'
import { ArrowLeft, Boxes, Download, ExternalLink, ShieldCheck, Store } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { ensureWeaveSystemStoreSchema } from '@/lib/weave-system-store'

export const dynamic='force-dynamic'

export default async function SystemStoreDetailPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  const sql=getFileFolderDb()
  await ensureWeaveSystemStoreSchema(sql)
  const [system]=await sql`
    SELECT p.*,v.version_name,v.version_code,v.package_type,v.package_name,v.entry_url,v.package_url,v.storage_object,
      v.package_sha256,v.permissions,v.screenshots,v.release_notes,v.approved_at AS version_approved_at,
      u.name AS publisher_name,u.business_name AS publisher_business,
      bs.public_slug AS customer_door_slug
    FROM weave_system_store_publications p
    JOIN weave_system_store_versions v ON v.id=p.current_version_id
    JOIN users u ON u.id=p.client_id
    LEFT JOIN client_business_stores bs ON bs.client_id=p.client_id AND bs.file_number=p.file_number
    WHERE p.public_slug=${slug} AND p.status='approved' AND v.review_status='approved'
    LIMIT 1
  `
  if(!system)notFound()
  const permissions=Array.isArray(system.permissions)?system.permissions:[]
  const screenshots=Array.isArray(system.screenshots)?system.screenshots:[]
  const downloadable=Boolean(system.storage_object||system.package_url)
  const launchable=Boolean(system.entry_url)
  const paid=Number(system.price||0)>0

  return <main className="min-h-screen bg-[#030610] px-5 py-8 text-white md:px-8" data-weave-system-store-detail>
    <div className="mx-auto max-w-6xl">
      <Link href="/system-store" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400"><ArrowLeft className="h-3.5 w-3.5"/>System Store</Link>
      <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,.14),transparent_34%),linear-gradient(160deg,#071321,#030610)] p-6 md:p-9">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">{system.icon_url?<img src={system.icon_url} alt="" className="h-16 w-16 rounded-2xl border border-white/10 object-cover"/>:<div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[.05]"><Boxes className="h-7 w-7 text-cyan-300"/></div>}<div><p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">{system.category} · {String(system.package_type).replaceAll('_',' ')}</p><h1 className="mt-2 text-4xl font-black tracking-tight md:text-6xl">{system.system_name}</h1><p className="mt-2 text-sm text-slate-500">WEAVE System ID · {system.weave_system_id}</p></div></div>
          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[.04] px-4 py-3"><p className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-emerald-300"><ShieldCheck className="h-4 w-4"/>Administration verified</p><p className="mt-2 text-sm font-black">v{system.version_name}</p></div>
        </div>
        <p className="mt-7 max-w-4xl text-base leading-8 text-slate-300">{system.summary}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          {!paid&&launchable&&<a href={`/api/system-store/${system.public_slug}/launch`} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950"><ExternalLink className="h-4 w-4"/>Open System</a>}
          {!paid&&downloadable&&<a href={`/api/system-store/${system.public_slug}/download`} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-black"><Download className="h-4 w-4"/>Download</a>}
          {paid&&system.customer_door_slug&&<Link href={`/market/${system.customer_door_slug}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-300 px-5 py-3 text-sm font-black text-slate-950"><Store className="h-4 w-4"/>Purchase through Publisher Customer Door</Link>}
          {!paid&&system.customer_door_slug&&<Link href={`/market/${system.customer_door_slug}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-violet-300/20 px-5 py-3 text-sm font-black text-violet-200"><Store className="h-4 w-4"/>Publisher Customer Door</Link>}
          {paid&&!system.customer_door_slug&&<span className="rounded-xl border border-amber-300/20 bg-amber-300/[.05] px-5 py-3 text-sm font-black text-amber-200">Publisher commerce entrance is not open yet.</span>}
        </div>
        {paid&&<p className="mt-4 max-w-3xl text-xs leading-5 text-slate-500">Paid releases are not delivered from an unrestricted public URL. Purchase must be completed through the publisher commerce path before package or live-system entitlement is issued.</p>}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-[1.7rem] border border-white/10 bg-white/[.02] p-5 md:p-6"><p className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">Release</p><dl className="mt-4 grid gap-4 sm:grid-cols-2"><Info label="Publisher" value={system.publisher_business||system.publisher_name}/><Info label="Version" value={`${system.version_name} · build ${system.version_code}`}/><Info label="Price" value={paid?`${system.currency} ${Number(system.price).toLocaleString()}`:'Free'}/><Info label="Distribution" value={String(system.distribution_scope||'store').replaceAll('_',' ')}/><Info label="Downloads" value={Number(system.download_count||0).toLocaleString()}/><Info label="Opens" value={Number(system.open_count||0).toLocaleString()}/></dl>{system.release_notes&&<div className="mt-6 border-t border-white/10 pt-5"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Release notes</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{system.release_notes}</p></div>}</div>
        <div className="rounded-[1.7rem] border border-white/10 bg-white/[.02] p-5 md:p-6"><p className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">Package evidence</p><Info label="Package name" value={system.package_name||'WEAVE-hosted system'}/>{system.package_sha256&&<div className="mt-4"><p className="text-[9px] uppercase tracking-wider text-slate-600">SHA-256</p><p className="mt-1 break-all font-mono text-[10px] leading-5 text-slate-400">{system.package_sha256}</p></div>}{permissions.length>0&&<div className="mt-5"><p className="text-[9px] uppercase tracking-wider text-slate-600">Declared permissions</p><div className="mt-2 flex flex-wrap gap-2">{permissions.map((p:any)=><span key={String(p)} className="rounded-full border border-white/10 px-3 py-1 text-[9px] text-slate-400">{String(p)}</span>)}</div></div>}</div>
      </section>

      {screenshots.length>0&&<section className="mt-5 rounded-[1.7rem] border border-white/10 bg-white/[.02] p-5"><p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Screens</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{screenshots.map((src:any)=><img key={String(src)} src={String(src)} alt="System screenshot" className="aspect-video w-full rounded-xl border border-white/10 object-cover"/>)}</div></section>}
    </div>
  </main>
}

function Info({label,value}:{label:string,value:any}){return <div><dt className="text-[9px] uppercase tracking-wider text-slate-600">{label}</dt><dd className="mt-1 text-sm font-black text-slate-200">{String(value??'—')}</dd></div>}
