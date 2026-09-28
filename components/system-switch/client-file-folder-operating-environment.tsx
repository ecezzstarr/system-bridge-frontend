'use client'
import { visiblePoll } from '@/lib/visible-poll'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowRight,
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
  Store,
  Wallet,
  X,
} from 'lucide-react'
import FileFolderOpenWorld from '@/components/system-switch/file-folder-open-world'
import ClientWorkshopWorld from '@/components/system-switch/client-workshop-world'
import EnterpriseDreamPanel from '@/components/system-switch/enterprise-dream-panel'
import ClientGrowthWorld from '@/components/system-switch/client-growth-world'
import { ClientPremiumDJ } from '@/components/system-switch/client-premium-dj'
import { ClientBridgeAiSupport } from '@/components/system-switch/client-bridge-ai-support'
import { ClientFileFolder3D } from '@/components/system-switch/client-file-folder-3d'
import { getClientToken } from '@/lib/client-auth'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'

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
  route_station: ['Connected systems', 'Routes', 'Movement records', 'Throughput'],
  creator_booth: ['Program ideas', 'Production notes', 'Publishing queue', 'Media records'],
  broadcast_studio: ['Programs', 'Schedule', 'Production control', 'Broadcast preparation'],
  streaming_gate: ['Public channel', 'Live source', 'Audience entry', 'Replay movement'],
  media_network: ['Programming', 'Distribution', 'Audience', 'Media routes'],
  enterprise_door: ['Public enterprise entrance', 'Identity', 'Systems', 'Customer paths'],
  enterprise_hall: ['Headquarters', 'Public hall', 'Participants', 'Enterprise records'],
  legion_quarters: ['Legions', 'Functions', 'Capacity', 'Participation'],
  operations_command: ['Operations', 'Approvals', 'Coordination', 'Recurring movement'],
  enterprise_treasury: ['Budgets', 'Allocations', 'Revenue records', 'Controls'],
  distribution_network: ['Routes', 'Distribution', 'Destinations', 'Movement records'],
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
  if (progress < 12) return { label: 'Blueprint', layer: 1, detail: 'System purpose is fixed; formation has begun.' }
  if (progress < 38) return { label: 'Foundation', layer: 2, detail: 'The structural core is taking authority over the blueprint.' }
  if (progress < 68) return { label: 'Structure', layer: 3, detail: 'Working functions are becoming a usable technology.' }
  if (progress < 90) return { label: 'Integration', layer: 4, detail: 'Parts, functions and routes are being woven into one capability.' }
  return { label: 'Commissioning', layer: 5, detail: 'The technology is being verified for real movement and connection.' }
}

const BUILD_LADDER = [
  { label:'Blueprint', detail:'Name the capability and choose the system that can carry it.' },
  { label:'Foundation', detail:'Commit the required material and establish the structural core.' },
  { label:'Structure', detail:'Functions become technology as formation progresses through time.' },
  { label:'Integration', detail:'Install parts, verification, AI capability and system connections.' },
  { label:'Commissioning', detail:'Commission the finished technology for real people, movement and connected systems.' },
  { label:'Live operation', detail:'Operate it, connect it, record its movement and weave it into larger capability.' },
]

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
  const appliedParts = Array.isArray(system.configuration?.appliedParts)
    ? system.configuration.appliedParts.filter((part: any, index: number, parts: any[]) => {
        const key = String(part?.item_key || part?.name || index)
        return parts.findIndex((candidate: any, candidateIndex: number) => String(candidate?.item_key || candidate?.name || candidateIndex) === key) === index
      })
    : []

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
      {appliedParts.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-600">Built with</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {appliedParts.map((part:any,index:number)=>(
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
  const { isVisible, orderFor } = useEnvironmentOrganizer()
  const [surface, setSurface] = useState<Surface>('command')
  const [panelOpen, setPanelOpen] = useState(false)
  const [travelingTo, setTravelingTo] = useState<Surface | null>(null)
  const travelTimer = useRef<number | null>(null)
  const [world, setWorld] = useState(data.file_folder_world)
  const [formationOpen, setFormationOpen] = useState(false)
  const [formationDistrict, setFormationDistrict] = useState('workshop_core')
  const [now, setNow] = useState(Date.now())
  const [selectedBlueprintKey, setSelectedBlueprintKey] = useState(
    data.file_folder_world?.blueprints?.[0]?.blueprint_key || '',
  )
  const [selectedSystemId,setSelectedSystemId]=useState('')

  useEffect(() => {
    const tick = visiblePoll(() => setNow(Date.now()), 5000)
    return () => tick()
  }, [])

  useEffect(() => {
    const refresh = async (signal:AbortSignal) => {
      try {
        const token = getClientToken()
        if (!token) return
        const response = await fetch('/api/client/file-folder-world', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',signal,
        })
        const body = await response.json()
        if (!signal.aborted && response.ok && body.world) setWorld(body.world)
      } catch {
        // Keep the current File Folder visible if a background refresh fails.
      }
    }

    const interval = visiblePoll(refresh, 15000, false)
    return () => interval()
  }, [])

  const openFormation = (district: string) => {
    setFormationDistrict(district)
    setFormationOpen(true)
    setPanelOpen(true)
  }

  const travelToStudio = (district: string) => {
    setSurface('builds')
    setSelectedSystemId('')
    setFormationDistrict(district)
    setFormationOpen(true)
    setPanelOpen(true)
  }

  const enterSurface = (next: Surface) => {
    if (travelTimer.current) window.clearTimeout(travelTimer.current)
    setSurface(next)
    setSelectedSystemId('')
    if (next === 'builds') setFormationDistrict('workshop_core')
    setPanelOpen(false)
    setTravelingTo(next)
    travelTimer.current = window.setTimeout(() => {
      setTravelingTo(null)
      setPanelOpen(true)
      travelTimer.current = null
    }, 520)
  }

  useEffect(() => () => {
    if (travelTimer.current) window.clearTimeout(travelTimer.current)
  }, [])

  const blueprints = Array.isArray(world?.blueprints) ? world.blueprints : []
  const builds = Array.isArray(world?.builds) ? world.builds : []
  const systems = Array.isArray(world?.systems) ? world.systems : []
  const activeBuilds = builds.filter((build: any) => build.status === 'building')
  const liveSystemTypes=new Set(systems.filter((system:any)=>system.status==='active').map((system:any)=>system.system_type))
  const marketLevel=liveSystemTypes.has('marketplace_network')
    ? 3
    : liveSystemTypes.has('commerce_storefront')
      ? 2
      : liveSystemTypes.has('customer_door')
        ? 1
        : 0
  const activeMarketBuild=activeBuilds.find((build:any)=>['marketplace_network','commerce_storefront','customer_door'].includes(build.system_type))
  const marketBuildProgress=activeMarketBuild?buildProgress(activeMarketBuild,now):0
  const streamLevel=liveSystemTypes.has('media_network')
    ? 4
    : liveSystemTypes.has('streaming_gate')
      ? 3
      : liveSystemTypes.has('broadcast_studio')
        ? 2
        : liveSystemTypes.has('creator_booth')
          ? 1
          : 0
  const enterpriseLevel=liveSystemTypes.has('distribution_network')
    ? 4
    : liveSystemTypes.has('operations_command') || liveSystemTypes.has('enterprise_treasury')
      ? 3
      : liveSystemTypes.has('enterprise_hall')
        ? 2
        : liveSystemTypes.has('enterprise_door')
          ? 1
          : 0
  const routeCount=Number(world?.growth?.routes?.length||0)
  const vitalityScore=Number(world?.growth?.vitality?.score||0)
  const enterpriseApproved=Boolean(data.enterprise?.enterprise_status==='approved' && ['lord','lady'].includes(String(data.enterprise?.position||'').toLowerCase()))
  const territoryPosition=enterpriseApproved ? String(data.enterprise.position).toUpperCase() : 'CLIENT'
  const territoryName=enterpriseApproved
    ? (data.enterprise?.enterprise_name || 'Enterprise Dream Territory')
    : 'Client Construction Territory'
  const selectedSystem = systems.find((system:any)=>system.id===selectedSystemId) || null
  const selectedBlueprint = useMemo(
    () => blueprints.find((blueprint: any) => blueprint.blueprint_key === selectedBlueprintKey) || blueprints[0] || null,
    [blueprints, selectedBlueprintKey],
  )

  const surfaces = [
    { key: 'command' as Surface, label: 'Command Citadel', icon: Home, detail: 'Read the whole business world, its resources and its next movement.', tone: 'sky', step: '01' },
    { key: 'builds' as Surface, label: 'Construction + Systems', icon: Hammer, detail: 'Blueprint, supply, build, commission and operate real systems.', tone: 'violet', step: '02' },
    { key: 'business' as Surface, label: 'Market + Customers', icon: Store, detail: 'Turn finished systems into customer movement, orders, payments and service.', tone: 'emerald', step: '03' },
    { key: 'enterprise' as Surface, label: 'Expansion Council', icon: BriefcaseBusiness, detail: 'Develop the business into a Lord/Lady enterprise with Legions and wider operations.', tone: 'amber', step: '04' },
    ...(data.premium_dj_enabled
      ? [{ key: 'sound' as Surface, label: 'Sound Room', icon: Headphones, detail: 'Private premium File Folder atmosphere and DJ.', tone: 'rose', step: '05' }]
      : []),
  ].filter(item=>isVisible(`/client/system-switch#${item.key}`))
    .sort((a,b)=>orderFor(`/client/system-switch#${a.key}`)-orderFor(`/client/system-switch#${b.key}`))

  const studioDistricts = [
    { label:'Blueprint Foundry', district:'blueprint_foundry', phase:'Design' },
    { label:'Materials Depot', district:'build_market', phase:'Supply' },\n    { label:'Parts Workshop', district:'parts_workshop', phase:'Equip' },
    { label:'Formation Yard', district:'formation_yard', phase:'Form' },
    { label:'Acceleration Bay', district:'boost_bay', phase:'Accelerate' },
    { label:'Systems in Motion', district:'active_systems', phase:'Operate + Connect' },
    { label:'Build Intelligence', district:'library_district', phase:'Understand' },
  ].filter(item=>isVisible(`/client/system-switch#studio:${item.district}`))
    .sort((a,b)=>orderFor(`/client/system-switch#studio:${a.district}`)-orderFor(`/client/system-switch#studio:${b.district}`))

  useEffect(()=>{
    if(!surfaces.some(item=>item.key===surface))setSurface((surfaces[0]?.key||'command') as Surface)
  },[surface,isVisible])

  const current = surfaces.find(item => item.key === surface) || surfaces[0] || { key:'command' as Surface,label:'Command Citadel',icon:Home,detail:'',tone:'sky',step:'01' }
  const CurrentIcon = current.icon

  const surfaceTone: Record<string, { selected: string; icon: string; badge: string }> = {
    sky: { selected: 'border-sky-300/30 bg-sky-400/10', icon: 'text-sky-300', badge: 'border-sky-300/15 bg-sky-400/5 text-sky-200' },
    violet: { selected: 'border-violet-300/30 bg-violet-400/10', icon: 'text-violet-300', badge: 'border-violet-300/15 bg-violet-400/5 text-violet-200' },
    emerald: { selected: 'border-emerald-300/30 bg-emerald-400/10', icon: 'text-emerald-300', badge: 'border-emerald-300/15 bg-emerald-400/5 text-emerald-200' },
    amber: { selected: 'border-amber-300/30 bg-amber-400/10', icon: 'text-amber-300', badge: 'border-amber-300/15 bg-amber-400/5 text-amber-200' },
    rose: { selected: 'border-rose-300/30 bg-rose-400/10', icon: 'text-rose-300', badge: 'border-rose-300/15 bg-rose-400/5 text-rose-200' },
  }

  return (
    <section
      className="weave-system-depth relative h-[calc(100dvh-5.5rem)] min-h-[720px] overflow-hidden border-y border-cyan-200/10 bg-[#070b10] shadow-[0_34px_110px_rgba(0,0,0,.42)]"
      data-file-folder-world="persistent-territory-interface"
      data-file-folder-panel={panelOpen ? 'interior-open' : 'territory'}
    >
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 border-b border-cyan-100/10 bg-[linear-gradient(180deg,rgba(4,10,16,.96),rgba(4,10,16,.78),transparent)] px-4 py-4 md:px-6 md:py-5">
        <div className="flex items-start gap-3 md:gap-4">
          <div className="hidden rounded-2xl border border-sky-300/15 bg-sky-400/10 p-3 sm:block">
            <FolderOpen className="h-6 w-6 text-sky-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-200 md:text-[9px] md:tracking-[0.28em]">Main File Folder · {territoryPosition} · {territoryName}</p>
            <h1 className="mt-1 truncate text-xl font-black text-white md:mt-2 md:text-3xl">{data.workshop.title}</h1>
            <p className="mt-1 truncate text-[10px] text-slate-400 md:mt-2 md:text-xs">{data.client.name} · {data.client.file_number}</p>
          </div>
        </div>
        <div className="pointer-events-auto mt-3 flex gap-4 overflow-x-auto border-y border-cyan-100/10 py-2 text-[8px] uppercase tracking-wider text-stone-500 md:mt-3 md:max-w-xl md:grid-cols-3 md:gap-2 md:border-0 md:py-0 md:text-center md:text-[9px]">
          <div className="flex shrink-0 items-baseline gap-1.5 md:block md:rounded-xl md:border md:border-amber-300/15 md:bg-amber-400/5 md:px-4 md:py-3"><b className="text-base text-amber-100 md:mt-1 md:block md:text-xl">{activeBuilds.length}</b><span className="text-amber-300">Building</span></div>
          <div className="flex shrink-0 items-baseline gap-1.5 md:block md:rounded-xl md:border md:border-emerald-300/15 md:bg-emerald-400/5 md:px-4 md:py-3"><b className="text-base text-emerald-100 md:mt-1 md:block md:text-xl">{systems.length}</b><span className="text-emerald-300">Live</span></div>
          <div className="flex shrink-0 items-baseline gap-1.5 md:block md:rounded-xl md:border md:border-violet-300/15 md:bg-violet-400/5 md:px-4 md:py-3"><b className="text-base text-violet-100 md:mt-1 md:block md:text-xl">×{Number(world?.buildFunding?.buildSpeedMultiplier || data.build_funding?.buildSpeedMultiplier || 1).toFixed(2)}</b><span className="text-violet-300">Build power</span></div>
        </div>
      </header>

      <div className="absolute inset-0">
        <ClientFileFolder3D
          activeSurface={current.key}
          onSurfaceChange={(next) => enterSurface(next)}
          activeBuilds={activeBuilds.map((build:any)=>({
            id:build.id,
            title:build.title,
            systemType:build.system_type,
            progress:buildProgress(build,now),
          }))}
          liveSystems={systems.map((system:any)=>({
            id:system.id,
            title:system.title,
            systemType:system.system_type,
            activity:Array.isArray(system.entries)?system.entries.length:0,
          }))}
          premiumSound={Boolean(data.premium_dj_enabled)}
          visibleSurfaceKeys={surfaces.map(item=>item.key)}
          marketLevel={marketLevel}
          marketBuildProgress={marketBuildProgress}
          streamLevel={streamLevel}
          enterpriseLevel={enterpriseLevel}
          enterprisePosition={data.enterprise?.position || 'client'}
          enterpriseApproved={enterpriseApproved}
          enterpriseName={data.enterprise?.enterprise_name || null}
          routeCount={routeCount}
          vitalityScore={vitalityScore}
          territoryMode
        />
      </div>

      <div
        className={`absolute z-40 transition-all duration-500 ease-out
          inset-x-2 bottom-[4.75rem] max-h-[56dvh]
          md:inset-y-[7.75rem] md:left-auto md:right-4 md:bottom-auto md:w-[min(48rem,54vw)] md:max-h-none
          ${panelOpen ? 'translate-y-0 opacity-100 md:translate-x-0' : 'pointer-events-none translate-y-[115%] opacity-0 md:translate-y-0 md:translate-x-[110%]'}`}
        aria-hidden={!panelOpen}
      >
        <div className="flex h-full max-h-[56dvh] flex-col overflow-hidden rounded-[1.4rem] border border-amber-100/15 bg-[#0d0907]/96 shadow-[0_30px_100px_rgba(0,0,0,.62)] backdrop-blur-2xl md:max-h-[calc(100dvh-9rem)] md:rounded-[1.8rem]">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-cyan-100/10 bg-[#17100b]/92 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[7px] font-black uppercase tracking-[.18em] text-amber-200">Inside the territory</p>
              <div className="mt-1 flex items-center gap-2">
                <CurrentIcon className={`h-3.5 w-3.5 ${surfaceTone[current.tone]?.icon || 'text-sky-300'}`} />
                <p className="truncate text-[10px] font-black uppercase tracking-[.12em] text-white">{current.label}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/25 text-stone-300 transition hover:border-amber-200/30 hover:text-amber-100"
              aria-label="Return to File Folder territory"
            >
              <X className="h-4 w-4"/>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 md:p-5">
        <section aria-label="Construction sequence" className="border-y border-cyan-100/10 bg-[#18110c]/55 px-2 py-2.5 md:px-4 md:py-3" data-file-folder-awareness="compact-build-sequence">
          <div className="flex items-center gap-3">
            <button onClick={()=>travelToStudio('workshop_core')} className="inline-flex shrink-0 items-center gap-1.5 border-r border-cyan-100/10 pr-3 text-[8px] font-black uppercase tracking-[.12em] text-amber-100 md:gap-2 md:text-[9px] md:tracking-[.14em]">
              <Hammer className="h-3.5 w-3.5"/>Build
            </button>
            <div className="flex min-w-0 flex-1 snap-x snap-mandatory gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {BUILD_LADDER.map((stage,index)=><div key={stage.label} className="flex shrink-0 snap-start items-center gap-1.5 px-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-200/20 bg-[#21150d] text-[7px] font-black text-amber-100">{index+1}</span>
                <span className="whitespace-nowrap text-[7px] font-black uppercase tracking-[.05em] text-stone-400 md:text-[8px] md:text-stone-300">{stage.label}</span>
                {index<BUILD_LADDER.length-1&&<span className="h-px w-3 bg-amber-200/15 md:w-5"/>}
              </div>)}
            </div>
            <p className="hidden max-w-xs text-[9px] leading-4 text-stone-500 lg:block">Blueprint → physical formation → live operation. The active construction world below carries the detailed location.</p>
          </div>
        </section>

        <div className="mt-3 min-w-0 md:mt-4">

        {surface === 'command' && (
          <div className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[1.4fr_.6fr]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 md:p-7">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Current movement</p>
                <h2 className="mt-2 text-2xl font-black text-white">{data.workshop.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{data.workshop.purpose}</p>
                <button
                  onClick={() => travelToStudio('workshop_core')}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-sky-400 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950"
                >
                  Enter construction + systems <ArrowRight className="h-3.5 w-3.5" />
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


          </div>
        )}

        {surface === 'builds' && (
          <div className="space-y-4">
            {selectedSystem ? (
              <HostedSystem system={selectedSystem} onClose={()=>setSelectedSystemId('')} onWorldChange={setWorld} />
            ) : (
              <>
                <div className="flex flex-col gap-3 border-y border-cyan-100/10 bg-[#17100b]/62 px-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[.2em] text-amber-200">Construction territory active</p>
                    <p className="mt-1 text-[11px] leading-5 text-stone-400">Blueprint Foundry, Materials Depot, Construction Yard, Acceleration and Live Systems are one continuous site. Move through the site instead of opening separate dashboard pages.</p>
                  </div>
                  <div className="flex shrink-0 gap-4 text-right text-[8px] uppercase tracking-wider text-stone-500">
                    <span><b className="block text-base text-amber-100">{activeBuilds.length}</b>building</span>
                    <span><b className="block text-base text-emerald-100">{systems.length}</b>live</span>
                  </div>
                </div>
                <FileFolderOpenWorld
                  key={formationDistrict}
                  clientName={data.client.name}
                  fileNumber={data.client.file_number}
                  workshopTitle={data.workshop.title}
                  workshopPurpose={data.workshop.purpose}
                  initialWorld={world}
                  onWorldChange={setWorld}
                  initialDistrict={formationDistrict || 'workshop_core'}
                />
              </>
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
            fileFolderWorld={world}
            onOpenConstruction={(district)=>{setSurface('builds');openFormation(district)}}
          />
        )}

        {surface === 'enterprise' && <div className="space-y-5">
          <ClientGrowthWorld
            initialGrowth={world?.growth || data.file_folder_world?.growth}
            systems={systems}
            enterprise={data.enterprise || null}
            onOpenConstruction={(district)=>{setSurface('builds');openFormation(district)}}
          />
          <EnterpriseDreamPanel initialState={data.enterprise || null} growth={world?.growth || data.file_folder_world?.growth} />
        </div>}

        {surface === 'sound' && data.premium_dj_enabled && (
          <ClientPremiumDJ fileNumber={data.client.file_number} />
        )}
        </div>
          </div>
        </div>
      </div>

      {!panelOpen && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[4.7rem] z-30 flex justify-center px-4">
          <div className="rounded-full border border-cyan-100/10 bg-[#070b10]/72 px-4 py-2 text-center text-[8px] font-black uppercase tracking-[.14em] text-stone-300 backdrop-blur-xl">
            {travelingTo
              ? `Moving to ${surfaces.find(item=>item.key===travelingTo)?.label || 'structure'}`
              : 'Move through the territory · select a structure to enter its function'}
          </div>
        </div>
      )}
    </section>
  )
}
