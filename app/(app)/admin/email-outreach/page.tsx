'use client'

import { useCallback, useEffect, useState } from 'react'
import { Mail, Play, RefreshCw, Save, Sparkles } from 'lucide-react'

import { getAuthHeaders } from '@/lib/auth-client'


export default function AdminEmailOutreachPage(){
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [replyEmail,setReplyEmail]=useState('')
  const [displayName,setDisplayName]=useState('')
  const [seedEmail,setSeedEmail]=useState('prospect0001@example.com')
  const [candidateCount,setCandidateCount]=useState(50)
  const [candidateDestination,setCandidateDestination]=useState<'balanced'|'admin'|'bridger'>('balanced')
  const [enabled,setEnabled]=useState(false)
  const [dailyLimit,setDailyLimit]=useState(120)
  const [subject,setSubject]=useState('')
  const [message,setMessage]=useState('')

  const load=useCallback(async()=>{
    setLoading(true);setError('')
    const controller=new AbortController()
    const timeout=window.setTimeout(()=>controller.abort(),15000)
    try{
      const state=await fetch('/api/admin/email-outreach',{
        headers:getAuthHeaders(),
        cache:'no-store',
        signal:controller.signal,
      })
      const body=await state.json().catch(()=>({error:'Email Outreach returned an invalid response'}))
      if(!state.ok)throw new Error(body.error||'Unable to open email outreach')
      setData(body)
      setReplyEmail(body.sender?.reply_email||body.accountEmail||'')
      setDisplayName(body.sender?.display_name||'WEAVE Administration')
      setEnabled(Boolean(body.automation?.enabled))
      setDailyLimit(Number(body.automation?.daily_limit||120))
      setSubject(String(body.automation?.subject_template||''))
      setMessage(String(body.automation?.message_template||''))
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
        method:'POST',headers:getAuthHeaders(),body:JSON.stringify({replyEmail,displayName}),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to save Administration email')
      setNotice('Administration outreach email identity saved.')
      await load()
    }catch(e:any){setError(e?.message||'Unable to save Administration email')}
    finally{setBusy('')}
  }

  const generateCandidates=async()=>{
    setBusy('generate');setError('');setNotice('')
    try{
      const response=await fetch('/api/admin/email-outreach',{
        method:'POST',headers:getAuthHeaders(),
        body:JSON.stringify({
          action:'generate_candidates',
          seedEmail,
          count:candidateCount,
          destination:candidateDestination,
        }),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Email candidate generation failed')
      const result=body.result||{}
      setNotice(`Generated ${result.generated||0} candidate email Prospect${result.generated===1?'':'s'}: ${result.adminGenerated||0} for Administration and ${result.bridgerGenerated||0} for Bridgers. Reachability remains unverified until outreach response.`)
      await load()
    }catch(e:any){setError(e?.message||'Email candidate generation failed')}
    finally{setBusy('')}
  }

  const saveAutomation=async()=>{
    setBusy('automation');setError('');setNotice('')
    try{
      const response=await fetch('/api/admin/email-outreach',{
        method:'POST',headers:getAuthHeaders(),
        body:JSON.stringify({action:'set_automation',enabled,dailyLimit,subject,message}),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to save automation')
      setNotice(enabled?'Automatic daily email outreach armed.':'Automatic daily email outreach paused.')
      await load()
    }catch(e:any){setError(e?.message||'Unable to save automation')}
    finally{setBusy('')}
  }

  const runNow=async()=>{
    setBusy('run');setError('');setNotice('')
    try{
      const response=await fetch('/api/admin/email-outreach',{
        method:'POST',headers:getAuthHeaders(),body:JSON.stringify({action:'run_now'}),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Email outreach run failed')
      setNotice(`Run complete: ${body.result?.sent||0} sent, ${body.result?.failed||0} failed.`)
      await load()
    }catch(e:any){setError(e?.message||'Email outreach run failed')}
    finally{setBusy('')}
  }

  const markReplied=async(id:string)=>{
    setBusy('reply:'+id)
    try{
      const response=await fetch('/api/admin/email-outreach',{
        method:'POST',headers:getAuthHeaders(),
        body:JSON.stringify({action:'mark_replied',outreachId:id}),
      })
      if(!response.ok)throw new Error((await response.json()).error||'Unable to update report')
      await load()
    }catch(e:any){setError(e?.message||'Unable to update report')}
    finally{setBusy('')}
  }

  if(loading)return <main className="flex min-h-[55vh] items-center justify-center text-sm text-slate-400">Opening Administration Email Outreach…</main>

  return <main className="relative px-4 pb-16 pt-12 text-white" data-admin-email-outreach="true">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(56,189,248,.12),transparent_26%),radial-gradient(circle_at_84%_72%,rgba(249,115,22,.08),transparent_32%)]"/>
    <div className="relative mx-auto max-w-6xl">
      <header className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-sky-300"><Mail className="h-4 w-4"/><span className="text-[9px] font-black uppercase tracking-[.2em]">Administration · Email Outreach</span></div>
        <h1 className="mt-3 text-3xl font-black">Email Prospect Engine</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Generate candidate email Prospect series from a seed pattern, assign cryptographic WEAVE lead references, route inventory to Administration or Bridgers, and let actual outreach determine reachability.</p>
      </header>

      {(error||notice)&&<div className={`mt-5 border-l-2 px-4 py-3 text-sm ${error?'border-rose-400 text-rose-200':'border-emerald-400 text-emerald-200'}`}>{error||notice}</div>}

      <section className="mt-7 grid gap-6 lg:grid-cols-3">
        <div className="border-y border-white/10 py-5">
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-sky-300">Sender identity</p>
          <input value={replyEmail} onChange={e=>setReplyEmail(e.target.value)} className="mt-4 w-full border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none" placeholder="admin@example.com"/>
          <input value={displayName} onChange={e=>setDisplayName(e.target.value)} className="mt-3 w-full border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none" placeholder="WEAVE Administration"/>
          <button onClick={saveSender} disabled={busy==='sender'} className="mt-4 flex items-center gap-2 border border-sky-300/30 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.12em] disabled:opacity-40"><Save className="h-3.5 w-3.5"/>{busy==='sender'?'Saving…':'Save sender'}</button>
          <p className="mt-3 text-[10px] leading-5 text-slate-500">Mail leaves through the WEAVE provider; replies return to this Administration address.</p>
        </div>

        <div className="border-y border-white/10 py-5 lg:col-span-2">
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-emerald-300">Cryptographic Email Candidate Engine</p>
          <div className="mt-4 grid grid-cols-4 gap-3 text-center">
            {[
              ['Admin pool',data.counts?.admin_available||0],
              ['Bridger pool',data.counts?.bridger_available||0],
              ['Acquired',data.counts?.acquired||0],
              ['Contacted',data.counts?.contacted||0],
            ].map(([label,value])=><div key={String(label)} className="border border-white/[.07] px-2 py-3"><p className="text-xl font-black">{value}</p><p className="mt-1 text-[7px] uppercase tracking-[.12em] text-slate-500">{label}</p></div>)}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_110px]">
            <input value={seedEmail} onChange={e=>setSeedEmail(e.target.value)} className="border border-white/10 bg-black/20 px-3 py-3 font-mono text-sm outline-none focus:border-emerald-300/40" placeholder="prospect0001@example.com"/>
            <input type="number" min={1} max={200} value={candidateCount} onChange={e=>setCandidateCount(Math.max(1,Math.min(200,Number(e.target.value||1))))} className="border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none" aria-label="Candidate email count"/>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <select value={candidateDestination} onChange={e=>setCandidateDestination(e.target.value as 'balanced'|'admin'|'bridger')} className="border border-white/10 bg-[#071526] px-3 py-3 text-sm outline-none">
              <option value="balanced">Split inventory: Administration + Bridgers</option>
              <option value="admin">Administration outreach only</option>
              <option value="bridger">Bridger market only</option>
            </select>
            <button onClick={generateCandidates} disabled={busy==='generate'||!seedEmail.trim()} className="flex items-center justify-center gap-2 border border-emerald-300/30 px-4 py-3 text-[9px] font-black uppercase tracking-[.12em] text-emerald-100 disabled:opacity-35"><Sparkles className="h-3.5 w-3.5"/>{busy==='generate'?'Generating…':'Generate candidate emails'}</button>
          </div>
          <p className="mt-3 text-[10px] leading-5 text-slate-500">The engine mirrors the Prospect number engine: it creates candidate addresses from a seed pattern and assigns cryptographic EML identities. It does not claim the generated inboxes are reachable; response or delivery evidence establishes that later.</p>
        </div>
      </section>

      <section className="mt-8 border-y border-white/10 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[.18em] text-amber-300">Automatic daily movement</p>
            <p className="mt-2 text-xs text-slate-500">Only available, contactable leads are used. A lead is not repeatedly messaged by the same daily run.</p>
          </div>
          <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em]"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>Enabled</label>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[120px_1fr]">
          <input type="number" min={1} max={120} value={dailyLimit} onChange={e=>setDailyLimit(Number(e.target.value||1))} className="border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none" aria-label="Daily email limit"/>
          <input value={subject} onChange={e=>setSubject(e.target.value)} className="border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none" placeholder="Subject"/>
        </div>
        <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={5} className="mt-3 w-full border border-white/10 bg-black/20 px-3 py-3 text-sm leading-6 outline-none"/>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={saveAutomation} disabled={busy==='automation'} className="flex items-center gap-2 border border-sky-300/30 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.12em] disabled:opacity-40"><Save className="h-3.5 w-3.5"/>{busy==='automation'?'Saving…':'Save automation'}</button>
          <button onClick={runNow} disabled={busy==='run'||!enabled||!data.providerConfigured||!data.sender} className="flex items-center gap-2 border border-amber-300/30 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.12em] text-amber-100 disabled:opacity-35"><Play className="h-3.5 w-3.5"/>{busy==='run'?'Running…':'Run now'}</button>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between border-y border-white/10 py-3">
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-slate-400">Outreach report</p>
          <button onClick={load} className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[.12em] text-sky-300"><RefreshCw className="h-3.5 w-3.5"/>Refresh</button>
        </div>
        <div className="divide-y divide-white/[.07]">
          {(data.recent||[]).map((row:any)=><div key={row.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.12em] text-sky-300">{row.lead_code} · {row.actor_role} · {row.mode} · {row.status}</p>
              <p className="mt-1 text-sm">{row.name||'Email Prospect'} · {row.email}</p>
              <p className="mt-1 text-[10px] text-slate-500">{row.subject}</p>
              {row.failure_reason&&<p className="mt-1 text-[10px] text-rose-300">{row.failure_reason}</p>}
            </div>
            {row.status==='sent'&&<button onClick={()=>markReplied(row.id)} disabled={busy==='reply:'+row.id} className="border border-emerald-300/20 px-3 py-2 text-[8px] font-black uppercase tracking-[.12em] text-emerald-200">Mark replied</button>}
          </div>)}
          {!(data.recent||[]).length&&<p className="py-8 text-center text-xs text-slate-500">No email movement recorded yet.</p>}
        </div>
      </section>
    </div>
  </main>
}
