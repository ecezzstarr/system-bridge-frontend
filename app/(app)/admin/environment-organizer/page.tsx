'use client'

import {useEffect,useMemo,useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {ArrowDown,ArrowUp,Eye,EyeOff,LayoutTemplate,LockKeyhole,RefreshCw,RotateCcw,Search,SlidersHorizontal} from 'lucide-react'
import {toast} from 'sonner'
import {useAuth} from '@/lib/auth-provider'
import {getAuthHeaders} from '@/lib/auth-client'
import {WeaveSystemRoom} from '@/components/world/weave-system-room'
import {EnvironmentRuntimeControls} from '@/components/admin/environment-runtime-controls'

type Surface={
  surface_key:string
  label:string
  surface_kind:'district'|'station'
  route:string
  area:string
  scope:string
  is_visible:boolean
  sort_order:number
  is_protected:boolean
  updated_at:string
}
type View='stations'|'runtime'
type Visibility='all'|'live'|'hidden'
type Kind='all'|'district'|'station'

export default function EnvironmentOrganizerWorkshop(){
  const {user,isInitialized}=useAuth()
  const router=useRouter()
  const [items,setItems]=useState<Surface[]>([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [view,setView]=useState<View>('stations')
  const [area,setArea]=useState('Administrations')
  const [query,setQuery]=useState('')
  const [visibility,setVisibility]=useState<Visibility>('all')
  const [kind,setKind]=useState<Kind>('all')

  useEffect(()=>{
    if(isInitialized&&(!user||user.role!=='admin'))router.replace('/dashboard')
  },[isInitialized,user,router])

  const load=async()=>{
    setLoading(true)
    try{
      const response=await fetch('/api/admin/environment-organizer',{headers:getAuthHeaders(),cache:'no-store'})
      const body=await response.json()
      if(!response.ok||!body.success)throw new Error(body.error||'Unable to load Environment Organizer')
      setItems(Array.isArray(body.items)?body.items:[])
      setError('')
    }catch(e){
      const message=e instanceof Error?e.message:'Unable to load Environment Organizer'
      setError(message)
      toast.error(message)
    }finally{setLoading(false)}
  }

  useEffect(()=>{if(user?.role==='admin')void load()},[user?.id,user?.role])

  const run=async(payload:Record<string,unknown>,key:string)=>{
    if(busy)return
    setBusy(key)
    try{
      const response=await fetch('/api/admin/environment-organizer',{
        method:'PATCH',headers:getAuthHeaders(),body:JSON.stringify(payload),
      })
      const body=await response.json()
      if(!response.ok||!body.success)throw new Error(body.error||'Environment update failed')
      setItems(Array.isArray(body.items)?body.items:[])
      setError('')
      window.dispatchEvent(new Event('weave-environment-refresh'))
      toast.success(payload.action==='restore_defaults'?'Default organization restored.':'Saved to the active environment.')
    }catch(e){
      const message=e instanceof Error?e.message:'Environment update failed'
      toast.error(message)
      setError(message)
    }finally{setBusy('')}
  }

  const areas=useMemo(()=>[...new Set(items.map(item=>item.area))].sort((a,b)=>a.localeCompare(b)),[items])
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase()
    return items.filter(item=>
      (area==='all'||item.area===area)&&
      (visibility==='all'||(visibility==='live'?item.is_visible:!item.is_visible))&&
      (kind==='all'||item.surface_kind===kind)&&
      (!q||[item.label,item.route,item.area,item.scope,item.surface_kind].some(value=>String(value).toLowerCase().includes(q))))
  },[items,area,visibility,kind,query])
  const grouped=useMemo(()=>{
    const groups=new Map<string,Surface[]>()
    for(const item of filtered){
      const current=groups.get(item.area)||[]
      current.push(item)
      groups.set(item.area,current)
    }
    return [...groups.entries()].map(([name,surfaces])=>[name,
      [...surfaces].sort((a,b)=>a.sort_order-b.sort_order||a.label.localeCompare(b.label)||a.surface_key.localeCompare(b.surface_key))
    ] as const)
  },[filtered])
  const canMove=!query.trim()&&visibility==='all'&&kind==='all'
  const live=items.filter(item=>item.is_visible).length
  const hidden=items.length-live

  if(!isInitialized||!user||user.role!=='admin')return null

  const left=<>
    <section className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[.04] p-4">
      <LayoutTemplate className="h-5 w-5 text-cyan-300"/>
      <h2 className="mt-2 text-base font-bold text-white">Organize actual work</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">Choose a department, move its stations or change visibility. Each adjustment is recorded; source code and user records remain intact.</p>
    </section>
    <section className="mt-3 rounded-2xl border border-white/10 bg-white/[.04] p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Registered environment</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl border border-emerald-300/20 p-3"><p className="text-sm text-emerald-200">Visible</p><p className="mt-1 text-2xl font-bold text-white">{live}</p></div>
        <div className="rounded-xl border border-amber-300/20 p-3"><p className="text-sm text-amber-200">Hidden</p><p className="mt-1 text-2xl font-bold text-white">{hidden}</p></div>
      </div>
    </section>
  </>

  const center=<div data-phe-organizer="phone-first" className="min-w-0">
    <nav className="grid grid-cols-2 gap-2" aria-label="Organizer workshops">
      <button type="button" onClick={()=>setView('stations')} aria-pressed={view==='stations'}
        className={`min-h-12 rounded-xl border px-3 py-3 text-sm font-bold ${view==='stations'?'border-amber-200 bg-amber-200 text-[#142c3c]':'border-white/20 bg-black/20 text-slate-200'}`}>
        Pages and stations
      </button>
      <button type="button" onClick={()=>setView('runtime')} aria-pressed={view==='runtime'}
        className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold ${view==='runtime'?'border-amber-200 bg-amber-200 text-[#142c3c]':'border-white/20 bg-black/20 text-slate-200'}`}>
        <SlidersHorizontal className="h-4 w-4"/> Runtime
      </button>
    </nav>

    {view==='runtime'?<div className="mt-4" data-phe-organizer-runtime>
      <p className="mb-3 text-sm leading-6 text-slate-300">Loading, presence and ambience remain independent of the company’s pages. Review changes before publishing them.</p>
      <EnvironmentRuntimeControls/>
      <Link href="/admin/loader-workshop" className="mt-4 inline-flex min-h-12 w-full items-center rounded-xl border border-sky-300/30 p-3 text-sm font-bold text-sky-100">Open Loader Workshop</Link>
    </div>:<>
      <header className="mt-4 rounded-2xl border border-white/15 bg-black/25 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Pages and operating stations</h2>
            <p className="mt-1 text-sm text-slate-300">Select a department and arrange its real entrances.</p>
          </div>
          <button type="button" onClick={()=>void load()} disabled={loading||Boolean(busy)} aria-label="Refresh environment registry" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 text-white disabled:opacity-40"><RefreshCw className={`h-5 w-5 ${loading?'animate-spin':''}`}/></button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2" data-phe-organizer-filters>
          <label className="block text-sm font-semibold text-slate-200">Department or district
            <select value={area} onChange={e=>setArea(e.target.value)} className="mt-1 block min-h-12 w-full min-w-0 rounded-xl border border-white/25 bg-[#0c2638] px-3 text-base text-white">
              <option value="all">All company areas</option>
              {areas.map(name=><option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-200">Search station or address
            <span className="mt-1 flex min-h-12 items-center gap-2 rounded-xl border border-white/25 bg-[#0c2638] px-3">
              <Search className="h-4 w-4 shrink-0 text-sky-200"/>
              <input type="search" value={query} onChange={e=>setQuery(e.target.value)}
                placeholder="e.g. Hope, File Folder…" className="min-w-0 w-full bg-transparent py-3 text-base text-white outline-none placeholder:text-slate-400"/>
            </span>
          </label>
          <label className="block text-sm font-semibold text-slate-200">Visibility
            <select value={visibility} onChange={e=>setVisibility(e.target.value as Visibility)} className="mt-1 block min-h-12 w-full rounded-xl border border-white/25 bg-[#0c2638] px-3 text-base text-white">
              <option value="all">Visible and hidden</option><option value="live">Visible only</option><option value="hidden">Hidden only</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-200">Type
            <select value={kind} onChange={e=>setKind(e.target.value as Kind)} className="mt-1 block min-h-12 w-full rounded-xl border border-white/25 bg-[#0c2638] px-3 text-base text-white">
              <option value="all">All types</option><option value="district">Districts</option><option value="station">Stations</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p role="status" aria-live="polite" className="text-sm text-slate-300">{loading?'Reading environment…':`${filtered.length} of ${items.length} surfaces shown`}</p>
          {!canMove&&<p className="text-xs leading-5 text-amber-200">Clear search and visibility/type filters to reorder accurately.</p>}
        </div>
      </header>

      {error&&<p role="alert" className="mt-3 rounded-xl border border-rose-300/40 p-3 text-sm text-rose-100">{error}</p>}
      {loading?<p role="status" className="mt-4 rounded-xl border border-white/15 p-5 text-sm text-slate-200">Loading recorded stations…</p>:
      grouped.length===0?<p className="mt-4 rounded-xl border border-white/15 p-5 text-sm text-slate-200">No stations match these filters. Change the department or clear the search.</p>:
      <div className="mt-4 space-y-4" data-phe-organizer-groups>
        {grouped.map(([name,surfaces])=><section key={name} className="overflow-hidden rounded-2xl border border-white/15 bg-[#0b2132]/85" aria-label={name}>
          <header className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3">
            <div><h3 className="text-lg font-bold text-white">{name}</h3><p className="mt-1 text-xs text-slate-300">{surfaces.length} registered surfaces</p></div>
          </header>
          <ol className="divide-y divide-white/10">
            {surfaces.map((item,index)=><li key={item.surface_key} data-phe-organizer-surface={item.surface_key} className="min-w-0 p-3 sm:p-4">
              <article className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-white/20 px-2 text-xs font-bold text-white">{index+1}</span>
                  <h4 className="min-w-0 text-base font-bold text-white">{item.label}</h4>
                </div>
                <p className="mt-2 break-all text-xs text-slate-300">{item.route}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-200">
                  <span className="rounded-full border border-white/20 px-2 py-1">{item.surface_kind}</span>
                  <span className="rounded-full border border-white/20 px-2 py-1">{item.scope}</span>
                  <span className={`rounded-full border px-2 py-1 ${item.is_visible?'border-emerald-300/40 text-emerald-200':'border-amber-300/40 text-amber-100'}`}>{item.is_visible?'Visible':'Hidden'}</span>
                  {item.is_protected&&<span className="inline-flex items-center gap-1 rounded-full border border-violet-300/40 px-2 py-1 text-violet-200"><LockKeyhole className="h-3 w-3"/> Protected</span>}
                </div>
                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 sm:flex sm:flex-wrap" data-phe-organizer-actions>
                  <button type="button" aria-label={`Move ${item.label} earlier`}
                    disabled={Boolean(busy)||!canMove||index===0}
                    onClick={()=>void run({action:'move_surface',surfaceKey:item.surface_key,direction:'earlier'},item.surface_key+':earlier')}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-3 py-2 text-sm font-semibold text-white disabled:opacity-35">
                    <ArrowUp className="h-4 w-4"/> Earlier
                  </button>
                  <button type="button" aria-label={`Move ${item.label} later`}
                    disabled={Boolean(busy)||!canMove||index===surfaces.length-1}
                    onClick={()=>void run({action:'move_surface',surfaceKey:item.surface_key,direction:'later'},item.surface_key+':later')}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-3 py-2 text-sm font-semibold text-white disabled:opacity-35">
                    <ArrowDown className="h-4 w-4"/> Later
                  </button>
                  <button type="button" disabled={Boolean(busy)||(item.is_protected&&item.is_visible)}
                    onClick={()=>{
                      if(item.is_visible&&!window.confirm(`Hide ${item.label} from navigation? Its records and source remain preserved.`))return
                      void run({action:'set_visibility',surfaceKey:item.surface_key,visible:!item.is_visible},item.surface_key+':visibility')
                    }}
                    className={`col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold sm:ml-auto ${item.is_visible?'border-amber-300/40 text-amber-100':'border-emerald-300/40 text-emerald-200'} disabled:opacity-35`}>
                    {item.is_visible?<><EyeOff className="h-4 w-4"/>Remove from navigation</>:<><Eye className="h-4 w-4"/>Restore to navigation</>}
                  </button>
                </div>
              </article>
            </li>)}
          </ol>
        </section>)}
      </div>}
    </> }
  </div>

  const right=<>
    <section className="rounded-2xl border border-violet-300/25 bg-violet-300/[.04] p-4">
      <h2 className="text-sm font-bold text-violet-100">Protected company functions</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">Critical entrances remain visible. Hiding an optional surface never removes its code, permissions or user records.</p>
    </section>
    <button type="button" onClick={()=>void load()} disabled={loading||Boolean(busy)}
      className="mt-3 flex min-h-12 w-full items-center justify-between rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">Reload registry <RefreshCw className="h-4 w-4"/></button>
    <button type="button" disabled={Boolean(busy)} onClick={()=>{
      if(window.confirm('Restore the default visibility and order of every registered surface?'))void run({action:'restore_defaults'},'restore')
    }} className="mt-3 flex min-h-12 w-full items-center justify-between rounded-xl border border-amber-300/30 px-4 py-3 text-sm font-bold text-amber-200 disabled:opacity-40">Restore default organization <RotateCcw className="h-4 w-4"/></button>
  </>

  return <WeaveSystemRoom
    roomKey="administration-environment-organizer"
    eyebrow="Administrations · Environment Authority"
    title="Environment Organizer"
    detail="Put each department’s working stations in a useful order. Phone navigation comes first; runtime presence and sounds remain separately controlled."
    tone="sky" left={left} center={center} right={right}
    pulse={hidden?`${hidden} optional surfaces hidden`:'Active environment organization'}
  />
}
