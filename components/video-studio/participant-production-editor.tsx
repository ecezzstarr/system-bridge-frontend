'use client'

import { useEffect,useMemo,useState } from 'react'
import type { ChangeEvent } from 'react'
import { WeaveNarrationCapture } from '@/components/video-studio/narration-capture'
import { Loader2,Play,Save,Upload,Music2,Clapperboard,Copy } from 'lucide-react'
import {
  WEAVE_WORK_DEMOS,buildWeaveWorkDemoScenes,quoteWorkDemo,
  type WorkDemoKind,type WorkDemoLook
} from '@/lib/weave-work-demo-video'

type Scene={id:string;order:number;durationSeconds:number;beat:string;text:string;visualDirection:string;voiceover:string;assetUrl:string|null;assetType:'image'|'video'|null;visualStyle?:WorkDemoLook}
export type Production={id:string;title:string;status:string;durationSeconds:number;storyboard:Scene[];soundtrackUrl:string|null;narrationUrl:string|null;narrationScript:string;outputUrl:string|null;errorMessage:string|null;demoMode?:boolean}

export function ParticipantProductionEditor({production,onUpdated,role}:{production:Production;onUpdated:(project:Production)=>void;role?:string}) {
  const [draft,setDraft]=useState(production)
  const [busy,setBusy]=useState('')
  const [message,setMessage]=useState('')
  const [demoKind,setDemoKind]=useState<WorkDemoKind>(role==='bridger'?'bridger-outreach':role==='client'?'client-customer-door':'agent-agility')
  const [demoLook,setDemoLook]=useState<WorkDemoLook>('documentary')
  const [demoCartons,setDemoCartons]=useState(1)
  const [demoExamplePrice,setDemoExamplePrice]=useState(10000)
  const demoConfig={kind:demoKind,look:demoLook,quantity:demoCartons,examplePriceNgn:demoExamplePrice}
  const demoQuote=quoteWorkDemo(demoConfig)
  const narrationText=draft.storyboard.map(scene=>scene.voiceover.trim()).filter(Boolean).join('\n\n')
  const applyDemo=()=>{
    if(!draft.storyboard.length)return setMessage('This project has no editable scenes.')
    setDraft(current=>({...current,demoMode:true,storyboard:buildWeaveWorkDemoScenes(current.storyboard,demoConfig)}))
    setMessage('Work demonstration formed with authentic filming directions. Upload real footage, review the figures, and save before rendering.')
  }
  const copyNarration=async()=>{
    try{await navigator.clipboard.writeText(narrationText);setMessage('Narration guide copied for your storyteller. Record or upload audio to make it audible.')}
    catch{setMessage('Unable to copy; select the narration text below.')}
  }
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
      const response=await fetch('/api/video-ad-studio/project',{method:'PATCH',headers:headers(true),body:JSON.stringify({projectId:next.id,storyboard:next.storyboard,soundtrackUrl:next.soundtrackUrl,narrationUrl:next.narrationUrl,demoMode:Boolean(next.demoMode)})})
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
    <div><p className="text-xs font-black uppercase tracking-wider text-cyan-200">WEAVE Production Editor · Real Texture</p><h3 className="mt-1 text-xl font-black text-white">{draft.title}</h3><p className="mt-2 text-xs text-slate-300">{draft.storyboard.length} scenes · {total}/{draft.durationSeconds} seconds · {draft.status}</p><p className="mt-2 text-xs leading-5 text-slate-400">Work with genuine video clips, licensed photos, natural image treatment and an actual spoken narration. Realistic-looking fabricated customers, payments or earnings are not evidence.</p></div>
    <section data-weave-real-work-video="simulation-editor" className="rounded-2xl border border-amber-300/30 bg-gradient-to-br from-[#182e39] via-[#111d26] to-[#1d2830] p-4 sm:p-5">
      <div className="flex items-start gap-3"><Clapperboard className="mt-1 h-6 w-6 shrink-0 text-amber-200"/><div>
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-200">Company of Time · Working demonstration</p>
        <h4 className="mt-1 text-xl font-semibold text-white">Film how a person works and earns.</h4>
        <p className="mt-2 text-sm leading-6 text-slate-300">Choose a real WEAVE working path. The Studio writes the scene plan, identifies the shots to film, and calculates an honest example. A paid project and authentic media are required for export.</p>
      </div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-200">Working position
          <select value={demoKind} onChange={event=>setDemoKind(event.target.value as WorkDemoKind)} className="mt-2 min-h-12 w-full rounded-xl border border-white/25 bg-[#0b1d28] px-3 text-sm text-white">
            {WEAVE_WORK_DEMOS.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-200">Real-texture visual treatment
          <select value={demoLook} onChange={event=>setDemoLook(event.target.value as WorkDemoLook)} className="mt-2 min-h-12 w-full rounded-xl border border-white/25 bg-[#0b1d28] px-3 text-sm text-white">
            <option value="natural">Natural · clean real footage</option>
            <option value="documentary">Documentary · subtle film grain</option>
            <option value="cinematic">Cinematic · richer lighting and depth</option>
          </select>
        </label>
        {demoKind==='agent-agility'?<label className="text-xs font-semibold text-slate-200">Example Agility cartons (10 packages each)
          <input type="number" min={1} max={5} step={1} value={demoCartons} onChange={event=>setDemoCartons(Number(event.target.value))} className="mt-2 min-h-12 w-full rounded-xl border border-white/25 bg-[#0b1d28] px-3 text-sm text-white"/>
        </label>:<label className="text-xs font-semibold text-slate-200">Illustrative customer quote (₦, not actual revenue)
          <input type="number" min={1000} max={1000000} step={1000} value={demoExamplePrice} onChange={event=>setDemoExamplePrice(Number(event.target.value))} className="mt-2 min-h-12 w-full rounded-xl border border-white/25 bg-[#0b1d28] px-3 text-sm text-white"/>
        </label>}
        <div className="rounded-xl border border-amber-200/20 bg-black/30 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200">Simulated outcome, not a promise</p>
          <p className="mt-2 text-lg font-semibold text-white">{demoQuote.metric}</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-300">{demoQuote.note}</p>
      <button type="button" onClick={applyDemo} disabled={Boolean(busy)} className="mt-4 min-h-12 w-full rounded-xl bg-[#e8c98e] px-4 text-sm font-bold text-[#172e38] disabled:opacity-60">Form my real-work video storyboard</button>
      {draft.demoMode&&<p className="mt-3 text-xs font-bold text-amber-200">SIMULATION MODE · All exported scenes retain a visible hypothetical-earnings label, even if the captions are edited.</p>}
    </section>
    <WeaveNarrationCapture uploadEndpoint="/api/video-ad-studio/upload" existingUrl={draft.narrationUrl} onUploaded={async url=>{const next={...draft,narrationUrl:url};setDraft(next);const saved=await save(next);if(!saved)throw new Error('Narration was uploaded but was not attached to the project')}}/>
    {draft.narrationScript&&<div><p className="text-xs font-black text-white">Original words — preserved</p><textarea readOnly rows={5} value={draft.narrationScript} className="mt-2 w-full bg-black/30 p-3 text-sm text-slate-200"/></div>}
    <label className="inline-flex cursor-pointer items-center gap-2 border border-white/20 px-3 py-2 text-xs text-white"><Music2 className="h-4 w-4"/>{busy==='music'?'UPLOADING…':draft.soundtrackUrl?'CHANGE MUSIC':'ADD LICENSED MUSIC'}<input type="file" accept="audio/*" className="hidden" onChange={changeMusic}/></label>
    <p className="text-xs text-slate-400">Narration has priority over background music; written voiceover directions are not automatically synthesized.</p>
    {narrationText&&<div className="rounded-xl border border-white/15 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold text-white">Narrator reading guide</h4><button type="button" onClick={()=>void copyNarration()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/25 px-3 text-xs font-semibold text-white"><Copy size={15}/> Copy words</button></div>
      <textarea readOnly rows={4} value={narrationText} className="mt-3 w-full rounded-lg border border-white/15 bg-[#0c1720] p-3 text-sm text-slate-200"/>
      <p className="mt-2 text-xs text-slate-400">Use WEAVE Narration Capture above to record or upload these words. Written guidance alone is not an audio file.</p>
    </div>}
    <div className="grid gap-4 lg:grid-cols-2">{draft.storyboard.map((scene,index)=><section key={scene.id} className="space-y-3 border border-white/10 p-4">
      <p className="text-xs font-black text-cyan-100">SCENE {scene.order} · {scene.beat}</p>
      {scene.assetUrl&&(scene.assetType==='video'?<video controls src={scene.assetUrl} className="max-h-64 w-full bg-black object-contain"/>:<img alt="Scene visual" src={scene.assetUrl} className="max-h-64 w-full object-contain"/>)}
      <textarea value={scene.text} onChange={e=>patchScene(index,{text:e.target.value})} maxLength={160} rows={3} placeholder="Caption shown on the video" className="w-full border border-white/10 bg-black/30 p-2 text-sm text-white"/>
      <textarea value={scene.voiceover} onChange={e=>patchScene(index,{voiceover:e.target.value})} maxLength={700} rows={2} placeholder="Words and vocal direction for the narrator" className="w-full border border-white/10 bg-black/30 p-2 text-xs text-slate-300"/>
      <div className="rounded-lg border border-cyan-200/15 bg-[#12303a] p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-cyan-200">Real footage to film or upload</p>
        <textarea value={scene.visualDirection} onChange={e=>patchScene(index,{visualDirection:e.target.value})} maxLength={700} rows={3} className="mt-2 w-full rounded-lg border border-white/15 bg-[#0a2029] p-3 text-sm leading-6 text-white" placeholder="What the camera should actually show"/>
      </div>
      <label className="block text-xs font-semibold text-slate-200">Visual texture
        <select value={scene.visualStyle||'natural'} onChange={e=>patchScene(index,{visualStyle:e.target.value as WorkDemoLook})} className="mt-2 min-h-11 w-full rounded-lg border border-white/20 bg-[#101f28] px-3 text-white">
          <option value="natural">Natural</option><option value="documentary">Documentary</option><option value="cinematic">Cinematic</option>
        </select>
      </label>
      <label className="block text-xs text-slate-400">Scene seconds <input type="number" min={1} max={90} value={scene.durationSeconds} onChange={e=>patchScene(index,{durationSeconds:Number(e.target.value)})} className="ml-2 w-20 border border-white/20 bg-black/40 p-2 text-white"/></label>
      <label className="inline-flex cursor-pointer items-center gap-2 border border-cyan-300/20 px-3 py-2 text-xs text-cyan-100"><Upload className="h-4 w-4"/>{busy===`asset-${index}`?'UPLOADING…':'UPLOAD REAL PHOTO OR VIDEO'}<input className="hidden" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={event=>changeAsset(index,event)}/></label>
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-amber-300/30 px-3 text-xs font-semibold text-amber-100">
        <Clapperboard className="h-4 w-4"/> Record real-world footage on phone
        <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={event=>changeAsset(index,event)}/>
      </label>
    </section>)}</div>
    <div className="flex flex-wrap gap-3"><button type="button" onClick={()=>void save()} disabled={Boolean(busy)} className="inline-flex items-center gap-2 border border-white/20 px-4 py-2 text-xs font-black text-white"><Save className="h-4 w-4"/>SAVE STUDIO WORK</button><button type="button" onClick={()=>void render()} disabled={Boolean(busy)} className="inline-flex items-center gap-2 bg-cyan-300 px-4 py-2 text-xs font-black text-black">{busy==='render'?<Loader2 className="h-4 w-4 animate-spin"/>:<Play className="h-4 w-4"/>}RENDER MP4</button></div>
    {message&&<p role="status" className="text-xs text-cyan-100">{message}</p>}
    {draft.errorMessage&&<p className="text-xs text-red-300">{draft.errorMessage}</p>}
    {draft.outputUrl&&<div className="space-y-3"><video src={draft.outputUrl} controls className="aspect-[9/16] max-h-[600px] w-full bg-black object-contain"/><a href={draft.outputUrl} download className="inline-block border border-cyan-300/30 px-4 py-2 text-xs font-black text-cyan-100">DOWNLOAD YOUR MP4</a></div>}
  </div>
}
