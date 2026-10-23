'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'

type Offer = {
  id:string;candidate_name:string;candidate_email:string;position_title:string
  monthly_salary_usdt:number;ticket_amount_usdt:number;folder_tier:string;status:string
  payment_reference:string|null;payment_network:string|null;file_number:string|null;verified_at:string|null
}

export default function AdminClientStaffOffers() {
  const { user,token,isInitialized } = useAuth()
  const [name,setName] = useState('')
  const [email,setEmail] = useState('')
  const [position,setPosition] = useState('Company Representative · File Folder Business Relations')
  const [salary,setSalary] = useState('650')
  const [ticket,setTicket] = useState('150')
  const [invitation,setInvitation] = useState('')
  const [offers,setOffers] = useState<Offer[]>([])
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [checks,setChecks] = useState<Record<string,boolean>>({})

  const load=useCallback(async()=>{
    if(!token)return
    const response=await fetch('/api/admin/client-staff-offers',{
      headers:{Authorization:'Bearer '+token},cache:'no-store',
    })
    const data=await response.json()
    if(!response.ok)throw new Error(data.error||'Unable to load offers')
    setOffers(data.offers||[])
  },[token])

  useEffect(()=>{
    if(user?.role==='admin'&&token)void load().catch(e=>setError(e.message))
  },[user?.role,token,load])

  async function create(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError('');setNotice('');setInvitation('')
    try {
      const response=await fetch('/api/admin/client-staff-offers',{
        method:'POST',
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({candidateName:name,candidateEmail:email,positionTitle:position,
          monthlySalaryUSDT:Number(salary),ticketAmountUSDT:Number(ticket)}),
      })
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Unable to create invitation')
      setInvitation(window.location.origin+data.invitationPath)
      setNotice('Private offer created. Copy its link for the named recipient; it is shown only once.')
      await load()
    }catch(e:any){setError(e?.message||'Unable to create invitation')}
    finally{setBusy(false)}
  }

  async function review(offerId:string,action:'approve'|'reject'){
    setBusy(true);setError('');setNotice('')
    try{
      const reason=action==='reject'?'USDT ticket not verified':undefined
      const response=await fetch('/api/admin/client-staff-offers',{
        method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({offerId,action,reason,paymentChecked:action==='approve'&&Boolean(checks[offerId])}),
      })
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Verification could not be recorded')
      setNotice(action==='approve'?'Company ticket verified and employee File Number issued.':'Ticket rejected.')
      setChecks(prev=>({...prev,[offerId]:false}))
      await load()
    }catch(e:any){setError(e?.message||'Unable to review ticket')}
    finally{setBusy(false)}
  }

  if(!isInitialized)return <main className="p-6 text-slate-300">Opening company employment tickets…</main>
  if(user?.role!=='admin')return <main className="p-6 text-slate-300">Administration only.</main>
  return <main className="mx-auto max-w-6xl space-y-7 px-4 py-7 text-white">
    <Link href="/admin/employment-applications" className="text-sm text-cyan-200">← Employment applications</Link>
    <header className="space-y-2">
      <p className="text-xs uppercase tracking-widest text-cyan-200">Administration · Client staff employment</p>
      <h1 className="text-3xl font-black">Company offers & employee tickets</h1>
      <p className="max-w-3xl text-sm leading-6 text-slate-300">Create private employment offers, inspect independently verified USDT ticket references and issue a granted Client File Folder. These entries do not appear in retail File Folder purchase sales. Offered salaries are confidential and are not paid automatically.</p>
    </header>
    {error&&<p role="alert" className="rounded-xl border border-rose-300/30 p-4 text-rose-200">{error}</p>}
    {notice&&<p role="status" className="rounded-xl border border-cyan-300/30 p-4 text-cyan-100">{notice}</p>}
    <form onSubmit={create} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:grid-cols-2">
      <h2 className="text-xl font-bold sm:col-span-2">Create a private offer</h2>
      <label className="text-sm">Recipient name<input required value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
      <label className="text-sm">Recipient email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
      <label className="text-sm sm:col-span-2">Company position<input required value={position} onChange={e=>setPosition(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
      <label className="text-sm">Monthly salary in USDT<input required type="number" min="0" step=".01" value={salary} onChange={e=>setSalary(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
      <label className="text-sm">Separate company ticket in USDT<input required type="number" min=".01" step=".01" value={ticket} onChange={e=>setTicket(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
      <p className="text-xs text-slate-400 sm:col-span-2">Below 150 USDT grants Standard; 150–5,000 USDT grants Pro; above 5,000 USDT grants Premium. The File Folder is company-granted, not purchased through this ticket.</p>
      <button disabled={busy} type="submit" className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-40 sm:col-span-2">{busy?'Working…':'Issue private company offer'}</button>
      {invitation&&<div className="space-y-2 break-all rounded-xl border border-cyan-300/30 p-4 text-sm sm:col-span-2">
        <p>Private one-time invitation link (save now):</p><p>{invitation}</p>
        <button type="button" className="text-cyan-200 underline" onClick={()=>void navigator.clipboard.writeText(invitation)}>Copy invitation link</button>
      </div>}
    </form>
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Issued company offers</h2><button onClick={()=>void load().catch(e=>setError(e.message))} type="button" className="text-sm text-cyan-200 underline">Refresh</button></div>
      {offers.map(offer=><article key={offer.id} className="space-y-3 rounded-xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div>
          <h3 className="font-bold">{offer.candidate_name} · {offer.position_title}</h3>
          <p className="text-xs text-slate-400">{offer.candidate_email}</p>
        </div><span className="rounded-lg border border-white/20 p-2 text-xs">{offer.status.replaceAll('_',' ')}</span></div>
        <p className="text-sm text-slate-200">{offer.ticket_amount_usdt} USDT entry ticket · {offer.folder_tier.toUpperCase()} granted folder · {offer.monthly_salary_usdt} USDT/month offered salary</p>
        {offer.payment_reference&&<p className="break-all rounded-lg bg-slate-900 p-3 text-xs">Submitted payment: {offer.payment_network} · {offer.payment_reference}</p>}
        {offer.file_number&&<p className="text-xs text-cyan-200">Issued File Number: {offer.file_number}</p>}
        {offer.status==='pending_verification'&&<>
          <label className="flex items-start gap-3 text-sm leading-6 text-slate-200">
            <input type="checkbox" checked={Boolean(checks[offer.id])} onChange={e=>setChecks(p=>({...p,[offer.id]:e.target.checked}))} className="mt-1"/>
            I independently verified the transaction, recipient, network, exact USDT amount and payment reference outside this website.
          </label>
          <div className="flex gap-2">
            <button disabled={busy||!checks[offer.id]} type="button" onClick={()=>void review(offer.id,'approve')} className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40">Verify ticket and grant folder</button>
            <button disabled={busy} type="button" onClick={()=>void review(offer.id,'reject')} className="rounded-lg border border-rose-300/40 px-4 py-2 text-sm text-rose-200 disabled:opacity-40">Reject ticket</button>
          </div>
        </>}
      </article>)}
      {!offers.length&&<p className="text-sm text-slate-400">No company staff offers found.</p>}
    </section>
  </main>
}
