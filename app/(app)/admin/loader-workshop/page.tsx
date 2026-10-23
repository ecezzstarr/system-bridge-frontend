'use client'

import {useEffect,useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {RotateCcw,Save,RefreshCw,Clock3,BookOpen,ArrowLeft} from 'lucide-react'
import {toast} from 'sonner'
import {useAuth} from '@/lib/auth-provider'
import {getAuthHeaders} from '@/lib/auth-client'
import {
  DEFAULT_ENVIRONMENT_RUNTIME_CONFIG,
  LOADER_COPY_ROLES,
  normalizeEnvironmentRuntimeConfig,
  type LoaderCopyRole,
  type EnvironmentRuntimeConfig,
} from '@/lib/weave-environment-runtime-profile'
import type {WeaveLoadingBrief,WeaveLoadingRole} from '@/lib/weave-loading-guidance'

const labels:Record<LoaderCopyRole,string>={
  visitor:'Visitors',agent:'Agent · Stability',bridger:'Bridger · Hope',
  client:'Client · File Folder',admin:'Administration', 'flame-event':'Flame Event',
}
type RuntimeResponse={success:boolean;runtime?:{config:EnvironmentRuntimeConfig;version:number;updatedAt:string|null};error?:string}
type DurationField='bootMinMs'|'transitMinMs'|'autoAdvanceMs'|'maxWaitMs'
const numberToSec=(number:number)=>Number((number/1000).toFixed(2))

export default function LoaderWorkshop(){
  const {user,isInitialized}=useAuth()
  const router=useRouter()
  const [draft,setDraft]=useState<EnvironmentRuntimeConfig>(DEFAULT_ENVIRONMENT_RUNTIME_CONFIG)
  const [live,setLive]=useState<EnvironmentRuntimeConfig>(DEFAULT_ENVIRONMENT_RUNTIME_CONFIG)
  const [version,setVersion]=useState(0)
  const [updatedAt,setUpdatedAt]=useState<string|null>(null)
  const [audience,setAudience]=useState<LoaderCopyRole>('agent')
  const [lessonIndex,setLessonIndex]=useState(0)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)

  useEffect(()=>{if(isInitialized&&user?.role!=='admin')router.replace('/dashboard')},[isInitialized,user?.role,router])
  const apply=(body:RuntimeResponse)=>{
    if(!body.success||!body.runtime)throw Error(body.error||'Loader settings unavailable')
    const config=normalizeEnvironmentRuntimeConfig(body.runtime.config)
    setDraft(config);setLive(config)
    setVersion(body.runtime.version||0)
    setUpdatedAt(body.runtime.updatedAt||null)
  }
  const load=async()=>{
    setLoading(true)
    try{
      const response=await fetch('/api/admin/environment-organizer',{headers:getAuthHeaders(),cache:'no-store'})
      const body:RuntimeResponse=await response.json()
      if(!response.ok)throw Error(body.error||'Unable to retrieve loader settings')
      apply(body)
    }catch(error:any){toast.error(error.message||'Unable to load loader settings')}
    finally{setLoading(false)}
  }
  useEffect(()=>{if(user?.role==='admin')void load()},[user?.id])

  const setDuration=(key:DurationField,seconds:number)=>{
    if(!Number.isFinite(seconds))return
    setDraft(previous=>({...previous,loading:{...previous.loading,[key]:Math.round(seconds*1000)}}))
  }
  const setLesson=(field:keyof WeaveLoadingBrief,value:string)=>{
    setDraft(previous=>{
      const lessons={...previous.loading.lessons}
      const sequence=lessons[audience].map(item=>({...item}))
      sequence[lessonIndex]={...sequence[lessonIndex],[field]:value}
      lessons[audience]=sequence
      return {...previous,loading:{...previous.loading,lessons}}
    })
  }
  const setTransitionNote=(value:string)=>{
    if(audience==='flame-event')return
    const role=audience as WeaveLoadingRole
    setDraft(previous=>({...previous,loading:{
      ...previous.loading,transitionNotes:{...previous.loading.transitionNotes,[role]:value},
    }}))
  }

  const publish=async()=>{
    setBusy(true)
    try{
      const response=await fetch('/api/admin/environment-organizer',{
        method:'PATCH',headers:getAuthHeaders(),
        body:JSON.stringify({action:'set_runtime',config:draft}),
      })
      const body:RuntimeResponse=await response.json()
      if(!response.ok)throw Error(body.error||'Unable to publish loader settings')
      apply(body)
      window.dispatchEvent(new Event('weave-environment-refresh'))
      toast.success('Loader lessons and timing published. Active sessions receive updates automatically.')
    }catch(error:any){toast.error(error.message||'Publication failed')}
    finally{setBusy(false)}
  }
  if(!isInitialized||user?.role!=='admin')return null

  const copy=draft.loading.lessons[audience]?.[lessonIndex]
  const dirty=JSON.stringify(draft)!==JSON.stringify(live)
  const timedMinimum=Math.max(draft.loading.bootMinMs,draft.loading.autoAdvanceMs*3)
  const transitMinimum=Math.max(draft.loading.transitMinMs,draft.loading.autoAdvanceMs*3)
  const durationFields:{key:DurationField;label:string;min:number;max:number;step:number}[]=[
    {key:'bootMinMs',label:'Initial entrance minimum',min:2,max:30,step:0.5},
    {key:'transitMinMs',label:'Every department movement minimum',min:2,max:30,step:0.5},
    {key:'autoAdvanceMs',label:'Seconds per lesson',min:1.5,max:12,step:0.25},
    {key:'maxWaitMs',label:'Readiness safety ceiling',min:5,max:60,step:1},
  ]
  return <main className="min-h-screen bg-[#020b14] px-4 py-8 text-white sm:px-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/environment-organizer" className="inline-flex items-center gap-2 text-xs text-sky-200"><ArrowLeft className="h-4 w-4"/> Environment Organizer</Link>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-200">Administration · System Workshop</p>
          <h1 className="mt-2 text-3xl font-black">Loader Workshop</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Control WEAVE's single automatic loader across Visitors, Stability, Hope, Clients, Administration and Flame Event. Publish live wordings and speed to Cloud SQL without redeploying the application.</p>
        </div>
        <div className="rounded-xl border border-white/10 p-3 text-xs text-slate-400">Live version <strong className="text-white">v{version||'—'}</strong>{updatedAt&&<p className="mt-1">{new Date(updatedAt).toLocaleString()}</p>}</div>
      </header>
      {loading?<div className="flex min-h-96 items-center justify-center"><RefreshCw className="h-7 w-7 animate-spin text-amber-200"/></div>:<>
        <section className="mt-6 rounded-2xl border border-amber-300/20 bg-[#0d1726] p-5">
          <div className="flex items-center gap-2 text-amber-200"><Clock3 className="h-5 w-5"/><h2 className="font-black">Automatic loading speed</h2></div>
          <p className="mt-2 text-xs leading-5 text-slate-300">Defaults provide at least eight seconds, no Next or Enter button, and three readable lessons. Longer or shorter durations can be published here. Environment readiness must also finish before the cover is removed.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {durationFields.map(field=><label key={field.key} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <span className="block min-h-9 text-xs text-slate-200">{field.label}</span>
              <input type="number" min={field.min} max={field.max} step={field.step} value={numberToSec(draft.loading[field.key])} onChange={event=>setDuration(field.key,Number(event.target.value))} className="w-full rounded-lg border border-white/20 bg-[#060d18] px-3 py-2 text-sm font-semibold text-white"/>
            </label>)}
          </div>
          <p className="mt-3 text-xs text-sky-200">Expected minimum: Entrance {numberToSec(timedMinimum)}s · Movement {numberToSec(transitMinimum)}s. Three lessons always appear automatically.</p>
        </section>
        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,.8fr)]">
          <div className="rounded-2xl border border-white/10 bg-[#0d1726] p-5">
            <div className="flex items-center gap-2 text-amber-200"><BookOpen className="h-5 w-5"/><h2 className="font-black">Department wordings</h2></div>
            <p className="mt-2 text-xs text-slate-300">Choose a department, then edit its three automatic entrance lessons. The original location-specific system instructions remain available for each movement.</p>
            <div className="mt-4 flex flex-wrap gap-2">{LOADER_COPY_ROLES.map(role=><button key={role} type="button" onClick={()=>{setAudience(role);setLessonIndex(0)}} className={audience===role?'rounded-xl bg-amber-200 px-3 py-2 text-xs font-black text-slate-950':'rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200'}>{labels[role]}</button>)}</div>
            <div className="mt-4 flex gap-2">{[0,1,2].map(index=><button key={index} type="button" onClick={()=>setLessonIndex(index)} className={index===lessonIndex?'flex-1 rounded-lg bg-sky-200 px-3 py-2 text-xs font-black text-slate-950':'flex-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white'}>Lesson {index+1}</button>)}</div>
            <div className="mt-4 space-y-3">{(['eyebrow','title','body','movement'] as const).map(field=><label key={field} className="block text-xs font-semibold text-slate-200">
              <span className="mb-1 block capitalize">{field==='movement'?'Next movement':field}</span>
              {field==='body'?<textarea rows={5} maxLength={1200} value={copy?.[field]||''} onChange={event=>setLesson(field,event.target.value)} className="w-full rounded-xl border border-white/15 bg-black/25 p-3 leading-6 text-white"/>:<input maxLength={field==='title'?160:field==='eyebrow'?120:240} value={copy?.[field]||''} onChange={event=>setLesson(field,event.target.value)} className="w-full rounded-xl border border-white/15 bg-black/25 px-3 py-3 text-white"/>}
            </label>)}</div>
            {audience!=='flame-event'&&<label className="mt-4 block text-xs font-semibold text-slate-200">
              <span className="mb-1 block">Department guidance on internal crossings (optional)</span>
              <textarea rows={3} maxLength={500} value={draft.loading.transitionNotes[audience as WeaveLoadingRole]} onChange={event=>setTransitionNote(event.target.value)} placeholder="This note accompanies the actual destination's guidance." className="w-full rounded-xl border border-white/15 bg-black/25 p-3 leading-6 text-white"/>
            </label>}
          </div>
          <aside className="rounded-2xl border border-amber-300/20 bg-[linear-gradient(145deg,#091d30,#271407)] p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-200">Preview · {labels[audience]} · {lessonIndex+1}/3</p>
            <p className="mt-8 text-xs font-black uppercase tracking-wider text-amber-100">{copy?.eyebrow}</p>
            <h2 className="mt-4 text-2xl font-black leading-snug">{copy?.title}</h2>
            <p className="mt-5 whitespace-pre-wrap text-base leading-7 text-slate-100">{copy?.body}</p>
            <p className="mt-5 border-l-2 border-amber-200 pl-3 text-sm font-semibold text-amber-100">{copy?.movement}</p>
            <div className="mt-10 flex gap-2">{[0,1,2].map(i=><span key={i} className={i<=lessonIndex?'h-1 flex-1 rounded-full bg-amber-200':'h-1 flex-1 rounded-full bg-white/15'}/>)}</div>
            <p className="mt-3 text-xs text-slate-300">Preview shows saved draft wording only. It does not interrupt any user session.</p>
          </aside>
        </section>
        <footer className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#091423]/95 p-4">
          <p className="text-xs text-slate-300">{dirty?'Unpublished changes':'Draft matches current published settings'}</p>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-xs font-bold"><RefreshCw className="h-4 w-4"/>Reload live</button>
            <button disabled={busy} onClick={()=>setDraft(previous=>({...previous,loading:normalizeEnvironmentRuntimeConfig(DEFAULT_ENVIRONMENT_RUNTIME_CONFIG).loading}))} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-xs font-bold"><RotateCcw className="h-4 w-4"/>Restore draft defaults</button>
            <button disabled={busy||!dirty} onClick={()=>void publish()} className="inline-flex items-center gap-2 rounded-xl bg-amber-200 px-5 py-3 text-xs font-black text-[#061321] disabled:opacity-40"><Save className="h-4 w-4"/>Publish live</button>
          </div>
        </footer>
      </>}
    </div>
  </main>
}
