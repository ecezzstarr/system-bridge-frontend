'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Bot,
  Boxes,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Eye,
  FolderOpen,
  Hammer,
  Headphones,
  Home,
  Layers3,
  Plus,
  ShieldCheck,
  Store,
  Users,
  Wallet,
} from 'lucide-react'
import FileFolderOpenWorld from '@/components/system-switch/file-folder-open-world'
import ClientWorkshopWorld from '@/components/system-switch/client-workshop-world'
import EnterpriseDreamPanel from '@/components/system-switch/enterprise-dream-panel'
import { ClientPremiumDJ } from '@/components/system-switch/client-premium-dj'
import { ClientBridgeAiSupport } from '@/components/system-switch/client-bridge-ai-support'
import { getClientToken } from '@/lib/client-auth'

type Surface = 'command' | 'builds' | 'business' | 'enterprise' | 'sound'

type Props = {
  data: any
}

const previewModules: Record<string, string[]> = {
  operations_board: ['Intake', 'Priorities', 'Assignments', 'Decision record'],
  research_room: ['Question intake', 'Sources', 'Findings', 'Decision output'],
  service_workflow: ['Request intake', 'Process stages', 'Responsibility', 'Completion record'],
  customer_door: ['Public offer', 'Customer request', 'Order record', 'Fulfilment movement'],
  data_room: ['Data intake', 'Structured records', 'Search', 'Reusable output'],
  enterprise_shell: ['People', 'Operations', 'Records', 'Enterprise modules'],
  integration_network: ['Connected systems', 'Transfer rules', 'Event record', 'Shared output'],
  crypto_exchange_workshop: ['Market view', 'Buy / sell movement', 'Holdings', 'Order record'],
  ai_service_desk: ['Question intake', 'AI assistance', 'Human handoff', 'Support record'],
  commerce_storefront: ['Offers', 'Customers', 'Orders', 'Fulfilment'],
  payments_gateway: ['Payment request', 'Instructions', 'Settlement record', 'Reconciliation'],
  campaign_system: ['Audience', 'Message', 'Response', 'Follow-up'],
  learning_lab: ['Lessons', 'Exercises', 'Progress', 'Completion record'],
  operations_suite: ['Teams', 'Tasks', 'Approvals', 'Recurring operations'],
  mobile_service_app: ['Account', 'Request', 'Notification', 'Continuing service'],
  intelligence_lab: ['Research intake', 'Analysis', 'Knowledge record', 'Reusable intelligence'],
  marketplace_network: ['Sellers', 'Offers', 'Buyers', 'Orders'],
  enterprise_operating_system: ['Functions', 'Participants', 'Approvals', 'Institutional records'],
}

function systemModules(systemType?: string) {
  return previewModules[String(systemType || '')] || ['Input', 'Working function', 'Persistent record', 'Output']
}

function formatDate(value?: string | null) {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not recorded'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function buildProgress(build: any, now: number) {
  const start = new Date(build.started_at || build.created_at || now).getTime()
  const end = new Date(build.completes_at || now).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100))
}

function buildDepth(progress: number) {
  if (progress < 12) return { label: 'Blueprint', layer: 1, detail: 'System shape fixed; construction is beginning.' }
  if (progress < 38) return { label: 'Foundation', layer: 2, detail: 'Core structure is being established.' }
  if (progress < 68) return { label: 'Structure', layer: 3, detail: 'Working functions are taking shape.' }
  if (progress < 90) return { label: 'Integration', layer: 4, detail: 'Parts and functions are being connected.' }
  return { label: 'Commissioning', layer: 5, detail: 'The system is being prepared for live operation.' }
}

function PreviewFrame({ blueprint, label = 'Design preview', onBuild }: { blueprint: any; label?: string; onBuild?: () => void }) {
  const modules = systemModules(blueprint?.system_type)
  if (!blueprint) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-8 text-sm text-slate-500">
        Select a blueprint to inspect the system before construction.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-violet-300/15 bg-[#050817]">
      <div className="border-b border-white/10 bg-violet-400/[0.05] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-violet-300">{label}</p>
            <h3 className="mt-2 text-xl font-black text-white">{blueprint.name || blueprint.title}</h3>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">
              {blueprint.description || blueprint.purpose || 'A WEAVE system formed from this Client File Folder.'}
            </p>
          </div>
          <span className="rounded-full border border-amber-300/15 bg-amber-400/5 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-amber-200">
            Not live yet
          </span>
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((module, index) => (
          <div key={module} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-600">Function {index + 1}</p>
            <p className="mt-2 text-sm font-bold text-white">{module}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] leading-5 text-slate-500">
          Preview only. It shows the intended operating shape before construction; it does not claim live users, transactions, activity or results.
        </p>
        {onBuild && <button onClick={onBuild} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white">Continue into build workspace <ArrowRight className="h-3.5 w-3.5"/></button>}
      </div>
    </div>
  )
}

function LiveSystemCard({ system, onEnter }: { system: any; onEnter?: () => void }) {
  const entries = Array.isArray(system.entries) ? system.entries : []
  const completed = entries.filter((entry: any) => entry.status === 'done').length
  const open = entries.filter((entry: any) => entry.status !== 'done').length
  const state = entries.length > 0 ? 'In use' : 'Ready for first movement'

  return (
    <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.035] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Live system</p>
          <h4 className="mt-1 text-base font-black text-white">{system.title}</h4>
          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
            {String(system.system_type || 'system').replaceAll('_', ' ')}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {state}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <p className="text-[8px] uppercase tracking-wider text-slate-600">Records</p>
          <p className="mt-1 text-lg font-black text-white">{entries.length}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <p className="text-[8px] uppercase tracking-wider text-slate-600">Open</p>
          <p className="mt-1 text-lg font-black text-white">{open}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <p className="text-[8px] uppercase tracking-wider text-slate-600">Done</p>
          <p className="mt-1 text-lg font-black text-white">{completed}</p>
        </div>
      </div>
      {Array.isArray(system.configuration?.appliedParts) && system.configuration.appliedParts.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-600">Built with</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {system.configuration.appliedParts.map((part:any,index:number)=>(
              <span key={part.item_key + ':' + index} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] text-slate-300">{part.name || part.item_key}</span>
            ))}
          </div>
        </div>
      )}
      <p className="mt-4 text-[10px] leading-5 text-slate-500">
        Activated {formatDate(system.activated_at)}. Operation shown here is based on recorded File Folder entries, not simulated traffic.
      </p>
      {onEnter && <button onClick={onEnter} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">Enter hosted system <ArrowRight className="h-3.5 w-3.5"/></button>}
    </div>
  )
}

function HostedSystem({
  system,
  onClose,
  onWorldChange,
}: {
  system: any
  onClose: () => void
  onWorldChange: (world: any) => void
}) {
  const modules = systemModules(system.system_type)
  const [moduleKey,setModuleKey]=useState(modules[0] || 'Operation')
  const [title,setTitle]=useState('')
  const [body,setBody]=useState('')
  const [busy,setBusy]=useState('')
  const [message,setMessage]=useState('')

  const entries = Array.isArray(system.entries) ? system.entries : []
  const moduleEntries = entries.filter((entry:any)=>{
    const recordedModule = entry.metadata?.moduleKey || entry.entry_type
    return recordedModule === moduleKey || (!entry.metadata?.moduleKey && entry.entry_type === system.system_type)
  })

  const act=async(payload:any,key:string)=>{
    setBusy(key)
    setMessage('')
    try{
      const token=getClientToken()
      const response=await fetch('/api/client/file-folder-world',{
        method:'POST',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify(payload),
      })
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||'System movement failed')
      if(result.world)onWorldChange(result.world)
      setMessage('Recorded in the live system.')
    }catch(error:any){
      setMessage(error?.message||'System movement failed')
    }finally{
      setBusy('')
    }
  }

  const add=async()=>{
    if(!title.trim())return
    await act({
      action:'add_system_entry',
      system_id:system.id,
      module_key:moduleKey,
      title:title.trim(),
      body:body.trim(),
    },'add')
    setTitle('')
    setBody('')
  }

  return (
    <section className="weave-system-depth overflow-hidden rounded-3xl border border-emerald-300/15 bg-[#020b0c]">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_10%_0%,rgba(52,211,153,.13),transparent_34%)] p-5 md:p-6">
        <button onClick={onClose} className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300"><ChevronLeft className="h-3.5 w-3.5"/>Build + Systems</button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">Hosted live inside this File Folder</p>
            <h2 className="mt-2 text-2xl font-black text-white">{system.title}</h2>
            <p className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-400">{String(system.system_type||'system').replaceAll('_',' ')} · activated {formatDate(system.activated_at)}</p>
          </div>
          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/5 px-4 py-3 text-right">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-300">Runtime</p>
            <p className="mt-1 text-sm font-black text-white">Live · {entries.length} records</p>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-[240px_1fr]">
        <aside className="border-b border-white/10 bg-black/20 p-3 lg:border-b-0 lg:border-r">
          <p className="px-2 pb-2 text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">System functions</p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {modules.map(module=>{
              const count=entries.filter((entry:any)=>(entry.metadata?.moduleKey||entry.entry_type)===module).length
              const active=moduleKey===module
              return <button key={module} onClick={()=>setModuleKey(module)} className={`rounded-xl border p-3 text-left ${active?'border-emerald-300/25 bg-emerald-400/10':'border-white/5 bg-white/[0.02]'}`}>
                <p className="text-[10px] font-black text-white">{module}</p>
                <p className="mt-1 text-[8px] text-slate-500">{count} recorded movements</p>
              </button>
            })}
          </div>
        </aside>

        <div className="p-4 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Operating function</p>
              <h3 className="mt-1 text-xl font-black text-white">{moduleKey}</h3>
              <p className="mt-1 text-xs text-slate-400">Real-life activity recorded here remains attached to this live Client system.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[9px] font-black text-slate-300">{moduleEntries.length} records</span>
          </div>

          <div className="mt-5 space-y-2">
            {moduleEntries.length===0&&<p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">No movement recorded in this function yet. The system is live and ready for its first real activity.</p>}
            {moduleEntries.map((entry:any)=><div key={entry.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <button
                onClick={()=>void act({action:'toggle_system_entry',entry_id:entry.id,status:entry.status==='done'?'open':'done'},entry.id)}
                disabled={busy===entry.id}
                className={`mt-0.5 h-5 w-5 min-h-0 min-w-0 rounded-full border ${entry.status==='done'?'border-emerald-300 bg-emerald-300':'border-slate-500'}`}
                aria-label={entry.status==='done'?'Reopen record':'Mark record complete'}
              />
              <div className="min-w-0">
                <p className={`text-sm font-black ${entry.status==='done'?'text-slate-500 line-through':'text-white'}`}>{entry.title}</p>
                {entry.body&&<p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-400">{entry.body}</p>}
              </div>
            </div>)}
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.025] p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Record new real activity</p>
            <div className="mt-3 grid gap-2">
              <input value={title} onChange={event=>setTitle(event.target.value)} placeholder={`What happened in ${moduleKey}?`} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-semibold text-white outline-none"/>
              <textarea value={body} onChange={event=>setBody(event.target.value)} rows={3} placeholder="Details, result, next action or real-world record…" className="resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"/>
              <button onClick={()=>void add()} disabled={!title.trim()||busy==='add'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 disabled:opacity-40"><Plus className="h-4 w-4"/>{busy==='add'?'Recording…':'Record in live system'}</button>
            </div>
            {message&&<p className="mt-3 text-xs font-bold text-emerald-200">{message}</p>}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function ClientFileFolderOperatingEnvironment({ data }: Props) {
  const [surface, setSurface] = useState<Surface>('command')
  const [world, setWorld] = useState(data.file_folder_world)
  const [formationOpen, setFormationOpen] = useState(false)
  const [formationDistrict, setFormationDistrict] = useState('workshop_core')
  const [now, setNow] = useState(Date.now())
  const [selectedBlueprintKey, setSelectedBlueprintKey] = useState(
    data.file_folder_world?.blueprints?.[0]?.blueprint_key || '',
  )
  const [selectedSystemId,setSelectedSystemId]=useState('')

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [])

  useEffect(() => {
    const refresh = async () => {
      try {
        const token = getClientToken()
        if (!token) return
        const response = await fetch('/api/client/file-folder-world', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const body = await response.json()
        if (response.ok && body.world) setWorld(body.world)
      } catch {
        // Keep the current File Folder visible if a background refresh fails.
      }
    }

    const interval = window.setInterval(refresh, 15000)
    return () => window.clearInterval(interval)
  }, [])

  const openFormation = (district: string) => {
    setFormationDistrict(district)
    setFormationOpen(true)
  }

  const blueprints = Array.isArray(world?.blueprints) ? world.blueprints : []
  const builds = Array.isArray(world?.builds) ? world.builds : []
  const systems = Array.isArray(world?.systems) ? world.systems : []
  const activeBuilds = builds.filter((build: any) => build.status === 'building')
  const selectedSystem = systems.find((system:any)=>system.id===selectedSystemId) || null
  const selectedBlueprint = useMemo(
    () => blueprints.find((blueprint: any) => blueprint.blueprint_key === selectedBlueprintKey) || blueprints[0] || null,
    [blueprints, selectedBlueprintKey],
  )

  const surfaces = [
    { key: 'command' as Surface, label: 'Command', icon: Home, detail: 'One view of the whole File Folder.' },
    { key: 'builds' as Surface, label: 'Build + Systems', icon: Hammer, detail: 'Preview, construct and operate systems.' },
    { key: 'business' as Surface, label: 'Business', icon: Store, detail: 'Workshop, customer door, payments and support.' },
    { key: 'enterprise' as Surface, label: 'Enterprise', icon: BriefcaseBusiness, detail: 'Lord/Lady elevation and Legions.' },
    ...(data.premium_dj_enabled
      ? [{ key: 'sound' as Surface, label: 'Sound', icon: Headphones, detail: 'Private premium File Folder DJ.' }]
      : []),
  ]

  const current = surfaces.find(item => item.key === surface) || surfaces[0]
  const CurrentIcon = current.icon

  return (
    <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-sky-300/10 bg-[#020711]">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_10%_0%,rgba(14,165,233,.18),transparent_34%),radial-gradient(circle_at_90%_0%,rgba(139,92,246,.12),transparent_28%)] p-5 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-sky-300/15 bg-sky-400/10 p-3">
              <FolderOpen className="h-6 w-6 text-sky-300" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-sky-300">Main File Folder · Operating Environment</p>
              <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">{data.workshop.title}</h1>
              <p className="mt-2 text-xs text-slate-400">{data.client.name} · {data.client.file_number}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[9px]">
            <div className="rounded-xl border border-amber-300/15 bg-amber-400/5 px-4 py-3">
              <p className="uppercase tracking-wider text-amber-300">Building</p>
              <p className="mt-1 text-xl font-black text-white">{activeBuilds.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-300/15 bg-emerald-400/5 px-4 py-3">
              <p className="uppercase tracking-wider text-emerald-300">Live</p>
              <p className="mt-1 text-xl font-black text-white">{systems.length}</p>
            </div>
            <div className="rounded-xl border border-violet-300/15 bg-violet-400/5 px-4 py-3">
              <p className="uppercase tracking-wider text-violet-300">Position</p>
              <p className="mt-1 text-xs font-black uppercase text-white">{data.enterprise?.position || 'client'}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {surfaces.map(item => {
            const Icon = item.icon
            const selected = surface === item.key
            return (
              <button
                key={item.key}
                onClick={() => setSurface(item.key)}
                className={
                  'rounded-2xl border p-3 text-left transition ' +
                  (selected
                    ? 'border-sky-300/25 bg-sky-400/10'
                    : 'border-white/5 bg-black/20 hover:border-white/10 hover:bg-white/[0.03]')
                }
              >
                <div className="flex items-center gap-2">
                  <Icon className={'h-4 w-4 ' + (selected ? 'text-sky-300' : 'text-slate-500')} />
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white">{item.label}</span>
                </div>
                <p className="mt-1 hidden text-[9px] leading-4 text-slate-500 md:block">{item.detail}</p>
              </button>
            )
          })}
        </div>
      </header>

      <div className="p-4 md:p-6">
        <div className="mb-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
          <CurrentIcon className="h-3.5 w-3.5 text-sky-300" />
          File Folder / {current.label}
        </div>

        {surface === 'command' && (
          <div className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[1.4fr_.6fr]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 md:p-7">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Current movement</p>
                <h2 className="mt-2 text-2xl font-black text-white">{data.workshop.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{data.workshop.purpose}</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-5">
                  {[
                    ['1', 'Recognize'],
                    ['2', 'Preview'],
                    ['3', 'Build'],
                    ['4', 'Activate'],
                    ['5', 'Operate'],
                  ].map(([number, label]) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[8px] font-black uppercase tracking-wider text-slate-600">Stage {number}</p>
                      <p className="mt-1 text-xs font-bold text-white">{label}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setSurface('builds')}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-sky-400 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950"
                >
                  Open build environment <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-300" />
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Money environment</p>
                </div>
                <p className="mt-4 text-2xl font-black text-white">
                  {Number(data.vault?.balance || 0).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                </p>
                <p className="text-[10px] text-slate-500">{data.vault?.currency || 'Flame Coin'} · Client Vault</p>
                <div className="mt-4 space-y-2 text-[10px] text-slate-400">
                  <div className="flex justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                    <span>Main wallet</span>
                    <span>{Number(data.vault?.main_wallet?.flameCoin || 0).toLocaleString()} Flame Coin</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                    <span>Siblings funds</span>
                    <span>{Number(data.vault?.siblings_funds?.flameCoin || 0).toLocaleString()} Flame Coin</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-3xl border border-amber-300/10 bg-amber-400/[0.025] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">Construction queue</p>
                    <h3 className="mt-1 text-lg font-black text-white">What is becoming real now</h3>
                  </div>
                  <Clock3 className="h-5 w-5 text-amber-300" />
                </div>
                <div className="mt-4 space-y-3">
                  {activeBuilds.length === 0 && (
                    <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-slate-500">
                      No construction is running. Preview a blueprint before starting the next build.
                    </p>
                  )}
                  {activeBuilds.slice(0, 4).map((build: any) => {
                    const progress=buildProgress(build,now)
                    const depth=buildDepth(progress)
                    return <div key={build.id} className="rounded-xl border border-white/10 bg-black/20 p-4" style={{boxShadow:`0 ${8+depth.layer*4}px ${20+depth.layer*8}px rgba(2,8,23,.45), inset 0 1px 0 rgba(255,255,255,.03)`}}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-white">{build.title}</p>
                          <p className="mt-1 text-[9px] uppercase tracking-wider text-slate-500">
                            {String(build.system_type || '').replaceAll('_', ' ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-amber-200">{Math.round(progress)}%</span>
                          <p className="mt-1 text-[8px] font-black uppercase tracking-[0.14em] text-amber-300">{depth.label} · Layer {depth.layer}/5</p>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-amber-300" style={{ width: progress + '%' }} />
                      </div>
                      <p className="mt-2 text-[9px] text-slate-400">{depth.detail}</p>
                    </div>
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-emerald-300/10 bg-emerald-400/[0.025] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300">Live systems</p>
                    <h3 className="mt-1 text-lg font-black text-white">What is already operating</h3>
                  </div>
                  <Activity className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="mt-4 space-y-3">
                  {systems.length === 0 && (
                    <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-slate-500">
                      No completed system is active yet.
                    </p>
                  )}
                  {systems.slice(0, 3).map((system: any) => <LiveSystemCard key={system.id} system={system} onEnter={()=>{setSelectedSystemId(system.id);setSurface('builds');setFormationOpen(false)}} />)}
                </div>
              </div>
            </div>

            <ClientBridgeAiSupport />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-300" />
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Support structure</p>
                </div>
                <p className="mt-3 text-sm font-bold text-white">{data.bridge?.name || 'Assigned Bridge'}</p>
                <p className="mt-1 text-xs text-slate-500">{data.approved_agents?.length || 0} approved company agents</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Customer door</p>
                </div>
                <p className="mt-3 text-sm font-bold capitalize text-white">
                  {world?.customerDoor?.formation_status || 'forming'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {world?.customerDoor?.active_offer_count || 0} offers · {world?.customerDoor?.order_count || 0} orders
                </p>
              </div>
            </div>
          </div>
        )}

        {surface === 'builds' && (
          <div className="space-y-5">
            {selectedSystem && !formationOpen && (
              <HostedSystem system={selectedSystem} onClose={()=>setSelectedSystemId('')} onWorldChange={setWorld} />
            )}

            {!selectedSystem && <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-300">Build Studio</p>
                <p className="mt-1 text-xs text-slate-500">Inspect the intended system first, then enter the formation workspace when ready.</p>
              </div>
              <button
                onClick={() => formationOpen ? setFormationOpen(false) : openFormation('workshop_core')}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-sky-200"
              >
                <Layers3 className="h-3.5 w-3.5" />
                {formationOpen ? 'Close formation workspace' : 'Open formation workspace'}
              </button>
            </div>}

            {!selectedSystem && !formationOpen && (
              <>
                <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
                  <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                    <p className="px-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Blueprint catalog</p>
                    <div className="mt-3 max-h-[560px] space-y-2 overflow-auto pr-1">
                      {blueprints.map((blueprint: any) => {
                        const selected = selectedBlueprint?.blueprint_key === blueprint.blueprint_key
                        return (
                          <button
                            key={blueprint.blueprint_key}
                            onClick={() => setSelectedBlueprintKey(blueprint.blueprint_key)}
                            className={
                              'w-full rounded-2xl border p-4 text-left transition ' +
                              (selected
                                ? 'border-violet-300/25 bg-violet-400/10'
                                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]')
                            }
                          >
                            <div className="flex items-start gap-3">
                              <Eye className={'mt-0.5 h-4 w-4 ' + (selected ? 'text-violet-300' : 'text-slate-600')} />
                              <div>
                                <p className="text-sm font-bold text-white">{blueprint.name}</p>
                                <p className="mt-1 text-[10px] leading-4 text-slate-500">{blueprint.description}</p>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <PreviewFrame blueprint={selectedBlueprint} onBuild={() => openFormation('blueprint_foundry')} />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-3xl border border-amber-300/10 bg-amber-400/[0.025] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">Under construction</p><h3 className="mt-1 text-lg font-black text-white">Target systems in formation</h3></div>
                      <button onClick={() => openFormation('formation_yard')} className="rounded-full border border-amber-300/15 bg-amber-400/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-amber-200">Open live build</button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {activeBuilds.length === 0 && <p className="text-xs text-slate-500">No build is currently running.</p>}
                      {activeBuilds.map((build: any) => {
                        const progress=buildProgress(build,now)
                        const depth=buildDepth(progress)
                        return <div key={build.id} className="rounded-2xl border border-white/10 bg-black/20 p-4" style={{boxShadow:`0 ${10+depth.layer*5}px ${24+depth.layer*9}px rgba(2,8,23,.48)`}}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-white">{build.title}</p>
                              <p className="mt-1 text-[10px] text-slate-500">{build.purpose}</p>
                            </div>
                            <span className="rounded-full bg-amber-400/10 px-3 py-1 text-[9px] font-black text-amber-200">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-300/10 bg-amber-400/[0.025] px-3 py-2">
                            <div><p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-300">{depth.label} · depth layer {depth.layer}/5</p><p className="mt-1 text-[9px] text-slate-400">{depth.detail}</p></div>
                            <span className="text-[9px] font-black text-amber-200">×{Number(build.speed_multiplier||1).toFixed(2)} speed</span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {systemModules(build.system_type).map((module,index) => {
                              const ready = progress >= ((index+1)/systemModules(build.system_type).length)*70
                              return <div key={module} className={`rounded-lg border px-3 py-2 text-[9px] ${ready?'border-emerald-300/10 bg-emerald-400/[0.035] text-emerald-100':'border-white/5 bg-white/[0.02] text-slate-400'}`}>
                                {module}
                              </div>
                            })}
                          </div>
                        </div>
                      })}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-emerald-300/10 bg-emerald-400/[0.025] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300">After build</p><h3 className="mt-1 text-lg font-black text-white">Operational systems and recorded movement</h3></div>
                      <button onClick={() => openFormation('active_systems')} className="rounded-full border border-emerald-300/15 bg-emerald-400/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200">Operate systems</button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {systems.length === 0 && <p className="text-xs text-slate-500">Finished systems will appear here with their real recorded activity.</p>}
                      {systems.map((system: any) => <LiveSystemCard key={system.id} system={system} onEnter={()=>setSelectedSystemId(system.id)} />)}
                    </div>
                  </div>
                </div>
              </>
            )}

            {!selectedSystem && formationOpen && (
              <FileFolderOpenWorld
                clientName={data.client.name}
                fileNumber={data.client.file_number}
                workshopTitle={data.workshop.title}
                workshopPurpose={data.workshop.purpose}
                initialWorld={world}
                onWorldChange={setWorld}
                initialDistrict={formationDistrict}
              />
            )}
          </div>
        )}

        {surface === 'business' && (
          <ClientWorkshopWorld
            client={data.client}
            folder={data.file_folder}
            vault={data.vault}
            bridge={data.bridge}
            approvedAgents={data.approved_agents || []}
            workshop={data.workshop}
            bridgeAi={data.bridge_ai}
            businessStore={data.business_store}
            internationalPayments={data.international_payments}
            buildFunding={world?.buildFunding || data.build_funding}
          />
        )}

        {surface === 'enterprise' && <EnterpriseDreamPanel initialState={data.enterprise || null} />}

        {surface === 'sound' && data.premium_dj_enabled && (
          <ClientPremiumDJ fileNumber={data.client.file_number} />
        )}
      </div>
    </section>
  )
}
