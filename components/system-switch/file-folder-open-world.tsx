'use client'
import { visiblePoll } from '@/lib/visible-poll'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import { usePresenceCamera } from '@/components/world/presence-camera'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import { emitWeaveMotion,fileFolderMotion } from '@/lib/weave-interaction-motion'
import { WEAVE_AI_FILE_FOLDERS,aiFileFolderTerritory } from '@/lib/file-folder-multiplayer-world'

type Props = {
  clientName: string
  fileNumber: string
  workshopTitle: string
  workshopPurpose?: string | null
  initialWorld: any
  readOnly?: boolean
  observerLabel?: string
  refreshUrl?: string
  refreshToken?: string | null
  onWorldChange?: (world: any) => void
  initialDistrict?: string
}

const districts = [
  { key: 'workshop_core', label: 'Command Core', icon: Workflow, detail: 'Hold the purpose, authority, resources and next movement of this territory in one command position.' },
  { key: 'blueprint_foundry', label: 'Blueprint Foundry', icon: Boxes, detail: 'Turn an intended capability into a buildable system with defined functions, dependencies and consequence.' },
  { key: 'build_market', label: 'Materials Depot', icon: Store, detail: 'Acquire the primary kits that supply a blueprint before construction begins.' },
  { key: 'parts_workshop', label: 'Parts Workshop', icon: Boxes, detail: 'Acquire capability modules and attach compatible parts to structures while they form.' },
  { key: 'formation_yard', label: 'Formation Yard', icon: Hammer, detail: 'Form the technology through time, install capability parts and watch the territory change with the build.' },
  { key: 'boost_bay', label: 'Acceleration Bay', icon: Zap, detail: 'Use recorded acceleration instruments on active construction.' },
  { key: 'active_systems', label: 'Systems in Motion', icon: PackageOpen, detail: 'Operate completed technologies, connect their outputs and preserve the movement they produce.' },
  { key: 'library_district', label: 'Formation Intelligence', icon: Library, detail: 'Understand why each system works, what it can connect to and what larger capability can emerge.' },
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

function branchLabel(district: string) {
  const labels: Record<string,string> = {
    market_district: 'Market Expansion',
    streaming_district: 'Streaming',
    network_district: 'Business Network',
    enterprise_district: 'Enterprise',
    technology_district: 'Technology',
    formation_yard: 'Operations',
    library_district: 'Intelligence',
  }
  return labels[district] || 'System'
}

const CUSTOMER_DOOR_FORMATION=[
  {at:0,label:'Foundation Frame',detail:'Public entrance structure anchored to the Client territory.'},
  {at:15,label:'Client Identity Facade',detail:'Company/platform identity takes its public position.'},
  {at:32,label:'Customer Intake Interface',detail:'Visitor requests and order intent gain an entry path.'},
  {at:50,label:'Service Interface',detail:'Customer movement connects to the Client operation behind the Door.'},
  {at:68,label:'Fulfilment Interface',detail:'Delivery and fulfilment movement gains a recorded path.'},
  {at:88,label:'Public Commissioning',detail:'Door is verified for open-internet visitors.'},
] as const

function customerDoorFormation(progress:number){
  return CUSTOMER_DOOR_FORMATION.map((part,index)=>({...part,state:progress>=part.at?'formed':index===0||progress>=CUSTOMER_DOOR_FORMATION[index-1].at?'forming':'waiting'}))
}

function operatingEffect(item: any) {
  const value = Number(item.effect_value || 0)
  const effects: Record<string,string> = {
    route_capacity: `Adds ${value || 1} persistent Business Route slot after installation into compatible network infrastructure.`,
    legion_capacity: `Adds ${value || 1} Legion operating positions after installation into compatible enterprise infrastructure.`,
    stream_capacity: `Adds ${value || 1} simultaneous scheduled/live program slots after installation into compatible streaming infrastructure.`,
    audience_capacity: `Adds ${value || 0} points of public audience infrastructure to the Client streaming environment.`,
    ai_node: 'Adds one persistent AI Flame capability node to the completed system.',
    automation: 'Adds one persistent automation capability node to the completed system.',
    verification: 'Adds one persistent verification/testing capability to the completed system.',
    component: 'Becomes a recorded functional part of the completed system.',
  }
  return effects[String(item.build_effect || 'component')] || 'Becomes recorded capability inside a compatible completed Client system.'
}

export default function FileFolderOpenWorld({
  clientName,
  fileNumber,
  workshopTitle,
  workshopPurpose,
  initialWorld,
  readOnly = false,
  observerLabel = 'Staff / Visitor observation',
  refreshUrl,
  refreshToken,
  onWorldChange,
  initialDistrict = 'workshop_core',
}: Props) {
  const { isVisible, orderFor } = useEnvironmentOrganizer()
  const [world, setWorld] = useState(initialWorld)
  const [district, setDistrict] = useState(initialDistrict)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [now, setNow] = useState(Date.now())
  const [systemDrafts, setSystemDrafts] = useState<Record<string, string>>({})
  const [systemEvidence, setSystemEvidence] = useState<Record<string, string>>({})
  const { recordOutput } = usePresenceCamera()
  const buildStateRef=useRef<Map<string,string>>(new Map())

  useEffect(() => {
    const id = visiblePoll(() => setNow(Date.now()), 5000)
    return () => id()
  }, [])

  useEffect(()=>{
    const next=new Map<string,string>()
    for(const build of world?.builds||[]){
      const id=String(build.id||build.blueprint_key||'')
      if(!id)continue
      const status=String(build.status||'')
      const previous=buildStateRef.current.get(id)
      if(previous&&previous!=='complete'&&status==='complete'){
        emitWeaveMotion({
          kind:'emergence',
          label:`${build.title||build.blueprint_name||'System'} commissioned and live`,
          intensity:1.8,
          confirmed:true,
          source:'file-folder-build-completion',
        })
      }
      next.set(id,status)
    }
    buildStateRef.current=next
  },[world?.builds])

  useEffect(() => {
    const url = refreshUrl || (!readOnly ? '/api/client/file-folder-world' : null)
    if (!url) return

    const refresh = async (signal:AbortSignal) => {
      try {
        const token = refreshToken ?? (!readOnly ? getClientToken() : null)
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',signal,
        })
        const body = await response.json()
        if (!signal.aborted && response.ok && body.world) {
          setWorld(body.world)
          onWorldChange?.(body.world)
        }
      } catch {
        // Keep the current world visible if a background refresh fails.
      }
    }

    const id = visiblePoll(refresh, 20000, false)
    return () => id()
  }, [onWorldChange, readOnly, refreshToken, refreshUrl])

  const inventory = useMemo(
    () => new Map((world?.inventory || []).map((item: any) => [item.item_key, Number(item.quantity || 0)])),
    [world?.inventory],
  )
  const materialPurpose = useMemo(()=>{
    const map=new Map<string,string[]>()
    for(const blueprint of world?.blueprints||[]){
      if(!blueprint.required_item_key)continue
      const current=map.get(blueprint.required_item_key)||[]
      current.push(blueprint.name)
      map.set(blueprint.required_item_key,current)
    }
    return map
  },[world?.blueprints])

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
      onWorldChange?.(body.world)
      emitWeaveMotion(body.motion||fileFolderMotion(String(payload?.action||'')))
      setMessage('Movement recorded in the Main File Folder.')
    } catch (error: any) {
      const label=error?.message||'Movement failed'
      emitWeaveMotion({kind:'interruption',label,intensity:.65,confirmed:true,source:'file-folder'})
      setMessage(label)
    } finally {
      setBusy('')
    }
  }

  const visibleDistricts = districts.filter(item=>item.key==='workshop_core'||isVisible(`/client/system-switch#studio:${item.key}`))
    .sort((a,b)=>{
      if(a.key==='workshop_core')return -1
      if(b.key==='workshop_core')return 1
      return orderFor(`/client/system-switch#studio:${a.key}`)-orderFor(`/client/system-switch#studio:${b.key}`)
    })

  useEffect(()=>{
    if(!visibleDistricts.some(item=>item.key===district))setDistrict('workshop_core')
  },[district,isVisible])

  const activeBuilds = (world?.builds || []).filter((build: any) => build.status === 'building')
  const buildFunding = world?.buildFunding || null
  const fundingGateLocked = Boolean(buildFunding && !buildFunding.publicDoorUnlocked && world?.customerDoor?.formation_status === 'funding_gate')
  const completedBuilds = (world?.builds || []).filter((build: any) => build.status === 'complete')
  const availableBuildItems = (world?.inventory || []).filter((item: any) => Number(item.quantity || 0) > 0)
  const buildMarketItems = (world?.items || []).filter((item: any) => item.build_effect !== 'speed_boost')
  const boostItems = (world?.items || []).filter((item: any) => item.build_effect === 'speed_boost')

  return (
    <section className="overflow-clip rounded-[1.35rem] border border-amber-200/10 bg-[#02080d] shadow-[0_30px_100px_rgba(0,0,0,.42)] md:rounded-[2rem]" data-construction-workspace="progressive-site">
      <header className="border-b border-amber-100/10 bg-[radial-gradient(circle_at_18%_0%,rgba(249,115,22,.11),transparent_30%),linear-gradient(180deg,rgba(73,45,24,.22),rgba(2,8,13,.02))] px-4 py-4 md:p-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.22em] text-amber-200 md:text-[9px] md:tracking-[0.28em]">Main File Folder · Technology Formation Territory</p>
            <h2 className="mt-1 truncate text-lg font-black text-white md:mt-2 md:text-4xl">{workshopTitle}</h2>
            <p className="mt-1 truncate text-[9px] font-mono text-slate-500 md:mt-2 md:text-[10px]">{clientName} · {fileNumber}</p>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] ${readOnly?'border-violet-300/20 bg-violet-400/5 text-violet-200':'border-emerald-300/20 bg-emerald-400/5 text-emerald-200'}`}>
            {readOnly?'Observable territory':'Client control'}
          </span>
        </div>

        <p className="mt-3 hidden max-w-3xl text-xs leading-6 text-slate-400 md:block">{workshopPurpose || 'The Client’s chosen workshop remains the center while real systems form around it.'}</p>
        <div className="mt-4 border-y border-cyan-300/10 py-3" data-file-folder-multiplayer-world="human-and-weave-ai">
          <div className="flex items-center justify-between gap-4"><div><p className="text-[8px] font-black uppercase tracking-[.2em] text-cyan-200">Multiplayer File Folder World</p><p className="mt-1 text-[10px] leading-5 text-slate-400">Human Client territories and clearly identified WEAVE AI-operated demonstration territories occupy the same public world. Visitors can observe public systems without receiving private authority.</p></div><span className="shrink-0 text-[8px] font-black uppercase tracking-wider text-emerald-300">World active</span></div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {WEAVE_AI_FILE_FOLDERS.map(ai=>{const territory=aiFileFolderTerritory(ai);return <div key={territory.territoryId} className="min-w-[15rem] border-l border-cyan-300/25 bg-cyan-400/[.025] px-3 py-2" data-ai-demonstration-territory={territory.territoryId}><p className="text-[7px] font-black uppercase tracking-[.16em] text-cyan-300">{territory.operatorLabel}</p><p className="mt-1 text-xs font-black text-white">{territory.publicName}</p><p className="mt-1 text-[8px] text-slate-500">{territory.fileNumber} · {territory.activity}</p><p className="mt-2 text-[9px] leading-4 text-slate-400">{territory.products.join(' · ')}</p><p className="mt-1 text-[8px] font-black text-amber-200">Generated for WEAVE · {territory.generatedSalesFlameCoin.toLocaleString()} FC</p></div>})}
          </div>
        </div>
        {readOnly&&<div className="mt-3 border-l-2 border-violet-300/30 bg-violet-400/[.035] px-3 py-2 text-[9px] leading-4 text-violet-100" data-territory-observer="progress-visible"><span className="font-black uppercase tracking-wider">{observerLabel} · </span>Construction progress, completed structures, Customer Door maturity and public business movement are visible here. Ownership, wallet, private records and build controls remain with the Lord/Lady.</div>}

        <div className="mt-3 flex gap-4 overflow-x-auto border-y border-amber-100/10 py-2.5 text-[8px] uppercase tracking-wider text-stone-500 md:mt-5 md:grid md:grid-cols-4 md:gap-2 md:border-0 md:py-0 md:text-center md:text-[10px]">
          <div className="flex shrink-0 items-baseline gap-1.5 md:block md:rounded-xl md:border md:border-amber-300/15 md:bg-amber-400/5 md:px-4 md:py-3">
            <span className="text-base font-black text-amber-100 md:mt-1 md:block md:text-xl">{activeBuilds.length}</span><span className="text-amber-300">Building</span>
          </div>
          <div className="flex shrink-0 items-baseline gap-1.5 md:block md:rounded-xl md:border md:border-emerald-300/15 md:bg-emerald-400/5 md:px-4 md:py-3">
            <span className="text-base font-black text-emerald-100 md:mt-1 md:block md:text-xl">{world?.systems?.length || 0}</span><span className="text-emerald-300">Live</span>
          </div>
          <div className="flex shrink-0 items-baseline gap-1.5 md:block md:rounded-xl md:border md:border-violet-300/15 md:bg-violet-400/5 md:px-4 md:py-3">
            <span className="text-[10px] font-black uppercase text-white md:mt-1 md:block md:text-xs">{world?.customerDoor?.formation_status || 'forming'}</span><span className="text-violet-300">Door</span>
          </div>
          <div className="flex shrink-0 items-baseline gap-1.5 md:block md:rounded-xl md:border md:border-cyan-300/15 md:bg-cyan-400/5 md:px-4 md:py-3">
            <span className="text-base font-black text-cyan-100 md:mt-1 md:block md:text-xl">×{Number(buildFunding?.buildSpeedMultiplier || 1).toFixed(2)}</span><span className="text-cyan-300">Power</span>
          </div>
        </div>

        <div className="mt-3 hidden rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[10px] leading-5 text-slate-400 md:block">
          {world?.guarantee?.hasActiveBuild
            ? 'Formation guarantee: at least one real build is currently moving through time.'
            : world?.guarantee?.hasReadyBlueprint
              ? 'Formation guarantee: no build is running yet, but buildable blueprints are available now.'
              : 'No buildable blueprint is currently published.'}
        </div>

        {buildFunding && !buildFunding.grandfathered && (
          <div className={`mt-3 flex items-center justify-between gap-3 border-l-2 px-3 py-2 text-[9px] leading-4 md:rounded-xl md:border md:px-4 md:py-3 md:text-[10px] md:leading-5 ${buildFunding.publicDoorUnlocked ? 'border-emerald-300/25 bg-emerald-400/[.035] text-emerald-200' : 'border-amber-300/30 bg-amber-400/[.035] text-amber-100'}`}>
            <div className="min-w-0">
              <span className="font-black uppercase tracking-wider">Funding · </span>
              <span className="md:hidden">{Number(buildFunding.totalParticipationFlameCoin || 0).toLocaleString()} / {Number(buildFunding.publicDoorThresholdFlameCoin || 0).toLocaleString()} FC</span>
              <span className="hidden md:inline">{Number(buildFunding.totalParticipationFlameCoin || 0).toLocaleString()} / {Number(buildFunding.publicDoorThresholdFlameCoin || 0).toLocaleString()} Flame Coin for the first public door.{!buildFunding.publicDoorUnlocked && <> Add {Number(buildFunding.requiredToOpenPublicDoorFlameCoin || 0).toLocaleString()} more Flame Coin before the Customer Door can open and new construction can continue after that gate.</>}</span>
            </div>
            {!readOnly && !buildFunding.publicDoorUnlocked && (
              <Link href="/client/deposit" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-300 px-2.5 py-1.5 font-black uppercase tracking-wider text-slate-950 md:px-3">
                <Zap className="h-3 w-3"/><span className="hidden sm:inline">Add Flame Credits</span><span className="sm:hidden">Add</span>
              </Link>
            )}
          </div>
        )}
      </header>

      <div className="min-h-[650px]">
        <nav aria-label="Walk the build site" className={`sticky z-30 border-b border-amber-100/10 bg-[#17100b]/94 backdrop-blur-xl ${readOnly?'top-11 md:top-0':'top-0'}`} data-build-site-awareness="compact-sticky-rail">
          <div className="flex h-12 items-center gap-2 px-3 md:h-auto md:px-4 md:py-3">
            <div className="min-w-0 shrink-0 border-r border-amber-100/10 pr-3">
              <p className="text-[7px] font-black uppercase tracking-[.16em] text-stone-600">Build site</p>
              <p className="mt-0.5 max-w-[112px] truncate text-[9px] font-black uppercase tracking-[.08em] text-amber-100">
                {visibleDistricts.find(item=>item.key===district)?.label || 'Command Core'}
              </p>
            </div>
            <div className="flex min-w-0 flex-1 snap-x snap-mandatory gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {visibleDistricts.map((item,index) => {
                const Icon=item.icon
                const selected=district===item.key
                return <button
                  key={item.key}
                  aria-current={selected?'location':undefined}
                  onClick={()=>{
                    setDistrict(item.key)
                    recordOutput({type:'action',label:`File Folder district: ${item.label}`,toScene:'file-folder'})
                  }}
                  className={`group flex h-8 shrink-0 snap-start items-center gap-1.5 rounded-full border px-2.5 transition md:h-auto md:min-w-[138px] md:rounded-xl md:px-3 md:py-2 md:text-left ${selected?'border-amber-300/35 bg-amber-300/[.08] text-amber-100':'border-white/[.06] bg-white/[.02] text-stone-500 hover:border-stone-600 hover:text-stone-300'}`}
                >
                  <span className="text-[7px] font-black text-amber-300/60">{String(index+1).padStart(2,'0')}</span>
                  <Icon className="h-3.5 w-3.5 shrink-0"/>
                  <span className="whitespace-nowrap text-[8px] font-black uppercase tracking-[.06em] md:text-[9px]">{item.label}</span>
                  <span className="hidden text-[7px] leading-3 text-stone-600 md:block">{item.detail}</span>
                </button>
              })}
            </div>
            {readOnly&&<span className="hidden shrink-0 rounded-full border border-violet-300/15 px-2 py-1 text-[7px] font-black uppercase tracking-[.1em] text-violet-200 sm:inline">Observe</span>}
          </div>
        </nav>

        <div className="p-3 sm:p-4 md:p-6">
          {message && <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-300">{message}</div>}

          {district==='workshop_core'&&(
            <div className="space-y-5">
              <div className="border-l-2 border-amber-300/30 pl-4">
                <p className="text-[9px] font-black uppercase tracking-[.22em] text-amber-200">Command Core</p>
                <h3 className="mt-2 text-2xl font-black text-white">{workshopTitle}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">{workshopPurpose||'This workshop remains the Client command point while real systems rise around it.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-0 overflow-hidden border-y border-amber-100/10 md:grid-cols-4">
                {[
                  ['Blueprints ready',world?.blueprints?.length||0,'DESIGN'],
                  ['Finished builds',completedBuilds.length,'STRUCTURES'],
                  ['Build intelligence',(world?.library||[]).filter((x:any)=>x.status==='complete').length+'/'+(world?.library?.length||0),'KNOWLEDGE'],
                  ['Outside customers',world?.customerDoor?.order_count||0,'MARKET'],
                ].map(([label,value,state],index)=><div key={String(label)} className={`relative px-3 py-4 md:px-4 md:py-5 ${index>0?'border-amber-100/10':''} ${index%2===1?'border-l':''} ${index>1?'border-t':''} md:border-t-0 md:[&:not(:first-child)]:border-l`}>
                  <p className="text-[7px] font-black uppercase tracking-[.16em] text-stone-600">{state}</p>
                  <p className="mt-2 text-2xl font-black text-white">{String(value)}</p>
                  <p className="mt-1 text-[8px] uppercase tracking-wider text-stone-500">{label}</p>
                </div>)}
              </div>
              <div className="flex flex-wrap gap-3 text-[9px] font-black uppercase tracking-[.12em]">
                <button onClick={()=>setDistrict('blueprint_foundry')} className="border-b border-violet-300/40 px-1 py-2 text-violet-200">Choose next blueprint →</button>
                <button onClick={()=>setDistrict('formation_yard')} className="border-b border-amber-300/40 px-1 py-2 text-amber-200">Walk to construction →</button>
                {world?.customerDoor?.public_slug&&<a href={`/store/${world.customerDoor.public_slug}`} target="_blank" rel="noreferrer" className="border-b border-emerald-300/40 px-1 py-2 text-emerald-200">Open Customer Door →</a>}
              </div>
            </div>
          )}

          {district === 'formation_yard' && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">Construction Yard</p>
              <h3 className="mt-2 text-2xl font-black">Construction continues while you are away.</h3>
              <div className="mt-5 space-y-3">
                {activeBuilds.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-500">Nothing is constructing yet. Travel to Blueprint Foundry to choose the next system, then supply it through Materials Depot.</p>}
                {activeBuilds.map((build:any) => {
                  const remaining = Math.max(0, Math.floor((new Date(build.completes_at).getTime() - now) / 1000))
                  const total = Math.max(1, Number(build.duration_minutes || (Number(build.duration_hours || 1) * 60)) * 60)
                  const progress = Math.min(100, Math.max(0, ((total - remaining) / total) * 100))
                  return <div key={build.id} className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.04] p-5">
                    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold text-white">{build.title}</p><p className="mt-1 text-[10px] text-slate-500">{build.system_type.replaceAll('_',' ')}</p></div><div className="flex items-center gap-1 text-[10px] text-amber-300"><Clock3 className="h-3.5 w-3.5"/>{duration(remaining)}</div></div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-amber-300/80" style={{width:`${progress}%`}} /></div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px]">
                      <span className="rounded-full border border-amber-300/15 bg-amber-400/5 px-2.5 py-1 font-black uppercase tracking-wider text-amber-200">Live speed ×{Number(build.speed_multiplier || 1).toFixed(2)}</span>
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-slate-400">{(build.applied_parts || []).length} attached parts</span>
                    </div>
                    <p className="mt-3 text-[10px] text-slate-500">{build.purpose}</p>
                    {(build.applied_parts || []).length > 0 && <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-600">Installed during this build</p>
                      <div className="mt-2 flex flex-wrap gap-2">{(build.applied_parts || []).map((part:any)=><span key={part.id} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] text-slate-300">{part.name}{part.effect_type==='speed_boost' ? ` · ×${Number(part.effect_value || 1).toFixed(2)}` : ''}</span>)}</div>
                    </div>}
                    {!readOnly && <div className="mt-4 rounded-xl border border-sky-300/10 bg-sky-400/[0.025] p-3">
                      <div className="flex items-center justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-[0.18em] text-sky-300">Continue building live</p><p className="mt-1 text-[9px] text-slate-500">Attach purchased parts to this active build. Speed boosts immediately change its live formation time.</p></div><Zap className="h-4 w-4 text-sky-300"/></div>
                      {build.system_type==='customer_door'&&<div className="mt-4 border-y border-emerald-300/10 py-3" data-customer-door-formation="72-hour-cycle">
                        <p className="text-[8px] font-black uppercase tracking-[.16em] text-emerald-300">Standard formation · 72 real hours · acceleration optional</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">{customerDoorFormation(buildProgress(build,now)).map(part=><div key={part.label} className="border-l border-emerald-300/15 pl-3"><p className={`text-[9px] font-black ${part.state==='formed'?'text-emerald-200':part.state==='forming'?'text-amber-200':'text-slate-600'}`}>{part.label} · {part.state}</p><p className="mt-1 text-[8px] leading-4 text-slate-500">{part.detail}</p></div>)}</div>
                      </div>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {availableBuildItems.length === 0 && <span className="text-[9px] text-slate-600">No purchased build items are waiting in inventory.</span>}
                        {availableBuildItems.map((item:any)=>{const actionKey=`apply:${build.id}:${item.item_key}`;return <button key={item.item_key} disabled={busy===actionKey} onClick={()=>act({action:'apply_build_item',build_id:build.id,item_key:item.item_key},actionKey)} className="rounded-full border border-sky-300/15 bg-sky-400/5 px-3 py-1.5 text-[9px] font-black text-sky-100 disabled:opacity-40">{busy===actionKey?'Applying…':`${item.name} ×${item.quantity}`}</button>})}
                      </div>
                    </div>}
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
                  const hasComponents = !blueprint.required_item_key || owned >= Number(blueprint.required_item_quantity || 0)
                  const canStart = hasComponents && !fundingGateLocked
                  const effectiveMinutes = Math.max(15, Math.ceil(Number(blueprint.build_hours || 1) * 60 / Number(buildFunding?.buildSpeedMultiplier || 1)))
                  const effectiveLabel = effectiveMinutes >= 1440
                    ? `${(effectiveMinutes / 1440).toFixed(effectiveMinutes % 1440 === 0 ? 0 : 1)}d`
                    : effectiveMinutes >= 60
                      ? `${(effectiveMinutes / 60).toFixed(effectiveMinutes % 60 === 0 ? 0 : 1)}h`
                      : `${effectiveMinutes}m`
                  return <div key={blueprint.blueprint_key} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                    <div className="flex items-start justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-[0.14em] text-violet-300">{branchLabel(blueprint.district)}</p><h4 className="mt-1 font-bold text-white">{blueprint.name}</h4></div><span className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-[9px] text-slate-400">Base {blueprint.build_hours}h · Yours {effectiveLabel}</span></div>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{blueprint.description}</p>
                    <p className="mt-3 text-[10px] text-slate-500">Requires: {blueprint.required_item_quantity || 0} × {blueprint.required_item_name || 'No component'} · Owned {owned}{blueprint.required_item_key ? <> · <span className="font-bold text-amber-200">{Number(blueprint.required_item_price_flame_coin || 0).toLocaleString()} Flame Coin each</span></> : null}</p>
                    {!readOnly && <button disabled={busy===blueprint.blueprint_key || !canStart} onClick={()=>act({action:'start_build',blueprint_key:blueprint.blueprint_key},blueprint.blueprint_key)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-35"><Hammer className="h-3.5 w-3.5"/>{busy===blueprint.blueprint_key?'Starting…':fundingGateLocked?'Add Flame Credits':hasComponents?'Start Build':'Acquire Component'}</button>}
                  </div>
                })}
              </div>
            </div>
          )}

          {district === 'build_market' && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">Materials Depot</p>
              <h3 className="mt-2 text-2xl font-black">Every material has a structural consequence. Nothing enters the territory without a function.</h3>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {buildMarketItems.map((item:any) => <div key={item.item_key} className="rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.035] p-5">
                  <div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-white">{item.name}</h4><p className="mt-1 text-[9px] uppercase tracking-wider text-emerald-300">{item.category}</p></div><div className="text-right"><p className="flex items-center gap-1 text-sm font-black text-white"><Coins className="h-3.5 w-3.5 text-amber-300"/>{Number(item.price_flame_coin).toLocaleString()}</p><p className="text-[8px] text-slate-500">Flame Coin</p></div></div>
                  <p className="mt-3 text-xs leading-5 text-slate-400">{item.description}</p>
                  <div className="mt-3 rounded-xl border border-emerald-300/10 bg-black/20 px-3 py-2 text-[9px] leading-4 text-slate-400">
                    <span className="font-black uppercase tracking-wider text-emerald-300">Operating result · </span>
                    {(materialPurpose.get(item.item_key)||[]).length ? `Required to begin ${materialPurpose.get(item.item_key)!.join(', ')}. ${operatingEffect(item)}` : operatingEffect(item)}
                  </div>
                  <p className="mt-3 text-[10px] text-slate-500">Inventory: {Number(inventory.get(item.item_key) || 0)}</p>
                  {!readOnly && <button disabled={busy===item.item_key} onClick={()=>act({action:'purchase_item',item_key:item.item_key,quantity:1},item.item_key)} className="mt-4 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-200 disabled:opacity-50">{busy===item.item_key?'Acquiring…':'Acquire material'}</button>}
                </div>)}
              </div>
            </div>
          )}

          {district === 'parts_workshop' && (
            <div data-client-parts-workshop="capability">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Parts Workshop</p>
              <h3 className="mt-2 text-2xl font-black">Start modest. Add capability. Keep moving.</h3>
              <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-400">Parts are an open market, not a wealth gate. A Standard Client can choose inexpensive, narrower capabilities and operate them for as long as needed. More advanced parts increase capacity, automation and reach; they do not erase the value of a modest working system. Install purchased capability into a compatible active structure in Formation Yard.</p>
              <div className="mt-4 border-l border-amber-300/20 bg-amber-300/[0.025] p-4" data-standard-growth-path="time-capital-continuum"><p className="text-[8px] font-black uppercase tracking-[.16em] text-amber-200">Standard growth path</p><p className="mt-2 text-[10px] leading-5 text-slate-400">Low capital can be exchanged for longer time and smaller capability. Operate what you can afford, preserve field evidence, earn, add parts, connect systems and expand. Enterprise remains reachable through sustained movement and recognition.</p></div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {buildPartItems.map((item:any)=><div key={item.item_key} className="border-l border-sky-300/20 bg-sky-400/[0.025] p-5">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-[.15em] text-sky-300">{String(item.category||'build part').replaceAll('_',' ')}</p><h4 className="mt-1 font-bold text-white">{item.name}</h4></div><div className="text-right"><p className="text-sm font-black text-amber-200">{Number(item.price_flame_coin).toLocaleString()} FC</p>{item.category==='accessible_part'&&<p className="mt-1 text-[7px] font-black uppercase tracking-wider text-emerald-300">Accessible part</p>}</div></div>
                  <p className="mt-3 text-xs leading-5 text-slate-400">{item.description}</p>
                  <p className="mt-3 text-[9px] leading-4 text-slate-500"><span className="font-black uppercase text-sky-300">Installed capability · </span>{operatingEffect(item)}</p>
                  <div className="mt-3 flex items-center justify-between text-[9px]"><span className="text-slate-500">Workshop inventory</span><span className="font-black text-white">{Number(inventory.get(item.item_key)||0)} owned</span></div>
                  {!readOnly&&<button disabled={busy===item.item_key} onClick={()=>act({action:'purchase_item',item_key:item.item_key,quantity:1},item.item_key)} className="mt-4 border border-sky-300/20 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-sky-100 disabled:opacity-40">{busy===item.item_key?'Acquiring…':'Acquire part'}</button>}
                </div>)}
              </div>
            </div>
          )}

          {district === 'boost_bay' && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">Acceleration Bay</p>
              <h3 className="mt-2 text-2xl font-black">Acceleration changes formation time; it does not replace formation.</h3>
              <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-400">Acquire acceleration here, then attach it to an active build in Construction Yard. The remaining countdown is recalculated immediately from recorded File Folder state.</p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {boostItems.map((item:any) => <div key={item.item_key} className="rounded-2xl border border-amber-300/12 bg-amber-400/[0.035] p-5">
                  <div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-white">{item.name}</h4><p className="mt-1 text-[9px] uppercase tracking-wider text-amber-300">Live acceleration</p></div><div className="text-right"><p className="flex items-center gap-1 text-sm font-black text-white"><Coins className="h-3.5 w-3.5 text-amber-300"/>{Number(item.price_flame_coin).toLocaleString()}</p><p className="text-[8px] text-slate-500">Flame Coin</p></div></div>
                  <p className="mt-3 text-xs leading-5 text-slate-400">{item.description}</p>
                  <p className="mt-3 text-[10px] text-slate-500">Inventory: {Number(inventory.get(item.item_key) || 0)}</p>
                  <p className="mt-2 inline-flex rounded-full border border-amber-300/15 bg-amber-400/5 px-2.5 py-1 text-[9px] font-black text-amber-200">Applies live · ×{Number(item.effect_value || 1).toFixed(2)} build speed</p>
                  {!readOnly && <button disabled={busy===item.item_key} onClick={()=>act({action:'purchase_item',item_key:item.item_key,quantity:1},item.item_key)} className="mt-4 rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-amber-100 disabled:opacity-50">{busy===item.item_key?'Acquiring…':'Acquire boost'}</button>}
                </div>)}
              </div>
            </div>
          )}

          {district === 'active_systems' && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Systems in Motion</p>
              <h3 className="mt-2 text-2xl font-black">A finished structure becomes valuable when it moves, connects and produces an output.</h3>
              <div className="mt-5 space-y-4">
                {(world?.systems || []).length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-500">No system has finished construction yet.</p>}
                {(world?.systems || []).map((system:any) => <div key={system.id} className="rounded-2xl border border-sky-300/15 bg-sky-400/[0.035] p-5">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] uppercase tracking-wider text-sky-300">{system.system_type.replaceAll('_',' ')}</p><h4 className="mt-1 font-bold text-white">{system.title}</h4></div><CheckCircle2 className="h-5 w-5 text-emerald-300"/></div>
                  <div className="mt-4 space-y-2">{(system.entries || []).map((entry:any)=><div key={entry.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/20 p-3"><button disabled={readOnly} onClick={()=>act({action:'toggle_system_entry',entry_id:entry.id,status:entry.status==='done'?'open':'done'},entry.id)} className={`mt-0.5 h-4 w-4 rounded-full border ${entry.status==='done'?'border-emerald-300 bg-emerald-300':'border-slate-600'}`}/><div><p className={`text-xs font-semibold ${entry.status==='done'?'text-slate-500 line-through':'text-slate-200'}`}>{entry.title}</p>{entry.body&&<p className="mt-1 text-[10px] leading-4 text-slate-500">{entry.body}</p>}{entry.evidence_type&&entry.evidence_type!=='internal'&&<p className="mt-1 text-[8px] font-black uppercase tracking-wider text-emerald-300/70">Field evidence · {String(entry.evidence_type).replaceAll('_',' ')}</p>}</div></div>)}</div>
                  {!readOnly && <div className="mt-4 flex gap-2"><input value={systemDrafts[system.id]||''} onChange={e=>setSystemDrafts({...systemDrafts,[system.id]:e.target.value})} placeholder="Record the next real operation…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"/><select value={systemEvidence[system.id]||'internal'} onChange={e=>setSystemEvidence({...systemEvidence,[system.id]:e.target.value})} className="rounded-xl border border-white/10 bg-black/30 px-2 text-[9px] font-black uppercase text-slate-300"><option value="internal">Internal</option><option value="customer_use">Customer use</option><option value="visitor_use">Visitor use</option><option value="fulfilment">Fulfilment</option><option value="delivery">Delivery</option><option value="service">Service</option><option value="revenue">Revenue</option></select><button disabled={!systemDrafts[system.id]?.trim() || busy===system.id} onClick={async()=>{await act({action:'add_system_entry',system_id:system.id,title:systemDrafts[system.id],evidence_type:systemEvidence[system.id]||'internal'},system.id);setSystemDrafts({...systemDrafts,[system.id]:''})}} className="rounded-xl bg-sky-500 px-3 text-slate-950 disabled:opacity-40"><Plus className="h-4 w-4"/></button></div>}
                </div>)}
              </div>
            </div>
          )}

          {district === 'library_district' && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">Formation Intelligence</p>
              <h3 className="mt-2 text-2xl font-black">Understand the build while the Client is using it.</h3>
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
