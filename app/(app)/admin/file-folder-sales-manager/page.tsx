'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  Flame,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Target,
  TriangleAlert,
} from 'lucide-react'

import { useAuth } from '@/lib/auth-provider'

type Snapshot = {
  config: {
    enabled: boolean
    weekly_target: number
    echo_active: boolean
  }
  status: string
  metrics: Record<string, any>
  latestReport: any
  reports: any[]
  actions: any[]
}

const statusLabel:Record<string,string>={
  target_met:'Target met',
  on_track:'On track',
  at_risk:'At risk',
  critical:'Critical',
  needs_pipeline:'Needs pipeline',
  paused:'Paused',
}

export default function FileFolderSalesManagerPage(){
  const {user,token,isInitialized}=useAuth()
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [target,setTarget]=useState('1')

  const headers=useMemo(()=>({
    Authorization:`Bearer ${token||''}`,
    'Content-Type':'application/json',
  }),[token])

  async function load(){
    if(!token)return
    setBusy('load');setError('')
    try{
      const response=await fetch('/api/admin/file-folder-sales-manager',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to load sales manager')
      setSnapshot(body)
      setTarget(String(body.config?.weekly_target||1))
    }catch(err:any){setError(err?.message||'Unable to load sales manager')}
    finally{setBusy('')}
  }

  useEffect(()=>{if(user?.role==='admin'&&token)void load()},[user?.id,user?.role,token])

  async function runManager(){
    setBusy('run');setError('');setNotice('')
    try{
      const response=await fetch('/api/admin/file-folder-sales-manager',{
        method:'POST',headers,body:JSON.stringify({action:'run'}),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Manager run failed')
      setNotice('Echo coordinated the active funnel and EIGHT completed a fresh intelligence review.')
      await load()
    }catch(err:any){setError(err?.message||'Manager run failed')}
    finally{setBusy('')}
  }

  async function saveConfig(next?:Partial<{enabled:boolean;echoActive:boolean}>){
    setBusy('config');setError('');setNotice('')
    try{
      const response=await fetch('/api/admin/file-folder-sales-manager',{
        method:'PATCH',
        headers,
        body:JSON.stringify({
          weeklyTarget:Number(target)||1,
          enabled:next?.enabled ?? snapshot?.config.enabled,
          echoActive:next?.echoActive ?? snapshot?.config.echo_active,
        }),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to update manager')
      setNotice('Sales manager settings updated.')
      await load()
    }catch(err:any){setError(err?.message||'Unable to update manager')}
    finally{setBusy('')}
  }

  async function resolveAction(id:string,action:'complete_action'|'dismiss_action'){
    setBusy(id);setError('')
    try{
      const response=await fetch('/api/admin/file-folder-sales-manager',{
        method:'POST',headers,body:JSON.stringify({action,actionId:id}),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to update action')
      await load()
    }catch(err:any){setError(err?.message||'Unable to update action')}
    finally{setBusy('')}
  }

  if(!isInitialized)return <main className="p-8 text-slate-400">Loading sales manager…</main>
  if(user?.role!=='admin')return <main className="p-8 text-slate-300">Administration access required. <Link href="/login" className="text-cyan-300">Sign in</Link></main>

  const m=snapshot?.metrics||{}
  const openActions=(snapshot?.actions||[]).filter(action=>action.status==='open')
  const eight=snapshot?.latestReport?.eight_analysis
  const echo=snapshot?.latestReport?.echo_summary

  return <main className="min-h-screen bg-[#030911] px-4 py-6 text-slate-100 sm:px-6" data-file-folder-sales-manager="echo-eight">
    <div className="mx-auto max-w-7xl">
      <header className="border-b border-cyan-300/10 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.24em] text-cyan-300">Administration · File Folder Sales Manager</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Weekly sales movement.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Echo coordinates the active prospect and follow-up movement. EIGHT reads the whole funnel as commercial intelligence. The manager enforces cadence and escalation; it does not fabricate or promise buyer behavior.</p>
          </div>
          <button onClick={()=>void runManager()} disabled={busy==='run'} className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-xs font-black text-slate-950 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${busy==='run'?'animate-spin':''}`}/>{busy==='run'?'Managing…':'Run manager now'}</button>
        </div>
        {error&&<p className="mt-4 text-sm text-rose-300">{error}</p>}
        {notice&&<p className="mt-4 text-sm text-emerald-300">{notice}</p>}
      </header>

      <section className="grid gap-3 py-6 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ['Weekly target',snapshot?.config.weekly_target||1,Target],
          ['Confirmed sales',m.confirmedSales||0,CheckCircle2],
          ['Remaining',m.remainingSales||0,Activity],
          ['Pending verification',(m.directPurchasesPending||0)+(m.bridgeDepositsPending||0),ShieldCheck],
          ['Warm replies',(m.emailReplied||0)+(m.whatsappResponded||0),MessageCircle],
          ['Days remaining',m.daysRemaining??0,Flame],
        ].map(([label,value,Icon]:any)=><div key={label} className="border border-white/10 bg-white/[0.025] p-4">
          <Icon className="h-4 w-4 text-cyan-300"/>
          <p className="mt-3 text-[8px] font-black uppercase tracking-[.16em] text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-black">{Number(value).toLocaleString()}</p>
        </div>)}
      </section>

      <section className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <div className="space-y-5">
          <article className="border border-white/10 bg-white/[0.025] p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300">Management state</p><h2 className="mt-2 text-xl font-black">{statusLabel[snapshot?.status||'']||snapshot?.status||'Loading'}</h2></div>
              {(snapshot?.status==='at_risk'||snapshot?.status==='critical'||snapshot?.status==='needs_pipeline')?<TriangleAlert className="h-6 w-6 text-amber-300"/>:<CheckCircle2 className="h-6 w-6 text-emerald-300"/>}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
              <div className="border border-white/8 p-3"><span className="text-slate-500">Email sent</span><p className="mt-1 text-lg font-black">{m.emailSent||0}</p></div>
              <div className="border border-white/8 p-3"><span className="text-slate-500">Email replies</span><p className="mt-1 text-lg font-black">{m.emailReplied||0}</p></div>
              <div className="border border-white/8 p-3"><span className="text-slate-500">WhatsApp opened</span><p className="mt-1 text-lg font-black">{m.whatsappOpened||0}</p></div>
              <div className="border border-white/8 p-3"><span className="text-slate-500">WhatsApp responded</span><p className="mt-1 text-lg font-black">{m.whatsappResponded||0}</p></div>
              <div className="border border-white/8 p-3"><span className="text-slate-500">Email prospect supply</span><p className="mt-1 text-lg font-black">{m.contactableEmailLeads||0}</p></div>
              <div className="border border-white/8 p-3"><span className="text-slate-500">WhatsApp prospect supply</span><p className="mt-1 text-lg font-black">{m.availableWhatsappProspects||0}</p></div>
            </div>
          </article>

          <article className="border border-white/10 bg-white/[0.025] p-5">
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-slate-400">Control</p>
            <label className="mt-4 block text-xs text-slate-400">Minimum confirmed File Folder sales per week
              <input value={target} onChange={event=>setTarget(event.target.value.replace(/[^0-9]/g,''))} className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 text-white outline-none"/>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={()=>void saveConfig()} disabled={busy==='config'} className="rounded-full bg-white px-4 py-2 text-[9px] font-black uppercase text-slate-950">Save target</button>
              <button onClick={()=>void saveConfig({echoActive:!snapshot?.config.echo_active})} className="rounded-full border border-cyan-300/20 px-4 py-2 text-[9px] font-black uppercase text-cyan-200">Echo {snapshot?.config.echo_active?'active':'paused'}</button>
              <button onClick={()=>void saveConfig({enabled:!snapshot?.config.enabled})} className="rounded-full border border-white/10 px-4 py-2 text-[9px] font-black uppercase text-slate-300">Manager {snapshot?.config.enabled?'active':'paused'}</button>
            </div>
          </article>
        </div>

        <div className="space-y-5">
          <article className="border border-cyan-300/12 bg-cyan-300/[0.025] p-5">
            <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-300"/><p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">Echo · Active Manager</p></div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{echo?.summary||'Run the manager to let Echo coordinate the current weekly movement.'}</p>
            <p className="mt-5 text-[9px] font-black uppercase tracking-[.18em] text-slate-500">{openActions.length} open movement{openActions.length===1?'':'s'}</p>
            <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
              {openActions.slice(0,20).map((action:any)=><div key={action.id} className="py-4">
                <div className="flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-wider"><span className={action.priority==='urgent'?'text-rose-300':action.priority==='high'?'text-amber-300':'text-cyan-300'}>{action.priority}</span><span className="text-slate-600">{action.channel}</span><span className="text-slate-600">{action.owner_role}</span></div>
                <p className="mt-2 text-sm font-bold text-white">{action.instruction}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{action.reason}</p>
                <div className="mt-3 flex gap-2">
                  <button disabled={busy===action.id} onClick={()=>void resolveAction(action.id,'complete_action')} className="rounded-full bg-emerald-300 px-3 py-1.5 text-[8px] font-black uppercase text-slate-950">Complete</button>
                  <button disabled={busy===action.id} onClick={()=>void resolveAction(action.id,'dismiss_action')} className="rounded-full border border-white/10 px-3 py-1.5 text-[8px] font-black uppercase text-slate-400">Dismiss</button>
                </div>
              </div>)}
              {!openActions.length&&<p className="py-5 text-sm text-slate-500">No open Echo movements. Run the manager after new outreach activity or purchases enter the funnel.</p>}
            </div>
          </article>

          <article className="border border-violet-300/12 bg-violet-300/[0.025] p-5">
            <div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-violet-300"/><p className="text-[9px] font-black uppercase tracking-[.2em] text-violet-300">EIGHT · Commercial Intelligence</p></div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{eight?.message||'Run the manager to generate EIGHT’s current File Folder funnel diagnosis.'}</p>
            {Array.isArray(eight?.suggestions)&&eight.suggestions.length>0&&<div className="mt-4 border-t border-white/10 pt-4">{eight.suggestions.map((item:string,index:number)=><p key={index} className="mt-2 text-xs leading-5 text-slate-400">{index+1}. {item}</p>)}</div>}
          </article>
        </div>
      </section>

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[9px] font-black uppercase tracking-[.16em] text-slate-600">
        <span className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5"/>Email + WhatsApp + verification + confirmed File Folder evidence</span>
        <Link href="/admin/email-outreach" className="text-cyan-300">Email Outreach →</Link>
      </footer>
    </div>
  </main>
}
