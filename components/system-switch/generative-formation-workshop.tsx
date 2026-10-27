'use client'
import {useCallback,useEffect,useState} from 'react'
import {getClientToken} from '@/lib/client-auth'
import {FORMATION_MATERIALS} from '@/lib/file-folder-generative-formation'
import type {FormationMaterial} from '@/lib/file-folder-generative-formation'

const SOURCE_KINDS=[
 {value:'commerce',label:'Commerce / marketplace'},
 {value:'operations',label:'Business operations'},
 {value:'community',label:'Community / resource coordination'},
 {value:'creative',label:'Creative production'},
 {value:'education',label:'Education / learning'},
 {value:'logistics',label:'Logistics / delivery'},
 {value:'custom',label:'Other / define my own system'},
] as const

type SourcePlan={systemKind:string;functions:string[];participantRoles:string[];connections:string[];platformKind:string;blueprintStages:{blueprintKey:string;order:number;purpose:string;status:string}[];productionGap:string;buildSequence:string[];acceptanceChecks:string[];executionBoundary:string}
type Formation={id:string;status:string;specification:{name:string;purpose:string;materials:string[];textures:{material:string;description:string}[];openQuestions:string[];sourcePlan?:SourcePlan}}
export default function GenerativeFormationWorkshop(){
 const [description,setDescription]=useState('')
 const [name,setName]=useState('')
 const [systemKind,setSystemKind]=useState('custom')
 const [materials,setMaterials]=useState<FormationMaterial[]>(['custom'])
 const [formations,setFormations]=useState<Formation[]>([])
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const load=useCallback(async()=>{
  const token=getClientToken();if(!token)return
  try{
   const res=await fetch('/api/client/generated-formations',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
   if(res.ok){const data=await res.json();setFormations(data.formations||[])}
  }catch{setError('Formation history is temporarily unavailable.')}
 },[])
 useEffect(()=>{void load()},[load])
 async function propose(){
  const token=getClientToken();if(!token){setError('Client login required.');return}
  setLoading(true);setError('')
  try{
   const res=await fetch('/api/client/generated-formations',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'propose',name,description,materials,systemKind})})
   const data=await res.json()
   if(!res.ok)throw new Error(data.error||'Formation failed')
   setDescription('');setName('');await load()
  }catch(e){setError(e instanceof Error?e.message:'Formation failed')}finally{setLoading(false)}
 }
 return <section data-formation-intelligence="client-generative-workshop" data-source-engine="file-folder-v1" className="border border-cyan-300/20 bg-[#07121d] p-4 text-white space-y-4">
  <div><p className="text-[10px] uppercase tracking-widest text-cyan-300">Formation Intelligence · File Folder Source Engine</p><h3 className="text-lg font-bold">Form a system from your business source</h3><p className="text-xs text-slate-300">Describe the business, need or idea. WEAVE structures it into functions, participant roles, system connections and a build sequence inside this File Folder. This first layer creates an inspectable plan, not executable software.</p></div>
  <label className="block text-xs">Formation name<input aria-label="Formation name" value={name} maxLength={100} onChange={e=>setName(e.target.value)} placeholder="Name this business world or system" className="mt-2 w-full rounded border border-white/20 bg-black/40 p-3 text-white"/></label>
  <label className="block text-xs">What is the source, and what should the system do?<textarea aria-label="Construction description" value={description} onChange={e=>setDescription(e.target.value)} rows={4} maxLength={6000} placeholder="Describe the business or idea, what needs to happen, who participates, and what outcome the system should produce..." className="mt-2 w-full rounded border border-white/20 bg-black/40 p-3 text-white"/></label>
  <label className="block text-xs">What kind of web system are you forming?<select aria-label="System kind" value={systemKind} onChange={e=>setSystemKind(e.target.value)} className="mt-2 w-full rounded border border-white/20 bg-[#07121d] p-3 text-white">{SOURCE_KINDS.map(kind=><option key={kind.value} value={kind.value}>{kind.label}</option>)}</select></label>
  <fieldset><legend className="text-xs">Material and texture directions for the File Folder world</legend><div className="mt-2 flex flex-wrap gap-2">{FORMATION_MATERIALS.map(material=><label key={material} className="flex items-center gap-2 rounded border border-white/20 p-2 text-xs"><input type="checkbox" checked={materials.includes(material)} onChange={e=>setMaterials(previous=>e.target.checked?[...previous.filter(m=>m!==material),material]:previous.filter(m=>m!==material))}/>{material}</label>)}</div></fieldset>
  <button type="button" disabled={loading||description.trim().length<15||!name.trim()} onClick={propose} className="rounded bg-cyan-300 px-4 py-3 text-sm font-bold text-black disabled:opacity-40">{loading?'Forming source plan…':'Form system plan inside this File Folder'}</button>
  {error&&<p role="alert" className="text-sm text-amber-200">{error}</p>}
  <div className="space-y-3"><h4 className="text-sm font-bold">My emerging formations ({formations.length})</h4>{formations.map(item=><article key={item.id} className="space-y-3 border-l-2 border-cyan-400/50 bg-black/30 p-3">
   <div><p className="font-semibold">{item.specification.name}</p><p className="text-xs text-cyan-200">Conceptual · awaiting implementation and verification</p><p className="mt-1 text-xs text-slate-300">{item.specification.purpose}</p><p className="mt-1 text-xs text-slate-400">Materials: {item.specification.materials.join(', ')}</p></div>
   {item.specification.sourcePlan&&<div className="space-y-3 border-t border-white/10 pt-3">
    <div><p className="text-[10px] font-bold uppercase tracking-wider text-cyan-200">Source composition · {item.specification.sourcePlan.systemKind}</p><p className="mt-1 text-xs text-slate-300">Functions</p><ul className="list-disc space-y-1 pl-5 text-xs text-slate-200">{item.specification.sourcePlan.functions.map(value=><li key={value}>{value}</li>)}</ul></div>
    <div><p className="text-xs text-slate-300">Participant roles</p><p className="mt-1 text-xs text-slate-200">{item.specification.sourcePlan.participantRoles.join(' · ')}</p></div>
    <div><p className="text-xs text-slate-300">System connections</p><ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-200">{item.specification.sourcePlan.connections.map(value=><li key={value}>{value}</li>)}</ul></div>
    <div className="rounded border border-cyan-300/20 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-cyan-200">Existing construction path · {item.specification.sourcePlan.platformKind.replaceAll('_',' ')}</p><p className="mt-1 text-xs text-slate-300">The engine maps this proposal to real blueprint stages already defined in the File Folder build system. These stages are not marked built until actual build and active-system records exist.</p><ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-200">{item.specification.sourcePlan.blueprintStages.map(stage=><li key={stage.blueprintKey}><span className="font-semibold">{stage.blueprintKey.replaceAll('_',' ')}</span><span className="text-slate-400"> — {stage.status.replaceAll('_',' ')}</span></li>)}</ol><p className="mt-3 text-xs text-amber-200">Still required before launch: {item.specification.sourcePlan.productionGap}</p></div>
    <div><p className="text-xs text-slate-300">Build sequence</p><ol className="mt-1 list-decimal space-y-1 pl-5 text-xs text-slate-200">{item.specification.sourcePlan.buildSequence.map(value=><li key={value}>{value}</li>)}</ol></div>
    <details className="text-xs text-slate-300"><summary className="cursor-pointer">Acceptance and security checks</summary><ul className="mt-2 list-disc space-y-1 pl-5">{item.specification.sourcePlan.acceptanceChecks.map(value=><li key={value}>{value}</li>)}</ul><p className="mt-2 text-slate-400">{item.specification.sourcePlan.executionBoundary}</p></details>
   </div>}
  </article>)}</div>
 </section>
}
