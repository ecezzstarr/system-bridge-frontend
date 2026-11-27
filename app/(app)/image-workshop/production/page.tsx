'use client'
import Link from 'next/link'
import {useEffect,useRef,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {getClientToken} from '@/lib/client-auth'
import {FlameSubscriptionPanel,notifyFlameUsage} from '@/components/flame-subscription'

type Job={id:string;kind:'image'|'text';prompt:string;status:string;asset_id?:string;content?:string;created_at:string}
type State={image:boolean;text:boolean;costs:{image:number;text:number};presets:string[];sizes:string[];jobs:Job[]}
const headers=()=>({'Content-Type':'application/json',Authorization:'Bearer '+(getClientToken()||'')})
const field='w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-white'
export default function CreativeProduction(){
 const {user}=useAuth()
 const [state,setState]=useState<State|null>(null),[kind,setKind]=useState<'image'|'text'>('image')
 const [prompt,setPrompt]=useState(''),[preset,setPreset]=useState('cinematic'),[size,setSize]=useState('1024x1024')
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('')
 const [preview,setPreview]=useState(''),[previewAsset,setPreviewAsset]=useState('')
 const pending=useRef<{id:string;fingerprint:string}|null>(null),lock=useRef(false)
 async function load(){
  try{const r=await fetch('/api/image-workshop/production',{headers:headers(),cache:'no-store'});const b=await r.json();if(!r.ok)throw Error(b.error);setState(b)}
  catch(e){setNotice(e instanceof Error?e.message:'Workshop unavailable.')}
 }
 useEffect(()=>{setState(null);setPrompt('');setConsent(false);pending.current=null;if(user?.id)void load()},[user?.id])
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview])
 async function create(){
  if(lock.current||busy||!consent||!state?.[kind]||prompt.trim().length<5)return
  const fingerprint=JSON.stringify({kind,prompt:prompt.trim(),preset,size})
  if(pending.current&&pending.current.fingerprint!==fingerprint){setNotice('An earlier request is unconfirmed. Refresh its records before starting a different production.');return}
  if(!window.confirm('Generate '+kind+' through the configured provider for '+state.costs[kind]+' Flame units? Only this brief is sent.'))return
  pending.current ||= {id:crypto.randomUUID(),fingerprint}
  lock.current=true;setBusy(true);setNotice('')
  try{
   const r=await fetch('/api/image-workshop/production',{method:'POST',headers:headers(),body:JSON.stringify({kind,prompt,preset,size,allowProvider:true,requestId:pending.current.id})})
   const b=await r.json()
   if(!r.ok){setNotice(b.error||'Production was not confirmed.');await load();return}
   pending.current=null;setConsent(false);setNotice('Production saved to your private workshop.');await load()
  }catch{setNotice('Connection interrupted. Refresh the job record before retrying the same request.')}
  finally{lock.current=false;setBusy(false);notifyFlameUsage()}
 }
 async function view(asset:string,download=false){
  try{
   const r=await fetch(`/api/image-workshop/assets/${encodeURIComponent(asset)}`,{headers:headers(),cache:'no-store'})
   if(!r.ok)throw Error('Private image unavailable.')
   const url=URL.createObjectURL(await r.blob())
   if(download){const a=document.createElement('a');a.href=url;a.download='weave-'+asset.slice(0,8)+'.png';a.click();window.setTimeout(()=>URL.revokeObjectURL(url),15000)}
   else{setPreview(url);setPreviewAsset(asset)}
  }catch(e){setNotice(e instanceof Error?e.message:'Image unavailable.')}
 }
 if(!user)return <main className="p-6 text-white">Sign in to open Creative Production.</main>
 return <main className="mx-auto max-w-5xl space-y-5 px-4 py-7 text-white">
  <Link href="/image-workshop" className="text-cyan-200 underline">Return to Image House</Link>
  <header className="rounded-2xl border border-amber-300/25 bg-slate-900 p-5">
   <p className="text-xs font-bold uppercase tracking-widest text-amber-200">WEAVE · Flame production</p>
   <h1 className="mt-2 text-3xl font-bold">Creative Production</h1>
   <p className="mt-2 text-sm text-slate-300">Generate original artwork, photographic concepts, posters, illustrations, product visuals and written content from your brief. Provider-assisted production is separate from Weave's offline Image House. Nothing is published automatically.</p>
  </header>
  <FlameSubscriptionPanel/>
  <div className="space-y-4 rounded-2xl border border-white/15 p-4">
   <div className="flex gap-2">{(['image','text'] as const).map(k=><button key={k} disabled={busy} onClick={()=>{setKind(k);setConsent(false)}} className={'rounded-xl border px-4 py-2 '+(kind===k?'border-amber-300 text-amber-200':'border-white/15')}>{k==='image'?'Image generation':'Written content'}</button>)}</div>
   <label className="block text-sm">Describe your production<textarea className={field} rows={6} maxLength={4000} value={prompt} disabled={busy} onChange={e=>{setPrompt(e.target.value);setConsent(false)}} placeholder="Subject, purpose, visual detail, audience, tone or exact text…"/></label>
   {kind==='image'&&<div className="grid gap-3 sm:grid-cols-2"><label>Visual style<select className={field} value={preset} onChange={e=>{setPreset(e.target.value);setConsent(false)}} disabled={busy}>{(state?.presets||['cinematic']).map(p=><option key={p}>{p}</option>)}</select></label><label>Image format<select className={field} value={size} onChange={e=>{setSize(e.target.value);setConsent(false)}} disabled={busy}>{(state?.sizes||['1024x1024']).map(s=><option key={s}>{s}</option>)}</select></label></div>}
   <p className="text-sm text-amber-200">{state?.[kind]?'Cost: '+state.costs[kind]+' Flame usage units per successful production.':'Engine not enabled by Administrations. Offline Image House remains available.'}</p>
   <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/>I authorize this brief to be processed by the configured external creative provider. I have rights to the material and will not include confidential information.</label>
   <button disabled={busy||!consent||!state?.[kind]||prompt.trim().length<5} onClick={()=>void create()} className="rounded-xl bg-amber-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">{busy?'Producing…':'Generate '+kind}</button>
   <button disabled={busy} onClick={()=>void load()} className="ml-3 text-sm underline">Refresh records</button>
   {pending.current&&!busy&&state?.jobs.some(j=>j.id===pending.current?.id&&j.status!=='running')&&<button onClick={()=>{pending.current=null;setNotice('Previous record reviewed. You may start a new request.')}} className="block text-sm text-cyan-200 underline">Acknowledge previous job</button>}
   {notice&&<p role="status" className="text-sm">{notice}</p>}
  </div>
  {preview&&<section className="rounded-xl border border-white/15 p-3"><img src={preview} alt="Your generated artwork" className="max-h-[70vh] w-full object-contain"/><button className="mt-2 underline" onClick={()=>void view(previewAsset,true)}>Download image</button></section>}
  <section className="space-y-3"><h2 className="text-xl font-bold">Your productions</h2>{state?.jobs.map(j=><article key={j.id} className="space-y-2 rounded-xl border border-white/15 p-4"><p className="text-xs uppercase text-amber-200">{j.kind} · {j.status}</p><p className="whitespace-pre-wrap break-words text-sm text-slate-300">{j.prompt}</p>{j.content&&<><p className="whitespace-pre-wrap break-words">{j.content}</p><button className="text-cyan-200 underline" onClick={()=>void navigator.clipboard.writeText(j.content||'').then(()=>setNotice('Content copied.'),()=>setNotice('Copy unavailable.'))}>Copy content</button></>}{j.asset_id&&<div className="flex gap-4"><button className="text-cyan-200 underline" onClick={()=>void view(j.asset_id!)}>View image</button><button className="text-cyan-200 underline" onClick={()=>void view(j.asset_id!,true)}>Download PNG</button></div>}</article>)}</section>
 </main>
}
