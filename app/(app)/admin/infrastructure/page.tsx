'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Activity, Flame, Globe2, Loader2, RefreshCw, ScrollText, Server, Shield, ShieldCheck, TerminalSquare } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type Snapshot={
  runtime:{
    mode:string
    domain:string
    serverKey:string
    releaseSha:string|null
    edge:string
    application:string
    deployAuthority:string
  }
  shield:{active:boolean;title:string;message:string;updatedAt:string|null}
  systems:Array<any>
  deployments:Array<any>
}

export default function InfrastructureWorkshop(){
  const {user,token,isInitialized}=useAuth()
  const router=useRouter()
  const [data,setData]=useState<Snapshot|null>(null)
  const [loading,setLoading]=useState(true)
  const [shieldBusy,setShieldBusy]=useState(false)
  const [webBusy,setWebBusy]=useState(false)
  const [webUrl,setWebUrl]=useState('https://weavingsystem.online')
  const [webResult,setWebResult]=useState<any>(null)

  useEffect(()=>{
    if(!isInitialized) return
    if(!user || user.role!=='admin'){router.replace('/dashboard');return}
    void refresh()
  },[isInitialized,user?.id,user?.role,token])

  const headers=()=>({
    'Content-Type':'application/json',
    ...(token?{Authorization:`Bearer ${token}`}:{})
  })

  async function refresh(){
    setLoading(true)
    try{
      const response=await fetch('/api/admin/infrastructure',{cache:'no-store',headers:headers()})
      const body=await response.json()
      if(!response.ok || !body.success) throw new Error(body.error || 'Infrastructure unavailable')
      setData(body)
    }catch(error){
      toast.error(error instanceof Error?error.message:'Infrastructure unavailable')
    }finally{setLoading(false)}
  }

  async function toggleShield(){
    if(!data) return
    const next=!data.shield.active
    if(next && !window.confirm('Raise Divine Shield? Every non-Administration user will be held outside WEAVE.')) return
    setShieldBusy(true)
    try{
      const response=await fetch('/api/admin/divine-shield',{
        method:'POST',
        headers:headers(),
        body:JSON.stringify({
          active:next,
          title:data.shield.title,
          message:data.shield.message,
        }),
      })
      const body=await response.json()
      if(!response.ok || !body.success) throw new Error(body.error || 'Divine Shield update failed')
      setData(prev=>prev?{...prev,shield:body.state}:prev)
      toast.success(next
        ? `Divine Shield raised · ${Number(body.evacuatedSessions || 0)} non-admin sessions evacuated`
        : 'Divine Shield released')
    }catch(error){
      toast.error(error instanceof Error?error.message:'Divine Shield update failed')
    }finally{setShieldBusy(false)}
  }

  async function webProbe(){
    if(!webUrl.trim()) return
    setWebBusy(true);setWebResult(null)
    try{
      const response=await fetch('/api/admin/infrastructure',{
        method:'POST',headers:headers(),
        body:JSON.stringify({action:'web_probe',url:webUrl.trim()}),
      })
      const body=await response.json()
      if(!response.ok || !body.success) throw new Error(body.error || 'Web read failed')
      setWebResult(body.result)
    }catch(error){toast.error(error instanceof Error?error.message:'Web read failed')}
    finally{setWebBusy(false)}
  }

  if(!isInitialized || !user || user.role!=='admin') return null

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <header className="rounded-[2rem] border border-cyan-300/15 bg-[#03101d]/78 p-6 backdrop-blur-xl md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Administration · Infrastructure</p>
            <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">WEAVE Infrastructure Workshop</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Self-host runtime, Caddy edge, Sovereign + Flame deployment records, EIGHT web access and Divine Shield in one operating surface.</p>
          </div>
          <Button onClick={()=>void refresh()} disabled={loading} variant="outline" className="border-cyan-300/20">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`} /> Refresh
          </Button>
        </div>
      </header>

      {loading && !data ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300"/></div> : data && <>
        <section className={`rounded-[2rem] border p-6 ${data.shield.active?'border-amber-300/30 bg-amber-400/[0.06]':'border-emerald-300/20 bg-emerald-400/[0.04]'}`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">{data.shield.active?<Shield className="h-7 w-7 text-amber-300"/>:<ShieldCheck className="h-7 w-7 text-emerald-300"/>}</div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Divine Shield</p>
                <h2 className="mt-1 text-xl font-bold text-white">{data.shield.active?'Raised · participants waiting outside':'Released · WEAVE open'}</h2>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">{data.shield.message}</p>
              </div>
            </div>
            <Button onClick={toggleShield} disabled={shieldBusy} className={data.shield.active?'bg-emerald-600 hover:bg-emerald-700':'bg-amber-600 hover:bg-amber-700'}>
              {shieldBusy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Shield className="mr-2 h-4 w-4"/>}
              {data.shield.active?'Release Shield':'Raise Shield'}
            </Button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
            <div className="flex items-start gap-3">
              <Server className="mt-0.5 h-5 w-5 text-emerald-300"/>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">WEAVE Self-Host Production</p>
                <p className="mt-1 break-all text-[10px] text-slate-500">{data.runtime.domain} · {data.runtime.serverKey}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
                <Activity className="h-5 w-5 text-emerald-300"/>
                <p className="mt-3 text-sm font-bold text-white">Verified main → production</p>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">Production Check must pass before the self-host deploy path accepts a release.</p>
              </div>
              <div className="rounded-2xl border border-sky-300/15 bg-sky-400/[0.04] p-4">
                <TerminalSquare className="h-5 w-5 text-sky-300"/>
                <p className="mt-3 text-sm font-bold text-white">Docker + Caddy</p>
                <p className="mt-1 break-all text-[10px] leading-4 text-slate-500">Release {data.runtime.releaseSha || 'not reported yet'} · edge {data.runtime.edge}</p>
              </div>
            </div>
            <Link href="/admin/release-workshop" className="mt-4 mr-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[.04] px-4 text-xs font-black text-emerald-100">Release Workshop · Deploy or Roll Back</Link>
            <Link href="/admin/deployment-records" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-orange-300/15 bg-orange-300/[0.04] px-4 text-xs font-black text-orange-100 hover:bg-orange-300/[0.08]">
              <ScrollText className="h-4 w-4"/> Sovereign + Flame Record
            </Link>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
            <div className="flex items-center gap-3"><Globe2 className="h-5 w-5 text-violet-300"/><div><p className="text-xs font-bold text-white">EIGHT Public Web</p><p className="text-[10px] text-slate-500">Read-only · public network only</p></div></div>
            <div className="mt-4 flex gap-2"><Input value={webUrl} onChange={e=>setWebUrl(e.target.value)} placeholder="https://..." className="bg-black/30"/><Button onClick={webProbe} disabled={webBusy}>{webBusy?<Loader2 className="h-4 w-4 animate-spin"/>:'Read'}</Button></div>
            {webResult&&<div className="mt-4 max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3"><p className="text-[9px] uppercase tracking-wider text-emerald-300">{webResult.status} · {webResult.url}</p><p className="mt-2 text-[10px] leading-5 text-slate-400">{webResult.text}</p></div>}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
          <div className="flex items-center gap-3"><TerminalSquare className="h-5 w-5 text-cyan-300"/><h2 className="text-lg font-bold text-white">Origin Systems · Live Registry</h2></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.systems.map(system=><article key={system.system_key} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{system.kind} · {system.deployment_target}</p><h3 className="mt-1 text-sm font-bold text-white">{system.name}</h3></div><span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase ${system.health.status==='online'?'bg-emerald-400/10 text-emerald-300':system.health.status==='internal'?'bg-sky-400/10 text-sky-300':'bg-red-400/10 text-red-300'}`}>{system.health.status}</span></div>
              {system.public_url&&<p className="mt-3 break-all text-[10px] text-slate-500">{system.public_url}</p>}
              {system.health.latencyMs!=null&&<p className="mt-2 text-[9px] text-slate-600">{system.health.latencyMs} ms</p>}
            </article>)}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
          <div className="flex items-center gap-2"><Flame className="h-4 w-4 text-orange-300"/><h2 className="text-sm font-bold text-white">Latest Production Movement</h2></div>
          <div className="mt-4 space-y-2">{data.deployments.length===0?<p className="text-xs text-slate-500">No self-host deployment movement recorded yet.</p>:data.deployments.slice(0,8).map(item=><div key={item.id} className="grid gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-[10px] sm:grid-cols-[100px_minmax(0,1fr)_auto]"><span className="font-bold uppercase text-orange-200">{String(item.status).replaceAll('_',' ')}</span><span className="break-all font-mono text-slate-300">{item.release_sha}</span><span className="text-slate-500">{new Date(item.created_at).toLocaleString()}</span></div>)}</div>
        </section>
      </>}
    </main>
  )
}
