'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Boxes,
  ChevronRight,
  Clock3,
  Coins,
  Hammer,
  Library,
  PackageOpen,
  Plus,
  Store,
  Workflow,
  CheckCircle2,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { getClientToken } from '@/lib/client-auth'

type Props = {
  clientName: string
  fileNumber: string
  workshopTitle: string
  workshopPurpose?: string | null
  initialWorld: any
  readOnly?: boolean
  refreshUrl?: string
  refreshToken?: string | null
}

const districts = [
  { key: 'workshop_core', label: 'Workshop Core', icon: Workflow, detail: 'Your personalized workshop and current movement.' },
  { key: 'formation_yard', label: 'Formation Yard', icon: Hammer, detail: 'Structures currently being built in real time.' },
  { key: 'blueprint_foundry', label: 'Blueprint Foundry', icon: Boxes, detail: 'Choose the next real system to form.' },
  { key: 'build_market', label: 'Build Market', icon: Store, detail: 'Acquire components required by blueprints.' },
  { key: 'active_systems', label: 'Active Systems', icon: PackageOpen, detail: 'Use systems that have finished construction.' },
  { key: 'library_district', label: 'Library District', icon: Library, detail: 'Learn by movement and record progress.' },
]

function duration(seconds: number) {
  if (seconds <= 0) return 'Completing…'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default function FileFolderOpenWorld({
  clientName,
  fileNumber,
  workshopTitle,
  workshopPurpose,
  initialWorld,
  readOnly = false,
  refreshUrl,
  refreshToken,
}: Props) {
  const [world, setWorld] = useState(initialWorld)
  const [district, setDistrict] = useState('workshop_core')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [now, setNow] = useState(Date.now())
  const [systemDrafts, setSystemDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const url = refreshUrl || (!readOnly ? '/api/client/file-folder-world' : null)
    if (!url) return

    const refresh = async () => {
      try {
        const token = refreshToken ?? (!readOnly ? getClientToken() : null)
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        })
        const body = await response.json()
        if (response.ok && body.world) setWorld(body.world)
      } catch {
        // Keep the current world visible if a background refresh fails.
      }
    }

    const id = window.setInterval(refresh, 20000)
    return () => window.clearInterval(id)
  }, [readOnly, refreshToken, refreshUrl])

  const inventory = useMemo(
    () => new Map((world?.inventory || []).map((item: any) => [item.item_key, Number(item.quantity || 0)])),
    [world?.inventory],
  )

  const act = async (payload: any, key: string) => {
    if (readOnly) return
    setBusy(key)
    setMessage('')
    try {
      const token = getClientToken()
      const response = await fetch('/api/client/file-folder-world', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Movement failed')
      setWorld(body.world)
      setMessage('Movement recorded in the Main File Folder.')
    } catch (error: any) {
      setMessage(error?.message || 'Movement failed')
    } finally {
      setBusy('')
    }
  }

  const activeBuilds = (world?.builds || []).filter((build: any) => build.status === 'building')
  const buildFunding = world?.buildFunding || null
  const fundingGateLocked = Boolean(buildFunding && !buildFunding.publicDoorUnlocked && world?.customerDoor?.formation_status === 'funding_gate')
  const completedBuilds = (world?.builds || []).filter((build: any) => build.status === 'complete')

  return (
    <section className="overflow-hidden rounded-[2rem] border border-sky-300/10 bg-[#020711] shadow-2xl">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(14,165,233,.18),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(139,92,246,.13),transparent_30%)] p-5 md:p-8">
        <p className="text-[9px] font-black uppercase tracking-[0.28em] text-sky-300">Main File Folder · Persistent Open World</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-white md:text-4xl">{workshopTitle}</h2>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-400">{workshopPurpose || 'The Client’s chosen workshop remains the center while real systems form around it.'}</p>
            <p className="mt-2 text-[10px] font-mono text-slate-500">{clientName} · {fileNumber}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-[10px] md:grid-cols-4">
            <div className="rounded-xl border border-amber-300/15 bg-amber-400/5 px-4 py-3">
              <p className="uppercase tracking-wider text-amber-300">Building now</p>
              <p className="mt-1 text-xl font-black text-white">{activeBuilds.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-300/15 bg-emerald-400/5 px-4 py-3">
              <p className="uppercase tracking-wider text-emerald-300">Active systems</p>
              <p className="mt-1 text-xl font-black text-white">{world?.systems?.length || 0}</p>
            </div>
            <div className="rounded-xl border border-violet-300/15 bg-violet-400/5 px-4 py-3">
              <p className="uppercase tracking-wider text-violet-300">Customer Door</p>
              <p className="mt-1 text-xs font-black uppercase text-white">{world?.customerDoor?.formation_status || 'forming'}</p>
              <p className="mt-1 text-[8px] text-slate-500">{world?.customerDoor?.active_offer_count || 0} public offers</p>
            </div>
            <div className="rounded-xl border border-cyan-300/15 bg-cyan-400/5 px-4 py-3">
              <p className="uppercase tracking-wider text-cyan-300">Build Power</p>
              <p className="mt-1 text-xl font-black text-white">×{Number(buildFunding?.buildSpeedMultiplier || 1).toFixed(2)}</p>
              <p className="mt-1 text-[8px] text-slate-500">{Number(buildFunding?.totalParticipationFlameCoin || 0).toLocaleString()} Flame Coin</p>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[10px] leading-5 text-slate-400">
          {world?.guarantee?.hasActiveBuild
            ? 'Formation guarantee: at least one real build is currently moving through time.'
            : world?.guarantee?.hasReadyBlueprint
              ? 'Formation guarantee: no build is running yet, but buildable blueprints are available now.'
              : 'No buildable blueprint is currently published.'}
        </div>
        {buildFunding && !buildFunding.grandfathered && (
          <div className={`mt-3 rounded-xl border px-4 py-3 text-[10px] leading-5 ${buildFunding.publicDoorUnlocked ? 'border-emerald-300/15 bg-emerald-400/5 text-emerald-200' : 'border-amber-300/20 bg-amber-400/5 text-amber-100'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-black uppercase tracking-wider">File Folder funding · </span>
                {Number(buildFunding.totalParticipationFlameCoin || 0).toLocaleString()} / {Number(buildFunding.publicDoorThresholdFlameCoin || 0).toLocaleString()} Flame Coin for the first public door.
                {!buildFunding.publicDoorUnlocked && <> Add {Number(buildFunding.requiredToOpenPublicDoorFlameCoin || 0).toLocaleString()} more Flame Coin before the Customer Door can open and new construction can continue after that gate.</>}
              </div>
              {!readOnly && !buildFunding.publicDoorUnlocked && (
                <Link href="/client/deposit" className="inline-flex items-center gap-1.5 rounded-full bg-amber-300 px-3 py-1.5 font-black uppercase tracking-wider text-slate-950">
                  <Zap className="h-3 w-3"/> Add Flame Credits
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="grid min-h-[650px] lg:grid-cols-[250px_1fr]">
        <aside className="border-b border-white/10 bg-black/20 p-3 lg:border-b-0 lg:border-r">
          <p className="px-2 pb-2 text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">District travel</p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {districts.map((item) => {
              const Icon = item.icon
              const selected = district === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setDistrict(item.key)}
                  className={`rounded-xl border p-3 text-left transition ${selected ? 'border-sky-300/25 bg-sky-400/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${selected ? 'text-sky-300' : 'text-slate-500'}`} />
                    <span className="text-[10px] font-black uppercase tracking-[0.08em] text-white">{item.label}</span>
                  </div>
                  <p className="mt-1 hidden text-[9px] leading-4 text-slate-500 lg:block">{item.detail}</p>
                </button>
              )
            })}
          </div>
          {readOnly && (
            <div className="mt-3 rounded-xl border border-violet-300/15 bg-violet-400/5 p-3 text-[9px] leading-4 text-violet-200">
              Support view through Bridge Plaza. Observe the Client world and participate through WEAVE internal functions.
            </div>
          )}
        </aside>

        <div className="p-4 md:p-6">
          {message && <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-300">{message}</div>}

          {district === 'workshop_core' && (
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Workshop Core</p>
                <h3 className="mt-2 text-2xl font-black text-white">{workshopTitle}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{workshopPurpose || 'This workshop is personalized to the Client. Blueprints and systems form around the Client’s actual movement rather than replacing it.'}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><p className="text-[9px] uppercase tracking-wider text-slate-500">Blueprints ready</p><p className="mt-2 text-3xl font-black">{world?.blueprints?.length || 0}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><p className="text-[9px] uppercase tracking-wider text-slate-500">Finished builds</p><p className="mt-2 text-3xl font-black">{completedBuilds.length}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><p className="text-[9px] uppercase tracking-wider text-slate-500">Library movements</p><p className="mt-2 text-3xl font-black">{(world?.library || []).filter((x:any)=>x.status==='complete').length}/{world?.library?.length || 0}</p></div><div className="rounded-2xl border border-violet-300/15 bg-violet-400/[0.035] p-5"><p className="text-[9px] uppercase tracking-wider text-violet-300">Outside customers</p><p className="mt-2 text-3xl font-black">{world?.customerDoor?.order_count || 0}</p>{world?.customerDoor?.public_slug&&<a href={`/store/${world.customerDoor.public_slug}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[9px] font-black uppercase tracking-wider text-violet-200">Open Customer Door →</a>}</div>
              </div>
            </div>
          )}

          {district === 'formation_yard' && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">Formation Yard</p>
              <h3 className="mt-2 text-2xl font-black">Construction continues while you are away.</h3>
              <div className="mt-5 space-y-3">
                {activeBuilds.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-500">Nothing is constructing yet. Travel to Blueprint Foundry to begin a build.</p>}
                {activeBuilds.map((build:any) => {
                  const remaining = Math.max(0, Math.floor((new Date(build.completes_at).getTime() - now) / 1000))
                  const total = Math.max(1, Number(build.duration_hours || 1) * 3600)
                  const progress = Math.min(100, Math.max(0, ((total - remaining) / total) * 100))
                  return <div key={build.id} className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.04] p-5">
                    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold text-white">{build.title}</p><p className="mt-1 text-[10px] text-slate-500">{build.system_type.replaceAll('_',' ')}</p></div><div className="flex items-center gap-1 text-[10px] text-amber-300"><Clock3 className="h-3.5 w-3.5"/>{duration(remaining)}</div></div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-amber-300/80" style={{width:`${progress}%`}} /></div>
                    <p className="mt-3 text-[10px] text-slate-500">{build.purpose}</p>
                  </div>
                })}
              </div>
            </div>
          )}

          {district === 'blueprint_foundry' && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-violet-300">Blueprint Foundry</p>
              <h3 className="mt-2 text-2xl font-black">Choose what becomes real next.</h3>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {(world?.blueprints || []).map((blueprint:any) => {
                  const owned = Number(inventory.get(blueprint.required_item_key) || 0)
                  const canStart = !blueprint.required_item_key || owned >= Number(blueprint.required_item_quantity || 0)
                  return <div key={blueprint.blueprint_key} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                    <div className="flex items-center justify-between gap-3"><h4 className="font-bold text-white">{blueprint.name}</h4><span className="rounded-full bg-white/5 px-2 py-1 text-[9px] text-slate-400">{blueprint.build_hours}h</span></div>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{blueprint.description}</p>
                    <p className="mt-3 text-[10px] text-slate-500">Requires: {blueprint.required_item_quantity || 0} × {blueprint.required_item_name || 'No component'} · Owned {owned}</p>
                    {!readOnly && <button disabled={busy===blueprint.blueprint_key || !canStart} onClick={()=>act({action:'start_build',blueprint_key:blueprint.blueprint_key},blueprint.blueprint_key)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-35"><Hammer className="h-3.5 w-3.5"/>{busy===blueprint.blueprint_key?'Starting…':canStart?'Start Build':'Acquire Component'}</button>}
                  </div>
                })}
              </div>
            </div>
          )}

          {district === 'build_market' && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">Build Market</p>
              <h3 className="mt-2 text-2xl font-black">Components have function, inventory and price.</h3>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {(world?.items || []).map((item:any) => <div key={item.item_key} className="rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.035] p-5">
                  <div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-white">{item.name}</h4><p className="mt-1 text-[9px] uppercase tracking-wider text-emerald-300">{item.category}</p></div><div className="text-right"><p className="flex items-center gap-1 text-sm font-black text-white"><Coins className="h-3.5 w-3.5 text-amber-300"/>{Number(item.price_flame_coin).toLocaleString()}</p><p className="text-[8px] text-slate-500">Flame Coin</p></div></div>
                  <p className="mt-3 text-xs leading-5 text-slate-400">{item.description}</p>
                  <p className="mt-3 text-[10px] text-slate-500">Inventory: {Number(inventory.get(item.item_key) || 0)}</p>
                  {!readOnly && <button disabled={busy===item.item_key} onClick={()=>act({action:'purchase_item',item_key:item.item_key,quantity:1},item.item_key)} className="mt-4 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-200 disabled:opacity-50">{busy===item.item_key?'Acquiring…':'Acquire item'}</button>}
                </div>)}
              </div>
            </div>
          )}

          {district === 'active_systems' && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Active Systems</p>
              <h3 className="mt-2 text-2xl font-black">Finished structures are usable systems.</h3>
              <div className="mt-5 space-y-4">
                {(world?.systems || []).length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-500">No system has finished construction yet.</p>}
                {(world?.systems || []).map((system:any) => <div key={system.id} className="rounded-2xl border border-sky-300/15 bg-sky-400/[0.035] p-5">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] uppercase tracking-wider text-sky-300">{system.system_type.replaceAll('_',' ')}</p><h4 className="mt-1 font-bold text-white">{system.title}</h4></div><CheckCircle2 className="h-5 w-5 text-emerald-300"/></div>
                  <div className="mt-4 space-y-2">{(system.entries || []).map((entry:any)=><div key={entry.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/20 p-3"><button disabled={readOnly} onClick={()=>act({action:'toggle_system_entry',entry_id:entry.id,status:entry.status==='done'?'open':'done'},entry.id)} className={`mt-0.5 h-4 w-4 rounded-full border ${entry.status==='done'?'border-emerald-300 bg-emerald-300':'border-slate-600'}`}/><div><p className={`text-xs font-semibold ${entry.status==='done'?'text-slate-500 line-through':'text-slate-200'}`}>{entry.title}</p>{entry.body&&<p className="mt-1 text-[10px] leading-4 text-slate-500">{entry.body}</p>}</div></div>)}</div>
                  {!readOnly && <div className="mt-4 flex gap-2"><input value={systemDrafts[system.id]||''} onChange={e=>setSystemDrafts({...systemDrafts,[system.id]:e.target.value})} placeholder="Add the next real task / record…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"/><button disabled={!systemDrafts[system.id]?.trim() || busy===system.id} onClick={async()=>{await act({action:'add_system_entry',system_id:system.id,title:systemDrafts[system.id]},system.id);setSystemDrafts({...systemDrafts,[system.id]:''})}} className="rounded-xl bg-sky-500 px-3 text-slate-950 disabled:opacity-40"><Plus className="h-4 w-4"/></button></div>}
                </div>)}
              </div>
            </div>
          )}

          {district === 'library_district' && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">Library District</p>
              <h3 className="mt-2 text-2xl font-black">Learning moves with the Client.</h3>
              <div className="mt-5 space-y-3">
                {(world?.library || []).map((entry:any)=><div key={entry.entry_key} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <div className="flex items-start gap-3"><BookOpen className="mt-0.5 h-5 w-5 text-cyan-300"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold text-white">{entry.title}</h4><span className="text-[9px] uppercase tracking-wider text-slate-500">{entry.status || 'available'}</span></div><p className="mt-2 text-xs leading-5 text-slate-400">{entry.summary}</p>{entry.status!=='available'&&<p className="mt-3 rounded-xl border border-cyan-300/10 bg-cyan-400/[0.03] p-3 text-[11px] leading-5 text-slate-300">{entry.lesson}</p>}<p className="mt-3 text-[10px] text-slate-500">Movement: {entry.movement}</p>{!readOnly&&entry.status!=='complete'&&<button onClick={()=>act({action:entry.status==='in_progress'?'library_complete':'library_start',entry_key:entry.entry_key},entry.entry_key)} disabled={busy===entry.entry_key} className="mt-4 inline-flex items-center gap-1 rounded-full border border-cyan-300/20 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-cyan-200 disabled:opacity-50">{entry.status==='in_progress'?'Complete movement':'Begin movement'}<ChevronRight className="h-3.5 w-3.5"/></button>}</div></div>
                </div>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
