'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Mail, Play, RefreshCw, Save, Upload } from 'lucide-react'

import { getAuthHeaders } from '@/lib/auth-client'

type ImportRow={name:string;email:string;source:string;consentBasis:string}

export default function AdminEmailOutreachPage(){
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [sourceEmail,setSourceEmail]=useState('')
  const [displayName,setDisplayName]=useState('')
  const [appPassword,setAppPassword]=useState('')
  const [importText,setImportText]=useState('')
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
      setSourceEmail(body.sender?.source_email||body.sender?.reply_email||body.accountEmail||'')
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

  const rows=useMemo<ImportRow[]>(()=>{
    return importText.split(/\r?\n/).map(line=>{
      const [name='',email='',source='',consentBasis='']=line.split(',').map(v=>v.trim())
      return {name,email,source,consentBasis}
    }).filter(row=>row.email)
  },[importText])

  const saveSender=async()=>{
    setBusy('sender');setError('');setNotice('')
    try{
      const response=await fetch('/api/email-outreach/sender',{
        method:'POST',headers:getAuthHeaders(),body:JSON.stringify({sourceEmail,displayName,appPassword}),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to save Administration email')
      setAppPassword('')
      setNotice(body.mailbox?.status==='connected'?'Administration Google mailbox authenticated and active for outreach.':'Administration source email saved and active through the WEAVE fallback transport.')
      await load()
    }catch(e:any){setError(e?.message||'Unable to save Administration email')}
    finally{setBusy('')}
  }

  const importLeads=async()=>{
    setBusy('import');setError('');setNotice('')
    try{
      const response=await fetch('/api/admin/email-outreach',{
        method:'POST',headers:getAuthHeaders(),
        body:JSON.stringify({action:'import_leads',leads:rows}),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Email Prospect import failed')
      setNotice(`${body.inserted} email Prospects entered the system. ${body.skipped} skipped.`)
      setImportText('')
      await load()
    }catch(e:any){setError(e?.message||'Email Prospect import failed')}
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
      const reasons:Record<string,string>={disabled:'Save automation as enabled before running.',already_running:'A run is already in progress.',daily_limit:'Today’s email limit has been reached.',no_leads:'No contactable email Prospects are available. Import leads first.'}
      setNotice(reasons[body.result?.reason]||`Run complete: ${body.result?.sent||0} accepted by provider, ${body.result?.failed||0} need attention.`)
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

  if(!data)return <main className="px-4 py-16 text-white"><p role="alert">{error||'Email Outreach could not open.'}</p><button onClick={load} className="mt-4 border border-white/20 px-4 py-2">Retry Email Outreach</button></main>

  return <main className="relative px-4 pb-16 pt-12 text-white" data-admin-email-outreach="true">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(56,189,248,.12),transparent_26%),radial-gradient(circle_at_84%_72%,rgba(249,115,22,.08),transparent_32%)]"/>
    <div className="relative mx-auto max-w-6xl">
      <header className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-sky-300"><Mail className="h-4 w-4"/><span className="text-[9px] font-black uppercase tracking-[.2em]">Administration · Email Outreach</span></div>
        <h1 className="mt-3 text-3xl font-black">Email Prospect Engine</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Load contactable email Prospects, give each one a cryptographic WEAVE lead reference, control the daily Administration movement, and inspect Bridger/Admin send reports from one place.</p>
      </header>

      {(error||notice)&&<div className={`mt-5 border-l-2 px-4 py-3 text-sm ${error?'border-rose-400 text-rose-200':'border-emerald-400 text-emerald-200'}`}>{error||notice}</div>}

      <p className="mt-4 text-xs text-slate-300" role="status">{data.providerConfigured&&data.sender ? 'Source configured · provider acceptance is recorded after each send.' : 'Source not ready · activate your mailbox before sending.'}</p>
      <section className="mt-7 grid gap-6 lg:grid-cols-3">
        <div className="border-y border-white/10 py-5">
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-sky-300">Email Source Engine</p>
          <input value={sourceEmail} onChange={e=>setSourceEmail(e.target.value)} className="mt-4 w-full border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none" placeholder="weavebridge@gmail.com"/>
          <input value={displayName} onChange={e=>setDisplayName(e.target.value)} className="mt-3 w-full border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none" placeholder="WeaveBridge · WEAVE Administration"/>
          <input type="password" value={appPassword} onChange={e=>setAppPassword(e.target.value)} className="mt-3 w-full border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none" placeholder="Google app password · only needed to authenticate/change mailbox" autoComplete="new-password"/>
          <button onClick={saveSender} disabled={busy==='sender'} className="mt-4 flex items-center gap-2 border border-sky-300/30 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.12em] disabled:opacity-40"><Save className="h-3.5 w-3.5"/>{busy==='sender'?'Authenticating…':'Activate source'}</button>
          <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="mt-3 block text-xs text-sky-300 underline">Open Google app passwords</a><p className="mt-2 text-xs text-slate-400">Enable Google 2-Step Verification first. Create an app password for the same mailbox entered above.</p>
          <p className="mt-3 text-[10px] leading-5 text-slate-500">For Gmail, use a Google app password rather than the normal account password. WEAVE verifies and encrypts the credential before storage. If the fallback mail provider is configured, the source email can remain reply-only.</p>
        </div>

        <div className="border-y border-white/10 py-5 lg:col-span-2">
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-emerald-300">Email Prospect inventory</p>
          <div className="mt-4 grid grid-cols-4 gap-3 text-center">
            {[
              ['Available',data.counts?.available||0],
              ['Acquired',data.counts?.acquired||0],
              ['Contacted',data.counts?.contacted||0],
              ['Blocked',data.counts?.blocked||0],
            ].map(([label,value])=><div key={String(label)} className="border border-white/[.07] px-2 py-3"><p className="text-xl font-black">{value}</p><p className="mt-1 text-[7px] uppercase tracking-[.12em] text-slate-500">{label}</p></div>)}
          </div>
          <textarea value={importText} onChange={e=>setImportText(e.target.value)} rows={5} className="mt-4 w-full border border-white/10 bg-black/20 px-3 py-3 font-mono text-xs leading-5 outline-none" placeholder={"Name,email@example.com,source,consent basis\nAnother,email2@example.com,event signup,opt in"}/>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[10px] text-slate-500">{rows.length} parsed row{rows.length===1?'':'s'} · max 200 per import</p>
            <button onClick={importLeads} disabled={!rows.length||busy==='import'} className="flex items-center gap-2 border border-emerald-300/30 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.12em] disabled:opacity-40"><Upload className="h-3.5 w-3.5"/>{busy==='import'?'Importing…':'Import leads'}</button>
          </div>
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
          <button onClick={runNow} disabled={Boolean(busy)||!data.automation?.enabled||!data.providerConfigured||!data.sender||!data.counts?.available} className="flex items-center gap-2 border border-amber-300/30 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.12em] text-amber-100 disabled:opacity-35"><Play className="h-3.5 w-3.5"/>{busy==='run'?'Running…':'Run now'}</button>
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
              <p className="mt-1 text-sm">{row.name||'Email Prospect'} · {row.email}</p><p className="mt-1 text-[10px] text-slate-500">Source: {row.source_email||data.sender?.source_email||'not recorded'}</p>
              <p className="mt-1 text-[10px] text-slate-500">{row.subject}</p>
              {row.failure_reason&&<p className="mt-1 text-[10px] text-rose-300">{row.failure_reason}</p>}
            </div>
            {row.status==='sent'&&<button onClick={()=>markReplied(row.id)} disabled={busy==='reply:'+row.id} className="border border-emerald-300/20 px-3 py-2 text-[8px] font-black uppercase tracking-[.12em] text-emerald-200">Mark replied</button>}
          </div>)}
          {!(data.recent||[]).length&&<p className="py-8 text-center text-xs text-slate-500">No email movement recorded yet. Activate a source and import contactable leads to begin.</p>}
        </div>
      </section>
    </div>
  </main>
}
