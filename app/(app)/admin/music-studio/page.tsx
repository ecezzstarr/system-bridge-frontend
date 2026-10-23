'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {AudioLines,ArrowLeft,CheckCircle2,Disc3,Music2,Plus,Radio,Save,Trash2,Upload,Volume2} from 'lucide-react'
import type {MusicProject,MusicAsset} from '@/components/music-workshop/music-conversation-editor'
import type {AdminSongSection} from '@/lib/admin-music-studio'
import {exportAdvancedSongWav,loopSeconds} from '@/lib/music-loop-engine'

const Composer=dynamic(()=>import('@/components/music-workshop/music-conversation-editor'),{ssr:false})
type Release={id:string;title:string;dj_track_id:string;published_at:string}
const btn='inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/[.09] px-4 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/[.16] disabled:opacity-40'
const input='w-full min-w-0 rounded-xl border border-white/15 bg-[#0a1521] px-3 py-2.5 text-sm text-white'
const names=['Opening','Self · First Voice','Environment · Answer','Conversation','Bridge','Closing']
const sectionId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2)
function authHeaders(json=false):HeadersInit{
 const token=localStorage.getItem('ssb_auth_token')
 return {...(json?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})}
}
export default function AdminMusicStudioPage(){
 const {user}=useAuth()
 const [projects,setProjects]=useState<MusicProject[]>([])
 const [assets,setAssets]=useState<MusicAsset[]>([])
 const [releases,setReleases]=useState<Release[]>([])
 const [selected,setSelected]=useState<string|null>(null)
 const [name,setName]=useState('')
 const [songTitle,setSongTitle]=useState('WEAVE · A Conversation in Motion')
 const [songArtist,setSongArtist]=useState('WEAVE · The Company of Time')
 const [sections,setSections]=useState<AdminSongSection[]>([])
 const [busy,setBusy]=useState('')
 const [message,setMessage]=useState('')
 const [initializing,setInitializing]=useState(true)
 const [previewUrl,setPreviewUrl]=useState<string|null>(null)
 const previewRef=useRef<HTMLAudioElement>(null)
 const previewUrlRef=useRef<string|null>(null)
 useEffect(()=>()=>{if(previewUrlRef.current)URL.revokeObjectURL(previewUrlRef.current)},[])
 const load=useCallback(async()=>{
  const res=await fetch('/api/admin/music-studio',{headers:authHeaders(),cache:'no-store'})
  const data=await res.json().catch(()=>({}))
  if(!res.ok||!data.success)throw Error(data.error||'Administration Music Studio could not load.')
  setProjects(data.projects||[]);setAssets(data.assets||[]);setReleases(data.releases||[])
 },[])
 useEffect(()=>{
  if(user?.role!=='admin'){if(user)setInitializing(false);return}
  void load().catch(e=>setMessage(e.message)).finally(()=>setInitializing(false))
 },[load,user?.role])
 const send=async(action:string,details:Record<string,unknown>)=>{
  const res=await fetch('/api/admin/music-studio',{method:'POST',headers:authHeaders(true),body:JSON.stringify({action,...details})})
  const data=await res.json().catch(()=>({}))
  if(!res.ok||!data.success)throw Error(data.error||'Cannot save WEAVE composition.')
  return data
 }
 const execute=async(label:string,run:()=>Promise<void>)=>{
  setBusy(label);setMessage('')
  try{await run()}catch(e){setMessage(e instanceof Error?e.message:'Music production failed.')}
  finally{setBusy('')}
 }
 const create=()=>void execute('create',async()=>{
  const data=await send('create',{title:name})
  setProjects(p=>[data.project,...p]);setSelected(data.project.id)
  if(!sections.length)setSections([{id:sectionId(),name:'Opening',projectId:data.project.id,repeats:2}])
  setName('');setMessage('Administration composition created. Arrange its words and sounds.')
 })
 const onSaved=async(project:MusicProject)=>{
  const data=await send('save',{projectId:project.id,title:project.title,arrangement:project.arrangement})
  setProjects(p=>p.map(x=>x.id===project.id?data.project:x))
  if(previewUrlRef.current){URL.revokeObjectURL(previewUrlRef.current);previewUrlRef.current=null;setPreviewUrl(null)}
 }
 const onAsset=async(file:File):Promise<MusicAsset>=>{
  const form=new FormData();form.append('file',file)
  const res=await fetch('/api/admin/music-studio/media',{method:'POST',headers:authHeaders(),body:form})
  const data=await res.json().catch(()=>({}))
  if(!res.ok||!data.success)throw Error(data.error||'Cannot save this Administration recording.')
  setAssets(old=>[data.asset,...old])
  return data.asset as MusicAsset
 }
 const fetchAudio=useCallback(async(assetId:string)=>{
  const res=await fetch('/api/admin/music-studio/media?assetId='+encodeURIComponent(assetId),{
   headers:authHeaders(),cache:'no-store'})
  if(!res.ok)throw Error('An institutional recording is unavailable.')
  return res.arrayBuffer()
 },[])
 const projectMap=useMemo(()=>new Map(projects.map(p=>[p.id,p])),[projects])
 const songSeconds=sections.reduce((sum,s)=>{
  const project=projectMap.get(s.projectId)
  return sum+(project?loopSeconds(project.arrangement)*s.repeats:0)
 },0)
 const issue=sections.length===0?'Add song sections before rendering.':
  sections.some(s=>!projectMap.has(s.projectId))?'One of the compositions no longer exists.':
  sections.some(s=>projectMap.get(s.projectId)!.arrangement.tracks.filter(t=>!t.muted&&t.level>0).length<2)?'Each song section needs two audible tracks.':
  songSeconds>160?'Reduce the song to 160 seconds or less.':''
 const createSong=async()=>{
  if(issue)throw Error(issue)
  const plan=sections.map(section=>({arrangement:projectMap.get(section.projectId)!.arrangement,repeats:section.repeats}))
  return exportAdvancedSongWav(plan,fetchAudio)
 }
 const preview=()=>void execute('render',async()=>{
  const result=await createSong()
  if(previewUrlRef.current)URL.revokeObjectURL(previewUrlRef.current)
  const url=URL.createObjectURL(result);previewUrlRef.current=url;setPreviewUrl(url)
  setMessage('Song composed. Listen to the full WAV master before publishing it to Weave.')
 })
 const download=()=>void execute('download',async()=>{
  const result=await createSong()
  const url=URL.createObjectURL(result),anchor=document.createElement('a')
  anchor.href=url;anchor.download=songTitle.replace(/[^a-z0-9_-]+/gi,'-').slice(0,100)+'.wav'
  anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1200)
  setMessage('Full song WAV downloaded.')
 })
 const publish=()=>void execute('publish',async()=>{
  if(songTitle.trim().length<3)throw Error('Name the song before publishing.')
  if(!window.confirm('Publish this WEAVE song to the DJ Library? It will not play for users until Administration places it into a playlist and starts broadcasting.'))return
  const wav=await createSong()
  const form=new FormData()
  form.append('title',songTitle.trim());form.append('artist',songArtist.trim())
  form.append('sections',JSON.stringify(sections))
  form.append('file',new File([wav],'weave-song.wav',{type:'audio/wav'}))
  const response=await fetch('/api/admin/music-studio/publish',{method:'POST',headers:authHeaders(),body:form})
  const data=await response.json().catch(()=>({}))
  if(!response.ok||!data.success)throw Error(data.error||'DJ song publication failed.')
  await load()
  setMessage('Song published to DJ Track Library. Enter DJ Workshop, create a playlist using the new track, then choose Go Live.')
 })
 const addSection=()=>{
  if(!projects.length||sections.length>=16)return
  const index=sections.length
  setSections(x=>[...x,{id:sectionId(),name:names[index%names.length],projectId:projects[0].id,repeats:1}])
 }
 const updateSection=(id:string,patch:Partial<AdminSongSection>)=>{
  setSections(s=>s.map(v=>v.id===id?{...v,...patch}:v))
  if(previewUrlRef.current){URL.revokeObjectURL(previewUrlRef.current);previewUrlRef.current=null;setPreviewUrl(null)}
 }
 if(user?.role!=='admin')return <main className="p-8 text-white"><h1>Administration Music Studio</h1><p className="mt-3 text-sm text-slate-300">Administration authentication is required.</p></main>
 if(initializing)return <main className="p-8 text-sm text-white">Opening the Administration Music Studio…</main>
 const chosen=projects.find(p=>p.id===selected)
 return <main className="mx-auto max-w-7xl space-y-6 p-3 pb-16 text-white sm:p-6" data-admin-music-studio="institutional-composition">
  <header className="relative overflow-hidden rounded-3xl border border-amber-200/20 bg-[linear-gradient(120deg,#071522,#113040_52%,#301e18)] p-5 sm:p-8">
   <p className="text-[10px] font-bold uppercase tracking-[.22em] text-amber-200">The Company of Time · Administration Studio</p>
   <h1 className="mt-3 flex items-center gap-3 text-2xl font-black sm:text-4xl"><AudioLines className="h-8 w-8 text-amber-200"/> The Music of Presence</h1>
   <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">Form songs through the arrangement of words, sounds and repeated patterns. Compose the Self speaking and the Environment answering, then assemble complete songs for Weave's institutional DJ.</p>
   <Link href="/admin/dj-workshop" className={btn+' mt-5'}><Radio className="h-4 w-4"/> Enter the DJ Workshop</Link>
  </header>
  {chosen?<Composer key={chosen.id} project={chosen} assets={assets} fileNumber="WEAVE-ADMIN" mode="administration"
   onSaved={onSaved} onAsset={onAsset} onClose={()=>setSelected(null)}/>:<>
   <section className="rounded-2xl border border-white/10 bg-[#091521] p-5">
    <h2 className="flex items-center gap-2 text-lg font-bold"><Music2 className="h-5 w-5 text-cyan-200"/> Sound compositions</h2>
    <p className="mt-2 text-xs leading-5 text-slate-400">First create several compositions with different rhythms, words, instruments and recordings. Each becomes a reusable section of an advanced song.</p>
    <div className="mt-4 flex flex-wrap gap-2"><input className={input+' flex-1'} value={name} onChange={e=>setName(e.target.value)}
      placeholder="Name a composition: e.g. River / First Voice" maxLength={180}/>
     <button disabled={!!busy||name.trim().length<3} className={btn} onClick={create}><Plus className="h-4 w-4"/> New composition</button></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
     {projects.map(p=><button key={p.id} onClick={()=>setSelected(p.id)}
      className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] p-4 text-left hover:border-amber-200/35">
      <p className="font-bold">{p.title}</p>
      <p className="mt-2 text-xs text-slate-400">{p.arrangement.bpm} BPM · {p.arrangement.tracks.length} tracks · {p.arrangement.words.length} word cues</p>
      <p className="mt-3 text-xs font-bold text-cyan-200">Open composition →</p>
     </button>)}
    </div>
   </section>
   <section className="rounded-2xl border border-white/10 bg-[#0a1823] p-5" data-admin-song-arrangement="multi-section">
    <div className="flex flex-wrap items-start justify-between gap-3">
     <div><h2 className="flex items-center gap-2 text-xl font-bold"><Disc3 className="h-5 w-5 text-amber-200"/> Song Assembly · A Conversation</h2>
      <p className="mt-2 text-xs text-slate-400">Each section uses its own composition. Mix distinct beginnings, vocal answers, environmental textures, bridges and endings on one continuous master timeline.</p>
     </div>
     <span className="rounded-lg bg-amber-200/[.08] px-3 py-2 text-xs text-amber-100">{Math.round(songSeconds)} / 160 seconds</span>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
     <label className="text-xs text-slate-300">Song title<input className={input+' mt-2'} value={songTitle} maxLength={180} onChange={e=>setSongTitle(e.target.value)}/></label>
     <label className="text-xs text-slate-300">WEAVE artist / production credit<input className={input+' mt-2'} value={songArtist} maxLength={160} onChange={e=>setSongArtist(e.target.value)}/></label>
    </div>
    <div className="mt-5 space-y-3">
     {sections.map((section,index)=><div key={section.id} className="grid gap-2 rounded-xl border border-cyan-200/10 bg-slate-950/50 p-3 sm:grid-cols-[2rem_1fr_1.35fr_7rem_2rem] sm:items-end">
      <span className="text-center text-xs font-bold text-amber-200">{index+1}</span>
      <label className="text-xs text-slate-400">Movement<input className={input+' mt-1'} value={section.name} maxLength={64}
       onChange={e=>updateSection(section.id,{name:e.target.value})}/></label>
      <label className="text-xs text-slate-400">Source composition<select className={input+' mt-1'} value={section.projectId}
       onChange={e=>updateSection(section.id,{projectId:e.target.value})}>
       {projects.map(p=><option value={p.id} key={p.id}>{p.title}</option>)}
      </select></label>
      <label className="text-xs text-slate-400">Repeat<select className={input+' mt-1'} value={section.repeats}
       onChange={e=>updateSection(section.id,{repeats:Number(e.target.value)})}>
       {[1,2,3,4].map(n=><option value={n} key={n}>{n}×</option>)}
      </select></label>
      <button aria-label="Remove section" className={btn} onClick={()=>setSections(s=>s.filter(x=>x.id!==section.id))}><Trash2 className="h-4 w-4"/></button>
     </div>)}
    </div>
    <button disabled={!projects.length||sections.length>=16} onClick={addSection} className={btn+' mt-4'}><Plus className="h-4 w-4"/> Add song movement</button>
    <p className="mt-3 text-[11px] text-slate-400">Words are timed script cues; to hear sung or spoken lyrics, record the actual voice inside each composition. Only audio you create or have rights to use should be broadcast.</p>
    {issue&&<p className="mt-3 text-xs text-amber-200">{issue}</p>}
    <div className="mt-5 flex flex-wrap gap-2">
     <button className={btn} disabled={!!busy||!!issue} onClick={preview}><Volume2 className="h-4 w-4"/> Render and listen</button>
     <button className={btn} disabled={!!busy||!!issue} onClick={download}><Save className="h-4 w-4"/> Download full WAV song</button>
     <button className={btn+' border-amber-200/35 text-amber-100'} disabled={!!busy||!!issue} onClick={publish}>
      <Upload className="h-4 w-4"/> Publish to DJ Library
     </button>
    </div>
    {previewUrl&&<div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-200/[.04] p-4">
     <p className="mb-2 text-xs text-emerald-100">Actual rendered master — review the song before publication</p>
     <audio ref={previewRef} src={previewUrl} controls className="w-full" preload="metadata"/>
    </div>}
   </section>
   <section className="rounded-2xl border border-white/10 bg-[#0a1420] p-5">
    <h2 className="flex items-center gap-2 text-lg font-bold"><Radio className="h-5 w-5 text-cyan-300"/> Released WEAVE songs</h2>
    <p className="mt-2 text-xs text-slate-400">Completed songs become ordinary music tracks in the DJ Library. Create or select a DJ playlist and start its broadcast to play the song throughout Weave.</p>
    <div className="mt-4 space-y-2">{releases.map(r=><div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 p-3">
     <div><p className="text-sm font-bold">{r.title}</p><p className="text-xs text-slate-500">{new Date(r.published_at).toLocaleString()}</p></div>
     <span className="flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4"/> DJ Library</span>
    </div>)}
    {!releases.length&&<p className="text-xs text-slate-500">No original WEAVE songs have been released yet.</p>}</div>
    <Link className={btn+' mt-4'} href="/admin/dj-workshop"><ArrowLeft className="h-4 w-4"/> DJ playlists and Go Live</Link>
   </section>
  </>}
  {message&&<p role="status" className="rounded-xl border border-cyan-300/20 bg-cyan-300/[.07] p-4 text-sm text-cyan-100">{message}</p>}
 </main>
}
