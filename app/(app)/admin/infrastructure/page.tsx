'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { HostPowerShellStatus } from '@/components/admin/host-powershell-status'
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
  readiness:{ready:boolean;releaseSha:string|null;checkedAt:string|null;checks:Array<{name:string;passed:boolean;detail:string}>}
  systems:Array<any>
  deployments:Array<any>
}

export default function InfrastructureWorkshop(){
  const {user,token,isInitialized}=useAuth()
  const router=useRouter()
  const [data,setData]=useState<Snapshot|null>(null)
  const [loading,setLoading]=useState(true)
  const [shieldBusy,setShieldBusy]=useState(false)
  const [checkBusy,setCheckBusy]=useState(false)
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

  /**
   * A readiness snapshot is informational, not a disabled-button lock.
   * Every release request obtains fresh, actor-audited checks before changing
   * the persistent Shield. The server independently verifies the same cycle
   * and deployment SHA in its atomic release update.
   */
  async function verifyRelease(showSuccess:boolean):Promise<boolean>{
    setCheckBusy(true)
    try{
      const response=await fetch('/api/admin/divine-shield',{
        method:'POST',headers:headers(),body:JSON.stringify({action:'check'}),
        cache:'no-store',
      })
      const body=await response.json()
      if(!response.ok||!body.success)throw Error(body.error||'Unable to verify release')
      setData(prev=>prev?{...prev,readiness:body.readiness}:prev)
      if(!body.check?.passed||!body.readiness?.ready){
        const failures=(body.check?.checks||[]).filter((item:{passed:boolean})=>!item.passed)
        const detail=failures.map((item:{name:string;detail:string})=>item.name+': '+item.detail).join(' · ')
        toast.error(detail||'Release verification failed. See the checks below; the Shield remains raised.',{duration:12000})
        return false
      }
      if(showSuccess)toast.success('Release verified. Administrations may release Divine Shield.')
      return true
    }catch(error){
      toast.error(error instanceof Error?error.message:'Release verification failed')
      return false
    }finally{setCheckBusy(false)}
  }

  async function toggleShield(){
    if(!data)return
    const next=!data.shield.active
    if(next && !window.confirm('Raise Divine Shield? Departmental work will pause, but all user sessions remain signed in.'))return
    if(!next && !window.confirm('Verify the current live release and release Divine Shield only if every check passes?'))return
    setShieldBusy(true)
    try{
      // Do not use a cached 15-minute status to authorize reopening.
      if(!next && !(await verifyRelease(false)))return
      const response=await fetch('/api/admin/divine-shield',{
        method:'POST',headers:headers(),cache:'no-store',
        body:JSON.stringify({
          active:next,
          confirm:next?'RAISE_DIVINE_SHIELD':'RELEASE_DIVINE_SHIELD',
          title:data.shield.title,
          message:data.shield.message,
        }),
      })
      const body=await response.json()
      if(!response.ok||!body.success)throw new Error(body.error||'Divine Shield update failed')
      setData(prev=>prev?{...prev,shield:body.state,readiness:body.readiness}:prev)
      if(body.recorded===false)toast.warning('Shield changed, but transition audit did not persist. Reconcile the infrastructure ledger immediately.')
      toast.success(next
        ? 'Divine Shield raised · sessions preserved · departments waiting'
        : 'Divine Shield released · departments resumed')
    }catch(error){
      toast.error(error instanceof Error?error.message:'Divine Shield update failed')
      // A race or expired check must never silently reopen company workrooms.
      void refresh()
    }finally{setShieldBusy(false)}
  }

  async function runReleaseChecks(){
    if(!data?.shield.active)return
    await verifyRelease(true)
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
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Administrations · Infrastructure</p>
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
                <h2 className="mt-1 text-xl font-bold text-white">{data.shield.active?'Raised · departments waiting, accounts preserved':'Released · WEAVE open'}</h2>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">{data.shield.message}</p>
                <p className="mt-2 text-xs text-amber-100">Shield does not log users out or clear their work. Administrations verifies the live release while departmental operations are paused.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {data.shield.active&&<Button onClick={()=>void runReleaseChecks()} disabled={checkBusy||shieldBusy} variant="outline" className="border-amber-300/50 text-amber-100">
                {checkBusy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Activity className="mr-2 h-4 w-4"/>}Run release checks
              </Button>}
            <Button onClick={toggleShield} disabled={shieldBusy||checkBusy} className={data.shield.active?'bg-emerald-600 hover:bg-emerald-700':'bg-amber-600 hover:bg-amber-700'}>
              {shieldBusy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Shield className="mr-2 h-4 w-4"/>}
              {data.shield.active?'Verify & Release Shield':'Raise Shield'}
            </Button>
            </div>
          </div>
          {data.shield.active&&<div className="mt-5 rounded-xl border border-amber-300/25 bg-black/20 p-4" data-divine-shield-checks>
            <p className="text-sm font-bold text-amber-100">{data.readiness.ready?'Release verified · Administrations can reopen departments':'Awaiting checks · departments remain paused'}</p>
            <p className="mt-1 text-xs text-slate-300">Release {data.readiness.releaseSha||'not identified'} · Last check {data.readiness.checkedAt?new Date(data.readiness.checkedAt).toLocaleString():'not yet performed'}. Checks expire after 15 minutes.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {data.readiness.checks.map(check=><div key={check.name} className="rounded-lg border border-white/10 p-3">
                <p className={check.passed?'text-xs font-bold text-emerald-200':'text-xs font-bold text-rose-200'}>{check.passed?'Passed':'Needs attention'} · {check.name}</p>
                <p className="mt-1 text-xs text-slate-300">{check.detail}</p>
              </div>)}
            </div>
            <p className="mt-3 text-xs text-slate-400">If a check fails, keep the Shield raised and use Release Workshop for remediation or rollback. The Shield never deploys code by itself.</p>
          </div>}
        </section>

        <HostPowerShellStatus token={token} />

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
