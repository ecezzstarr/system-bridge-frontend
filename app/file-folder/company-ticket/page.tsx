'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, Loader2, ShieldCheck, Ticket } from 'lucide-react'

type Offer = {
  recipient_name:string
  position_title:string
  region:string|null
  salary_usdt:string
  ticket_amount_usdt:string
  file_folder_tier:'standard'|'pro'|'premium'
  status:string
  file_number:string|null
}

export default function CompanyClientStaffTicketPage() {
  const [code,setCode]=useState('')
  const [offer,setOffer]=useState<Offer|null>(null)
  const [reference,setReference]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  async function refresh(value:string) {
    const response=await fetch('/api/public/company-client-staff/ticket?code='+encodeURIComponent(value),{cache:'no-store'})
    const body=await response.json()
    if(!response.ok) throw new Error(body.error||'Offer not available')
    setOffer(body.offer)
  }

  useEffect(()=>{
    const value=new URLSearchParams(window.location.search).get('code')||''
    setCode(value)
    if(!value){setMessage('Open the private company offer link provided by Weave Administration.');setLoading(false);return}
    refresh(value).catch(error=>setMessage(error.message)).finally(()=>setLoading(false))
  },[])

  useEffect(()=>{
    if(!code || !['verification_pending','accepted'].includes(offer?.status||'')) return
    const timer=window.setInterval(()=>{
      if(document.visibilityState==='visible') refresh(code).catch(()=>{})
    },12000)
    return()=>window.clearInterval(timer)
  },[code,offer?.status])

  async function submit(action:'accept'|'submit_ticket') {
    setBusy(true)
    setMessage('')
    try {
      const response=await fetch('/api/public/company-client-staff/ticket',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({code,action,paymentReference:reference.trim()})
      })
      const body=await response.json()
      if(!response.ok) throw new Error(body.error||'Unable to complete this stage')
      await refresh(code)
      setMessage(action==='accept'
        ? 'Your acceptance is recorded. Request the approved company USDT payment instructions before paying your Entry Ticket.'
        : 'Ticket reference received. Administration must verify it before your company-provided File Folder and staff position are released.')
    }catch(error:any){setMessage(error.message||'Unable to complete this stage')}
    finally{setBusy(false)}
  }

  return <main className="min-h-dvh bg-[#f8fafc] px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <Link href="/file-folder" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16}/> File Folder entrance</Link>
        <span className="text-xs font-bold uppercase tracking-widest text-amber-700">WEAVE · Company Entry</span>
      </div>
      <section className="mt-8 overflow-hidden rounded-3xl border border-amber-300/40 bg-white shadow-xl">
        <header className="border-b border-amber-200/60 bg-gradient-to-r from-amber-50 via-white to-sky-50 px-6 py-7">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-800"><Ticket size={20}/> Company Client Staff Entry Ticket</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Enter as a Client and a Weave employee</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">This ticket belongs to an Administration-issued employment offer. It does not purchase a File Folder. Your offered File Folder is supplied by the company after ticket verification.</p>
        </header>
        {loading?<div className="flex items-center gap-3 p-8 text-sm"><Loader2 className="animate-spin" size={20}/> Loading company invitation</div>
        :offer?<div className="space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">Named recipient</p><p className="mt-1 text-lg font-bold">{offer.recipient_name}</p>
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold"><BriefcaseBusiness size={16}/>{offer.position_title}</p>
              {offer.region&&<p className="mt-1 text-sm text-slate-500">{offer.region}</p>}
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">Company-provided File Folder</p>
              <p className="mt-1 text-2xl font-black capitalize text-amber-900">{offer.file_folder_tier}</p>
              <p className="mt-3 text-sm text-slate-500">Agreed monthly salary: <strong className="text-slate-900">{Number(offer.salary_usdt).toLocaleString()} USDT</strong></p>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-900 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-200">One-time company Entry Ticket</p>
            <p className="mt-2 text-3xl font-black">{Number(offer.ticket_amount_usdt).toLocaleString()} USDT</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Separate from the File Folder selling price. Only a verified, company-issued offer unlocks a staff Client account and its assigned File Folder.</p>
          </div>
          {offer.status==='offered'&&<button disabled={busy} onClick={()=>submit('accept')} className="w-full rounded-xl bg-slate-900 px-5 py-4 font-bold text-white disabled:opacity-60">{busy?'Saving acceptance…':'Accept the company opportunity'}</button>}
          {['accepted','payment_rejected'].includes(offer.status)&&<section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-bold">Submit your Entry Ticket payment</p>
            <p className="text-sm leading-6 text-slate-600">Obtain verified USDT wallet, network and transfer instructions directly from Weave Administration before sending funds. Do not send TRX or File Folder purchase funds for this ticket.</p>
            <label className="block text-xs font-bold text-slate-600">USDT payment transaction reference
              <input value={reference} onChange={event=>setReference(event.target.value)} placeholder="Transaction hash or payment reference" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"/>
            </label>
            <button disabled={busy||reference.trim().length<12} onClick={()=>submit('submit_ticket')} className="w-full rounded-xl bg-amber-700 px-5 py-3 font-bold text-white disabled:opacity-50">Submit ticket for Administration verification</button>
          </section>}
          {offer.status==='verification_pending'&&<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><ShieldCheck className="text-amber-700"/><p className="mt-2 font-bold">Payment verification pending</p><p className="mt-2 text-sm text-slate-600">No File Number or employee workspace is released before Administration independently verifies the payment.</p></div>}
          {offer.status==='active'&&offer.file_number&&<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><CheckCircle2 className="text-emerald-700" size={26}/><p className="mt-2 font-bold text-emerald-900">Staff Client Entry Ticket verified</p><p className="mt-2 text-sm text-slate-700">Company-provided <strong className="capitalize">{offer.file_folder_tier}</strong> File Folder ready. File Number: <strong>{offer.file_number}</strong></p><Link href={'/client/register?fileNumber='+encodeURIComponent(offer.file_number)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white">Open your Client registration <ArrowRight size={16}/></Link><p className="mt-2 text-xs text-slate-500">Already registered? Open your Client dashboard and Company Workspace.</p></div>}
          {message&&<p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">{message}</p>}
        </div>:<div className="p-8 text-sm text-slate-600">{message||'A private company offer link is required.'}</div>}
      </section>
      <p className="mt-6 text-center text-xs text-slate-500">Company Entry Tickets are not regular File Folder purchases or public employment guarantees.</p>
    </div>
  </main>
}
