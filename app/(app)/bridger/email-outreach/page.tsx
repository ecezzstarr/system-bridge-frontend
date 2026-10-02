'use client'

import { useCallback, useEffect, useState } from 'react'
import { Mail, RefreshCw, Send, WalletCards } from 'lucide-react'

import { getAuthHeaders } from '@/lib/auth-client'

type Lead = {
  id:string
  lead_code:string
  name?:string|null
  email:string
  source:string
  consent_basis:string
  status:string
  acquired_at?:string|null
}

type Outreach = {
  id:string
  lead_id:string
  lead_code:string
  name?:string|null
  email:string
  subject:string
  status:string
  sent_at?:string|null
  replied_at?:string|null
  failure_reason?:string|null
}

export default function BridgerEmailOutreachPage(){
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [sourceEmail,setSourceEmail]=useState('')
  const [displayName,setDisplayName]=useState('')
  const [subject,setSubject]=useState('')
  const [message,setMessage]=useState('')

  const load=useCallback(async()=>{
    setLoading(true);setError('')
    const controller=new AbortController()
    const timeout=window.setTimeout(()=>controller.abort(),15000)
    try{
      const state=await fetch('/api/bridger/email-outreach',{
        headers:getAuthHeaders(),
        cache:'no-store',
        signal:controller.signal,
      })
      const body=await state.json().catch(()=>({error:'Email Outreach returned an invalid response'}))
      if(!state.ok)throw new Error(body.error||'Unable to open email outreach')
      setData(body)
      setSourceEmail(body.sender?.source_email||body.sender?.reply_email||body.accountEmail||'')
      setDisplayName(body.sender?.display_name||'')
      setSubject(v=>v||body.defaultSubject||'')
      setMessage(v=>v||body.defaultMessage||'')
    }catch(e:any){
      setError(e?.name==='AbortError'?'Email Outreach did not answer within 15 seconds. Retry after the environment reconnects.':e?.message||'Unable to open email outreach')
    }finally{
      window.clearTimeout(timeout)
      setLoading(false)
    }
  },[])

  useEffect(()=>{load()},[load])

  const saveSender=async()=>{
    setBusy('sender');setError('');setNotice('')
    try{
      const response=await fetch('/api/email-outreach/sender',{
        method:'POST',headers:getAuthHeaders(),
        body:JSON.stringify({sourceEmail,displayName}),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to save outreach email')
      setNotice('Source email saved and active. Replies return to this mailbox.')
      await load()
    }catch(e:any){setError(e?.message||'Unable to save outreach email')}
    finally{setBusy('')}
  }

  const acquire=async()=>{
    setBusy('acquire');setError('');setNotice('')
    try{
      const response=await fetch('/api/bridger/email-outreach',{
        method:'POST',headers:getAuthHeaders(),body:JSON.stringify({action:'acquire'}),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to acquire email Prospect')
      setNotice(`Email Prospect ${body.lead?.lead_code||''} acquired for ${data.priceFlameCoin} Flame Coin.`)
      await load()
    }catch(e:any){setError(e?.message||'Unable to acquire email Prospect')}
    finally{setBusy('')}
  }

  const sendLead=async(lead:Lead)=>{
    setBusy('send:'+lead.id);setError('');setNotice('')
    try{
      const response=await fetch('/api/bridger/email-outreach',{
        method:'POST',headers:getAuthHeaders(),
        body:JSON.stringify({action:'send',leadId:lead.id,subject,message}),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Email outreach failed')
      setNotice(`Email sent to ${lead.lead_code}. Delivery is recorded in your outreach report.`)
      await load()
    }catch(e:any){setError(e?.message||'Email outreach failed')}
    finally{setBusy('')}
  }

  const markReplied=async(row:Outreach)=>{
    setBusy('reply:'+row.id)
    try{
      const response=await fetch('/api/bridger/email-outreach',{
        method:'POST',headers:getAuthHeaders(),
        body:JSON.stringify({action:'mark_replied',outreachId:row.id}),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to update report')
      await load()
    }catch(e:any){setError(e?.message||'Unable to update report')}
    finally{setBusy('')}
  }

  if(loading)return <main className="flex min-h-[55vh] items-center justify-center text-sm text-slate-400">Opening Email Outreach…</main>

  const leads:Lead[]=data?.leads||[]
  const outreach:Outreach[]=data?.outreach||[]
  const sentLeadIds=new Set(outreach.filter(row=>row.status==='sent'||row.status==='replied').map(row=>row.lead_id))

  return <main className="relative px-4 pb-16 pt-12 text-white" data-bridger-email-outreach="true">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(56,189,248,.12),transparent_26%),radial-gradient(circle_at_84%_62%,rgba(16,185,129,.08),transparent_30%)]"/>
    <div className="relative mx-auto max-w-5xl">
      <header className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-sky-300"><Mail className="h-4 w-4"/><span className="text-[9px] font-black uppercase tracking-[.2em]">Bridger · Email Outreach</span></div>
        <h1 className="mt-3 text-3xl font-black">Email Prospect Movement</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Email Prospects cost half the normal Prospect reference: <b className="text-white">{data.priceFlameCoin} Flame Coin</b> each. Acquire one, send the human-first message, then record the response.</p>
      </header>

      {(error||notice)&&<div className={`mt-5 border-l-2 px-4 py-3 text-sm ${error?'border-rose-400 text-rose-200':'border-emerald-400 text-emerald-200'}`}>{error||notice}</div>}

      <section className="mt-7 grid gap-5 md:grid-cols-[1fr_1fr]">
        <div className="border-y border-white/10 py-5">
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-sky-300">01 · Email Source</p>
          <label className="mt-4 block text-[9px] font-black uppercase tracking-[.12em] text-slate-500">Your source email</label>
          <input value={sourceEmail} onChange={e=>setSourceEmail(e.target.value)} className="mt-2 w-full border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-sky-300/50" placeholder="you@example.com"/>
          <label className="mt-4 block text-[9px] font-black uppercase tracking-[.12em] text-slate-500">Display name</label>
          <input value={displayName} onChange={e=>setDisplayName(e.target.value)} className="mt-2 w-full border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-sky-300/50" placeholder="Your name · WEAVE Bridger"/>
          <button onClick={saveSender} disabled={busy==='sender'} className="mt-4 border border-sky-300/30 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.14em] text-sky-100 disabled:opacity-40">{busy==='sender'?'Saving…':'Activate source email'}</button>
          <p className="mt-3 text-[10px] leading-5 text-slate-500">This is your Bridger source identity. WEAVE sends through its configured mail transport and Prospect replies return to this source mailbox.</p>
        </div>

        <div className="border-y border-white/10 py-5">
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-emerald-300">02 · Acquire</p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-black">{data.availableCount}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[.12em] text-slate-500">email Prospects available</p>
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1 text-sm font-black"><WalletCards className="h-4 w-4"/>{Number(data.walletBalance||0).toFixed(2)}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[.12em] text-slate-500">Flame Coin balance</p>
            </div>
          </div>
          <button onClick={acquire} disabled={busy==='acquire'||!data.availableCount} className="mt-5 w-full border border-emerald-300/30 px-4 py-3 text-[10px] font-black uppercase tracking-[.14em] text-emerald-100 disabled:opacity-40">{busy==='acquire'?'Acquiring…':`Acquire Email Prospect · ${data.priceFlameCoin} Flame Coin`}</button>
          <p className="mt-3 text-[10px] leading-5 text-slate-500">Only Administration-loaded, contactable email leads enter this market. Each acquisition is debited and receipted.</p>
        </div>
      </section>

      <section className="mt-8 border-t border-white/10 pt-6">
        <p className="text-[8px] font-black uppercase tracking-[.18em] text-sky-300">03 · Message</p>
        <input value={subject} onChange={e=>setSubject(e.target.value)} className="mt-4 w-full border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-sky-300/50"/>
        <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={5} className="mt-3 w-full border border-white/10 bg-black/20 px-3 py-3 text-sm leading-6 outline-none focus:border-sky-300/50"/>
        <p className="mt-2 text-[10px] text-slate-500">Use <b>{'{{name}}'}</b> for the Prospect name and <b>{'{{lead_code}}'}</b> for the cryptographic lead reference.</p>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between border-y border-white/10 py-3">
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-slate-400">Your email Prospects</p>
          <button onClick={load} className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[.14em] text-sky-300"><RefreshCw className="h-3.5 w-3.5"/>Refresh</button>
        </div>
        <div className="divide-y divide-white/[.07]">
          {leads.map(lead=><div key={lead.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[.12em] text-sky-300">{lead.lead_code}</p>
              <p className="mt-1 truncate text-sm font-black">{lead.name||'Email Prospect'} · {lead.email}</p>
              <p className="mt-1 text-[10px] text-slate-500">{lead.source} · {lead.consent_basis}</p>
            </div>
            <button onClick={()=>sendLead(lead)} disabled={sentLeadIds.has(lead.id)||busy==='send:'+lead.id||!data.providerConfigured||!data.sender} className="flex items-center justify-center gap-2 border border-white/10 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.12em] disabled:opacity-35">
              <Send className="h-3.5 w-3.5"/>{sentLeadIds.has(lead.id)?'Sent':busy==='send:'+lead.id?'Sending…':'Send email'}
            </button>
          </div>)}
          {!leads.length&&<p className="py-8 text-center text-xs text-slate-500">No email Prospects acquired yet.</p>}
        </div>
      </section>

      <section className="mt-8">
        <div className="border-y border-white/10 py-3 text-[8px] font-black uppercase tracking-[.18em] text-slate-400">Outreach report</div>
        <div className="divide-y divide-white/[.07]">
          {outreach.map(row=><div key={row.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.12em] text-sky-300">{row.lead_code} · {row.status}</p>
              <p className="mt-1 text-sm">{row.email}</p><p className="mt-1 text-[10px] text-slate-500">Source: {row.source_email||data.sender?.source_email||'not recorded'}</p>
              {row.failure_reason&&<p className="mt-1 text-[10px] text-rose-300">{row.failure_reason}</p>}
            </div>
            {row.status==='sent'&&<button onClick={()=>markReplied(row)} disabled={busy==='reply:'+row.id} className="border border-emerald-300/20 px-3 py-2 text-[8px] font-black uppercase tracking-[.12em] text-emerald-200">Mark replied</button>}
          </div>)}
          {!outreach.length&&<p className="py-8 text-center text-xs text-slate-500">No email movement recorded yet.</p>}
        </div>
      </section>
    </div>
  </main>
}
