'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type Offer = {
  candidateName:string;recipientEmail:string;positionTitle:string
  monthlySalaryUSDT:number;ticketAmountUSDT:number;grantedTier:string|null
  applicantContributionUSDT:number;proposedPersonalLoanUSDT:number;personalLoanTerms:string|null;personalLoanAccepted:boolean
  status:string;fileNumber:string|null;receiptNumber:string|null;registerUrl:string|null;rejectionReason:string|null
}

export default function EmployeeClientTicketCrossing({offerToken}:{offerToken:string}) {
  const [offer,setOffer]=useState<Offer|null>(null)
  const [phone,setPhone]=useState('')
  const [email,setEmail]=useState('')
  const [reference,setReference]=useState('')
  const [network,setNetwork]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [loanTermsAccepted,setLoanTermsAccepted]=useState(false)

  const refresh=useCallback(async()=>{
    try {
      const response=await fetch('/api/public/client-staff-ticket?offerToken='+encodeURIComponent(offerToken),{
        cache:'no-store',
      })
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Offer unavailable')
      setOffer(data.offer)
      setEmail(data.offer.recipientEmail||'')
      setError('')
    } catch(err:any){setError(err?.message||'Offer unavailable')}
  },[offerToken])

  useEffect(()=>{void refresh()},[refresh])
  useEffect(()=>{
    if(!offer||offer.status!=='pending_verification')return
    const poll=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh()},8000)
    return()=>window.clearInterval(poll)
  },[offer?.status,refresh])

  async function submit(action:'accept'|'submit_payment'){
    setBusy(true);setError('')
    try {
      const response=await fetch('/api/public/client-staff-ticket',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({offerToken,action,email,phone,paymentReference:reference,paymentNetwork:network,personalLoanTermsAccepted:loanTermsAccepted}),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to continue')
      await refresh()
    }catch(err:any){setError(err?.message||'Unable to continue')}
    finally{setBusy(false)}
  }

  return <main className="min-h-dvh bg-[#050d15] px-4 py-10 text-white">
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/file-folder" className="text-sm text-cyan-200">← File Folder entrance</Link>
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-200">WEAVE · Company position ticket</p>
        <h1 className="text-3xl font-black">Employee File Folder entrance</h1>
        <p className="text-sm leading-6 text-slate-300">An employment entry ticket is separate from buying a File Folder. An approved company employee receives a company-granted File Folder at the tier of their verified ticket. Ordinary File Folder purchases continue through their own checkout.</p>
      </header>
      {error&&<p role="alert" className="rounded-xl border border-rose-400/40 p-4 text-sm text-rose-200">{error}</p>}
      {!offer&&!error&&<p className="text-slate-300">Reading your private invitation…</p>}
      {offer&&<section className="space-y-5 rounded-2xl border border-cyan-200/20 bg-slate-900/60 p-5 sm:p-7">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-cyan-200">Offered to {offer.candidateName}</p>
          <h2 className="text-2xl font-bold">{offer.positionTitle}</h2>
          <p className="text-sm text-slate-200">Monthly salary: <strong>{offer.monthlySalaryUSDT>0?offer.monthlySalaryUSDT.toLocaleString()+' USDT/month — subject to signed terms':'Not yet agreed; see employment position documents'}</strong></p>
          <p className="text-sm text-slate-200">Company entry ticket: <strong>{offer.ticketAmountUSDT.toLocaleString()} USDT</strong> (not a File Folder purchase)</p>
          <p className="text-sm text-slate-200">Your payment portion: <strong>{offer.applicantContributionUSDT.toLocaleString()} USDT</strong></p>
          {offer.proposedPersonalLoanUSDT>0&&<div className="rounded-xl border border-amber-200/25 bg-amber-200/5 p-4">
            <p className="text-sm text-amber-100">Proposed personal loan: <strong>{offer.proposedPersonalLoanUSDT.toLocaleString()} USDT</strong>. This is not yet proof of funds. The offer needs your agreement and separate verification of loan funding.</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{offer.personalLoanTerms}</p>
          </div>}
          <p className="text-xs text-slate-400">Paying a ticket is not a File Folder purchase or an automatic salary payment. Employment is governed by the company's accepted terms and Administration approval.</p>
          <p className="text-sm text-cyan-200">Status: {offer.status.replaceAll('_',' ')}</p>
        </div>
        {offer.status==='offered'&&<form onSubmit={e=>{e.preventDefault();void submit('accept')}} className="space-y-3">
          <label className="block text-sm">Invitation email
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/>
          </label>
          <label className="block text-sm">Contact phone
            <input type="tel" required minLength={7} value={phone} onChange={e=>setPhone(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/>
          </label>
          {offer.proposedPersonalLoanUSDT>0&&<label className="flex items-start gap-2 text-sm leading-6 text-slate-200">
            <input type="checkbox" checked={loanTermsAccepted} onChange={e=>setLoanTermsAccepted(e.target.checked)} className="mt-1"/>
            I have read and agree to the stated personal loan amount and repayment terms. The loan does not become funded just by ticking this box.
          </label>}
          <button disabled={busy||(offer.proposedPersonalLoanUSDT>0&&!loanTermsAccepted)} type="submit" className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{busy?'Recording…':'Accept company offer'}</button>
        </form>}
        {offer.status==='accepted'&&<form onSubmit={e=>{e.preventDefault();void submit('submit_payment')}} className="space-y-3">
          <p className="text-sm text-slate-200">Follow the verified payment instructions in your official company offer. Record your {offer.applicantContributionUSDT.toLocaleString()} USDT contribution payment network and actual transaction reference here for Administration to examine. No payment is sent by this page.</p>
          <label className="block text-sm">Payment network
            <input required value={network} placeholder="USDT network used" onChange={e=>setNetwork(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/>
          </label>
          <label className="block text-sm">USDT transaction reference
            <input required minLength={6} value={reference} onChange={e=>setReference(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/>
          </label>
          <button disabled={busy} type="submit" className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{busy?'Recording…':'Submit ticket for Administration verification'}</button>
        </form>}
        {offer.status==='pending_verification'&&<p className="rounded-xl border border-amber-200/30 p-4 text-sm text-amber-100">Ticket reference received. Administration must independently verify payment before a File Number can be issued. <button className="ml-2 underline" onClick={()=>void refresh()} type="button">Check status</button></p>}
        {offer.status==='approved'&&<div className="space-y-3">
          <p className="text-sm text-emerald-200">Administration verified the ticket. Your <strong>{offer.grantedTier?.toUpperCase()}</strong> File Folder is granted through the company, not purchased.</p>
          <p className="text-sm">Issued File Number: <strong>{offer.fileNumber}</strong></p>
          <p className="text-xs text-slate-300">Verified ticket receipt: {offer.receiptNumber}</p>
          {offer.registerUrl&&<Link href={offer.registerUrl+'&staffOffer='+encodeURIComponent(offerToken)} className="inline-flex rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950">Open Client registration →</Link>}
        </div>}
        {offer.status==='rejected'&&<p className="text-sm text-rose-200">Administration did not verify the submitted ticket. {offer.rejectionReason}</p>}
      </section>}
    </div>
  </main>
}
