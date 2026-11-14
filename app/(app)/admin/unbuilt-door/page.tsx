'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, RefreshCcw, ShieldCheck } from 'lucide-react'
import { getAuthHeaders } from '@/lib/auth-client'

type Demand = {
  id:string; category:string; location:string; title:string; description:string
  contact_email:string; status:string; verification_basis:string|null; created_at:string
}
type Interest = {
  id:string; demand_id:string; business_name:string; contact_email:string
  proposed_service:string; movement_code:string|null; demand_title:string; status:string; created_at:string
  bridger_id:string;bridge_code:string;bridger_name:string
}
export default function AdminUnbuiltDoorPage() {
  const [demands,setDemands]=useState<Demand[]>([])
  const [interests,setInterests]=useState<Interest[]>([])
  const [notes,setNotes]=useState<Record<string,string>>({})
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [loading,setLoading]=useState(true)

  const load=useCallback(async()=>{
    setLoading(true);setError('')
    try {
      const response=await fetch('/api/admin/unbuilt-door',{headers:getAuthHeaders(),cache:'no-store'})
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Review board unavailable')
      setDemands(body.demands||[])
      setInterests(body.interests||[])
    }catch(err:any){setError(err?.message||'Unable to load requests')}
    finally{setLoading(false)}
  },[])
  useEffect(()=>{void load()},[load])

  async function review(id:string,action:'verify'|'reject'|'close'){
    setBusy(id);setError('');setNotice('')
    try {
      const response=await fetch('/api/admin/unbuilt-door',{
        method:'POST',headers:getAuthHeaders(),
        body:JSON.stringify({id,action,basis:notes[id]||''}),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Review failed')
      setNotice('Review saved with a recorded Administrations identity.')
      await load()
    }catch(err:any){setError(err?.message||'Review failed')}
    finally{setBusy('')}
  }

  return <main className="min-h-screen bg-[#f8f6f0] px-4 py-7 text-[#20211f]" data-unbuilt-door-review="admin">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ddd1ba] pb-5">
        <Link href="/admin/file-folder-sales-manager" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6e5d3a]"><ArrowLeft className="h-4 w-4"/> File Folder Sales Manager</Link>
        <button onClick={()=>void load()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#a89470] px-4 text-sm font-semibold"><RefreshCcw className="h-4 w-4"/>Refresh register</button>
      </div>
      <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-[#8e7545]">Administrations · A Time · Sales evidence</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">The Unbuilt Door · Verification Workshop</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[#57544f]">This board holds private contact details and public-eligibility decisions. Confirm an actual customer inquiry outside the page before publishing it. A request must never be presented as a paid order, guaranteed sale, or promised Client.</p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/unbuilt-door" className="rounded-full border border-[#baa57d] px-4 py-2 font-semibold">Public outreach door</Link>
        <span className="rounded-full border border-[#d5c6aa] px-4 py-2">Pending: {demands.filter(x=>x.status==='pending').length}</span>
        <span className="rounded-full border border-[#d5c6aa] px-4 py-2">Verified: {demands.filter(x=>x.status==='verified').length}</span>
        <span className="rounded-full border border-[#d5c6aa] px-4 py-2">Business proposals: {interests.length}</span>
      </div>
      {loading&&<p role="status" className="mt-6 text-sm">Opening private review register…</p>}
      {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400 p-4 text-sm">{error}</p>}
      {notice&&<p role="status" className="mt-5 rounded-xl border border-green-600 p-4 text-sm">{notice}</p>}

      <section className="mt-8">
        <h2 className="text-2xl font-semibold">Requests requiring verification</h2>
        {!loading&&demands.length===0&&<p className="mt-4 rounded-2xl border border-[#e1d5c0] bg-white p-5 text-sm">No customer requests have been submitted.</p>}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {demands.map(item=><article key={item.id} className="rounded-2xl border border-[#e0d4bd] bg-white p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#7d633c]">
              <ShieldCheck className="h-4 w-4"/>{item.category} · {item.location}
              <span className="rounded-full border border-[#d5c8ab] px-2 py-1 uppercase">{item.status}</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#53524d]">{item.description}</p>
            <p className="mt-3 break-all text-sm"><strong>Private contact:</strong> {item.contact_email}</p>
            <p className="mt-1 text-xs text-[#6d6c67]">Submitted {new Date(item.created_at).toLocaleString()}</p>
            {item.verification_basis&&<p className="mt-3 border-t border-[#eee5d7] pt-3 text-xs leading-6 text-[#615b51]">Recorded review: {item.verification_basis}</p>}
            {(item.status==='pending'||item.status==='verified')&&<>
              <label className="mt-4 block text-sm font-semibold">Independent verification evidence / decision note
                <textarea rows={3} maxLength={400} value={notes[item.id]||''} onChange={e=>setNotes({...notes,[item.id]:e.target.value})} className="mt-2 w-full rounded-xl border border-[#d5cab7] px-3 py-3 text-sm" placeholder="e.g. I confirmed the inquiry directly with the person on [date]."/></label>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.status==='pending'&&<><button onClick={()=>void review(item.id,'verify')} disabled={!!busy} className="min-h-11 rounded-full bg-[#25382b] px-4 text-sm font-semibold text-white disabled:opacity-40">Verify real request</button>
                  <button onClick={()=>void review(item.id,'reject')} disabled={!!busy} className="min-h-11 rounded-full border border-[#af8178] px-4 text-sm font-semibold disabled:opacity-40">Reject</button></>}
                {item.status==='verified'&&<button onClick={()=>void review(item.id,'close')} disabled={!!busy} className="min-h-11 rounded-full border border-[#807c74] px-4 text-sm font-semibold disabled:opacity-40">Close public opportunity</button>}
              </div>
            </>}
          </article>)}
        </div>
      </section>

      <section className="mt-10 border-t border-[#ddd1ba] pt-8">
        <h2 className="text-2xl font-semibold">Prospective File Folder businesses</h2>
        <p className="mt-2 text-sm leading-6 text-[#5d5b57]">Every business response arrives through a verified, active Hope Bridger Bridge. The Bridger owns the sales relationship; Administrations independently reviews the request and verifies File Folder payment. No proposal guarantees a sale, customer, activation, or commission.</p>
        {interests.length===0&&!loading&&<p className="mt-4 rounded-2xl border border-[#e1d5c0] bg-white p-5 text-sm">No business proposals recorded.</p>}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {interests.map(item=><article key={item.id} className="rounded-2xl border border-[#e0d4bd] bg-white p-5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#836b41]"><CheckCircle2 className="h-4 w-4"/>Request · {item.status}</p>
            <h3 className="mt-2 text-lg font-semibold">{item.business_name}</h3>
            <p className="mt-2 text-sm"><strong>Related need:</strong> {item.demand_title}</p>
            <p className="mt-2 text-sm leading-6">{item.proposed_service}</p>
            <p className="mt-3 break-all text-sm"><strong>Private contact:</strong> {item.contact_email}</p>
            <p className="mt-2 text-sm font-semibold">Responsible Bridger: {item.bridger_name}</p>
            <p className="mt-1 break-all text-xs text-[#736e65]">Verified Bridge AI reference: {item.bridge_code}</p>
            <p className="mt-2 text-xs text-[#736e65]">Business interest is not a purchase. Verify the actual Bridge-linked File Folder sale before recognizing commission.</p>
          </article>)}
        </div>
      </section>
    </div>
  </main>
}
