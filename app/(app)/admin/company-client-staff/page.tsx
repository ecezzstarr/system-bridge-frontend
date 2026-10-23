'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BriefcaseBusiness, Check, Copy, MessageSquare, ShieldCheck, Ticket } from 'lucide-react'

type Offer = {
  id:string; access_code:string; recipient_name:string;recipient_email:string
  position_title:string;region:string|null;salary_usdt:string;ticket_amount_usdt:string
  file_folder_tier:string;status:string;payment_reference:string|null
  file_number:string|null;client_id:string|null
}
type Msg={id:string;sender_role:string;message:string;created_at:string}
const emptyForm={name:'',email:'',phone:'',positionTitle:'Regional Business Representative',region:'',salaryUsdt:'650',ticketAmountUsdt:'150'}

export default function CompanyClientStaffAdministration() {
  const [form,setForm]=useState(emptyForm)
  const [offers,setOffers]=useState<Offer[]>([])
  const [selected,setSelected]=useState<string|null>(null)
  const [messages,setMessages]=useState<Msg[]>([])
  const [reply,setReply]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [createdLink,setCreatedLink]=useState('')

  function headers() {
    const token=window.localStorage.getItem('ssb_auth_token')||''
    return {'Content-Type':'application/json',Authorization:'Bearer '+token}
  }

  async function refresh() {
    const res=await fetch('/api/admin/company-client-staff/tickets',{headers:headers(),cache:'no-store'})
    const data=await res.json()
    if(!res.ok)throw new Error(data.error||'Unable to load staff ticket offers')
    setOffers(data.offers||[])
  }
  async function refreshMessages(id:string){
    const res=await fetch('/api/admin/company-client-staff/tickets?offerId='+encodeURIComponent(id),{headers:headers(),cache:'no-store'})
    const data=await res.json()
    if(res.ok)setMessages(data.messages||[])
  }

  useEffect(()=>{
    refresh().catch(e=>setError(e.message))
    const requested=new URLSearchParams(window.location.search).get('offer')
    if(requested)setSelected(requested)
  },[])
  useEffect(()=>{if(selected)refreshMessages(selected).catch(()=>{})},[selected])

  async function createOffer(){
    setBusy(true);setError('');setCreatedLink('')
    try{
      const res=await fetch('/api/admin/company-client-staff/tickets',{method:'POST',headers:headers(),body:JSON.stringify(form)})
      const data=await res.json()
      if(!res.ok)throw new Error(data.error||'Unable to create staff offer')
      setCreatedLink(window.location.origin+data.ticketUrl)
      setForm(emptyForm)
      await refresh()
    }catch(e:any){setError(e.message)}
    finally{setBusy(false)}
  }
  async function decide(offerId:string,action:'verify'|'reject'){
    setBusy(true);setError('')
    try{
      const res=await fetch('/api/admin/company-client-staff/tickets',{method:'PATCH',headers:headers(),body:JSON.stringify({offerId,action})})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Unable to complete verification')
      await refresh()
    }catch(e:any){setError(e.message)}
    finally{setBusy(false)}
  }
  async function sendReply(){
    if(!selected||!reply.trim())return
    setBusy(true);setError('')
    try{
      const res=await fetch('/api/admin/company-client-staff/tickets',{method:'POST',headers:headers(),body:JSON.stringify({action:'reply',offerId:selected,message:reply})})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Unable to send reply')
      setReply('');await refreshMessages(selected)
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }

  const fields:[keyof typeof emptyForm,string][]=[
    ['name','Recipient full name'],['email','Recipient email'],
    ['phone','Recipient phone'],['positionTitle','Company position'],
    ['region','Region'],['salaryUsdt','Monthly salary (USDT)'],
    ['ticketAmountUsdt','One-time Entry Ticket (USDT)']
  ]
  return <main className="min-h-dvh bg-[#071220] px-4 py-8 text-white">
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/file-folder-sales-manager" className="text-sm font-semibold text-sky-200">← File Folder Sales Manager</Link>
      <div className="mt-6 flex items-center gap-3"><BriefcaseBusiness className="text-amber-200" size={28}/><h1 className="text-3xl font-black">Company Client Staff</h1></div>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">Administration creates private employment offers. The separate USDT Entry Ticket is verified here. Successful verification gives the recipient a company-provided Standard, Pro, or Premium File Folder and a Client-linked employee workspace. The ticket is not a File Folder sale.</p>
      <div className="mt-7 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2"><Ticket className="text-amber-200"/><h2 className="font-bold">Issue employment offer</h2></div>
          <div className="mt-4 grid gap-3">
            {fields.map(([key,label])=><label key={key} className="block text-xs font-semibold text-slate-300">{label}
              <input value={form[key]} type={key==='email'?'email':key==='ticketAmountUsdt'||key==='salaryUsdt'?'number':'text'}
                min={key==='ticketAmountUsdt'?'0.01':undefined} step={key==='ticketAmountUsdt'||key==='salaryUsdt'?'0.01':undefined}
                onChange={e=>setForm(prev=>({...prev,[key]:e.target.value}))}
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#0b1b2b] px-3 py-3 text-sm text-white outline-none focus:border-amber-300/50"/>
            </label>)}
          </div>
          <button disabled={busy||!form.name||!form.email||!form.phone||!form.ticketAmountUsdt} onClick={createOffer} className="mt-5 w-full rounded-lg bg-amber-200 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">Create private ticket offer</button>
          {createdLink&&<div className="mt-4 rounded-xl border border-emerald-300/30 p-4"><p className="text-xs text-emerald-200">Private company offer link</p><p className="mt-2 break-all text-xs">{createdLink}</p><button onClick={()=>navigator.clipboard.writeText(createdLink)} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-emerald-200"><Copy size={14}/> Copy invitation</button></div>}
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-bold">Offers and ticket verification</h2>
          <p className="mt-2 text-xs text-slate-400">Check actual payment independently. A submitted reference is not evidence of a settled transaction.</p>
          <div className="mt-4 max-h-[65rem] space-y-3 overflow-auto">
            {offers.map(offer=><article key={offer.id} className="rounded-xl border border-white/10 bg-[#0c1c2d] p-4">
              <div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold">{offer.recipient_name}</p><p className="text-xs text-slate-400">{offer.position_title} · {offer.region||'Region pending'}</p></div><span className="text-xs font-bold uppercase text-amber-200">{offer.status.replaceAll('_',' ')}</span></div>
              <p className="mt-3 text-xs text-slate-300">Ticket {Number(offer.ticket_amount_usdt).toLocaleString()} USDT · <strong className="capitalize">{offer.file_folder_tier}</strong> Folder company benefit · Salary {Number(offer.salary_usdt).toLocaleString()} USDT/month</p>
              {offer.payment_reference&&<p className="mt-2 break-all text-xs text-sky-200">Submitted payment reference: {offer.payment_reference}</p>}
              {offer.file_number&&<p className="mt-2 text-xs text-emerald-200">File Number: {offer.file_number}</p>}
              <div className="mt-4 flex flex-wrap gap-3">
                {offer.status==='verification_pending'&&<>
                  <button disabled={busy} onClick={()=>decide(offer.id,'verify')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold"><ShieldCheck size={14}/> Verify and issue benefit</button>
                  <button disabled={busy} onClick={()=>decide(offer.id,'reject')} className="rounded-lg border border-rose-400/40 px-3 py-2 text-xs font-bold text-rose-200">Reject proof</button>
                </>}
                <button onClick={()=>{setSelected(offer.id);refreshMessages(offer.id)}} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold"><MessageSquare size={14}/> Staff communication</button>
                <button onClick={()=>navigator.clipboard.writeText(window.location.origin+'/file-folder/company-ticket?code='+encodeURIComponent(offer.access_code))} className="inline-flex items-center gap-1 text-xs text-sky-200"><Copy size={13}/> Invite link</button>
              </div>
            </article>)}
            {!offers.length&&<p className="text-sm text-slate-400">No company Client staff offers recorded.</p>}
          </div>
        </section>
      </div>
      {selected&&<section className="mt-6 rounded-2xl border border-sky-200/20 bg-[#0b1b2b] p-5"><div className="flex items-center gap-2"><MessageSquare className="text-sky-200"/><h2 className="font-bold">Company Staff communication</h2></div>
        <div className="mt-4 max-h-80 space-y-3 overflow-auto">{messages.map(msg=><div key={msg.id} className="rounded-lg border border-white/10 p-3 text-sm"><p className="text-xs font-semibold uppercase text-slate-400">{msg.sender_role} · {new Date(msg.created_at).toLocaleString()}</p><p className="mt-2 whitespace-pre-wrap">{msg.message}</p></div>)}{!messages.length&&<p className="text-xs text-slate-400">No messages yet.</p>}</div>
        <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={3} maxLength={3000} placeholder="Reply to this employed Client" className="mt-4 w-full rounded-lg border border-white/15 bg-[#071220] p-3 text-sm"/>
        <button onClick={sendReply} disabled={busy||!reply.trim()} className="mt-3 rounded-lg bg-sky-200 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"><Check className="mr-1 inline" size={16}/> Send reply</button>
      </section>}
      {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-900/20 p-4 text-sm text-rose-200">{error}</p>}
    </div>
  </main>
}
