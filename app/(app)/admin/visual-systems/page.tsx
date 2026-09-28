'use client'

import { AdaptiveCanvas } from '@/components/world/adaptive-canvas'
import { OrbitControls } from '@react-three/drei'
import { useEffect,useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Eye,
  History,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Undo2,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-provider'
import { getAuthHeaders } from '@/lib/auth-client'
import { WeaveSystemRoom } from '@/components/world/weave-system-room'
import { FlameEventArtifact3D,FlameEventArtifactMark } from '@/components/events/flame-event-artifact'
import { InteractionMotionField } from '@/components/world/interaction-motion-field'
import { emitWeaveMotion } from '@/lib/weave-interaction-motion'
import {
  DEFAULT_FLAME_ARTIFACT_CONFIG,
  FLAME_ARTIFACT_SURFACES,
  FLAME_ARTIFACT_SURFACE_LABELS,
  normalizeFlameArtifactConfig,
  type FlameArtifactVisualConfig,
  type VisualWorldMode,
} from '@/lib/weave-visual-profile'

type Revision={
  id:string
  version:number
  config:FlameArtifactVisualConfig
  action:string
  created_at:string
}

type WorkshopPayload={
  success:boolean
  profile:{
    draft:FlameArtifactVisualConfig
    published:FlameArtifactVisualConfig
    version:number
    updatedAt:string|null
    publishedAt:string|null
  }
  history:Revision[]
  error?:string
}

const paletteKeys=['sky','blue','white','red','ember','dark'] as const
const worldModes:{key:VisualWorldMode;label:string;detail:string}[]=[
  {key:'normal',label:'Normal WEAVE',detail:'Subtle living current across daily operation.'},
  {key:'flame-event',label:'Flame Event',detail:'Fire and Burning River become the dominant field.'},
  {key:'quiet-river',label:'Quiet River',detail:'Continuity and current lead; flame becomes restrained.'},
  {key:'ceremony',label:'Ceremony',detail:'Balanced fire, light and current for public moments.'},
  {key:'night-operations',label:'Night Operations',detail:'Lower flame with stronger route/current readability.'},
]

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}:{
  label:string
  value:number
  min:number
  max:number
  step:number
  onChange:(value:number)=>void
}){
  return <label className="block rounded-2xl border border-white/10 bg-black/20 p-3">
    <div className="flex items-center justify-between gap-3">
      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span>
      <span className="font-mono text-xs font-black text-white">{value.toFixed(step<0.1?2:1)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} className="mt-3 w-full accent-sky-300"/>
  </label>
}

export default function VisualSystemsWorkshop(){
  const {user,isInitialized}=useAuth()
  const router=useRouter()
  const [draft,setDraft]=useState<FlameArtifactVisualConfig>(DEFAULT_FLAME_ARTIFACT_CONFIG)
  const [published,setPublished]=useState<FlameArtifactVisualConfig>(DEFAULT_FLAME_ARTIFACT_CONFIG)
  const [version,setVersion]=useState(1)
  const [publishedAt,setPublishedAt]=useState<string|null>(null)
  const [history,setHistory]=useState<Revision[]>([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState<string|null>(null)

  useEffect(()=>{
    if(isInitialized&&(!user||user.role!=='admin'))router.replace('/dashboard')
  },[isInitialized,user,router])

  const applyPayload=(body:WorkshopPayload)=>{
    setDraft(normalizeFlameArtifactConfig(body.profile.draft))
    setPublished(normalizeFlameArtifactConfig(body.profile.published))
    setVersion(Number(body.profile.version||1))
    setPublishedAt(body.profile.publishedAt||null)
    setHistory(body.history||[])
  }

  const load=async()=>{
    setLoading(true)
    try{
      const res=await fetch('/api/admin/visual-systems',{headers:getAuthHeaders(),cache:'no-store'})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Unable to load Visual Systems Workshop')
      applyPayload(body)
    }catch(error:any){
      toast.error(error.message||'Unable to load Visual Systems Workshop')
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{
    if(user?.role==='admin')void load()
  },[user?.id])

  const run=async(action:string,extra:Record<string,unknown>={})=>{
    setBusy(action)
    try{
      const res=await fetch('/api/admin/visual-systems',{
        method:'PATCH',
        headers:getAuthHeaders(),
        body:JSON.stringify({action,config:draft,...extra}),
      })
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Visual update failed')
      applyPayload(body)
      const labels:Record<string,string>={
        save_draft:'Draft preserved.',
        publish:'Visual profile published live.',
        restore_live:'Draft restored from the current live version.',
        reset_draft:'Default artifact restored to draft.',
        rollback:'Published revision restored live.',
      }
      if(action==='publish'||action==='rollback'){
        window.dispatchEvent(new Event('weave:visual-runtime-published'))
        emitWeaveMotion({
          kind:action==='publish'?'ignition':'river',
          label:action==='publish'?'Visual Runtime published live':'Visual Runtime rolled back',
          intensity:1.35,
          confirmed:true,
          source:'visual-systems',
        })
      }
      toast.success(labels[action]||'Visual system updated.')
    }catch(error:any){
      toast.error(error.message||'Visual update failed')
    }finally{
      setBusy(null)
    }
  }

  const publish=()=>{
    if(!window.confirm('Publish this visual profile live across WEAVE? Existing sessions will receive it automatically.'))return
    void run('publish')
  }

  const rollback=(revision:Revision)=>{
    if(!window.confirm(`Restore published revision v${revision.version} as a new live version?`))return
    void run('rollback',{revisionId:revision.id})
  }

  const dirty=JSON.stringify(draft)!==JSON.stringify(published)
  const activeSurfaces=FLAME_ARTIFACT_SURFACES.filter(key=>draft.surfaces[key]).length

  if(!isInitialized||!user||user.role!=='admin')return null

  const left=<>
    <section className="rounded-3xl border border-violet-300/15 bg-violet-400/[.035] p-4">
      <Palette className="h-5 w-5 text-violet-300"/>
      <p className="mt-3 text-sm font-black text-white">Runtime visual authority</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">Change the registered artifact system without changing application source. Publish updates flow from Cloud SQL into the running app.</p>
    </section>
    <section className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">State</p>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-xs"><span className="text-slate-400">Live version</span><span className="font-black text-white">v{version}</span></div>
        <div className="flex items-center justify-between text-xs"><span className="text-slate-400">Draft</span><span className={dirty?'font-black text-amber-300':'font-black text-emerald-300'}>{dirty?'CHANGED':'SYNCED'}</span></div>
        <div className="flex items-center justify-between text-xs"><span className="text-slate-400">Surfaces</span><span className="font-black text-white">{activeSurfaces}/{FLAME_ARTIFACT_SURFACES.length}</span></div>
      </div>
    </section>
    <section className="rounded-3xl border border-sky-300/15 bg-sky-400/[.035] p-4">
      <p className="text-[9px] font-black uppercase tracking-wider text-sky-300">Fixable live</p>
      <p className="mt-3 text-xs leading-5 text-slate-300">World mode · live Flame Field · Burning River · route current · system emergence · artifact palette · surface placement.</p>
    </section>
  </>

  const center=loading?<div className="flex min-h-[520px] items-center justify-center"><RefreshCw className="h-7 w-7 animate-spin text-violet-300"/></div>:<>
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <section className="overflow-hidden rounded-3xl border border-violet-300/15 bg-[#020711]/75">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">Draft preview</p>
          <p className="mt-1 text-xs text-slate-400">This is the draft. Users still see v{version} until Publish Live.</p>
        </div>
        <div className="relative h-[360px] overflow-hidden bg-[#0c0806]" data-visual-preview="interaction-motion">
          <InteractionMotionField configOverride={draft} forceEvent={draft.world.mode==='flame-event'} className="z-0" opacity={0.95}/>
          {draft.enabled?<div className="relative z-10 h-full"><AdaptiveCanvas camera={{position:[0,0.15,4.8],fov:44}}>
            <ambientLight intensity={0.42}/>
            <pointLight position={[3,4,4]} intensity={16} color="#fff4dc"/>
            <FlameEventArtifact3D variant="hero" progress={4} active configOverride={draft}/>
            <OrbitControls enablePan={false} enableZoom={false}/>
          </AdaptiveCanvas></div>:<div className="relative z-10 flex h-full items-center justify-center p-8 text-center"><div><Eye className="mx-auto h-7 w-7 text-slate-600"/><p className="mt-3 text-sm font-black text-slate-400">Artifact disabled · world motion can remain active</p></div></div>}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10">
            <p className="text-[8px] font-black uppercase tracking-[.18em] text-amber-200">World motion · {draft.world.mode}</p>
            <p className="mt-1 text-[9px] text-stone-400">Flame {draft.world.flameIntensity.toFixed(2)} · River {draft.world.riverIntensity.toFixed(2)} · Emergence {draft.world.emergence.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex items-center justify-center border-t border-white/10 p-4">
          <FlameEventArtifactMark size="sm" configOverride={draft}/>
          <div className="ml-3"><p className="text-xs font-black text-white">{draft.name}</p><p className="mt-1 text-[9px] text-slate-500">Interface mark + 3D object share one profile</p></div>
        </div>
      </section>

      <section className="space-y-4">
        <section className="rounded-3xl border border-orange-300/15 bg-[linear-gradient(180deg,rgba(124,45,18,.08),rgba(2,6,23,.12))] p-4" data-admin-visual-system="world-motion">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-orange-200">Interaction in Motion</p>
              <h2 className="mt-1 text-lg font-black text-white">World motion authority</h2>
              <p className="mt-2 max-w-2xl text-[10px] leading-5 text-stone-400">WEAVE does not wear a theme. Flame, river, routes and system emergence are one live motion runtime.</p>
            </div>
            <button onClick={()=>setDraft(v=>({...v,world:{...v.world,enabled:!v.world.enabled}}))} className={`rounded-xl border px-3 py-2 text-[8px] font-black uppercase ${draft.world.enabled?'border-emerald-300/20 text-emerald-200':'border-white/10 text-stone-500'}`}>{draft.world.enabled?'World motion live':'World motion paused'}</button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {worldModes.map(mode=><button
              key={mode.key}
              onClick={()=>setDraft(v=>({...v,world:{...v.world,mode:mode.key}}))}
              className={`rounded-xl border p-3 text-left transition ${draft.world.mode===mode.key?'border-orange-200/30 bg-orange-300/[.07]':'border-white/10 bg-black/20 hover:border-white/20'}`}
            >
              <span className={`block text-[9px] font-black uppercase ${draft.world.mode===mode.key?'text-orange-100':'text-stone-300'}`}>{mode.label}</span>
              <span className="mt-1 block text-[8px] leading-3 text-stone-600">{mode.detail}</span>
            </button>)}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <section className="rounded-2xl border border-orange-300/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[8px] font-black uppercase tracking-[.16em] text-orange-200">Flame Field</p>
                <button onClick={()=>setDraft(v=>({...v,world:{...v.world,flameEnabled:!v.world.flameEnabled}}))} className={`text-[8px] font-black uppercase ${draft.world.flameEnabled?'text-emerald-300':'text-stone-600'}`}>{draft.world.flameEnabled?'FLOWING':'OFF'}</button>
              </div>
              <div className="mt-3 space-y-2">
                <Slider label="Flame intensity" value={draft.world.flameIntensity} min={0} max={2} step={0.05} onChange={value=>setDraft(v=>({...v,world:{...v.world,flameIntensity:value}}))}/>
                <Slider label="Flame flow" value={draft.world.flameFlow} min={0.1} max={2.5} step={0.05} onChange={value=>setDraft(v=>({...v,world:{...v.world,flameFlow:value}}))}/>
                <Slider label="Ember density" value={draft.world.emberDensity} min={0} max={1.5} step={0.05} onChange={value=>setDraft(v=>({...v,world:{...v.world,emberDensity:value}}))}/>
                <Slider label="Heat presence" value={draft.world.heatDistortion} min={0} max={1} step={0.05} onChange={value=>setDraft(v=>({...v,world:{...v.world,heatDistortion:value}}))}/>
              </div>
            </section>

            <section className="rounded-2xl border border-sky-300/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[8px] font-black uppercase tracking-[.16em] text-sky-200">Burning River</p>
                <button onClick={()=>setDraft(v=>({...v,world:{...v.world,riverEnabled:!v.world.riverEnabled}}))} className={`text-[8px] font-black uppercase ${draft.world.riverEnabled?'text-emerald-300':'text-stone-600'}`}>{draft.world.riverEnabled?'FLOWING':'OFF'}</button>
              </div>
              <div className="mt-3 space-y-2">
                <Slider label="River presence" value={draft.world.riverIntensity} min={0} max={2} step={0.05} onChange={value=>setDraft(v=>({...v,world:{...v.world,riverIntensity:value}}))}/>
                <Slider label="River speed" value={draft.world.riverSpeed} min={0.1} max={2.5} step={0.05} onChange={value=>setDraft(v=>({...v,world:{...v.world,riverSpeed:value}}))}/>
                <Slider label="Reflection" value={draft.world.reflection} min={0} max={1.5} step={0.05} onChange={value=>setDraft(v=>({...v,world:{...v.world,reflection:value}}))}/>
                <Slider label="Route current" value={draft.world.routeCurrent} min={0} max={2} step={0.05} onChange={value=>setDraft(v=>({...v,world:{...v.world,routeCurrent:value}}))}/>
              </div>
            </section>
          </div>

          <div className="mt-3">
            <Slider label="Live system emergence" value={draft.world.emergence} min={0} max={2} step={0.05} onChange={value=>setDraft(v=>({...v,world:{...v.world,emergence:value}}))}/>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/20 p-4" data-admin-motion-tests="true">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-amber-200">Motion response test</p>
          <p className="mt-2 text-[10px] leading-5 text-stone-500">Test the live interaction language without creating a business record. These pulses are visual/audio diagnostics only.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
            {[
              ['ignition','Ignition'],
              ['river','River'],
              ['route','Route'],
              ['emergence','Emergence'],
              ['value','Value'],
              ['arrival','Arrival'],
              ['confirmation','Confirm'],
            ].map(([kind,label])=><button
              key={kind}
              onClick={()=>emitWeaveMotion({kind:kind as any,label:`Admin motion test · ${label}`,intensity:1.15,confirmed:true,source:'visual-systems-test'})}
              className="rounded-xl border border-white/10 bg-white/[.025] px-3 py-2 text-[8px] font-black uppercase tracking-[.08em] text-stone-300 transition hover:border-amber-200/25 hover:text-amber-100"
            >{label}</button>)}
          </div>
        </section>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-sky-300">Identity</p><h2 className="mt-1 text-lg font-black text-white">Artifact profile</h2></div><button onClick={()=>setDraft(v=>({...v,enabled:!v.enabled}))} className={`rounded-xl border px-3 py-2 text-[9px] font-black uppercase ${draft.enabled?'border-emerald-300/20 bg-emerald-400/[.06] text-emerald-300':'border-red-300/20 bg-red-400/[.06] text-red-300'}`}>{draft.enabled?'Enabled':'Disabled'}</button></div>
          <label className="mt-4 block"><span className="text-[9px] font-black uppercase text-slate-500">Name</span><input value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"/></label>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-red-300">Palette</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {paletteKeys.map(key=><label key={key} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.02] p-3"><input type="color" value={draft.palette[key]} onChange={e=>setDraft(v=>({...v,palette:{...v.palette,[key]:e.target.value}}))} className="h-10 w-10 cursor-pointer rounded border-0 bg-transparent"/><div><p className="text-[9px] font-black uppercase text-slate-400">{key}</p><p className="mt-1 font-mono text-[9px] text-white">{draft.palette[key]}</p></div></label>)}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[.18em] text-sky-300">Motion</p><button onClick={()=>setDraft(v=>({...v,motion:{...v.motion,enabled:!v.motion.enabled}}))} className={`rounded-lg border px-2 py-1 text-[8px] font-black uppercase ${draft.motion.enabled?'border-sky-300/20 text-sky-300':'border-white/10 text-slate-500'}`}>{draft.motion.enabled?'Moving':'Still'}</button></div>
            <div className="mt-3 space-y-2"><Slider label="Rotation speed" value={draft.motion.rotationSpeed} min={0} max={2.5} step={0.1} onChange={value=>setDraft(v=>({...v,motion:{...v.motion,rotationSpeed:value}}))}/><Slider label="Float strength" value={draft.motion.floatStrength} min={0} max={0.3} step={0.01} onChange={value=>setDraft(v=>({...v,motion:{...v.motion,floatStrength:value}}))}/></div>
          </section>
          <section className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">Appearance</p>
            <div className="mt-3 space-y-2"><Slider label="Scale" value={draft.appearance.coreScale} min={0.55} max={1.7} step={0.05} onChange={value=>setDraft(v=>({...v,appearance:{...v.appearance,coreScale:value}}))}/><Slider label="Glow" value={draft.appearance.glow} min={0} max={2} step={0.1} onChange={value=>setDraft(v=>({...v,appearance:{...v.appearance,glow:value}}))}/><Slider label="Orbit strength" value={draft.appearance.orbitOpacity} min={0} max={1.4} step={0.1} onChange={value=>setDraft(v=>({...v,appearance:{...v.appearance,orbitOpacity:value}}))}/><Slider label="Wireframe" value={draft.appearance.wireframeOpacity} min={0} max={1.4} step={0.1} onChange={value=>setDraft(v=>({...v,appearance:{...v.appearance,wireframeOpacity:value}}))}/></div>
          </section>
        </div>
      </section>
    </div>

    <section className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">Surface registry</p></div>
      <p className="mt-2 text-xs leading-5 text-slate-400">Disable a bad visual placement instantly without deleting code. Re-enable it after the profile is corrected.</p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">{FLAME_ARTIFACT_SURFACES.map(key=><button key={key} onClick={()=>setDraft(v=>({...v,surfaces:{...v.surfaces,[key]:!v.surfaces[key]}}))} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left text-xs font-black ${draft.surfaces[key]?'border-emerald-300/15 bg-emerald-400/[.035] text-white':'border-white/10 bg-black/20 text-slate-500'}`}><span>{FLAME_ARTIFACT_SURFACE_LABELS[key]}</span><span className={draft.surfaces[key]?'text-emerald-300':'text-slate-600'}>{draft.surfaces[key]?'LIVE':'HIDDEN'}</span></button>)}</div>
    </section>

    <div className="mt-5 grid gap-2 sm:grid-cols-4">
      <button data-presence-output="Save visual systems draft" disabled={Boolean(busy)} onClick={()=>void run('save_draft')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300/20 bg-sky-400/[.05] px-4 py-3 text-xs font-black text-sky-200 disabled:opacity-40"><Save className="h-4 w-4"/>Save Draft</button>
      <button data-presence-output="Publish visual systems live" disabled={Boolean(busy)||!dirty} onClick={publish} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-40"><Zap className="h-4 w-4"/>Publish Live</button>
      <button disabled={Boolean(busy)||!dirty} onClick={()=>void run('restore_live')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-black text-white disabled:opacity-40"><Undo2 className="h-4 w-4"/>Discard Draft</button>
      <button disabled={Boolean(busy)} onClick={()=>void run('reset_draft')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/20 px-4 py-3 text-xs font-black text-amber-300 disabled:opacity-40"><RotateCcw className="h-4 w-4"/>Default Draft</button>
    </div>
  </>

  const right=<>
    <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[.035] p-4">
      <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">Live propagation</p></div>
      <p className="mt-3 text-sm font-black text-white">No deployment after publish</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">Mounted artifacts poll the published profile. Existing sessions normally pick up a new version within about 15 seconds or when the window regains focus.</p>
      {publishedAt&&<p className="mt-3 text-[9px] text-slate-500">Last publish · {new Date(publishedAt).toLocaleString()}</p>}
    </section>

    <section className="max-h-[520px] overflow-y-auto rounded-3xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2"><History className="h-4 w-4 text-violet-300"/><p className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">Published history</p></div>
      <div className="mt-3 space-y-2">{history.map(revision=><article key={revision.id} className="rounded-xl border border-white/10 bg-white/[.02] p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-black text-white">Version {revision.version}</p><p className="mt-1 text-[9px] uppercase text-slate-500">{revision.action} · {new Date(revision.created_at).toLocaleString()}</p></div><button disabled={Boolean(busy)} onClick={()=>rollback(revision)} className="rounded-lg border border-violet-300/15 px-2 py-1.5 text-[8px] font-black text-violet-300 disabled:opacity-40">ROLL BACK</button></div></article>)}</div>
    </section>

    <button onClick={()=>void load()} disabled={loading} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3 text-xs font-black text-white"><span>Reload live state</span><RefreshCw className={`h-4 w-4 text-violet-300 ${loading?'animate-spin':''}`}/></button>
  </>

  return <WeaveSystemRoom
    roomKey="administration-visual-systems"
    eyebrow="Administration · Runtime Design Authority"
    title="Visual Systems Workshop · Interaction in Motion"
    detail="Operate WEAVE as motion itself. Control live Flame Field, Burning River, route current, system emergence and registered artifacts from one runtime authority; preview, publish and roll back without a Cloud Run deployment."
    tone="violet"
    left={left}
    center={center}
    right={right}
    pulse={dirty?'Draft differs from live':'Runtime profile synchronized'}
  />
}
