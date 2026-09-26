'use client'

import { useEffect,useMemo,useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  LayoutTemplate,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-provider'
import { getAuthHeaders } from '@/lib/auth-client'
import { WeaveSystemRoom } from '@/components/world/weave-system-room'

type Surface={
  surface_key:string
  label:string
  surface_kind:'page'|'card'
  route:string
  area:string
  scope:string
  is_visible:boolean
  sort_order:number
  is_protected:boolean
  updated_at:string
}

export default function EnvironmentOrganizerWorkshop(){
  const {user,isInitialized}=useAuth()
  const router=useRouter()
  const [items,setItems]=useState<Surface[]>([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState('')
  const [query,setQuery]=useState('')

  useEffect(()=>{
    if(isInitialized&&(!user||user.role!=='admin'))router.replace('/dashboard')
  },[isInitialized,user,router])

  const load=async()=>{
    setLoading(true)
    try{
      const response=await fetch('/api/admin/environment-organizer',{headers:getAuthHeaders(),cache:'no-store'})
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to load Environment Organizer')
      setItems(body.items||[])
    }catch(error:any){
      toast.error(error.message||'Unable to load Environment Organizer')
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{if(user?.role==='admin')void load()},[user?.id])

  const run=async(payload:Record<string,unknown>,key:string)=>{
    setBusy(key)
    try{
      const response=await fetch('/api/admin/environment-organizer',{
        method:'PATCH',
        headers:getAuthHeaders(),
        body:JSON.stringify(payload),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Environment update failed')
      setItems(body.items||[])
      window.dispatchEvent(new Event('weave-environment-refresh'))
      toast.success(payload.action==='restore_defaults'?'Environment defaults restored.':'Environment organization updated.')
    }catch(error:any){
      toast.error(error.message||'Environment update failed')
    }finally{
      setBusy('')
    }
  }

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase()
    if(!q)return items
    return items.filter(item=>[item.label,item.route,item.area,item.scope,item.surface_kind].some(value=>String(value).toLowerCase().includes(q)))
  },[items,query])

  const grouped=useMemo(()=>{
    const map=new Map<string,Surface[]>()
    for(const item of filtered){
      const group=map.get(item.area)||[]
      group.push(item)
      map.set(item.area,group)
    }
    return [...map.entries()]
  },[filtered])

  const live=items.filter(item=>item.is_visible).length
  const hidden=items.length-live

  if(!isInitialized||!user||user.role!=='admin')return null

  const left=<>
    <section className="rounded-3xl border border-cyan-300/15 bg-cyan-400/[.035] p-4">
      <LayoutTemplate className="h-5 w-5 text-cyan-300"/>
      <p className="mt-3 text-sm font-black text-white">Runtime environment authority</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">Remove a badly placed card or page from the active environment without deleting its source. Restore it when the structure is ready.</p>
    </section>
    <section className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Registry state</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-emerald-300/10 bg-emerald-400/[.035] p-3 text-center"><p className="text-[8px] uppercase text-emerald-300">Live</p><p className="mt-1 text-2xl font-black text-white">{live}</p></div>
        <div className="rounded-xl border border-amber-300/10 bg-amber-400/[.035] p-3 text-center"><p className="text-[8px] uppercase text-amber-300">Removed</p><p className="mt-1 text-2xl font-black text-white">{hidden}</p></div>
      </div>
    </section>
    <section className="rounded-3xl border border-violet-300/15 bg-violet-400/[.035] p-4">
      <p className="text-[9px] font-black uppercase tracking-wider text-violet-300">Safety rule</p>
      <p className="mt-3 text-xs leading-5 text-slate-300">Protected control surfaces stay present so Administration cannot remove the Organizer, core Operating Rooms, or the Client’s Main File Folder entrance.</p>
    </section>
  </>

  const center=loading?<div className="flex min-h-[520px] items-center justify-center"><RefreshCw className="h-7 w-7 animate-spin text-cyan-300"/></div>:<>
    <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">Environment registry</p>
        <h2 className="mt-1 text-xl font-black text-white">Pages and cards in operating order</h2>
        <p className="mt-2 text-xs leading-5 text-slate-400">Removal here means hidden from active navigation/runtime. Source code and records remain intact.</p>
      </div>
      <label className="flex min-w-[260px] items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
        <Search className="h-4 w-4 text-slate-500"/>
        <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Find page, card or district…" className="w-full bg-transparent text-xs text-white outline-none"/>
      </label>
    </div>

    <div className="mt-4 space-y-5">
      {grouped.map(([area,surfaces])=><section key={area} className="overflow-hidden rounded-3xl border border-white/10 bg-[#030914]/70">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-sky-300">{area}</p><p className="mt-1 text-[10px] text-slate-500">{surfaces.length} registered surfaces</p></div>
        </header>
        <div className="divide-y divide-white/5">
          {surfaces.map((item,index)=><article key={item.surface_key} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black text-white">{item.label}</h3>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[8px] font-black uppercase text-slate-400">{item.surface_kind}</span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[8px] font-black uppercase text-slate-500">{item.scope}</span>
                {item.is_protected&&<span className="inline-flex items-center gap-1 rounded-full border border-violet-300/15 bg-violet-400/[.04] px-2 py-0.5 text-[8px] font-black uppercase text-violet-200"><LockKeyhole className="h-3 w-3"/>Protected</span>}
              </div>
              <p className="mt-1 truncate font-mono text-[9px] text-slate-600">{item.route}</p>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={Boolean(busy)||index===0} onClick={()=>void run({action:'set_order',surfaceKey:item.surface_key,sortOrder:item.sort_order-15},item.surface_key+':up')} className="rounded-lg border border-white/10 p-2 text-slate-400 disabled:opacity-30" aria-label="Move earlier"><ArrowUp className="h-3.5 w-3.5"/></button>
              <button disabled={Boolean(busy)||index===surfaces.length-1} onClick={()=>void run({action:'set_order',surfaceKey:item.surface_key,sortOrder:item.sort_order+15},item.surface_key+':down')} className="rounded-lg border border-white/10 p-2 text-slate-400 disabled:opacity-30" aria-label="Move later"><ArrowDown className="h-3.5 w-3.5"/></button>
              <button
                disabled={Boolean(busy)||(item.is_protected&&item.is_visible)}
                onClick={()=>void run({action:'set_visibility',surfaceKey:item.surface_key,visible:!item.is_visible},item.surface_key+':visibility')}
                className={`inline-flex min-w-[118px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[9px] font-black uppercase ${item.is_visible?'border-amber-300/20 bg-amber-400/[.05] text-amber-200':'border-emerald-300/20 bg-emerald-400/[.05] text-emerald-200'} disabled:opacity-35`}
              >
                {item.is_visible?<><EyeOff className="h-3.5 w-3.5"/>Withdraw</>:<><Eye className="h-3.5 w-3.5"/>Restore</>}
              </button>
            </div>
          </article>)}
        </div>
      </section>)}
    </div>
  </>

  const right=<>
    <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[.035] p-4">
      <div className="flex items-center gap-2"><Eye className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">Runtime effect</p></div>
      <p className="mt-3 text-sm font-black text-white">No Cloud Run rebuild for later changes</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">Once this source upgrade is eventually released, Organizer changes are database-backed and active clients refresh the registry automatically.</p>
    </section>
    <button onClick={()=>void load()} disabled={loading} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3 text-xs font-black text-white"><span>Reload registry</span><RefreshCw className={`h-4 w-4 text-cyan-300 ${loading?'animate-spin':''}`}/></button>
    <button onClick={()=>{if(window.confirm('Restore every registered page/card to its default visibility and order?'))void run({action:'restore_defaults'},'restore')}} disabled={Boolean(busy)} className="flex w-full items-center justify-between rounded-2xl border border-amber-300/15 bg-amber-400/[.035] px-4 py-3 text-xs font-black text-amber-200 disabled:opacity-40"><span>Restore default organization</span><RotateCcw className="h-4 w-4"/></button>
  </>

  return <WeaveSystemRoom
    roomKey="administration-environment-organizer"
    eyebrow="Administration · Environment Authority"
    title="Environment Organizer"
    detail="Control which registered pages and cards remain in the active WEAVE environment, and correct their operating order without deleting source code."
    tone="sky"
    left={left}
    center={center}
    right={right}
    pulse={hidden?`${hidden} surfaces removed from the active environment`:'Environment registry fully visible'}
  />
}
