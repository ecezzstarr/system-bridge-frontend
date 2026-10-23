'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import type {FilmProject} from '@/components/animation-workshop/animation-movie-editor'
const AnimationMovieEditor=dynamic(()=>import('@/components/animation-workshop/animation-movie-editor'),{ssr:false})
type Access={fileNumber:string;role:string;isOwner:boolean;built:boolean}
type Collaborator={id:string;name:string;username:string;role:string}
const classes='rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-xs font-bold text-cyan-100 disabled:opacity-40'

export default function AnimationWorkshopPage(){
 const [file,setFile]=useState('')
 const [access,setAccess]=useState<Access|null>(null)
 const [projects,setProjects]=useState<FilmProject[]>([])
 const [collaborators,setCollaborators]=useState<Collaborator[]>([])
 const [selected,setSelected]=useState<string|null>(null)
 const [title,setTitle]=useState('')
 const [username,setUsername]=useState('')
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const endpoint=(f:string)=>'/api/animation-workshop'+(f?'?file='+encodeURIComponent(f):'')
 const headers=():HeadersInit=>{
  const token=typeof window!=='undefined'?localStorage.getItem('ssb_auth_token'):null
  return {'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})}
 }
 const load=useCallback(async(f:string)=>{
  const res=await fetch(endpoint(f),{headers:headers(),cache:'no-store'})
  const body=await res.json().catch(()=>({}))
  if(!res.ok||!body.success)throw new Error(body.error||'Unable to open Animation Workshop')
  setAccess(body.access);setFile(body.access.fileNumber);setProjects(body.projects||[])
  setCollaborators(body.collaborators||[])
 },[])
 useEffect(()=>{
  const f=new URLSearchParams(window.location.search).get('file')||''
  load(f).catch(e=>setMessage(e.message)).finally(()=>setLoading(false))
 },[load])
 const send=async(action:string,rest:Record<string,unknown>={})=>{
  const response=await fetch('/api/animation-workshop',{method:'POST',headers:headers(),
   body:JSON.stringify({action,file:access?.fileNumber,...rest})})
  const body=await response.json().catch(()=>({}))
  if(!response.ok||!body.success)throw new Error(body.error||'Animation workshop operation failed')
  return body
 }
 const run=async(fn:()=>Promise<void>)=>{
  setBusy(true);setMessage('')
  try{await fn()}catch(e){setMessage(e instanceof Error?e.message:'Operation failed')}
  finally{setBusy(false)}
 }
 const create=()=>void run(async()=>{
  const result=await send('create',{title})
  setProjects(p=>[result.project,...p]);setSelected(result.project.id);setTitle('')
 })
 const save=async(project:FilmProject)=>{
  const result=await send('save',{projectId:project.id,title:project.title,durationSeconds:project.duration_seconds,scene:project.scene})
  setProjects(p=>p.map(item=>item.id===result.project.id?result.project:item))
 }
 const invite=()=>void run(async()=>{await send('grant',{username});setUsername('');await load(file);setMessage('Private animation workshop invitation granted.')})
 const remove=(userId:string)=>void run(async()=>{await send('revoke',{userId});await load(file);setMessage('Workshop permission withdrawn.')})
 const copyDoor=async()=>{
  const url=window.location.origin+'/animation-workshop?file='+encodeURIComponent(access?.fileNumber||'')
  try{await navigator.clipboard.writeText(url);setMessage('Private workshop link copied. Only approved staff and Legions can enter.')}
  catch{setMessage(url)}
 }
 const selectedProject=projects.find(p=>p.id===selected)
 if(loading)return <div className="min-h-[360px] p-12 text-center text-slate-300" role="status">Opening WEAVE Animation Workshop…</div>
 if(!access)return <main className="mx-auto max-w-3xl p-6 text-white"><h1 className="text-2xl font-bold">Animation Workshop access</h1>
  <p className="mt-3 text-sm text-amber-200">{message||'This Client File Folder is private.'}</p></main>
 return <main className="mx-auto max-w-7xl space-y-5 px-3 py-6 text-white md:px-6" data-animation-workshop="true">
  <header className="rounded-3xl border border-cyan-200/15 bg-[#061322] p-5 md:p-8">
   <p className="text-[10px] font-bold uppercase tracking-[.25em] text-cyan-300">The Weave of Presence · File Folder world</p>
   <h1 className="mt-3 text-3xl font-black">Animation Workshop</h1>
   <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Produce your own animated films in a real interactive 3D environment. Position materials, create movement keyframes, choose the shot and record a movie. All working projects belong to this Client File Folder.</p>
   <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
    <span>File number: {access.fileNumber}</span><span>Position: {access.role}</span>
    <span className={access.built?'text-emerald-300':'text-amber-300'}>{access.built?'Animation Workshop active':'Construction required'}</span>
    {access.isOwner&&<Link className={classes} href="/client/system-switch#builds">Return to File Folder</Link>}
   </div>
  </header>
  {!access.built?<section className="rounded-2xl border border-amber-200/20 bg-amber-300/5 p-6">
   <h2 className="text-lg font-bold text-amber-100">Workshop still in construction</h2>
   <p className="mt-2 text-sm text-slate-300">The Client must acquire the Animation Production Kit, build the Animation Workshop in the Streaming district and activate the completed system. No user or Legion can produce private Client films before activation.</p>
   {access.isOwner&&<Link className={classes+' mt-4 inline-block'} href="/client/system-switch#builds">Enter Streaming construction</Link>}
  </section>:selectedProject?<AnimationMovieEditor key={selectedProject.id} project={selectedProject} onSave={save} onClose={()=>setSelected(null)}/>:<>
   <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
    <div className="rounded-2xl border border-white/10 bg-[#0b1420] p-5">
     <h2 className="text-xl font-bold">Film productions</h2>
     <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <input aria-label="New film title" maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}
       placeholder="Name your next film" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-950 p-3 text-sm"/>
      <button className={classes} disabled={busy||title.trim().length<3} onClick={create}>Create 3D movie</button>
     </div>
     <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {projects.map(p=><button key={p.id} onClick={()=>setSelected(p.id)} className="rounded-xl border border-cyan-200/15 bg-white/[.035] p-4 text-left hover:bg-cyan-200/[.07]">
       <p className="text-sm font-bold">{p.title}</p>
       <p className="mt-2 text-xs text-slate-400">{p.duration_seconds}s · {p.scene?.actors?.length||0} 3D objects</p>
       <p className="mt-3 text-xs text-cyan-300">Open production →</p>
      </button>)}
      {projects.length===0&&<p className="text-sm text-slate-400">No productions yet. Create the first movie to open the 3D timeline.</p>}
     </div>
    </div>
    <aside className="rounded-2xl border border-white/10 bg-[#0b1420] p-5">
     <h2 className="text-lg font-bold">Production rights</h2>
     <p className="mt-2 text-xs leading-5 text-slate-400">Client ownership is permanent. Hired Legions work under their active appointment. Other Agents, Bridgers and Administration staff need a Client invitation. Public visitors have no access.</p>
     {access.isOwner&&<>
      <button onClick={()=>void copyDoor()} className={classes+' mt-4 w-full'}>Copy private workshop entrance</button>
      <label className="mt-5 block text-xs text-slate-300">Invite staff by exact username
       <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Agent, Bridger or Administrator" className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-sm"/></label>
      <button disabled={busy||!username.trim()} onClick={invite} className={classes+' mt-2 w-full'}>Grant workshop permission</button>
      <div className="mt-4 space-y-2">{collaborators.map(c=><div key={c.id} className="flex items-center justify-between gap-2 border-b border-white/10 py-2 text-xs">
       <div><strong>{c.name||c.username}</strong><p className="text-slate-500">{c.role}</p></div>
       <button disabled={busy} onClick={()=>remove(c.id)} className="text-rose-300">Remove</button>
      </div>)}</div>
     </>}
     <p className="mt-5 text-xs text-slate-500">Film export currently supports silent WebM recording on compatible browsers. Full audio editing, character rigging, multiplayer editing and server MP4 rendering require separate production stages.</p>
    </aside>
   </section>
  </>}
  {message&&<p role="status" className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-3 text-xs text-cyan-200">{message}</p>}
 </main>
}
