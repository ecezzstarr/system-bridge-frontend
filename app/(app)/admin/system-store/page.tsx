'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ExternalLink, PackageSearch, RefreshCcw, ShieldCheck, XCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

export default function AdminSystemStoreWorkshop(){
  const {token,user}=useAuth()
  const [pending,setPending]=useState<any[]>([])
  const [published,setPublished]=useState<any[]>([])
  const [notes,setNotes]=useState<Record<string,string>>({})
  const [busy,setBusy]=useState('')
  const [message,setMessage]=useState('')

  const load=async()=>{
    if(!token)return
    const response=await fetch('/api/admin/system-store',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
    const body=await response.json();if(!response.ok)throw new Error(body.error||'Unable to load System Store workshop')
    setPending(body.pending||[]);setPublished(body.published||[])
  }
  useEffect(()=>{if(user?.role==='admin')void load().catch(error=>setMessage(error instanceof Error?error.message:'Unable to load workshop'))},[token,user?.role])

  const review=async(version:any,action:'approve'|'reject')=>{
    if(!token)return
    setBusy(String(version.version_id));setMessage('')
    try{
      const response=await fetch('/api/admin/system-store',{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action,version_id:version.version_id,review_note:notes[String(version.version_id)]||''})})
      const body=await response.json();if(!response.ok)throw new Error(body.error||'Review failed')
      setMessage(action==='approve'?'System version approved and published.':'System version returned to the Client with review notes.')
      await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Review failed')}
    finally{setBusy('')}
  }

  if(user&&user.role!=='admin')return <main className="p-8 text-white">Administration access required.</main>

  return <main className="mx-auto max-w-7xl px-4 py-8 text-white md:px-7" data-admin-system-store-workshop>
    <header className="border-b border-white/10 pb-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-emerald-300"><ShieldCheck className="h-4 w-4"/>Administration · System Store Workshop</p><h1 className="mt-2 text-4xl font-black">Verify what WEAVE distributes.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Every Client release is tied to an active File Folder system. Administration verifies the package identity, declared permissions, release information and delivery movement before it becomes a public version.</p></div><div className="flex gap-2"><Link href="/system-store" className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black text-cyan-300">Public Store</Link><button onClick={()=>void load()} className="rounded-xl border border-white/10 p-3 text-slate-400"><RefreshCcw className="h-4 w-4"/></button></div></div></header>
    {message&&<div className="mt-5 rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] p-4 text-sm text-cyan-100">{message}</div>}

    <section className="mt-6"><div className="mb-4"><p className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">Verification queue</p><h2 className="mt-1 text-2xl font-black">{pending.length} submitted version{pending.length===1?'':'s'}</h2></div>{pending.length===0?<div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500"><PackageSearch className="mx-auto mb-3 h-7 w-7"/>No versions are waiting for review.</div>:<div className="space-y-4">{pending.map(version=><article key={version.version_id} className="rounded-[1.6rem] border border-white/10 bg-white/[.02] p-5"><div className="grid gap-5 lg:grid-cols-[1fr_.7fr]"><div><div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-black uppercase tracking-wider text-cyan-300">{version.category}</span><span className="text-[9px] text-slate-600">{version.package_type} · v{version.version_name} · build {version.version_code}</span></div><h3 className="mt-2 text-2xl font-black">{version.system_name}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{version.summary}</p><div className="mt-4 grid gap-3 text-xs sm:grid-cols-2"><Info label="Client" value={version.business_name||version.client_name}/><Info label="File Number" value={version.file_number}/><Info label="Built system" value={`${version.built_system_title} · ${version.built_system_type}`}/><Info label="Package" value={version.package_name||version.storage_object||version.entry_url||'WEAVE native'}/><Info label="SHA-256" value={version.package_sha256||'Not supplied'}/><Info label="Size" value={version.package_size_bytes?`${(Number(version.package_size_bytes)/1024/1024).toFixed(1)} MB`:'Not applicable'}/></div>{Array.isArray(version.permissions)&&version.permissions.length>0&&<div className="mt-4"><p className="text-[9px] uppercase tracking-wider text-slate-600">Declared permissions</p><div className="mt-2 flex flex-wrap gap-2">{version.permissions.map((item:any)=><span key={String(item)} className="rounded-full border border-white/10 px-3 py-1 text-[9px] text-slate-400">{String(item)}</span>)}</div></div>}</div><div><label className="block"><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Administration review note</span><textarea rows={6} value={notes[String(version.version_id)]||''} onChange={e=>setNotes({...notes,[String(version.version_id)]:e.target.value})} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white" placeholder="Required changes, verification result or approval note..."/></label><div className="mt-3 grid gap-2 sm:grid-cols-2"><button disabled={busy===String(version.version_id)} onClick={()=>void review(version,'approve')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-black text-slate-950 disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/>Approve</button><button disabled={busy===String(version.version_id)} onClick={()=>void review(version,'reject')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-300/20 px-4 text-sm font-black text-rose-200 disabled:opacity-50"><XCircle className="h-4 w-4"/>Return</button></div></div></div></article>)}</div>}</section>

    <section className="mt-10 border-t border-white/10 pt-6"><p className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">Distribution record</p><h2 className="mt-1 text-2xl font-black">Published and withdrawn systems</h2><div className="mt-4 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-white/[.035] text-[9px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">System</th><th className="p-3">Publisher</th><th className="p-3">Version</th><th className="p-3">Type</th><th className="p-3">Standing</th><th className="p-3">Movement</th></tr></thead><tbody className="divide-y divide-white/10">{published.map(item=><tr key={item.weave_system_id}><td className="p-3 font-black">{item.system_name}{item.public_slug&&item.status==='approved'&&<Link href={`/system-store/${item.public_slug}`} className="ml-2 inline-flex text-cyan-300"><ExternalLink className="h-3 w-3"/></Link>}</td><td className="p-3 text-slate-400">{item.business_name||item.client_name}</td><td className="p-3">{item.version_name||'—'}</td><td className="p-3 text-slate-400">{item.package_type||'—'}</td><td className="p-3 font-black uppercase text-slate-300">{item.status}</td><td className="p-3 text-slate-400">{Number(item.download_count||0).toLocaleString()} downloads · {Number(item.open_count||0).toLocaleString()} opens</td></tr>)}</tbody></table></div></section>
  </main>
}

function Info({label,value}:{label:string,value:any}){return <div><p className="text-[9px] uppercase tracking-wider text-slate-600">{label}</p><p className="mt-1 break-all font-semibold text-slate-300">{String(value??'—')}</p></div>}
