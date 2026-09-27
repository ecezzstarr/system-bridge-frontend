'use client'

import { useEffect,useState } from 'react'
import { Bell,Footprints,RefreshCw,RotateCcw,Save,Volume2,Waves } from 'lucide-react'
import { toast } from 'sonner'
import { getAuthHeaders } from '@/lib/auth-client'
import {
  DEFAULT_ENVIRONMENT_RUNTIME_CONFIG,
  normalizeEnvironmentRuntimeConfig,
  type EnvironmentRuntimeConfig,
} from '@/lib/weave-environment-runtime-profile'

type RuntimePayload={
  success:boolean
  runtime?:{
    config:EnvironmentRuntimeConfig
    version:number
    updatedAt:string|null
  }
  error?:string
}

function seconds(ms:number){return Math.round(ms/100)/10}
function ms(value:string,fallback:number){
  const n=Number(value)
  return Number.isFinite(n)?Math.round(n*1000):fallback
}

function Range({
  label,value,min,max,step,onChange,suffix='',
}:{
  label:string
  value:number
  min:number
  max:number
  step:number
  onChange:(value:number)=>void
  suffix?:string
}){
  return <label className="block rounded-xl border border-white/10 bg-black/20 p-3">
    <div className="flex items-center justify-between gap-3">
      <span className="text-[9px] font-black uppercase tracking-wider text-stone-400">{label}</span>
      <span className="font-mono text-[10px] font-black text-amber-100">{value.toFixed(step<.01?3:step<.1?2:1)}{suffix}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={event=>onChange(Number(event.target.value))} className="mt-3 w-full accent-amber-300"/>
  </label>
}

export function EnvironmentRuntimeControls(){
  const [draft,setDraft]=useState<EnvironmentRuntimeConfig>(DEFAULT_ENVIRONMENT_RUNTIME_CONFIG)
  const [live,setLive]=useState<EnvironmentRuntimeConfig>(DEFAULT_ENVIRONMENT_RUNTIME_CONFIG)
  const [version,setVersion]=useState(0)
  const [updatedAt,setUpdatedAt]=useState<string|null>(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState('')

  const load=async()=>{
    setLoading(true)
    try{
      const response=await fetch('/api/admin/environment-organizer',{headers:getAuthHeaders(),cache:'no-store'})
      const body:RuntimePayload=await response.json()
      if(!response.ok||!body.success||!body.runtime)throw new Error(body.error||'Environment runtime profile unavailable')
      const config=normalizeEnvironmentRuntimeConfig(body.runtime.config)
      setDraft(config)
      setLive(config)
      setVersion(Number(body.runtime.version||0))
      setUpdatedAt(body.runtime.updatedAt||null)
    }catch(error:any){
      toast.error(error.message||'Unable to load environment runtime')
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{void load()},[])

  const publish=async(action:'set_runtime'|'restore_runtime_defaults')=>{
    setBusy(action)
    try{
      const response=await fetch('/api/admin/environment-organizer',{
        method:'PATCH',
        headers:getAuthHeaders(),
        body:JSON.stringify(action==='set_runtime'?{action,config:draft}:{action}),
      })
      const body:RuntimePayload=await response.json()
      if(!response.ok||!body.success||!body.runtime)throw new Error(body.error||'Environment runtime update failed')
      const config=normalizeEnvironmentRuntimeConfig(body.runtime.config)
      setDraft(config)
      setLive(config)
      setVersion(Number(body.runtime.version||0))
      setUpdatedAt(body.runtime.updatedAt||null)
      window.dispatchEvent(new Event('weave-environment-refresh'))
      toast.success(action==='set_runtime'?'Environment runtime published live.':'Environment runtime defaults restored live.')
    }catch(error:any){
      toast.error(error.message||'Environment runtime update failed')
    }finally{
      setBusy('')
    }
  }

  const preview=(kind:'bell'|'footsteps'|'movement')=>{
    window.dispatchEvent(new CustomEvent('weave:ambience-preview',{detail:{kind}}))
  }

  const dirty=JSON.stringify(draft)!==JSON.stringify(live)
  const loadingConfig=draft.loading
  const ambience=draft.ambience

  return <section className="mt-5 overflow-hidden rounded-3xl border border-amber-200/15 bg-[linear-gradient(180deg,rgba(65,42,23,.28),rgba(10,9,8,.72))]">
    <header className="border-b border-amber-100/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-200">Environment Runtime</p>
          <h2 className="mt-1 text-xl font-black text-white">Loading + Presence Workshop</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-stone-400">Tune how long WEAVE keeps an environment covered while components settle, and how strongly unseen human-presence ambience sits under DJ sound. Publishing changes Cloud SQL runtime state; no Cloud Run deployment is required.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-right">
          <p className="text-[8px] font-black uppercase text-stone-500">Runtime version</p>
          <p className="mt-1 text-sm font-black text-white">v{version||'—'}</p>
          {updatedAt&&<p className="mt-1 text-[8px] text-stone-600">{new Date(updatedAt).toLocaleString()}</p>}
        </div>
      </div>
    </header>

    {loading?<div className="flex min-h-[260px] items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-amber-200"/></div>:<div className="grid gap-5 p-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center gap-2"><Waves className="h-4 w-4 text-sky-200"/><p className="text-[9px] font-black uppercase tracking-[.18em] text-sky-200">Environment formation</p></div>
        <p className="mt-2 text-xs leading-5 text-stone-400">The cover stays up for the minimum time and also waits for fonts, current images and a quiet DOM. The maximum wait prevents a broken component from trapping the user forever.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-[9px] font-black uppercase text-stone-500">Cold entry minimum · seconds</span><input type="number" min="1.8" max="10" step=".1" value={seconds(loadingConfig.bootMinMs)} onChange={e=>setDraft(v=>({...v,loading:{...v.loading,bootMinMs:ms(e.target.value,v.loading.bootMinMs)}}))} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm font-black text-white"/></label>
          <label className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-[9px] font-black uppercase text-stone-500">Route movement minimum · seconds</span><input type="number" min=".35" max="5" step=".05" value={seconds(loadingConfig.transitMinMs)} onChange={e=>setDraft(v=>({...v,loading:{...v.loading,transitMinMs:ms(e.target.value,v.loading.transitMinMs)}}))} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm font-black text-white"/></label>
          <label className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-[9px] font-black uppercase text-stone-500">Quiet settle window · seconds</span><input type="number" min=".12" max="2" step=".05" value={seconds(loadingConfig.settleQuietMs)} onChange={e=>setDraft(v=>({...v,loading:{...v.loading,settleQuietMs:ms(e.target.value,v.loading.settleQuietMs)}}))} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm font-black text-white"/></label>
          <label className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-[9px] font-black uppercase text-stone-500">Safety maximum · seconds</span><input type="number" min="3" max="15" step=".25" value={seconds(loadingConfig.maxWaitMs)} onChange={e=>setDraft(v=>({...v,loading:{...v.loading,maxWaitMs:ms(e.target.value,v.loading.maxWaitMs)}}))} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm font-black text-white"/></label>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button onClick={()=>setDraft(v=>({...v,loading:{...v.loading,waitForFonts:!v.loading.waitForFonts}}))} className={`rounded-xl border px-3 py-3 text-left text-[10px] font-black uppercase ${loadingConfig.waitForFonts?'border-emerald-300/20 bg-emerald-400/[.04] text-emerald-200':'border-white/10 text-stone-500'}`}>Typography wait · {loadingConfig.waitForFonts?'ON':'OFF'}</button>
          <button onClick={()=>setDraft(v=>({...v,loading:{...v.loading,waitForImages:!v.loading.waitForImages}}))} className={`rounded-xl border px-3 py-3 text-left text-[10px] font-black uppercase ${loadingConfig.waitForImages?'border-emerald-300/20 bg-emerald-400/[.04] text-emerald-200':'border-white/10 text-stone-500'}`}>Media wait · {loadingConfig.waitForImages?'ON':'OFF'}</button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div><div className="flex items-center gap-2"><Volume2 className="h-4 w-4 text-amber-200"/><p className="text-[9px] font-black uppercase tracking-[.18em] text-amber-200">Unseen presence mix</p></div><p className="mt-2 text-xs leading-5 text-stone-400">Control footsteps, hall bells and distant movement independently of DJ. Music and voice always get priority.</p></div>
          <button onClick={()=>setDraft(v=>({...v,ambience:{...v.ambience,enabled:!v.ambience.enabled}}))} className={`rounded-xl border px-3 py-2 text-[9px] font-black uppercase ${ambience.enabled?'border-emerald-300/20 text-emerald-200':'border-rose-300/20 text-rose-200'}`}>{ambience.enabled?'Enabled':'Muted'}</button>
        </div>

        <div className="mt-4 space-y-2">
          <Range label="Environment presence level" value={ambience.idleGain} min={0} max={.08} step={.002} onChange={value=>setDraft(v=>({...v,ambience:{...v.ambience,idleGain:value}}))}/>
          <Range label="Under DJ music" value={ambience.musicGain} min={0} max={.04} step={.001} onChange={value=>setDraft(v=>({...v,ambience:{...v.ambience,musicGain:value}}))}/>
          <Range label="Under voice / announcements" value={ambience.voiceGain} min={0} max={.025} step={.001} onChange={value=>setDraft(v=>({...v,ambience:{...v.ambience,voiceGain:value}}))}/>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-[8px] font-black uppercase text-stone-500">Footsteps min/max · sec</span><div className="mt-2 grid grid-cols-2 gap-2"><input type="number" min="1.8" step=".5" value={seconds(ambience.footstepMinMs)} onChange={e=>setDraft(v=>({...v,ambience:{...v.ambience,footstepMinMs:ms(e.target.value,v.ambience.footstepMinMs)}}))} className="min-w-0 rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-xs text-white"/><input type="number" min="2.3" step=".5" value={seconds(ambience.footstepMaxMs)} onChange={e=>setDraft(v=>({...v,ambience:{...v.ambience,footstepMaxMs:ms(e.target.value,v.ambience.footstepMaxMs)}}))} className="min-w-0 rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-xs text-white"/></div></label>
          <label className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-[8px] font-black uppercase text-stone-500">Hall bell min/max · sec</span><div className="mt-2 grid grid-cols-2 gap-2"><input type="number" min="8" step="1" value={seconds(ambience.bellMinMs)} onChange={e=>setDraft(v=>({...v,ambience:{...v.ambience,bellMinMs:ms(e.target.value,v.ambience.bellMinMs)}}))} className="min-w-0 rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-xs text-white"/><input type="number" min="10" step="1" value={seconds(ambience.bellMaxMs)} onChange={e=>setDraft(v=>({...v,ambience:{...v.ambience,bellMaxMs:ms(e.target.value,v.ambience.bellMaxMs)}}))} className="min-w-0 rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-xs text-white"/></div></label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={()=>preview('footsteps')} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[9px] font-black uppercase text-stone-300"><Footprints className="h-3.5 w-3.5"/>Test footsteps</button>
          <button onClick={()=>preview('bell')} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[9px] font-black uppercase text-stone-300"><Bell className="h-3.5 w-3.5"/>Test bell</button>
          <button onClick={()=>preview('movement')} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[9px] font-black uppercase text-stone-300"><Waves className="h-3.5 w-3.5"/>Test movement</button>
        </div>
      </section>
    </div>}

    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-100/10 p-4">
      <p className="text-[9px] leading-4 text-stone-500">{dirty?'Draft differs from the live environment.':'Controls match the live environment.'}</p>
      <div className="flex flex-wrap gap-2">
        <button disabled={loading||Boolean(busy)} onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[9px] font-black uppercase text-stone-300 disabled:opacity-40"><RefreshCw className="h-3.5 w-3.5"/>Reload</button>
        <button disabled={loading||Boolean(busy)} onClick={()=>{if(window.confirm('Restore default loading and presence settings live?'))void publish('restore_runtime_defaults')}} className="inline-flex items-center gap-2 rounded-xl border border-amber-300/15 px-3 py-2 text-[9px] font-black uppercase text-amber-200 disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5"/>Defaults</button>
        <button data-presence-output="Publish environment runtime controls live" disabled={loading||Boolean(busy)||!dirty} onClick={()=>void publish('set_runtime')} className="inline-flex items-center gap-2 rounded-xl bg-amber-200 px-4 py-2 text-[9px] font-black uppercase text-stone-950 disabled:opacity-40"><Save className="h-3.5 w-3.5"/>Publish Live</button>
      </div>
    </footer>
  </section>
}
