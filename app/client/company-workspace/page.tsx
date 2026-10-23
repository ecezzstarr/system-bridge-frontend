'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Headphones, MessageSquare } from 'lucide-react'

type Offer={
  position_title:string;region:string|null;salary_usdt:string;ticket_amount_usdt:string;
  file_folder_tier:string;file_number:string;verified_at:string
}
type Msg={id:string;sender_role:string;message:string;created_at:string}
export default function ClientCompanyWorkspace() {
  const [offer,setOffer]=useState<Offer|null>(null)
  const [messages,setMessages]=useState<Msg[]>([])
  const [draft,setDraft]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  function headers() {
    return {'Content-Type':'application/json',Authorization:'Bearer '+(window.localStorage.getItem('ssb_auth_token')||'')}
  }
  async function reload(){
    const res=await fetch('/api/client/company-workspace',{headers:headers(),cache:'no-store'})
    const body=await res.json()
    if(!res.ok)throw new Error(body.error||'Unable to open your company position')
    setOffer(body.offer);setMessages(body.messages||[])
  }
  useEffect(()=>{reload().catch(e=>setError(e.message))},[])
  async function send(){
    if(!draft.trim())return
    setBusy(true);setError('')
    try{
      const res=await fetch('/api/client/company-workspace',{method:'POST',headers:headers(),body:JSON.stringify({message:draft})})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Message not sent')
      setDraft('');await reload()
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }
  return <main className="min-h-dvh bg-[#f8fafc] px-4 py-7 text-slate-900">
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/client/dashboard" className="text-sm font-bold text-slate-700">← Return to Weave Open World</Link><Link href="/client/system-switch" className="inline-flex items-center gap-2 text-sm font-bold text-amber-800">Your Client File Folder <ArrowRight size={16}/></Link></div>
      <header className="mt-7 rounded-3xl border border-amber-200 bg-gradient-to-r from-white via-amber-50 to-sky-50 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-amber-800"><BriefcaseBusiness size={20}/><p className="text-xs font-black uppercase tracking-widest">Weave · Employed Client Workspace</p></div>
        <h1 className="mt-3 text-3xl font-black">{offer?.position_title||'Company Position'}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Your employment functions are separate from your personally operated Client File Folder. Both are available through one Weave identity.</p>
      </header>
      {offer&&<div className="mt-5 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase text-slate-500">Company position</p><p className="mt-2 text-lg font-bold">{offer.position_title}</p><p className="mt-2 text-sm text-slate-500">{offer.region||'Region to be assigned'}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase text-slate-500">Agreed monthly salary</p><p className="mt-2 text-2xl font-black">{Number(offer.salary_usdt).toLocaleString()} USDT</p><p className="mt-2 text-xs text-slate-500">Employment terms; not a wallet balance or automatic payout</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase text-slate-500">Company-provided File Folder</p><p className="mt-2 text-2xl font-black capitalize">{offer.file_folder_tier}</p><p className="mt-2 text-xs text-slate-500">File Number: {offer.file_number}</p></article>
      </div>}
      {offer&&<section className="mt-5 grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2"><CheckCircle2 className="text-emerald-700" size={18}/><h2 className="font-bold">Position responsibilities</h2></div>
          <p className="mt-4 text-sm leading-6 text-slate-600">Represent Weave in your assigned region, maintain accurate records of company engagements, coordinate professional introductions and business opportunities, and report progress to Administration.</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">Introduce approved Weave offerings, including Plus File Folder, only using current company product information and agreed representation terms. Submit decisions requiring company authority to Administration.</p>
          <Link href="/client/system-switch" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white">Enter your File Folder <ArrowRight size={16}/></Link>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2"><Headphones className="text-amber-700" size={18}/><h2 className="font-bold">Assistance and Administration</h2></div>
          <p className="mt-4 text-sm leading-6 text-slate-600">Request product presentations, business meeting coordination, approval of prospective partnerships, sales guidance or assistance with your assigned work. Messages go to Administration and replies return here with notifications.</p>
          <Link href="/file-folder" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-amber-800">Public File Folder market <ArrowRight size={16}/></Link>
        </article>
      </section>}
      {offer&&<section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2"><MessageSquare className="text-sky-700" size={18}/><h2 className="font-bold">Your company communication</h2></div>
        <div className="mt-4 max-h-96 space-y-3 overflow-auto" aria-live="polite">{messages.map(msg=><div key={msg.id} className={'max-w-[90%] rounded-xl p-4 text-sm '+(msg.sender_role==='admin'?'bg-sky-50':'ml-auto bg-amber-50')}><p className="text-xs font-bold uppercase text-slate-500">{msg.sender_role==='admin'?'WEAVE Administration':'You'} · {new Date(msg.created_at).toLocaleString()}</p><p className="mt-2 whitespace-pre-wrap text-slate-800">{msg.message}</p></div>)}{!messages.length&&<p className="text-sm text-slate-500">No messages yet. Start a conversation with Administration about your work.</p>}</div>
        <label className="mt-5 block text-xs font-bold text-slate-600">Message Administration<textarea rows={4} value={draft} onChange={e=>setDraft(e.target.value)} maxLength={3000} placeholder="What assistance or approval do you need?" className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"/></label>
        <button disabled={busy||draft.trim().length<2} onClick={send} className="mt-3 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?'Sending…':'Send to Administration'}</button>
      </section>}
      {error&&<div role="alert" className="mt-5 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">{error}</div>}
    </div>
  </main>
}
