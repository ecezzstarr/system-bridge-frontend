'use client'

import { useEffect,useMemo,useState } from 'react'
import type { ChangeEvent } from 'react'
import { WeaveNarrationCapture } from '@/components/video-studio/narration-capture'
import { Loader2,Play,Save,Upload,Music2 } from 'lucide-react'

type Scene={id:string;order:number;durationSeconds:number;beat:string;text:string;visualDirection:string;voiceover:string;assetUrl:string|null;assetType:'image'|'video'|null}
export type Production={id:string;title:string;status:string;durationSeconds:number;storyboard:Scene[];soundtrackUrl:string|null;narrationUrl:string|null;narrationScript:string;outputUrl:string|null;errorMessage:string|null}

export function ParticipantProductionEditor({production,onUpdated}:{production:Production;onUpdated:(project:Production)=>void}) {
  const [draft,setDraft]=useState(production)
  const [busy,setBusy]=useState('')
  const [message,setMessage]=useState('')
  useEffect(()=>{setDraft(production);setMessage('')},[production.id])
  const total=useMemo(()=>draft.storyboard.reduce((sum,scene)=>sum+Number(scene.durationSeconds||0),0),[draft])
  const headers=(json=false):Record<string,string>=>{
    const token=localStorage.getItem('ssb_auth_token')
    return {...(json?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})}
  }
  const patchScene=(index:number,patch:Partial<Scene>)=>setDraft(current=>({...current,storyboard:current.storyboard.map((scene,i)=>i===index?{...scene,...patch}:scene)}))

  async function save(next=draft) {
    setBusy('save');setMessage('')
    try {
      const response=await fetch('/api/video-ad-studio/project',{method:'PATCH',headers:headers(true),body:JSON.stringify({projectId:next.id,storyboard:next.storyboard,soundtrackUrl:next.soundtrackUrl,narrationUrl:next.narrationUrl})})
      const data=await response.json().catch(()=>({}))
      if(!response.ok||!data.success)throw new Error(data.error||'Could not save production')
      setDraft(data.project);onUpdated(data.project);setMessage('Video production saved.')
      return data.project as Production
    } catch(error:any) {
      setMessage(error.message||'Could not save production')
      return null
    } finally {setBusy('')}
  }

  async function upload(file:File) {
    const body=new FormData();body.append('file',file)
    const response=await fetch('/api/video-ad-studio/upload',{method:'POST',headers:headers(),body})
    const data=await response.json().catch(()=>({}))
    if(!response.ok||!data.success)throw new Error(data.error||'Media upload failed')
    return data as {url:string;mediaType:'image'|'video'|'audio'}
  }

  async function changeAsset(index:number,event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];if(!file)return
    setBusy(`asset-${index}`)
    try {
      const data=await upload(file)
      if(data.mediaType==='audio')throw new Error('Choose an image or video for a scene')
      const assetType:'image'|'video'=data.mediaType
      const next:Production={...draft,storyboard:draft.storyboard.map((scene,i)=>i===index?{...scene,assetUrl:data.url,assetType}:scene)}
      setDraft(next);setMessage('Scene media added. Save the changes before rendering.')
    }catch(error:any){setMessage(error.message||'Media upload failed')}
    finally{setBusy('');event.target.value=''}
  }

  async function changeMusic(event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];if(!file)return
    setBusy('music')
    try {
      const data=await upload(file)
      if(data.mediaType!=='audio')throw new Error('Music must be an audio file')
      const next={...draft,soundtrackUrl:data.url}
      setDraft(next);await save(next)
    }catch(error:any){setMessage(error.message||'Music upload failed')}
    finally{setBusy('');event.target.value=''}
  }

  async function render() {
    if(total!==draft.durationSeconds)return setMessage(`Scene timings must total ${draft.durationSeconds}s`)
    if(draft.storyboard.some(s=>!s.assetUrl||!s.assetType))return setMessage('Add an image or video to every scene first')
    setBusy('render');setMessage('Rendering your WEAVE production…')
    try {
      const saved=await save(draft)
      if(!saved)return
      const response=await fetch('/api/video-ad-studio/render',{method:'POST',headers:headers(true),body:JSON.stringify({projectId:saved.id})})
      const data=await response.json().catch(()=>({}))
      if(!response.ok||!data.success)throw new Error(data.error||'Render failed')
      setDraft(data.project);onUpdated(data.project);setMessage('Your MP4 is ready to watch and download.')
    }catch(error:any){setMessage(error.message||'Render failed')}
    finally{setBusy('')}
  }

  return <div className="space-y-5 border border-cyan-300/20 bg-black/30 p-4 sm:p-6">
    <div><p className="text-xs font-black uppercase tracking-wider text-cyan-200">WEAVE Production Editor</p><h3 className="mt-1 text-xl font-black text-white">{draft.title}</h3><p className="mt-2 text-xs text-slate-400">{draft.storyboard.length} scenes · {total}/{draft.durationSeconds} seconds · {draft.status}</p></div>
    <WeaveNarrationCapture uploadEndpoint="/api/video-ad-studio/upload" existingUrl={draft.narrationUrl} onUploaded={async url=>{const next={...draft,narrationUrl:url};setDraft(next);const saved=await save(next);if(!saved)throw new Error('Narration was uploaded but was not attached to the project')}}/>
    {draft.narrationScript&&<div><p className="text-xs font-black text-white">Original words — preserved</p><textarea readOnly rows={5} value={draft.narrationScript} className="mt-2 w-full bg-black/30 p-3 text-sm text-slate-200"/></div>}
    <label className="inline-flex cursor-pointer items-center gap-2 border border-white/20 px-3 py-2 text-xs text-white"><Music2 className="h-4 w-4"/>{busy==='music'?'UPLOADING…':draft.soundtrackUrl?'CHANGE MUSIC':'ADD LICENSED MUSIC'}<input type="file" accept="audio/*" className="hidden" onChange={changeMusic}/></label>
    <p className="text-xs text-slate-400">Narration has priority over background music; written voiceover directions are not automatically synthesized.</p>
    <div className="grid gap-4 lg:grid-cols-2">{draft.storyboard.map((scene,index)=><section key={scene.id} className="space-y-3 border border-white/10 p-4">
      <p className="text-xs font-black text-cyan-100">SCENE {scene.order} · {scene.beat}</p>
      {scene.assetUrl&&(scene.assetType==='video'?<video controls src={scene.assetUrl} className="max-h-64 w-full bg-black object-contain"/>:<img alt="Scene visual" src={scene.assetUrl} className="max-h-64 w-full object-contain"/>)}
      <textarea value={scene.text} onChange={e=>patchScene(index,{text:e.target.value})} maxLength={160} rows={3} placeholder="Caption shown on the video" className="w-full border border-white/10 bg-black/30 p-2 text-sm text-white"/>
      <textarea value={scene.voiceover} onChange={e=>patchScene(index,{voiceover:e.target.value})} maxLength={700} rows={2} placeholder="Words and vocal direction for the narrator" className="w-full border border-white/10 bg-black/30 p-2 text-xs text-slate-300"/>
      <label className="block text-xs text-slate-400">Scene seconds <input type="number" min={1} max={90} value={scene.durationSeconds} onChange={e=>patchScene(index,{durationSeconds:Number(e.target.value)})} className="ml-2 w-20 border border-white/20 bg-black/40 p-2 text-white"/></label>
      <label className="inline-flex cursor-pointer items-center gap-2 border border-cyan-300/20 px-3 py-2 text-xs text-cyan-100"><Upload className="h-4 w-4"/>{busy===`asset-${index}`?'UPLOADING…':'ADD OR REPLACE VISUAL'}<input className="hidden" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={event=>changeAsset(index,event)}/></label>
    </section>)}</div>
    <div className="flex flex-wrap gap-3"><button type="button" onClick={()=>void save()} disabled={Boolean(busy)} className="inline-flex items-center gap-2 border border-white/20 px-4 py-2 text-xs font-black text-white"><Save className="h-4 w-4"/>SAVE STUDIO WORK</button><button type="button" onClick={()=>void render()} disabled={Boolean(busy)} className="inline-flex items-center gap-2 bg-cyan-300 px-4 py-2 text-xs font-black text-black">{busy==='render'?<Loader2 className="h-4 w-4 animate-spin"/>:<Play className="h-4 w-4"/>}RENDER MP4</button></div>
    {message&&<p role="status" className="text-xs text-cyan-100">{message}</p>}
    {draft.errorMessage&&<p className="text-xs text-red-300">{draft.errorMessage}</p>}
    {draft.outputUrl&&<div className="space-y-3"><video src={draft.outputUrl} controls className="aspect-[9/16] max-h-[600px] w-full bg-black object-contain"/><a href={draft.outputUrl} download className="inline-block border border-cyan-300/30 px-4 py-2 text-xs font-black text-cyan-100">DOWNLOAD YOUR MP4</a></div>}
  </div>
}
