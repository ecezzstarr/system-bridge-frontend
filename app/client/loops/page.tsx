'use client'

import { useEffect,useMemo,useState } from 'react'
import Link from 'next/link'
import { ArrowLeft,CheckCircle2,FileText,GitBranch,Lock,PenLine,RefreshCw,ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { WeaveSystemRoom } from '@/components/world/weave-system-room'

type Loop={id:string;loop_number:number;title:string;purpose:string;stage:string;position:string;functions:string;economics:string;responsibilities:string;boundaries:string;agreement_version:string|null;audience:string[]}
type Document={key:string;title:string;version:string;required:boolean;body:string}
type Accepted={document_key:string;document_title:string;document_version:string;accepted_at:string}

function Info({label,value}:{label:string;value:string}) {
 return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-xs leading-5 text-slate-300 whitespace-pre-wrap">{value||'—'}</p></div>
}

export default function ClientLoopsPage(){
 const {user:client,token,isInitialized}=useAuth()
 const [loops,setLoops]=useState<Loop[]>([]),[documents,setDocuments]=useState<Document[]>([]),[accepted,setAccepted]=useState<Accepted[]>([])
 const [loading,setLoading]=useState(true),[message,setMessage]=useState(''),[openDoc,setOpenDoc]=useState<string|null>(null),[working,setWorking]=useState<string|null>(null)

 const load=async()=>{
  if(!client||!token){window.location.href='/client/login';return}
  try{
   const headers={Authorization:`Bearer ${token}`}
   const [loopRes,docRes]=await Promise.all([fetch('/api/company-loops?role=client',{headers,cache:'no-store'}),fetch('/api/client/agreements',{headers,cache:'no-store'})])
   if(loopRes.status===401||docRes.status===401){window.location.href='/client/login';return}
   const loopData=await loopRes.json(),docData=await docRes.json()
   if(!loopRes.ok||!docRes.ok)throw new Error('Unable to load Client records')
   setLoops(loopData.loops||[]);setDocuments(docData.documents||[]);setAccepted(docData.accepted||[])
  }catch{setMessage('Unable to load the Client Loop Field.')}finally{setLoading(false)}
 }
 useEffect(()=>{if(isInitialized)void load()},[isInitialized,client?.id,token])

 const acceptedKeys=useMemo(()=>new Set(accepted.map(item=>`${item.document_key}:${item.document_version}`)),[accepted])
 const requiredPending=documents.filter(d=>d.required&&!acceptedKeys.has(`${d.key}:${d.version}`)).length

 const accept=async(doc:Document)=>{
  setWorking(doc.key);setMessage('')
  try{
   const res=await fetch('/api/client/agreements',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({documentKey:doc.key,accept:true})})
   const data=await res.json();if(!res.ok)throw new Error(data.error||'Unable to record acceptance')
   setMessage(`${doc.title} accepted and preserved in your Client position.`);await load()
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to record acceptance')}finally{setWorking(null)}
 }

 const left=<>
  <section className="rounded-3xl border border-sky-300/15 bg-sky-400/[.035] p-4">
   <p className="text-[9px] font-black uppercase tracking-[.18em] text-sky-300">Loop position</p>
   <p className="mt-3 text-lg font-black text-white">Client</p>
   <p className="mt-2 text-xs leading-5 text-slate-400">System Switch establishes your place. Company Loops carry shared movement through time without replacing your File Folder.</p>
  </section>
  <section className="rounded-3xl border border-white/10 bg-black/20 p-4">
   <p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-500">Field state</p>
   <div className="mt-3 grid grid-cols-2 gap-2 text-center">
    <div className="rounded-xl border border-white/10 bg-white/[.025] p-3"><p className="text-xl font-black text-white">{loops.length}</p><p className="text-[8px] uppercase text-slate-500">Loops</p></div>
    <div className="rounded-xl border border-white/10 bg-white/[.025] p-3"><p className={`text-xl font-black ${requiredPending?'text-amber-300':'text-emerald-300'}`}>{requiredPending}</p><p className="text-[8px] uppercase text-slate-500">Pending docs</p></div>
   </div>
  </section>
 </>

 const right=<>
  <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[.035] p-4">
   <ShieldCheck className="h-5 w-5 text-emerald-300"/>
   <p className="mt-3 text-sm font-black text-white">Persistent record</p>
   <p className="mt-2 text-xs leading-5 text-slate-400">Agreement versions and acceptance time remain attached to the same Client position.</p>
  </section>
  <Link href="/client/dashboard" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3 text-xs font-black text-white"><span className="inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4 text-sky-300"/>Client World</span></Link>
 </>

 const center=loading?<div className="flex min-h-[420px] items-center justify-center"><RefreshCw className="h-7 w-7 animate-spin text-sky-300"/></div>:<>
  {message&&<div className="mb-4 rounded-xl border border-sky-300/10 bg-sky-400/[.035] px-4 py-3 text-xs text-slate-300">{message}</div>}
  <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
   <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-sky-300">Live loop ground</p><h2 className="mt-1 text-xl font-black text-white">Published movement</h2><p className="mt-2 text-xs leading-5 text-slate-400">{client?.business_name||client?.name} · movement that Administration has opened to the Client position.</p></div>
   <GitBranch className="h-6 w-6 text-sky-300"/>
  </div>
  <div className="mt-4 space-y-3">
   {loops.length===0?<p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">No Client Loop is open yet.</p>:loops.map(loop=><article key={loop.id} className="rounded-2xl border border-sky-300/10 bg-sky-400/[.025] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-wider text-sky-300">Loop {loop.loop_number}{loop.stage?` · ${loop.stage}`:''}</p><h3 className="mt-1 text-lg font-black text-white">{loop.title}</h3></div><span className="rounded-full border border-emerald-300/15 bg-emerald-400/[.05] px-3 py-1 text-[9px] font-black uppercase text-emerald-300">Available</span></div>
    <p className="mt-3 text-sm leading-6 text-slate-300">{loop.purpose}</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2"><Info label="Position" value={loop.position}/><Info label="Functions" value={loop.functions}/><Info label="Economics" value={loop.economics}/><Info label="Responsibilities" value={loop.responsibilities}/><Info label="Boundaries" value={loop.boundaries}/><Info label="Agreement" value={loop.agreement_version||'No separate agreement version attached'}/></div>
   </article>)}
  </div>

  <div className="mt-6 border-t border-white/10 pt-5"><p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300">Record chamber</p><h2 className="mt-1 text-xl font-black text-white">Documents & agreements</h2><p className="mt-2 text-xs leading-5 text-slate-400">Open a record, read it and preserve acceptance against this Client position.</p></div>
  <div className="mt-4 space-y-3">{documents.map(doc=>{const signed=acceptedKeys.has(`${doc.key}:${doc.version}`);const acceptedAt=accepted.find(a=>a.document_key===doc.key&&a.document_version===doc.version)?.accepted_at;return <article key={doc.key} className="rounded-2xl border border-white/10 bg-black/20 p-4">
   <div className="flex items-start gap-3"><div className="rounded-xl border border-white/10 bg-white/[.03] p-2"><FileText className="h-4 w-4 text-amber-300"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-white">{doc.title}</h3><span className={`text-[8px] font-black uppercase ${doc.required?'text-amber-300':'text-slate-500'}`}>{doc.required?'Required':'Notice'}</span></div><p className="mt-1 text-[10px] text-slate-500">Version {doc.version}</p></div><button data-presence-output={`Open Client record ${doc.title}`} onClick={()=>setOpenDoc(openDoc===doc.key?null:doc.key)} className="rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black text-slate-300">{openDoc===doc.key?'Close':'Read'}</button></div>
   {openDoc===doc.key&&<div className="mt-4 rounded-xl border border-white/10 bg-[#06101d]/80 p-4"><p className="text-sm leading-6 text-slate-300">{doc.body}</p><div className="mt-4 flex flex-wrap items-center gap-3"><button data-presence-output={`Accept Client record ${doc.title}`} onClick={()=>void accept(doc)} disabled={signed||working===doc.key} className="inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-2 text-xs font-black text-slate-950 disabled:opacity-40">{signed?<CheckCircle2 className="h-4 w-4"/>:<PenLine className="h-4 w-4"/>}{signed?'Accepted':working===doc.key?'Recording…':'Read & accept'}</button>{!signed&&<span className="inline-flex items-center gap-2 text-[10px] text-slate-500"><Lock className="h-3 w-3"/>Recorded to Client position</span>}</div></div>}
   {signed&&<p className="mt-3 text-[10px] font-bold text-emerald-300">Accepted · {acceptedAt?new Date(acceptedAt).toLocaleString():'recorded'}</p>}
  </article>})}</div>
 </>

 return <WeaveSystemRoom roomKey="client-loop-field" eyebrow="Client World · Company Loops" title="Loop Field" detail="Company movement appears as a live field around the same Client position. Loops, responsibilities and agreements remain connected to the File Folder rather than becoming separate pages." tone="sky" left={left} center={center} right={right} pulse={requiredPending?'Record review required':'Client Loop Field synchronized'}/>
}
