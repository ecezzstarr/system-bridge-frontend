'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {FILE_FOLDER_WORLD_APPEARANCES,FILE_FOLDER_THEME_IDS,FILE_FOLDER_EQUIPMENT_PACKS,FILE_FOLDER_REALNESS,FILE_FOLDER_EQUIPMENT_ZONES,PLUS_FILE_FOLDER_REFERENCE,type FileFolderWorldAppearance,type EquipmentZone} from '@/lib/file-folder-world-presets'
type Tier='standard'|'pro'|'premium'|'plus'
const tiers:Tier[]=['standard','pro','premium','plus']
type Config={headline:string;description:string;tierMessages:Record<Tier,string>;tierVisuals:Record<Tier,FileFolderWorldAppearance>}
type Release={id:string;version:number;state:'draft'|'published'|'archived';config:Config;created_at:string;published_at:string|null}
const initial:Config={headline:'Weave File Folder World',
 description:'Build, participate and operate your File Folder systems through System Switch.',
 tierMessages:{
 standard:'Standard File Folder · System Formation Workshop',
 pro:'Pro File Folder · Business systems in formation and operation',
 premium:'Premium File Folder · Extended operating environment',
 plus:'Plus File Folder · Complete systems for immediate uses',
},tierVisuals:FILE_FOLDER_WORLD_APPEARANCES}
export default function FileFolderGlobalReleaseWorkshop(){
 const {token,user,isInitialized}=useAuth()
 const [config,setConfig]=useState<Config>(initial)
 const [active,setActive]=useState<Release|null>(null)
 const [list,setList]=useState<Release[]>([])
 const [busy,setBusy]=useState(false)
 const [referenceUnavailable,setReferenceUnavailable]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [confirmation,setConfirmation]=useState('')
 const [candidate,setCandidate]=useState('')
 const withDefaults=(incoming:Config):Config=>({...incoming,tierVisuals:{...FILE_FOLDER_WORLD_APPEARANCES,...(incoming.tierVisuals||{})}})
 const updateTier=(tier:Tier,patch:Partial<FileFolderWorldAppearance>)=>setConfig(previous=>({
  ...previous,tierVisuals:{...previous.tierVisuals,[tier]:{...previous.tierVisuals[tier],...patch}}
 }))
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
   if(body.action==='prepare_rollback'){setCandidate(data.release.id);setConfig(withDefaults(data.release.config));setMessage('Previous release copied into a new draft. Publish it to restore.')}
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
  <section className="rounded-2xl border border-[#d8b875]/40 bg-[#fcfaf5] p-4 text-[#2e3540] sm:p-6" data-admin-plus-official-construction-reference="389215.png">
   <div className="grid gap-5 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
    <div className="overflow-hidden rounded-lg border border-[#dac893] bg-white">
      {!referenceUnavailable
       ? <img src={PLUS_FILE_FOLDER_REFERENCE.posterAssetPath}
           alt="Founder-approved official Plus File Folder white-and-gold world construction image"
           width={PLUS_FILE_FOLDER_REFERENCE.originalDimensions.width}
           height={PLUS_FILE_FOLDER_REFERENCE.originalDimensions.height}
           loading="lazy" onError={()=>setReferenceUnavailable(true)}
           className="h-auto w-full object-contain" />
       : <p role="status" className="p-4 text-sm">The approved poster has not been installed in the public image assets. Import its exact verified image before publishing the Plus world.</p>}
    </div>
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-[#895e18]">Official Plus design reference · 23 October 2026</p>
      <h2 className="mt-2 text-xl font-black">The approved image is the Plus world construction specification</h2>
      <p className="mt-3 text-sm leading-6">The same founder-approved picture appears on the homepage and here. Plus must remain a white-and-gold living world with a central opened File Folder, marble terraces, radiant structures, water, glass and six connected operating systems. It is not a recolored Premium File Folder or a static background.</p>
      <p className="mt-3 text-sm font-semibold">Required stations: {PLUS_FILE_FOLDER_REFERENCE.sixFunctions.map(item=>item[0].toUpperCase()+item.slice(1)).join(' · ')}</p>
      <p className="mt-3 text-xs leading-5 text-[#596677]">Keep this original artwork as the visual reference when publishing equipment and theme changes. Promotional market projections in the poster are not verified user earnings or a system guarantee.</p>
    </div>
   </div>
  </section>
  {error&&<p role="alert" className="rounded-xl border border-rose-300/30 p-4 text-sm text-rose-200">{error}</p>}
  {message&&<p role="status" className="rounded-xl border border-cyan-300/30 p-4 text-sm text-cyan-100">{message}</p>}
  <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[.03] p-5">
   <div className="flex items-center justify-between gap-2">
    <h2 className="text-xl font-bold">Global world update draft</h2>
    <button type="button" className="text-xs text-cyan-200 underline" onClick={()=>setConfig(withDefaults(active?.config||initial))}>Load published wording</button>
   </div>
   <label className="block text-sm">World title<input maxLength={160} value={config.headline} onChange={e=>setConfig(p=>({...p,headline:e.target.value}))} className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950 p-3"/></label>
   <label className="block text-sm">World explanation<textarea rows={3} maxLength={1500} value={config.description} onChange={e=>setConfig(p=>({...p,description:e.target.value}))} className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950 p-3"/></label>
   <div className="grid gap-4 md:grid-cols-2">
    {tiers.map(tier=><label key={tier} className="block text-sm">
      <span className="font-bold capitalize text-cyan-200">{tier} File Folder</span>
      <textarea rows={3} maxLength={900} value={config.tierMessages[tier]} onChange={e=>setConfig(p=>({...p,tierMessages:{...p.tierMessages,[tier]:e.target.value}}))} className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950 p-3"/>
    </label>)}
   </div>
   <div className="rounded-xl border border-[#d1b47b]/30 bg-[#e8d9b9]/[.04] p-4" data-file-folder-theme-equipment-controls="true">
     <h3 className="text-lg font-bold text-[#f7ddac]">World themes, realness and equipment</h3>
     <p className="mt-2 text-xs leading-5 text-slate-300">Select a safe, installed theme and equipment pack for every File Folder tier. Changes are staged in a draft. Equipment stations always connect to existing Client workspaces.</p>
     <div className="mt-4 grid gap-4 md:grid-cols-2">
      {tiers.map(tier=><section key={tier} className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
       <p className="mb-3 text-sm font-black uppercase tracking-wider text-cyan-200">{tier} environment</p>
       <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">Theme preset
         <select aria-label={tier+' theme'} value={config.tierVisuals[tier]?.theme||FILE_FOLDER_WORLD_APPEARANCES[tier].theme}
          onChange={e=>updateTier(tier,{theme:e.target.value as FileFolderWorldAppearance['theme']})}
          className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-2">
          {FILE_FOLDER_THEME_IDS.map(id=><option key={id} value={id}>{id.replaceAll('-',' ')}</option>)}
         </select>
        </label>
        <label className="text-xs">Realness
         <select aria-label={tier+' realness'} value={config.tierVisuals[tier]?.realness||FILE_FOLDER_WORLD_APPEARANCES[tier].realness}
          onChange={e=>updateTier(tier,{realness:e.target.value as FileFolderWorldAppearance['realness']})}
          className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-2">
          {FILE_FOLDER_REALNESS.map(id=><option key={id} value={id}>{id}</option>)}
         </select>
        </label>
       </div>
       <label className="mt-3 block text-xs">Equipment pack
        <select aria-label={tier+' equipment pack'} value={config.tierVisuals[tier]?.equipmentPack||FILE_FOLDER_WORLD_APPEARANCES[tier].equipmentPack}
         onChange={e=>updateTier(tier,{equipmentPack:e.target.value as FileFolderWorldAppearance['equipmentPack']})}
         className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-2">
         {FILE_FOLDER_EQUIPMENT_PACKS.map(id=><option key={id} value={id}>{id.replaceAll('-',' ')}</option>)}
        </select>
       </label>
       <div className="mt-4">
        <p className="text-xs font-semibold">Visible equipment and operating stations</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
        {FILE_FOLDER_EQUIPMENT_ZONES.map(zone=><label key={zone} className="flex items-center gap-2 text-xs capitalize text-slate-300">
         <input type="checkbox" checked={(config.tierVisuals[tier]?.equipmentZones||FILE_FOLDER_WORLD_APPEARANCES[tier].equipmentZones).includes(zone)}
          onChange={e=>{
           const current=config.tierVisuals[tier]?.equipmentZones||FILE_FOLDER_WORLD_APPEARANCES[tier].equipmentZones
           const next=e.target.checked?[...current,zone]:current.filter(item=>item!==zone)
           if(next.length)updateTier(tier,{equipmentZones:next as EquipmentZone[]})
          }}/>
         {zone}
        </label>)}
        </div>
       </div>
      </section>)}
     </div>
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
      {item.state==='draft'&&<button disabled={busy} type="button" onClick={()=>{setConfig(withDefaults(item.config));setCandidate(item.id)}} className="text-xs text-cyan-200 underline">Select draft</button>}
      {item.state==='archived'&&<button disabled={busy} type="button" onClick={()=>void send({action:'prepare_rollback',version:Number(item.version)})} className="text-xs text-amber-200 underline">Prepare rollback</button>}
    </div>
   </article>)}
  </section>
 </main>
}
