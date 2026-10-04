'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Radio, RefreshCw } from 'lucide-react'

type Project={id:string;orderId:string|null;title:string;objective:string;outputUrl:string|null;status:string;durationSeconds:number}
type Role='all'|'client'|'agent'|'bridger'|'admin'
type Placement='all'|'app'|'dashboard'|'event'|'marketplace'|'system-switch'|'login'
type Frequency='once'|'daily'|'every_login'|'persistent'

const ROLES:Role[]=['all','client','agent','bridger','admin']
const PLACEMENTS:Placement[]=['all','app','dashboard','event','marketplace','system-switch','login']
const FREQUENCIES:Frequency[]=['once','daily','every_login','persistent']

function durationLabel(seconds:number){
  if(seconds<60)return `${seconds}s`
  const m=Math.floor(seconds/60),s=seconds%60
  return s?`${m}m ${s}s`:`${m}m`
}

export function VideoAdStudioMovement(){
  const [projects,setProjects]=useState<Project[]>([])
  const [selectedId,setSelectedId]=useState('')
  const [roles,setRoles]=useState<Role[]>(['all'])
  const [placements,setPlacements]=useState<Placement[]>(['dashboard'])
  const [frequency,setFrequency]=useState<Frequency>('every_login')
  const [priority,setPriority]=useState('50')
  const [startAt,setStartAt]=useState('')
  const [endAt,setEndAt]=useState('')
  const [actionLabel,setActionLabel]=useState('')
  const [actionUrl,setActionUrl]=useState('')
  const [loading,setLoading]=useState(true)
  const [publishing,setPublishing]=useState(false)
  const [message,setMessage]=useState<string|null>(null)

  const headers=(json=false):Record<string,string>=>{
    const token=localStorage.getItem('ssb_auth_token')
    return {...(json?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})}
  }

  const load=async()=>{
    setLoading(true)
    try{
      const response=await fetch('/api/admin/video-ads',{headers:headers(),cache:'no-store'})
      const data=await response.json()
      if(!response.ok||!data.success)throw new Error(data.error||'Unable to load finished videos')
      const ready:Project[]=(data.projects||[]).filter((project:Project)=>project.status==='ready'&&project.outputUrl&&!project.orderId)
      setProjects(ready)
      setSelectedId(current=>current&&ready.some(item=>item.id===current)?current:ready[0]?.id||'')
    }catch(error:any){setMessage(error.message||'Unable to load finished videos')}finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[])
  const selected=useMemo(()=>projects.find(item=>item.id===selectedId)||null,[projects,selectedId])

  const toggleRole=(role:Role)=>{
    if(role==='all'){setRoles(['all']);return}
    setRoles(current=>{
      const base=current.filter(item=>item!=='all')
      const next=base.includes(role)?base.filter(item=>item!==role):[...base,role]
      return next.length?next:['all']
    })
  }

  const togglePlacement=(placement:Placement)=>{
    if(placement==='all'){setPlacements(['all']);return}
    setPlacements(current=>{
      const base=current.filter(item=>item!=='all')
      const next=base.includes(placement)?base.filter(item=>item!==placement):[...base,placement]
      return next.length?next:['dashboard']
    })
  }

  const publish=async(status:'draft'|'published')=>{
    if(!selected?.outputUrl)return
    setPublishing(true);setMessage(null)
    try{
      const response=await fetch('/api/admin/ads',{
        method:'POST',
        headers:headers(true),
        body:JSON.stringify({
          title:selected.title,
          body:selected.objective||'',
          mediaUrl:selected.outputUrl,
          mediaType:'video',
          targetRoles:roles,
          placements,
          actionLabel:actionLabel.trim()||null,
          actionUrl:actionUrl.trim()||null,
          eventKey:`video-ad-studio:${selected.id}`,
          startAt:startAt?new Date(startAt).toISOString():new Date().toISOString(),
          endAt:endAt?new Date(endAt).toISOString():null,
          frequency,
          priority:Number(priority||0),
          status,
          publicMovement:false,
          publicPlatforms:['direct'],
          movementDestination:actionUrl.trim()||'/',
        }),
      })
      const data=await response.json()
      if(!response.ok||!data.success)throw new Error(data.error||'Video movement could not be created')
      setMessage(status==='published'?'Video is now moving inside the selected parts of WEAVE.':'Video movement saved as a draft.')
    }catch(error:any){setMessage(error.message||'Video movement could not be created')}finally{setPublishing(false)}
  }

  return <section className="mx-auto mb-6 max-w-7xl space-y-5 border-y border-cyan-300/15 bg-black/20 p-5 sm:border sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.26em] text-cyan-300">VIDEO AD STUDIO · WEAVE MOVEMENT</p><h2 className="mt-1 text-2xl font-black text-white">SHOW THE FINISHED VIDEO INSIDE WEAVE</h2><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">A finished Administration video can move directly from this Studio into the live WEAVE ad system. Choose who sees it, where it appears, and how often it returns.</p></div><Button variant="outline" onClick={load} disabled={loading} className="border-white/15 text-white"><RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>REFRESH</Button></div>

    {message&&<div className="border border-cyan-300/15 bg-cyan-300/[0.04] px-4 py-3 text-xs text-cyan-100">{message}</div>}

    {loading?<Loader2 className="h-5 w-5 animate-spin text-slate-500"/>:projects.length===0?<p className="text-sm text-slate-600">Render an Administration video in the Studio before creating its WEAVE movement.</p>:<div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <div className="space-y-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-600">Finished Administration video</p>{projects.map(project=><button key={project.id} onClick={()=>setSelectedId(project.id)} className={`block w-full border p-3 text-left ${selectedId===project.id?'border-cyan-300/50 bg-cyan-300/[0.06]':'border-white/10 bg-black/20'}`}><p className="text-sm font-black text-white">{project.title}</p><p className="mt-1 text-[10px] text-slate-600">{durationLabel(project.durationSeconds)} · ready</p></button>)}</div>

      <div className="space-y-5 border border-white/10 bg-black/15 p-4">
        {selected&&<div className="grid gap-4 sm:grid-cols-[160px_1fr]"><video src={selected.outputUrl||''} controls className="aspect-[9/16] w-full bg-black object-contain"/><div><p className="text-lg font-black text-white">{selected.title}</p><p className="mt-2 text-xs leading-5 text-slate-500">{selected.objective}</p></div></div>}

        <div><p className="text-[9px] font-black uppercase tracking-wider text-slate-600">WHO SEES IT</p><div className="mt-2 flex flex-wrap gap-2">{ROLES.map(role=><button key={role} onClick={()=>toggleRole(role)} className={`border px-3 py-1.5 text-[9px] font-black uppercase ${roles.includes(role)?'border-fuchsia-300/50 bg-fuchsia-300/[0.08] text-fuchsia-100':'border-white/10 text-slate-500'}`}>{role}</button>)}</div></div>

        <div><p className="text-[9px] font-black uppercase tracking-wider text-slate-600">WHERE IT APPEARS</p><div className="mt-2 flex flex-wrap gap-2">{PLACEMENTS.map(placement=><button key={placement} onClick={()=>togglePlacement(placement)} className={`border px-3 py-1.5 text-[9px] font-black uppercase ${placements.includes(placement)?'border-cyan-300/50 bg-cyan-300/[0.08] text-cyan-100':'border-white/10 text-slate-500'}`}>{placement.replace('-',' ')}</button>)}</div></div>

        <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-[9px] font-black uppercase tracking-wider text-slate-600">FREQUENCY<select value={frequency} onChange={event=>setFrequency(event.target.value as Frequency)} className="h-10 w-full border border-white/10 bg-black/40 px-3 text-xs text-white outline-none">{FREQUENCIES.map(item=><option key={item} value={item}>{item.replace('_',' ')}</option>)}</select></label><label className="space-y-1 text-[9px] font-black uppercase tracking-wider text-slate-600">PRIORITY<Input type="number" value={priority} onChange={event=>setPriority(event.target.value)} className="border-white/10 bg-black/30 text-white"/></label></div>

        <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-[9px] font-black uppercase tracking-wider text-slate-600">START<Input type="datetime-local" value={startAt} onChange={event=>setStartAt(event.target.value)} className="border-white/10 bg-black/30 text-white"/></label><label className="space-y-1 text-[9px] font-black uppercase tracking-wider text-slate-600">END · OPTIONAL<Input type="datetime-local" value={endAt} onChange={event=>setEndAt(event.target.value)} className="border-white/10 bg-black/30 text-white"/></label></div>

        <div className="grid gap-3 sm:grid-cols-2"><Input value={actionLabel} onChange={event=>setActionLabel(event.target.value)} placeholder="Optional button label" className="border-white/10 bg-black/30 text-white"/><Input value={actionUrl} onChange={event=>setActionUrl(event.target.value)} placeholder="Optional WEAVE route e.g. /arena" className="border-white/10 bg-black/30 text-white"/></div>

        <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={()=>publish('draft')} disabled={publishing||!selected} className="border-white/15 text-white">SAVE MOVEMENT DRAFT</Button><Button onClick={()=>publish('published')} disabled={publishing||!selected} className="bg-cyan-300 font-black text-slate-950 hover:bg-cyan-200">{publishing?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Radio className="mr-2 h-4 w-4"/>}PUBLISH INSIDE WEAVE</Button></div>
      </div>
    </div>}
  </section>
}
