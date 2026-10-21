'use client'
import {useCallback,useEffect,useState} from 'react'
import {getClientToken} from '@/lib/client-auth'
import {FORMATION_MATERIALS} from '@/lib/file-folder-generative-formation'
import type {FormationMaterial} from '@/lib/file-folder-generative-formation'

type Formation={id:string;status:string;specification:{name:string;purpose:string;materials:string[];textures:{material:string;description:string}[];openQuestions:string[]}}
export default function GenerativeFormationWorkshop(){
 const [description,setDescription]=useState('')
 const [name,setName]=useState('')
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
   const res=await fetch('/api/client/generated-formations',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'propose',name,description,materials})})
   const data=await res.json()
   if(!res.ok)throw new Error(data.error||'Formation failed')
   setDescription('');setName('');await load()
  }catch(e){setError(e instanceof Error?e.message:'Formation failed')}finally{setLoading(false)}
 }
 return <section data-formation-intelligence="client-generative-workshop" className="border border-cyan-300/20 bg-[#07121d] p-4 text-white space-y-4">
  <div><p className="text-[10px] uppercase tracking-widest text-cyan-300">Formation Intelligence · Client-directed</p><h3 className="text-lg font-bold">Describe what does not yet exist</h3><p className="text-xs text-slate-300">Create a persistent construction specification from your own idea. This first stage is conceptual; it does not yet generate a working system or 3D texture.</p></div>
  <label className="block text-xs">Formation name<input aria-label="Formation name" value={name} maxLength={100} onChange={e=>setName(e.target.value)} placeholder="Name your new formation" className="mt-2 w-full rounded border border-white/20 bg-black/40 p-3 text-white"/></label>
  <label className="block text-xs">What do you want to build?<textarea aria-label="Construction description" value={description} onChange={e=>setDescription(e.target.value)} rows={4} maxLength={6000} placeholder="Describe its purpose, behavior, materials, movement and the world it belongs to..." className="mt-2 w-full rounded border border-white/20 bg-black/40 p-3 text-white"/></label>
  <fieldset><legend className="text-xs">Material and texture directions</legend><div className="mt-2 flex flex-wrap gap-2">{FORMATION_MATERIALS.map(material=><label key={material} className="flex items-center gap-2 rounded border border-white/20 p-2 text-xs"><input type="checkbox" checked={materials.includes(material)} onChange={e=>setMaterials(previous=>e.target.checked?[...previous.filter(m=>m!==material),material]:previous.filter(m=>m!==material))}/>{material}</label>)}</div></fieldset>
  <button type="button" disabled={loading||description.trim().length<15} onClick={propose} className="rounded bg-cyan-300 px-4 py-3 text-sm font-bold text-black disabled:opacity-40">{loading?'Forming…':'Preserve new formation'}</button>
  {error&&<p role="alert" className="text-sm text-amber-200">{error}</p>}
  <div className="space-y-2"><h4 className="text-sm font-bold">My emerging formations ({formations.length})</h4>{formations.map(item=><article key={item.id} className="border-l-2 border-cyan-400/50 bg-black/30 p-3"><p className="font-semibold">{item.specification.name}</p><p className="text-xs text-cyan-200">Conceptual · awaiting engineering and simulation</p><p className="mt-1 text-xs text-slate-300">{item.specification.purpose}</p><p className="mt-1 text-xs text-slate-400">Materials: {item.specification.materials.join(', ')}</p></article>)}</div>
 </section>
}
