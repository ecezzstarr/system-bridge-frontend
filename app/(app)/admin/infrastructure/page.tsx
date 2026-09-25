'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Cloud, Globe2, Loader2, RefreshCw, Rocket, Shield, ShieldCheck, TerminalSquare } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type Snapshot={
  cloud:{
    project:string
    region:string
    service:string
    previewConfigured:boolean
    promoteConfigured:boolean
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
  const [deployBusy,setDeployBusy]=useState<string|null>(null)
  const [webUrl,setWebUrl]=useState('https://weavingsystem.online')
  const [webResult,setWebResult]=useState<any>(null)

  useEffect(()=>{
    if(!isInitialized) return
    if(!user || user.role!=='admin'){router.replace('/dashboard');return}
    void refresh()
  },[isInitialized,user?.id,user?.role,token])

  const headers=()=>({
    'Content-Type':'application/json',
    ...(token?{Authorization:`Bearer ${token}`}:{}),
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
      toast.success(next?'Divine Shield raised':'Divine Shield released')
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

  async function deploy(action:'preview'|'promote'){
    if(!data) return
    const configured=action==='preview'?data.cloud.previewConfigured:data.cloud.promoteConfigured
    if(!configured){toast.error(`${action==='preview'?'Preview':'Promote'} Cloud Build trigger is not configured`);return}
    const label=action==='preview'?'DEPLOY_PREVIEW':'PROMOTE_PRODUCTION'
    const warning=action==='preview'
      ? 'Request a verified main preview build through Google Cloud Build?'
      : 'Promote the verified WEAVE candidate to production traffic?'
    if(!window.confirm(warning)) return
    setDeployBusy(action)
    try{
      const response=await fetch('/api/admin/infrastructure',{
        method:'POST',headers:headers(),
        body:JSON.stringify({action:action==='preview'?'deploy_preview':'deploy_promote',confirm:label}),
      })
      const body=await response.json()
      if(!response.ok || !body.success) throw new Error(body.error || 'Cloud Build request failed')
      toast.success(action==='preview'?'Preview deployment requested':'Production promotion requested')
      await refresh()
    }catch(error){toast.error(error instanceof Error?error.message:'Cloud Build request failed')}
    finally{setDeployBusy(null)}
  }

  if(!isInitialized || !user || user.role!=='admin') return null

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <header className="rounded-[2rem] border border-cyan-300/15 bg-[#03101d]/78 p-6 backdrop-blur-xl md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Administration · Infrastructure</p>
            <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">WEAVE Infrastructure Workshop</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Origin registry, Cloud Run runtime, EIGHT web access, deployment authority and Divine Shield in one operating surface.</p>
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
            <div className="flex items-center gap-3"><Cloud className="h-5 w-5 text-sky-300"/><div><p className="text-xs font-bold text-white">Google Cloud Runtime</p><p className="text-[10px] text-slate-500">{data.cloud.project} · {data.cloud.region} · {data.cloud.service}</p></div></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button onClick={()=>void deploy('preview')} className="rounded-2xl border border-sky-300/15 bg-sky-400/[0.04] p-4 text-left disabled:opacity-50" disabled={deployBusy!==null}>
                <Rocket className="h-5 w-5 text-sky-300"/>
                <p className="mt-3 text-sm font-bold text-white">Deploy Preview</p>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">{data.cloud.previewConfigured?'Cloud Build trigger ready':'Set WEAVE_CLOUD_BUILD_PREVIEW_TRIGGER_ID'}</p>
              </button>
              <button onClick={()=>void deploy('promote')} className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4 text-left disabled:opacity-50" disabled={deployBusy!==null}>
                <Activity className="h-5 w-5 text-emerald-300"/>
                <p className="mt-3 text-sm font-bold text-white">Promote Candidate</p>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">{data.cloud.promoteConfigured?'Cloud Build trigger ready':'Set WEAVE_CLOUD_BUILD_PROMOTE_TRIGGER_ID'}</p>
              </button>
            </div>
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
          <h2 className="text-sm font-bold text-white">Deployment Record</h2>
          <div className="mt-4 space-y-2">{data.deployments.length===0?<p className="text-xs text-slate-500">No infrastructure deployment requests recorded yet.</p>:data.deployments.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-[10px]"><span className="font-bold uppercase text-slate-300">{item.action}</span><span className="text-slate-500">{item.status} · {new Date(item.created_at).toLocaleString()}</span></div>)}</div>
        </section>
      </>}
    </main>
  )
}
