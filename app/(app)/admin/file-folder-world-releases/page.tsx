'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
type Tier='standard'|'pro'|'premium'|'plus'
const tiers:Tier[]=['standard','pro','premium','plus']
type Config={headline:string;description:string;tierMessages:Record<Tier,string>}
type Release={id:string;version:number;state:'draft'|'published'|'archived';config:Config;created_at:string;published_at:string|null}
const initial:Config={headline:'Weave File Folder World',
 description:'Build, participate and operate your File Folder systems through System Switch.',
 tierMessages:{
 standard:'Standard File Folder · System Formation Workshop',
 pro:'Pro File Folder · Business systems in formation and operation',
 premium:'Premium File Folder · Extended operating environment',
 plus:'Plus File Folder · Complete systems for immediate uses',
}}
export default function FileFolderGlobalReleaseWorkshop(){
 const {token,user,isInitialized}=useAuth()
 const [config,setConfig]=useState<Config>(initial)
 const [active,setActive]=useState<Release|null>(null)
 const [list,setList]=useState<Release[]>([])
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [confirmation,setConfirmation]=useState('')
 const [candidate,setCandidate]=useState('')
 const authHeaders={'Authorization':'Bearer '+(token||''),'Content-Type':'application/json'}
 const reload=useCallback(async()=>{
  if(!token)return
  const res=await fetch('/api/admin/file-folder-world-releases',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
  const data=await res.json()
  if(!res.ok)throw new Error(data.error||'Unable to read File Folder releases')
  setList(data.releases||[])
  setActive(data.published||null)
 },[token])
 useEffect(()=>{if(user?.role==='admin'&&token)void reload().catch(e=>setError(e.message))},[user?.role,token,reload])
 async function send(body:Record<string,unknown>){
  setBusy(true);setMessage('');setError('')
  try{
   const res=await fetch('/api/admin/file-folder-world-releases',
    {method:'POST',headers:authHeaders,body:JSON.stringify(body)})
   const data=await res.json()
   if(!res.ok)throw new Error(data.error||'Unable to update File Folder worlds')
   if(body.action==='draft'){setCandidate(data.release.id);setMessage('Draft saved. Review before publishing to all Clients.')}
   if(body.action==='prepare_rollback'){setCandidate(data.release.id);setConfig(data.release.config);setMessage('Previous release copied into a new draft. Publish it to restore.')}
   if(body.action==='publish'){setCandidate('');setConfirmation('');setMessage('Version published for all four File Folder tiers.')}
   await reload()
  }catch(e:any){setError(e?.message||'Release action failed')}
  finally{setBusy(false)}
 }
 if(!isInitialized)return <main className="p-6 text-slate-300">Opening File Folder update engine…</main>
 if(user?.role!=='admin')return <main className="p-6">Administration only.</main>
 return <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 text-white" data-weave-file-folder-global-release="true">
  <Link href="/admin/release-workshop" className="text-sm text-cyan-200">← WEAVE software deployment workshop</Link>
  <header className="space-y-2">
   <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-200">Administration · File Folder worlds</p>
   <h1 className="text-3xl font-black">File Folder Update Engine</h1>
   <p className="max-w-3xl text-sm leading-6 text-slate-300">Manage live world guidance and tier messages for every Client File Folder. Draft, publish and roll back one version across Standard, Pro, Premium and Plus without redeploying the app. For new executable systems or 3D engine code, use the independent WEAVE Release Workshop.</p>
   <div className="flex flex-wrap gap-4 text-sm text-slate-300">
    <span>Current published version: <strong>{active?.version??'Unavailable'}</strong></span>
    <Link href="/admin/client-folder-upgrades" className="text-cyan-200 underline">CJ Dorado Pro construction & loan verification →</Link>
    <Link href="/admin/client-build-catalog" className="text-cyan-200 underline">Blueprint & item catalog →</Link>
   </div>
  </header>
  {error&&<p role="alert" className="rounded-xl border border-rose-300/30 p-4 text-sm text-rose-200">{error}</p>}
  {message&&<p role="status" className="rounded-xl border border-cyan-300/30 p-4 text-sm text-cyan-100">{message}</p>}
  <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[.03] p-5">
   <div className="flex items-center justify-between gap-2">
    <h2 className="text-xl font-bold">Global world update draft</h2>
    <button type="button" className="text-xs text-cyan-200 underline" onClick={()=>setConfig(active?.config||initial)}>Load published wording</button>
   </div>
   <label className="block text-sm">World title<input maxLength={160} value={config.headline} onChange={e=>setConfig(p=>({...p,headline:e.target.value}))} className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950 p-3"/></label>
   <label className="block text-sm">World explanation<textarea rows={3} maxLength={1500} value={config.description} onChange={e=>setConfig(p=>({...p,description:e.target.value}))} className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950 p-3"/></label>
   <div className="grid gap-4 md:grid-cols-2">
    {tiers.map(tier=><label key={tier} className="block text-sm">
      <span className="font-bold capitalize text-cyan-200">{tier} File Folder</span>
      <textarea rows={3} maxLength={900} value={config.tierMessages[tier]} onChange={e=>setConfig(p=>({...p,tierMessages:{...p.tierMessages,[tier]:e.target.value}}))} className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950 p-3"/>
    </label>)}
   </div>
   <button type="button" disabled={busy} onClick={()=>void send({action:'draft',config})} className="rounded-xl border border-cyan-300/40 px-5 py-3 font-bold text-cyan-100 disabled:opacity-50">Save new version draft</button>
   {candidate&&<div className="space-y-3 rounded-xl border border-amber-300/30 p-4">
     <p className="text-xs text-amber-100">Selected unpublished version: {list.find(r=>r.id===candidate)?.version||'New'}. Review it before global publication.</p>
     <label className="block text-sm">To deploy this runtime update to all File Folder worlds, type PUBLISH FILE FOLDERS<input value={confirmation} onChange={e=>setConfirmation(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
     <button type="button" disabled={busy||confirmation!=='PUBLISH FILE FOLDERS'||!active} onClick={()=>void send({action:'publish',releaseId:candidate,expectedVersion:Number(active?.version),confirmation})} className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">Publish to all File Folders</button>
   </div>}
  </section>
  <section className="space-y-3">
   <h2 className="text-xl font-bold">Version history and rollback</h2>
   {list.map(item=><article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4">
    <div><p className="text-sm font-bold">Version {item.version} · {item.state}</p><p className="text-xs text-slate-400">{item.config.headline} · {new Date(item.created_at).toLocaleString()}</p></div>
    <div className="flex gap-3">
      {item.state==='draft'&&<button disabled={busy} type="button" onClick={()=>{setConfig(item.config);setCandidate(item.id)}} className="text-xs text-cyan-200 underline">Select draft</button>}
      {item.state==='archived'&&<button disabled={busy} type="button" onClick={()=>void send({action:'prepare_rollback',version:Number(item.version)})} className="text-xs text-amber-200 underline">Prepare rollback</button>}
    </div>
   </article>)}
  </section>
 </main>
}
