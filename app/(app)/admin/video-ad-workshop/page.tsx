'use client'

import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Clapperboard, Film, Image as ImageIcon, Loader2, Music2, Play, Save, Sparkles, Upload, Video } from 'lucide-react'

type SceneMediaType='image'|'video'
type Scene={id:string;order:number;durationSeconds:number;beat:string;text:string;visualDirection:string;voiceover:string;assetUrl:string|null;assetType:SceneMediaType|null}
type Project={id:string;orderId:string|null;title:string;subject:string;objective:string;audience:string;durationSeconds:number;aspectRatio:string;status:'draft'|'planned'|'rendering'|'ready'|'failed';storyboard:Scene[];soundtrackUrl:string|null;outputUrl:string|null;errorMessage:string|null;updatedAt:string}
type UploadedMedia={url:string;mediaType:'image'|'video'|'audio'}

const PRESETS=[30,45,60,90,120,180,240,300,360]
function durationLabel(seconds:number){if(seconds<60)return `${seconds}s`;const m=Math.floor(seconds/60),s=seconds%60;return s?`${m}m ${s}s`:`${m}m`}

export default function VideoAdStudioProductionPage(){
  const {user}=useAuth()
  const router=useRouter()
  const [projects,setProjects]=useState<Project[]>([])
  const [project,setProject]=useState<Project|null>(null)
  const [loading,setLoading]=useState(true)
  const [forming,setForming]=useState(false)
  const [saving,setSaving]=useState(false)
  const [rendering,setRendering]=useState(false)
  const [uploading,setUploading]=useState<string|null>(null)
  const [message,setMessage]=useState<string|null>(null)
  const [form,setForm]=useState({title:'WEAVE',subject:'',objective:'',audience:'',durationSeconds:30})

  const headers=(json=false):Record<string,string>=>{const token=localStorage.getItem('ssb_auth_token');return {...(json?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})}}

  useEffect(()=>{if(user&&user.role!=='admin')router.replace('/dashboard')},[user,router])

  const loadProjects=async()=>{
    try{
      setLoading(true)
      const response=await fetch('/api/admin/video-ads',{headers:headers(),cache:'no-store'})
      const data=await response.json()
      if(!response.ok||!data.success)throw new Error(data.error||'Unable to load Studio productions')
      const next:Project[]=data.projects||[]
      setProjects(next)
      setProject(current=>current?next.find(item=>item.id===current.id)||current:next[0]||null)
    }catch(error:any){setMessage(error.message||'Unable to load Studio productions')}finally{setLoading(false)}
  }
  useEffect(()=>{if(user?.role==='admin')void loadProjects()},[user?.role])

  const totalSeconds=useMemo(()=>project?.storyboard.reduce((sum:number,scene:Scene)=>sum+Number(scene.durationSeconds||0),0)||0,[project])

  const formProduction=async()=>{
    if(!form.title.trim()||!form.subject.trim()||!form.objective.trim()||!form.audience.trim()){setMessage('Name the production, subject, objective and audience.');return}
    setForming(true);setMessage(null)
    try{
      const response=await fetch('/api/admin/video-ads',{method:'POST',headers:headers(true),body:JSON.stringify(form)})
      const data=await response.json();if(!response.ok||!data.success)throw new Error(data.error||'Unable to form video')
      setProject(data.project);setProjects(current=>[data.project,...current.filter(item=>item.id!==data.project.id)])
      setMessage('Production formed. Supply or replace scene media, refine the storyboard, then render.')
    }catch(error:any){setMessage(error.message||'Unable to form video')}finally{setForming(false)}
  }

  const updateScene=(index:number,patch:Partial<Scene>)=>setProject(current=>current?{...current,storyboard:current.storyboard.map((scene,i)=>i===index?{...scene,...patch}:scene)}:current)

  const saveProject=async(nextProject:Project|null=project)=>{
    if(!nextProject)return null
    setSaving(true);setMessage(null)
    try{
      const response=await fetch('/api/admin/video-ads',{method:'PATCH',headers:headers(true),body:JSON.stringify({id:nextProject.id,storyboard:nextProject.storyboard,soundtrackUrl:nextProject.soundtrackUrl})})
      const data=await response.json();if(!response.ok||!data.success)throw new Error(data.error||'Save failed')
      const saved:Project=data.project
      setProject(saved);setProjects(current=>current.map(item=>item.id===saved.id?saved:item));setMessage('Studio production saved.')
      return saved
    }catch(error:any){setMessage(error.message||'Save failed');return null}finally{setSaving(false)}
  }

  const uploadFile=async(file:File):Promise<UploadedMedia>=>{
    const body=new FormData();body.append('file',file)
    const response=await fetch('/api/admin/video-ads/upload',{method:'POST',headers:headers(),body})
    const data=await response.json();if(!response.ok||!data.success)throw new Error(data.error||'Upload failed')
    return data as UploadedMedia
  }

  const uploadScene=async(index:number,event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];if(!file||!project)return
    setUploading(`scene-${index}`);setMessage(null)
    try{
      const uploaded=await uploadFile(file)
      if(uploaded.mediaType==='audio')throw new Error('Scene media must be an image or video')
      const assetType:SceneMediaType=uploaded.mediaType
      const next:Project={...project,storyboard:project.storyboard.map((scene,i)=>i===index?{...scene,assetUrl:uploaded.url,assetType}:scene)}
      setProject(next);await saveProject(next)
    }catch(error:any){setMessage(error.message||'Scene upload failed')}finally{setUploading(null);event.target.value=''}
  }

  const uploadSoundtrack=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];if(!file||!project)return
    setUploading('soundtrack');setMessage(null)
    try{
      const uploaded=await uploadFile(file);if(uploaded.mediaType!=='audio')throw new Error('Soundtrack must be audio')
      const next:Project={...project,soundtrackUrl:uploaded.url};setProject(next);await saveProject(next)
    }catch(error:any){setMessage(error.message||'Soundtrack upload failed')}finally{setUploading(null);event.target.value=''}
  }

  const render=async()=>{
    if(!project)return
    if(totalSeconds!==project.durationSeconds){setMessage(`Scene timing must total ${project.durationSeconds} seconds.`);return}
    if(project.storyboard.some(scene=>!scene.assetUrl||!scene.assetType)){setMessage('Every scene needs an image or video before rendering.');return}
    setRendering(true);setMessage('Rendering the current Studio production…')
    try{
      const saved=await saveProject(project);if(!saved)throw new Error('Save failed before rendering')
      const response=await fetch('/api/admin/video-ads/render',{method:'POST',headers:headers(true),body:JSON.stringify({projectId:saved.id})})
      const data=await response.json();if(!response.ok||!data.success)throw new Error(data.error||'Render failed')
      const ready:Project=data.project;setProject(ready);setProjects(current=>current.map(item=>item.id===ready.id?ready:item));setMessage(ready.orderId?'Customer video is ready in their Video Ad Studio.':'Video is ready for Administration review and publishing.')
    }catch(error:any){setMessage(error.message||'Render failed');await loadProjects()}finally{setRendering(false)}
  }

  const sendToAdWorkshop=()=>{
    if(!project?.outputUrl)return
    localStorage.setItem('weave_video_ad_handoff',JSON.stringify({title:project.title,body:project.objective,mediaUrl:project.outputUrl,mediaType:'video'}))
    router.push('/admin/ad-workshop?from=video-ad-studio')
  }

  if(!user||user.role!=='admin')return null

  return <main className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="overflow-hidden rounded-3xl border border-fuchsia-300/15 bg-[radial-gradient(circle_at_15%_0%,rgba(217,70,239,.16),transparent_35%),linear-gradient(140deg,#090b12,#05070c)] p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div><div className="inline-flex items-center gap-2 border border-fuchsia-300/15 bg-fuchsia-300/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-fuchsia-200"><Clapperboard className="h-3.5 w-3.5"/>Administration Studio</div><h1 className="mt-4 text-3xl font-black text-white sm:text-5xl">VIDEO AD STUDIO</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Paid customer productions and WEAVE campaigns use the same production grammar: hook → human situation → tension → turn → reveal → proof → consequence → one final line.</p></div><div className="border border-white/10 bg-black/20 px-5 py-4 text-right"><p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Production range</p><p className="mt-1 text-2xl font-black text-white">30 SEC — 6 MIN</p><p className="text-[10px] text-slate-600">Vertical 9:16 · MP4</p></div></div></section>

    {message&&<div className="border-y border-fuchsia-300/15 bg-fuchsia-300/[0.04] px-4 py-3 text-sm text-fuchsia-100 sm:border">{message}</div>}

    <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <section className="space-y-4 border-y border-white/10 bg-black/15 p-5 sm:border"><div><p className="text-[9px] font-black uppercase tracking-[0.24em] text-fuchsia-300">Administration production</p><h2 className="text-xl font-black text-white">FORM A WEAVE VIDEO</h2></div><div className="grid gap-3 sm:grid-cols-2"><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Production name" className="border-white/10 bg-black/30 text-white"/><Input value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})} placeholder="Audience" className="border-white/10 bg-black/30 text-white"/></div><textarea rows={3} value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Subject / product / environment" className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"/><textarea rows={3} value={form.objective} onChange={e=>setForm({...form,objective:e.target.value})} placeholder="What should this video achieve?" className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"/><div className="border-y border-white/10 py-4"><div className="flex items-center justify-between"><p className="text-xs font-black text-white">DURATION</p><p className="text-xl font-black text-fuchsia-200">{durationLabel(form.durationSeconds)}</p></div><input type="range" min={30} max={360} step={15} value={form.durationSeconds} onChange={e=>setForm({...form,durationSeconds:Number(e.target.value)})} className="mt-3 w-full accent-fuchsia-300"/><div className="mt-3 flex flex-wrap gap-2">{PRESETS.map(seconds=><button key={seconds} onClick={()=>setForm({...form,durationSeconds:seconds})} className={`border px-2 py-1 text-[9px] font-black ${form.durationSeconds===seconds?'border-fuchsia-300/50 text-fuchsia-100':'border-white/10 text-slate-500'}`}>{durationLabel(seconds)}</button>)}</div></div><Button onClick={formProduction} disabled={forming} className="w-full bg-fuchsia-300 font-black text-slate-950 hover:bg-fuchsia-200">{forming?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Sparkles className="mr-2 h-4 w-4"/>}FORM PRODUCTION</Button></section>

      <aside className="border-y border-white/10 bg-black/15 p-5 sm:border"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-600">Production floor</p><h2 className="text-xl font-black text-white">CURRENT VIDEOS</h2></div><Film className="h-5 w-5 text-fuchsia-200"/></div>{loading?<Loader2 className="mt-6 h-5 w-5 animate-spin text-slate-500"/>:projects.length===0?<p className="mt-6 text-sm text-slate-600">No Studio production yet.</p>:<div className="mt-4 divide-y divide-white/10">{projects.map(item=><button key={item.id} onClick={()=>setProject(item)} className="block w-full py-3 text-left"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-black text-white">{item.title}</p><span className="text-[9px] font-black uppercase text-fuchsia-200">{item.status}</span></div><p className="mt-1 text-[10px] text-slate-600">{durationLabel(item.durationSeconds)} · {item.orderId?'PAID CUSTOMER ORDER':'WEAVE PRODUCTION'}</p></button>)}</div>}</aside>
    </div>

    {project&&<section className="space-y-5 border-y border-white/10 bg-[#070910]/70 px-3 py-6 sm:border sm:px-6"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5"><div><p className="text-[9px] font-black uppercase tracking-[0.28em] text-fuchsia-300/70">{project.orderId?'Paid customer production':'Administration production'}</p><h2 className="mt-1 text-2xl font-black text-white">{project.title}</h2><p className="mt-2 text-xs text-slate-500">{durationLabel(project.durationSeconds)} · {project.storyboard.length} scenes · {project.status}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>void saveProject()} disabled={saving} className="border-white/15 text-white">{saving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Save className="mr-2 h-4 w-4"/>}SAVE</Button><label className="inline-flex cursor-pointer items-center border border-white/15 px-4 py-2 text-xs font-black text-white"><Music2 className="mr-2 h-4 w-4"/>{uploading==='soundtrack'?'UPLOADING…':project.soundtrackUrl?'REPLACE SOUND':'ADD SOUND'}<input type="file" accept="audio/*" className="hidden" onChange={uploadSoundtrack} disabled={Boolean(uploading)}/></label></div></div>

      <div className="grid gap-4 lg:grid-cols-2">{project.storyboard.map((scene,index)=><article key={scene.id} className="overflow-hidden border border-white/10 bg-black/20"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-fuchsia-300">SCENE {scene.order} · {scene.beat}</p><p className="mt-1 text-[10px] text-slate-600">{scene.durationSeconds}s</p></div>{scene.assetType==='video'?<Video className="h-5 w-5 text-cyan-300"/>:scene.assetType==='image'?<ImageIcon className="h-5 w-5 text-cyan-300"/>:<Upload className="h-5 w-5 text-slate-700"/>}</div>{scene.assetUrl&&<div className="aspect-[9/16] max-h-80 overflow-hidden bg-black">{scene.assetType==='video'?<video src={scene.assetUrl} controls className="h-full w-full object-cover"/>:<img src={scene.assetUrl} alt="" className="h-full w-full object-cover"/>}</div>}<div className="space-y-3 p-4"><Input value={scene.text} onChange={e=>updateScene(index,{text:e.target.value})} placeholder="Short on-screen line" className="border-white/10 bg-black/30 text-white"/><textarea rows={3} value={scene.visualDirection} onChange={e=>updateScene(index,{visualDirection:e.target.value})} placeholder="What should we see?" className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300 outline-none"/><textarea rows={2} value={scene.voiceover} onChange={e=>updateScene(index,{voiceover:e.target.value})} placeholder="Voice / sound direction" className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300 outline-none"/><label className="inline-flex cursor-pointer items-center border border-cyan-300/20 px-3 py-2 text-[9px] font-black text-cyan-200"><Upload className="mr-2 h-3.5 w-3.5"/>{uploading===`scene-${index}`?'UPLOADING…':scene.assetUrl?'REPLACE MEDIA':'ADD MEDIA'}<input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden" onChange={e=>uploadScene(index,e)} disabled={Boolean(uploading)}/></label></div></article>)}</div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-white/10 py-5"><div><p className="text-xs font-black text-white">Timeline {totalSeconds}s / {project.durationSeconds}s · {project.storyboard.filter(scene=>scene.assetUrl).length}/{project.storyboard.length} scenes supplied</p><p className="mt-1 text-[10px] text-slate-600">The Studio normalizes every scene to 9:16, joins the timeline and lays the optional soundtrack under the final MP4.</p></div><Button onClick={render} disabled={rendering||saving||Boolean(uploading)} className="bg-cyan-300 font-black text-slate-950 hover:bg-cyan-200">{rendering?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Play className="mr-2 h-4 w-4"/>}{rendering?'RENDERING…':'RENDER VIDEO'}</Button></div>

      {project.status==='failed'&&project.errorMessage&&<div className="border border-red-400/20 bg-red-400/[0.05] p-4 text-sm text-red-200">{project.errorMessage}</div>}
      {project.outputUrl&&<div className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]"><div className="mx-auto w-full max-w-sm bg-black"><video src={project.outputUrl} controls className="aspect-[9/16] w-full object-contain"/></div><div className="flex flex-col justify-center"><p className="text-[9px] font-black uppercase tracking-[0.26em] text-emerald-300">FINISHED VIDEO</p><h3 className="mt-2 text-2xl font-black text-white">{project.orderId?'RETURNED TO CUSTOMER STUDIO':'READY FOR WEAVE MOVEMENT'}</h3><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">{project.orderId?'The customer can now watch the finished production from their Video Ad Studio order.':'Administration can carry this production into the existing Ad Workshop for targeting and publishing.'}</p>{!project.orderId&&<Button onClick={sendToAdWorkshop} className="mt-5 w-fit bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200">SEND TO AD WORKSHOP<ArrowRight className="ml-2 h-4 w-4"/></Button>}</div></div>}
    </section>}
  </main>
}
