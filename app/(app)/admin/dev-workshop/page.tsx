'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from 'lucide-react'

import { getAuthHeaders } from '@/lib/auth-client'

type IntegrityCheck={
  key:string
  label:string
  status:'healthy'|'warning'|'repaired'
  count:number
  detail:string
}

type IntegrityReport={
  success:boolean
  mode:'scan'|'repair'
  checkedAt:string
  checks:IntegrityCheck[]
  repairs:string[]
  summary:{
    healthy:number
    warning:number
    repaired:number
  }
}

export default function WeaveIntegrityEnginePage(){
  const [report,setReport]=useState<IntegrityReport|null>(null)
  const [loading,setLoading]=useState(true)
  const [action,setAction]=useState<'scan'|'repair'|null>('scan')
  const [error,setError]=useState('')

  const run=useCallback(async(mode:'scan'|'repair')=>{
    const controller=new AbortController()
    const timeout=window.setTimeout(()=>controller.abort(),20000)
    setAction(mode)
    setError('')
    if(!report)setLoading(true)

    try{
      const response=await fetch('/api/admin/integrity-engine',{
        method:mode==='repair'?'POST':'GET',
        headers:getAuthHeaders(),
        ...(mode==='repair'?{body:JSON.stringify({action:'repair_safe'})}:{}),
        cache:'no-store',
        signal:controller.signal,
      })
      const body=await response.json().catch(()=>({success:false,error:'Integrity Engine returned an invalid response'}))
      if(!response.ok||!body.success)throw new Error(body.error||'Integrity Engine could not complete the movement')
      setReport(body)
    }catch(error:any){
      setError(
        error?.name==='AbortError'
          ? 'Integrity Engine did not answer within 20 seconds. The environment remains available; retry the scan.'
          : error?.message||'Integrity Engine could not complete the movement',
      )
    }finally{
      window.clearTimeout(timeout)
      setLoading(false)
      setAction(null)
    }
  },[report])

  useEffect(()=>{
    void run('scan')
  },[])

  return <main className="relative min-h-[calc(100svh-4rem)] overflow-x-hidden px-4 pb-20 pt-8 text-white" data-weave-integrity-engine="focused">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,.10),transparent_28%),radial-gradient(circle_at_80%_72%,rgba(168,85,247,.08),transparent_32%)]"/>
    <div className="relative mx-auto max-w-6xl">
      <header className="border-y border-white/10 py-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-cyan-300">
              <ShieldCheck className="h-4 w-4"/>
              <span className="text-[9px] font-black uppercase tracking-[.2em]">Administration · WEAVE Integrity Engine</span>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Observe the live system. Repair only proven drift.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              The Integrity Engine inspects real Prospect, Number Bay and Bridger prerequisites. Safe Repair only changes inconsistencies supported by existing records; it never invents balances, Prospects or numbers.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/development-agents" className="border border-white/10 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.13em] text-slate-300 hover:text-white">
              Development Foundry
            </Link>
            <Link href="/admin/infrastructure" className="border border-white/10 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.13em] text-slate-300 hover:text-white">
              Infrastructure
            </Link>
          </div>
        </div>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="border-y border-emerald-300/15 bg-emerald-400/[.035] px-4 py-4">
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-emerald-300">Healthy</p>
          <p className="mt-2 text-3xl font-black">{report?.summary?.healthy??'—'}</p>
        </div>
        <div className="border-y border-amber-300/15 bg-amber-400/[.035] px-4 py-4">
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-amber-300">Warning</p>
          <p className="mt-2 text-3xl font-black">{report?.summary?.warning??'—'}</p>
        </div>
        <div className="border-y border-cyan-300/15 bg-cyan-400/[.035] px-4 py-4">
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-cyan-300">Repaired</p>
          <p className="mt-2 text-3xl font-black">{report?.summary?.repaired??'—'}</p>
        </div>
      </section>

      <section className="mt-6 border-y border-white/10 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[.18em] text-slate-500">Integrity movement</p>
            <p className="mt-1 text-xs text-slate-400">
              {report?.checkedAt?'Last observation '+new Date(report.checkedAt).toLocaleString():'Opening live integrity state…'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={()=>void run('scan')}
              disabled={Boolean(action)}
              className="inline-flex items-center gap-2 border border-cyan-300/25 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.13em] text-cyan-200 disabled:opacity-40"
            >
              <RefreshCw className={'h-3.5 w-3.5 '+(action==='scan'?'animate-spin':'')}/>
              {action==='scan'?'Scanning…':'Integrity Scan'}
            </button>
            <button
              onClick={()=>void run('repair')}
              disabled={Boolean(action)}
              className="inline-flex items-center gap-2 border border-violet-300/25 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.13em] text-violet-200 disabled:opacity-40"
            >
              <Wrench className={'h-3.5 w-3.5 '+(action==='repair'?'animate-pulse':'')}/>
              {action==='repair'?'Repairing…':'Safe Repair'}
            </button>
          </div>
        </div>

        {error&&<div className="mt-5 border-l-2 border-rose-400 bg-rose-400/[.04] px-4 py-3">
          <p className="text-sm font-bold text-rose-200">{error}</p>
          <button onClick={()=>void run('scan')} disabled={Boolean(action)} className="mt-3 text-[9px] font-black uppercase tracking-[.14em] text-cyan-300 disabled:opacity-40">Retry scan</button>
        </div>}

        {loading&&!report&&<div className="mt-6 flex min-h-40 items-center justify-center border-y border-white/[.06]">
          <div className="text-center">
            <Activity className="mx-auto h-6 w-6 animate-pulse text-cyan-300"/>
            <p className="mt-3 text-[9px] font-black uppercase tracking-[.16em] text-slate-400">Reading live WEAVE state</p>
          </div>
        </div>}
      </section>

      {report&&<section className="mt-6 divide-y divide-white/[.07] border-y border-white/10">
        {report.checks.map(check=>{
          const Icon=check.status==='warning'?AlertTriangle:CheckCircle2
          const tone=check.status==='warning'?'text-amber-300':check.status==='repaired'?'text-cyan-300':'text-emerald-300'
          return <article key={check.key} className="grid gap-3 py-5 sm:grid-cols-[auto_1fr_auto] sm:items-start">
            <Icon className={'mt-0.5 h-4 w-4 '+tone}/>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black">{check.label}</h2>
                <span className={'text-[8px] font-black uppercase tracking-[.14em] '+tone}>{check.status}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{check.detail}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black">{check.count}</p>
              <p className="text-[8px] uppercase tracking-[.14em] text-slate-600">records</p>
            </div>
          </article>
        })}
      </section>}

      {report?.repairs?.length>0&&<section className="mt-6 border-y border-cyan-300/15 py-5">
        <p className="text-[8px] font-black uppercase tracking-[.18em] text-cyan-300">Repairs carried</p>
        <div className="mt-3 space-y-2">
          {report.repairs.map((repair,index)=><p key={index} className="text-xs leading-5 text-slate-300">• {repair}</p>)}
        </div>
      </section>}
    </div>
  </main>
}
