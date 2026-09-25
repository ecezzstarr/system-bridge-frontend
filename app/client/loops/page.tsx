'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, FileText, Lock, PenLine, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

type Loop = { id:string; loop_number:number; title:string; purpose:string; stage:string; position:string; functions:string; economics:string; responsibilities:string; boundaries:string; agreement_version:string|null; audience:string[] }
type Document = { key:string; title:string; version:string; required:boolean; body:string }
type Accepted = { document_key:string; document_title:string; document_version:string; accepted_at:string }

export default function ClientLoopsPage() {
  const { user: client, token, isInitialized } = useAuth()
  const [loops,setLoops] = useState<Loop[]>([])
  const [documents,setDocuments] = useState<Document[]>([])
  const [accepted,setAccepted] = useState<Accepted[]>([])
  const [loading,setLoading] = useState(true)
  const [message,setMessage] = useState('')
  const [openDoc,setOpenDoc] = useState<string|null>(null)
  const [working,setWorking] = useState<string|null>(null)

  const load = async () => {
    const user = client
    if (!user || !token) { window.location.href='/client/login'; return }

    try {
      const headers = { Authorization:`Bearer ${token}` }
      const [loopRes, docRes] = await Promise.all([fetch('/api/company-loops?role=client',{headers}), fetch('/api/client/agreements',{headers})])
      if (loopRes.status===401 || docRes.status===401) { window.location.href='/client/login'; return }
      const loopData=await loopRes.json(); const docData=await docRes.json()
      if (!loopRes.ok || !docRes.ok) throw new Error('Unable to load client records')
      setLoops(loopData.loops||[]); setDocuments(docData.documents||[]); setAccepted(docData.accepted||[])
    } catch { setMessage('Unable to load the Client environment.') }
    finally { setLoading(false) }
  }
  useEffect(()=>{ if (isInitialized) load() },[isInitialized, client?.id, token])

  const acceptedKeys = useMemo(()=>new Set(accepted.map(item=>`${item.document_key}:${item.document_version}`)),[accepted])
  const requiredPending = documents.filter(d=>d.required&&!acceptedKeys.has(`${d.key}:${d.version}`)).length

  const accept = async (doc:Document) => {
    setWorking(doc.key); setMessage('')
    try {
      const res=await fetch('/api/client/agreements',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({documentKey:doc.key,accept:true})})
      const data=await res.json(); if(!res.ok) throw new Error(data.error||'Unable to record acceptance')
      setMessage(`${doc.title} accepted and recorded.`); await load()
    } catch(e) { setMessage(e instanceof Error?e.message:'Unable to record acceptance') }
    finally { setWorking(null) }
  }

  if (loading) return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center"><RefreshCw className="animate-spin"/></main>

  return <main className="min-h-screen bg-slate-950 text-white p-4 lg:p-8">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div><Link href="/client/dashboard" className="text-xs text-cyan-400 inline-flex items-center gap-2 mb-3"><ArrowLeft className="w-3 h-3"/> Client World</Link><h1 className="text-2xl lg:text-3xl font-bold">Client Position</h1><p className="mt-2 text-sm text-slate-400">{client?.business_name || client?.name} · System Switch → Interaction in Motion → Company Loops</p></div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">Document status</p><p className={`text-sm font-semibold ${requiredPending?'text-amber-400':'text-green-400'}`}>{requiredPending?`${requiredPending} required to review`:'All required documents current'}</p></div>
      </div>

      {message && <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">{message}</div>}

      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-cyan-500/20 bg-slate-900/70 p-5"><p className="text-xs uppercase tracking-wider text-cyan-400">Your position</p><h2 className="mt-2 text-xl font-semibold">Client</h2><p className="mt-2 text-sm text-slate-400">You are the source. Your interaction becomes the work recognized by the company.</p></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Your crossing</p><h2 className="mt-2 text-xl font-semibold">System Switch</h2><p className="mt-2 text-sm text-slate-400">The crossing establishes your place; the Loops carry what continues after it.</p></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Administration</p><h2 className="mt-2 text-xl font-semibold">Continuous recognition</h2><p className="mt-2 text-sm text-slate-400">Work is reviewed before a subsequent Loop is presented and activated.</p></div>
      </section>

      <section className="mb-10 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between mb-5"><div><p className="text-xs uppercase tracking-wider text-cyan-400">Company events</p><h2 className="mt-1 text-xl font-semibold">Your Loops</h2></div><span className="text-xs text-slate-500">{loops.length} published</span></div>
        {loops.length===0 ? <p className="text-sm text-slate-500">No Client Loop has been published yet.</p> : <div className="space-y-4">{loops.map(loop=><article key={loop.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-cyan-400">Loop {loop.loop_number}{loop.stage?` · ${loop.stage}`:''}</p><h3 className="mt-1 text-lg font-semibold">{loop.title}</h3></div><span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs text-green-400">Available</span></div><p className="mt-3 text-sm text-slate-300">{loop.purpose}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Info label="Position" value={loop.position}/><Info label="Functions" value={loop.functions}/><Info label="Economics" value={loop.economics}/><Info label="Responsibilities" value={loop.responsibilities}/><Info label="Boundaries" value={loop.boundaries}/><Info label="Agreement" value={loop.agreement_version||'No separate agreement version attached'}/></div></article>)}</div>}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"><div className="mb-5"><p className="text-xs uppercase tracking-wider text-cyan-400">Persistent record</p><h2 className="mt-1 text-xl font-semibold">Client Documents & Agreements</h2><p className="mt-2 text-sm text-slate-400">Read each applicable document. Acceptance records the document version and time against your Client position.</p></div><div className="space-y-3">{documents.map(doc=>{const signed=acceptedKeys.has(`${doc.key}:${doc.version}`);return <div key={doc.key} className="rounded-lg border border-slate-800 bg-slate-950/70 p-4"><div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg bg-slate-800 p-2"><FileText className="w-4 h-4 text-cyan-400"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{doc.title}</h3>{doc.required?<span className="text-[10px] uppercase tracking-wider text-amber-400">Required</span>:<span className="text-[10px] uppercase tracking-wider text-slate-500">Notice</span>}</div><p className="mt-1 text-xs text-slate-500">Version {doc.version}</p>{openDoc===doc.key&&<div className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-4"><p className="text-sm leading-6 text-slate-300">{doc.body}</p><div className="mt-4 flex flex-wrap gap-3"><button onClick={()=>accept(doc)} disabled={signed||working===doc.key} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold disabled:opacity-40">{signed?<CheckCircle2 className="w-4 h-4"/>:<PenLine className="w-4 h-4"/>}{signed?'Accepted':'I have read and accept'}</button>{!signed&&<span className="inline-flex items-center gap-2 text-xs text-slate-500"><Lock className="w-3 h-3"/> Recorded to Client position</span>}</div></div>}</div><button onClick={()=>setOpenDoc(openDoc===doc.key?null:doc.key)} className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800">{openDoc===doc.key?'Close':'Read'}</button></div>{signed&&<p className="mt-3 ml-11 text-xs text-green-400">Accepted · {accepted.find(a=>a.document_key===doc.key&&a.document_version===doc.version)?.accepted_at ? new Date(accepted.find(a=>a.document_key===doc.key&&a.document_version===doc.version)!.accepted_at).toLocaleString() : 'recorded'}</p>}</div>})}</div></section>
    </div>
  </main>
}

function Info({label,value}:{label:string;value:string}) { return <div className="rounded-lg border border-slate-800 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-xs text-slate-300 whitespace-pre-wrap">{value||'—'}</p></div> }
