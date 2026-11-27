'use client'
import {useRef,useState} from 'react'
import {FLAME_INDUSTRIES,type FlameIndustry,type FlameEnterprisePlan} from '@/lib/flame-enterprise-plan'
import {FILE_FOLDER_PLATFORM_TEMPLATES} from '@/lib/file-folder-platform-projects'
import {getClientToken} from '@/lib/client-auth'
export function FlameEnterprisePlanner(){
 const [industry,setIndustry]=useState<FlameIndustry>('flame_creative')
 const [plan,setPlan]=useState<FlameEnterprisePlan|null>(null)
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 const lock=useRef(false)
 async function inspect(){
  if(lock.current)return
  lock.current=true;setBusy(true);setError('');setPlan(null)
  try{
   const token=getClientToken()
   if(!token)throw Error('Client login required.')
   const r=await fetch(`/api/client/file-folder-world?flameIndustry=${encodeURIComponent(industry)}`,{headers:{Authorization:'Bearer '+token},cache:'no-store'})
   const b=await r.json()
   if(!r.ok||!b.success||!b.plan)throw Error(b.error||'Plan unavailable.')
   setPlan(b.plan)
  }catch(e){setError(e instanceof Error?e.message:'Plan unavailable.')}
  finally{lock.current=false;setBusy(false)}
 }
 return <details className="my-4 rounded-xl border border-sky-300/20 p-4 text-slate-100">
  <summary className="cursor-pointer font-semibold">Build an intelligence industry with Flame</summary>
  <p className="mt-2 text-xs text-slate-400">Choose an industry and inspect the systems you already own, construction still needed and the public service boundary. This private planning preview is not added to the shared Bridger conversation and submits no purchase or publication.</p>
  <label className="mt-3 block text-sm">Industry<select disabled={busy} value={industry} onChange={e=>{setIndustry(e.target.value as FlameIndustry);setPlan(null)}} className="mt-1 block w-full rounded-lg border border-white/20 bg-slate-950 p-2">{FLAME_INDUSTRIES.map(k=><option key={k} value={k}>{FILE_FOLDER_PLATFORM_TEMPLATES[k].name}</option>)}</select></label>
  <button type="button" disabled={busy} onClick={()=>void inspect()} className="mt-3 rounded-lg bg-sky-200 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy?'Inspecting File Folder…':'Prepare my formation plan'}</button>
  {error&&<p role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}
  {plan&&<div className="mt-4 space-y-3" aria-live="polite">
   <h4 className="font-semibold">{plan.title}</h4><p className="text-sm">{plan.description}</p>
   {plan.stages.map(s=><div key={s.key} className="rounded-lg border border-white/10 p-3"><div className="flex flex-wrap justify-between gap-2 text-sm"><strong>{s.label}</strong><span>{s.state.replaceAll('_',' ')}</span></div><p className="mt-1 text-xs text-slate-300">{s.next}</p>{s.baseHours!==null&&<p className="text-xs text-slate-400">Catalog base build time: {s.baseHours} hours; actual timing varies.</p>}{s.missing>0&&<p className="text-xs text-slate-400">Missing material: {s.missing} × {s.material}. Confirm the current price in the original workshop.</p>}</div>)}
   <p className="text-xs">Customer Door: {plan.publicDoorRecorded?'public opening recorded':'public opening not confirmed'} · {plan.activeOffers} enabled offers. No commercial launch has been verified.</p>
   <p className="text-xs text-amber-200">{plan.productionGap} {plan.modelStatus}</p>
   <a href="/client/system-switch" className="block text-sm text-sky-200 underline">Open File Folder to create an industry project, review costs and authorize construction</a>
  </div>}
 </details>
}
