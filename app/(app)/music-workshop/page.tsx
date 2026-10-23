'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import type {MusicProject,MusicAsset} from '@/components/music-workshop/music-conversation-editor'
const ConversationEditor=dynamic(()=>import('@/components/music-workshop/music-conversation-editor'),{ssr:false})
type Access={fileNumber:string;isOwner:boolean;built:boolean;role:string}
type Collaborator={id:string;name:string;username:string;role:string}
const button='inline-flex min-h-10 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-200/[.075] px-4 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-200/15 disabled:opacity-40'
function tokenHeaders(json=false):HeadersInit{
 const token=localStorage.getItem('ssb_auth_token')
 return {...(json?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})}
}
export default function MusicWorkshop(){
 const [access,setAccess]=useState<Access|null>(null)
 const [projects,setProjects]=useState<MusicProject[]>([])
 const [assets,setAssets]=useState<MusicAsset[]>([])
 const [collaborators,setCollaborators]=useState<Collaborator[]>([])
 const [selected,setSelected]=useState<string|null>(null)
 const [title,setTitle]=useState('')
 const [username,setUsername]=useState('')
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [fileNumber,setFileNumber]=useState('')
 const load=useCallback(async(f:string)=>{
  const res=await fetch('/api/music-workshop'+(f?'?file='+encodeURIComponent(f):''),{
   headers:tokenHeaders(),cache:'no-store'})
  const data=await res.json().catch(()=>({}))
  if(!res.ok||!data.success)throw Error(data.error||'Music Studio is not accessible.')
  setAccess(data.access);setFileNumber(data.access.fileNumber)
  setProjects(data.projects||[]);setAssets(data.assets||[]);setCollaborators(data.collaborators||[])
 },[])
 useEffect(()=>{const file=new URLSearchParams(window.location.search).get('file')||''
  load(file).catch(e=>setMessage(e.message)).finally(()=>setLoading(false))
 },[load])
 const send=async(action:string,rest:Record<string,unknown>={})=>{
  const res=await fetch('/api/music-workshop',{method:'POST',headers:tokenHeaders(true),
   body:JSON.stringify({file:fileNumber,action,...rest})})
  const data=await res.json().catch(()=>({}))
  if(!res.ok||!data.success)throw Error(data.error||'Music Studio action failed.')
  return data
 }
 const run=async(fn:()=>Promise<void>)=>{
  setBusy(true);setMessage('')
  try{await fn()}catch(e){setMessage(e instanceof Error?e.message:'Music Studio request failed.')}
  finally{setBusy(false)}
 }
 const create=()=>void run(async()=>{
  const result=await send('create',{title})
  setProjects(p=>[result.project,...p]);setSelected(result.project.id);setTitle('')
 })
 const save=async(project:MusicProject)=>{
  const result=await send('save',{projectId:project.id,title:project.title,arrangement:project.arrangement})
  setProjects(p=>p.map(item=>item.id===result.project.id?result.project:item))
 }
 const upload=async(file:File):Promise<MusicAsset>=>{
  const data=new FormData()
  data.append('file',file);data.append('fileNumber',fileNumber)
  const res=await fetch('/api/music-workshop/media',{method:'POST',headers:tokenHeaders(),body:data})
  const body=await res.json().catch(()=>({}))
  if(!res.ok||!body.success)throw Error(body.error||'Sound upload failed.')
  setAssets(a=>[body.asset,...a])
  return body.asset as MusicAsset
 }
 const grant=()=>void run(async()=>{
  await send('grant',{username});setUsername('');await load(fileNumber)
  setMessage('Studio access granted. The Client remains the owner.')
 })
 const revoke=(userId:string)=>void run(async()=>{
  await send('revoke',{userId});await load(fileNumber);setMessage('Music production permission removed.')
 })
 const share=async()=>{
  const url=window.location.origin+'/music-workshop?file='+encodeURIComponent(fileNumber)
  try{await navigator.clipboard.writeText(url);setMessage('Private studio link copied. Only authorized workers can enter.')}
  catch{setMessage(url)}
 }
 const chosen=projects.find(p=>p.id===selected)
 if(loading)return <main role="status" className="min-h-[400px] p-10 text-center text-slate-200">Opening the WEAVE Music Studio…</main>
 if(!access)return <main className="mx-auto max-w-3xl p-6 text-white">
  <h1 className="text-2xl font-black">Music Studio — private File Folder</h1>
  <p className="mt-4 text-sm text-amber-200">{message||'Access was not granted.'}</p>
 </main>
 return <main className="mx-auto max-w-7xl space-y-5 px-3 py-7 text-white sm:px-6" data-weave-music-studio="true">
  <header className="rounded-3xl border border-cyan-300/15 bg-[linear-gradient(130deg,#05101b,#0b2531_55%,#09111d)] p-5 md:p-8">
   <p className="text-[10px] font-bold uppercase tracking-[.24em] text-amber-200">The Company of Time · Weave Production</p>
   <h1 className="mt-3 text-3xl font-black sm:text-4xl">Music Studio · The Sound of Interaction</h1>
   <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Words, sounds, and a repeating pattern become a real conversation. Position two or more sounds across the beat clock, let Self and Environment answer one another, and compose a loop with a beginning that returns.</p>
   <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
    <span>File Folder: {fileNumber}</span><span>Operating position: {access.role}</span>
    <span className={access.built?'text-emerald-300':'text-amber-300'}>{access.built?'Workshop constructed and active':'Build not yet completed'}</span>
    {access.isOwner&&<Link className={button} href="/client/system-switch#builds">Return to File Folder</Link>}
   </div>
  </header>
  {!access.built?<section className="rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-6">
   <h2 className="text-lg font-bold text-amber-100">Construction before operation</h2>
   <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">The Client must complete the Creator Booth, acquire the Music Studio Kit, build the Music Studio in the Streaming district and activate its File Folder system. Employees and collaborators enter only after this build is live.</p>
   {access.isOwner&&<Link className={button+' mt-4'} href="/client/system-switch#builds">Open construction site</Link>}
  </section>:chosen?<ConversationEditor key={chosen.id} project={chosen} assets={assets} fileNumber={fileNumber}
   onSaved={save} onAsset={upload} onClose={()=>setSelected(null)}/>:<div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
   <section className="rounded-2xl border border-white/10 bg-[#08131d] p-5 md:p-7">
    <h2 className="text-xl font-bold">Music productions</h2>
    <p className="mt-2 text-xs text-slate-400">Each production opens with three sounding tracks and words you can rearrange. The master mix is real, not an illustrated mock-up.</p>
    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
     <input aria-label="New music production title" value={title} onChange={e=>setTitle(e.target.value)} maxLength={180}
      placeholder="Name a song or spoken sound piece" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-950 p-3 text-sm"/>
     <button className={button} disabled={busy||title.trim().length<3} onClick={create}>Begin a music production</button>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
     {projects.map(p=><button key={p.id} onClick={()=>setSelected(p.id)}
      className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[.035] p-5 text-left transition hover:bg-cyan-300/[.07]">
      <p className="text-base font-bold">{p.title}</p>
      <p className="mt-2 text-xs text-slate-400">{p.arrangement.tracks.length} tracks · {p.arrangement.words.length} word cues · {p.arrangement.bpm} BPM</p>
      <p className="mt-4 text-xs font-bold text-cyan-200">Open your mixing room →</p>
     </button>)}
     {!projects.length&&<p className="text-xs text-slate-400">No saved music yet. Begin a production and hear the first conversation loop.</p>}
    </div>
   </section>
   <aside className="rounded-2xl border border-white/10 bg-[#08131d] p-5 md:p-7">
    <h2 className="text-lg font-bold">Client-owned sound</h2>
    <p className="mt-3 text-xs leading-5 text-slate-300">The Client owns the workshop and project records. Employed Legions can work only for their active Client. Any other department needs an invitation; public visitors cannot listen to or download private sessions.</p>
    <p className="mt-4 text-xs text-slate-400">Sounds saved in this File Folder: <strong>{assets.length}</strong></p>
    {access.isOwner&&<>
     <button className={button+' mt-4'} onClick={()=>void share()}>Copy private studio entrance</button>
     <label className="mt-5 block text-xs text-slate-300">Invite a staff username
      <input value={username} onChange={e=>setUsername(e.target.value)}
       placeholder="Agent, Bridger or Administration username" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm"/></label>
     <button className={button+' mt-2'} disabled={busy||!username.trim()} onClick={grant}>Approve collaborator</button>
     {collaborators.map(c=><div key={c.id} className="mt-3 flex items-center justify-between gap-2 border-b border-white/10 pb-3 text-xs">
      <div><p className="font-semibold">{c.name||c.username}</p><p className="text-slate-500">{c.role}</p></div>
      <button className="text-rose-300" disabled={busy} onClick={()=>revoke(c.id)}>Revoke</button>
     </div>)}
    </>}
    <p className="mt-5 text-[11px] leading-5 text-slate-500">Current export: one loop as WAV. Full master processing, licensed sample catalogues, stem separation, musical key detection, MP3 mastering and distribution are later production stages.</p>
   </aside>
  </div>}
  {message&&<p role="status" className="rounded-xl border border-cyan-200/15 bg-cyan-200/[.06] px-4 py-3 text-sm text-cyan-100">{message}</p>}
 </main>
}
