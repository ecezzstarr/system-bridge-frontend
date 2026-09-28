'use client'

import { useEffect,useState } from 'react'
import Link from 'next/link'
import { Eye,GitBranch,Radio,ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { WeaveSystemRoom } from '@/components/world/weave-system-room'

const AUDIENCE=['client','agent','bridger'] as const
type Loop={id:string;loop_number:number;title:string;purpose:string;stage:string;position:string;functions:string;economics:string;responsibilities:string;boundaries:string;agreement_version:string|null;audience:string[];status:string}
const emptyForm={loopNumber:'1',title:'',purpose:'',stage:'',position:'all',functions:'',economics:'',responsibilities:'',boundaries:'',agreementVersion:'',audience:[...AUDIENCE],status:'draft'}

export default function LoopWorkshopPage(){
 const {user,isLoading,isInitialized}=useAuth();const loading=isLoading||!isInitialized;const router=useRouter()
 const [form,setForm]=useState(emptyForm),[loops,setLoops]=useState<Loop[]>([]),[message,setMessage]=useState(''),[saving,setSaving]=useState(false)

 useEffect(()=>{if(!loading&&(!user||user.role!=='admin'))router.replace('/dashboard')},[loading,user,router])
 const loadLoops=async()=>{const res=await fetch('/api/company-loops?manage=true',{headers:{Authorization:`Bearer ${localStorage.getItem('ssb_auth_token')||''}`},cache:'no-store'});const data=await res.json();setLoops(data.loops||[])}
 useEffect(()=>{if(user?.role==='admin')void loadLoops()},[user])

 const toggleAudience=(role:(typeof AUDIENCE)[number])=>setForm(current=>({...current,audience:current.audience.includes(role)?current.audience.filter(item=>item!==role):[...current.audience,role]}))
 const createLoop=async()=>{setSaving(true);setMessage('');try{const token=localStorage.getItem('ssb_auth_token');const res=await fetch('/api/company-loops',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(form)});const data=await res.json();if(!res.ok)throw new Error(data.error||'Unable to create loop');setMessage(form.status==='published'?'Loop published into the WEAVE world.':'Loop preserved as a draft.');setForm({...emptyForm,loopNumber:String(Number(form.loopNumber)+1)});await loadLoops()}catch(error){setMessage(error instanceof Error?error.message:'Unable to create loop')}finally{setSaving(false)}}
 const setStatus=async(id:string,status:string)=>{const token=localStorage.getItem('ssb_auth_token');const res=await fetch('/api/company-loops',{method:'PATCH',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({id,status})});if(res.ok)await loadLoops()}
 if(loading||!user||user.role!=='admin')return null

 const field=(label:string,key:keyof typeof form,multiline=false)=><label className="block space-y-1.5"><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</span>{multiline?<textarea value={String(form[key])} onChange={e=>setForm({...form,[key]:e.target.value})} rows={3} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-violet-300/40"/>:<input value={String(form[key])} onChange={e=>setForm({...form,[key]:e.target.value})} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-violet-300/40"/>}</label>

 const left=<>
  <section className="rounded-3xl border border-violet-300/15 bg-violet-400/[.035] p-4"><Radio className="h-5 w-5 text-violet-300"/><p className="mt-3 text-sm font-black text-white">Publication channels</p><p className="mt-2 text-xs leading-5 text-slate-400">One Loop can be published to Client, Agent and Bridger positions while each position receives it through its own environment.</p></section>
  <section className="rounded-3xl border border-white/10 bg-black/20 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Audience</p><div className="mt-3 space-y-2">{AUDIENCE.map(role=><button key={role} onClick={()=>toggleAudience(role)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-black capitalize ${form.audience.includes(role)?'border-violet-300/20 bg-violet-400/[.05] text-violet-200':'border-white/10 text-slate-500'}`}><span>{role}</span><span>{form.audience.includes(role)?'ON':'OFF'}</span></button>)}</div></section>
 </>

 const center=<>
  <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-violet-300">Formation console</p><h2 className="mt-1 text-xl font-black text-white">Create company movement</h2><p className="mt-2 text-xs leading-5 text-slate-400">Define the Loop once, then publish it into the selected positions.</p></div><GitBranch className="h-6 w-6 text-violet-300"/></div>
  <div className="mt-4 grid gap-3 sm:grid-cols-2">{field('Loop Number','loopNumber')}{field('Title','title')}{field('Stage','stage')}{field('Position','position')}{field('Agreement Version','agreementVersion')}<label className="block space-y-1.5"><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Publication state</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white"><option value="draft">Draft</option><option value="published">Published</option></select></label></div>
  <div className="mt-3 grid gap-3 md:grid-cols-2">{field('Purpose','purpose',true)}{field('Functions','functions',true)}{field('Economics','economics',true)}{field('Responsibilities','responsibilities',true)}{field('Boundaries','boundaries',true)}</div>
  {message&&<div className="mt-4 rounded-xl border border-violet-300/10 bg-violet-400/[.035] px-4 py-3 text-xs text-slate-300">{message}</div>}
  <button data-presence-output={form.status==='published'?'Publish Company Loop':'Preserve Company Loop draft'} disabled={saving||!form.title.trim()} onClick={()=>void createLoop()} className="mt-4 w-full rounded-xl bg-violet-300 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-950 disabled:opacity-40">{saving?'Writing movement…':form.status==='published'?'Create & publish Loop':'Preserve draft'}</button>
 </>

 const right=<>
  <section className="max-h-[520px] overflow-y-auto rounded-3xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">Loop registry</p><p className="mt-1 text-sm font-black text-white">{loops.length} records</p></div><Eye className="h-4 w-4 text-amber-300"/></div><div className="mt-3 space-y-2">{loops.length===0?<p className="text-xs text-slate-500">No Company Loops recorded.</p>:loops.map(loop=><article key={loop.id} className="rounded-xl border border-white/10 bg-white/[.02] p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-[8px] font-black uppercase text-violet-300">Loop {loop.loop_number}</p><p className="mt-1 text-xs font-black text-white">{loop.title}</p></div><span className={`text-[8px] font-black uppercase ${loop.status==='published'?'text-emerald-300':'text-slate-500'}`}>{loop.status}</span></div><p className="mt-2 text-[9px] text-slate-500">{loop.audience.join(' · ')}</p><button data-presence-output={`${loop.status==='published'?'Archive':'Publish'} Loop ${loop.loop_number}`} onClick={()=>void setStatus(loop.id,loop.status==='published'?'archived':'published')} className="mt-2 w-full rounded-lg border border-white/10 px-2 py-1.5 text-[9px] font-black text-slate-300">{loop.status==='published'?'Archive':'Publish'}</button></article>)}</div></section>
  <Link href="/admin/functions" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3 text-xs font-black text-white"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-violet-300"/>Administration Operating Room</span></Link>
 </>

 return <WeaveSystemRoom roomKey="administration-loop-workshop" eyebrow="Administration · Company Loop Workshop" title="Loop Formation Room" detail="Administration forms recurring company movement here. Publishing changes the live environments of the selected participant positions instead of creating another disconnected page." tone="violet" left={left} center={center} right={right} pulse="Loop authority online"/>
}
