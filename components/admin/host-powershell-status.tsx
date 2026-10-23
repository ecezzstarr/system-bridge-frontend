'use client'
import { useEffect,useState } from 'react'
import Link from 'next/link'
import { Activity,RefreshCw,ServerCog,ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

type HostState={
  serverKey:string;online:boolean;lastSeen:string|null
  snapshot:Record<string,string|number|boolean|null>|null
  security:Record<string,boolean>
}
export function HostPowerShellStatus({token}:{token:string|null}){
  const [state,setState]=useState<HostState|null>(null)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const read=async()=>{
    if(!token)return
    setLoading(true)
    try{
      const response=await fetch('/api/admin/host-powershell',{
        cache:'no-store',headers:{Authorization:'Bearer '+token},
      })
      const body=await response.json()
      if(!response.ok||!body.success)throw new Error(body.error||'Host state unavailable')
      setState(body);setError('')
    }catch(err){setError(err instanceof Error?err.message:'Host state unavailable')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void read()},[token])
  const labels:Record<string,string>={
    production:'Production runtime',httpsOrigin:'HTTPS identity origin',
    nextAuthSecret:'Session signing secret',jwtSecret:'API JWT secret',
    distinctAuthSecrets:'Independent authentication secrets',
    releaseWorkerConfigured:'Release worker token',
    powershellWorkerConfigured:'PowerShell worker token',
  }
  return <section data-weave-powershell-host className="rounded-[2rem] border border-cyan-300/20 bg-[#06131b]/85 p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">Administration · PowerShell host</p>
        <h2 className="mt-2 text-xl font-black text-white">Weave Server Operations</h2>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">PowerShell 7 sends private server-health reports. The application never executes arbitrary commands. Deployments and historical rollbacks remain in the verified Release Workshop.</p>
      </div>
      <Button onClick={()=>void read()} disabled={loading||!token} variant="outline">
        <RefreshCw className={loading?'mr-2 h-4 w-4 animate-spin':'mr-2 h-4 w-4'}/> Refresh host
      </Button>
    </div>
    {error&&<p role="alert" className="mt-3 text-xs text-amber-300">{error}</p>}
    <div className="mt-4 grid gap-3 sm:grid-cols-4">
      {[
        ['Sentinel',state?.online?'Reporting':'Not connected'],
        ['Application',String(state?.snapshot?.weave||'Unknown')],
        ['HTTPS edge',String(state?.snapshot?.edge||'Unknown')],
        ['Disk used',typeof state?.snapshot?.disk==='number'&&state.snapshot.disk>=0?String(state.snapshot.disk)+'%':'Unknown'],
      ].map(([label,value])=><div key={label} className="rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="text-[10px] text-slate-500">{label}</p><p className="mt-2 text-sm font-bold text-white">{value}</p>
      </div>)}
    </div>
    <p className="mt-3 text-[10px] text-slate-500">{state?.lastSeen?'Last host report: '+new Date(state.lastSeen).toLocaleString():'No host reports received.'} · This display reflects reports, not guaranteed server security.</p>
    <div className="mt-5 border-t border-white/10 pt-4">
      <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-slate-200"/><h3 className="text-sm font-bold text-white">Security configuration checks</h3></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {Object.entries(state?.security||{}).map(([name,good])=><div key={name} className="flex items-center justify-between gap-3 border border-white/10 px-3 py-2">
          <span className="text-xs text-slate-300">{labels[name]||name}</span>
          <span className={good?'text-xs font-bold text-emerald-300':'text-xs font-bold text-amber-300'}>{good?'Configured':'Action needed'}</span>
        </div>)}
      </div>
    </div>
    <div className="mt-5 flex flex-wrap gap-2">
      <Link href="/admin/release-workshop" className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-400/[.05] px-4 py-3 text-xs font-black text-cyan-100">
        <ServerCog className="h-4 w-4"/> Verified deploy / rollback
      </Link>
      <Link href="/admin/deployment-records" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs text-slate-200">
        <Activity className="h-4 w-4"/> Host release record
      </Link>
    </div>
  </section>
}
