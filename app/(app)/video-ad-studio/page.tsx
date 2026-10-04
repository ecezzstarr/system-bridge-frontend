'use client'

import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Clapperboard, Flame, Loader2, Play, ReceiptText, Upload } from 'lucide-react'

type Package = { packageKey:string; name:string; description:string; durationSeconds:number; priceFlameCoin:number; active:boolean; sortOrder:number }
type Order = { id:string; packageName:string; durationSeconds:number; priceFlameCoin:number; businessName:string; status:string; outputUrl:string|null; createdAt:string }

function durationLabel(seconds:number){
  if(seconds<60)return `${seconds}s`
  const m=Math.floor(seconds/60),s=seconds%60
  return s?`${m}m ${s}s`:`${m}m`
}

export default function VideoAdStudioPage(){
  const { user }=useAuth()
  const router=useRouter()
  const [packages,setPackages]=useState<Package[]>([])
  const [orders,setOrders]=useState<Order[]>([])
  const [balance,setBalance]=useState(0)
  const [selected,setSelected]=useState<Package|null>(null)
  const [loading,setLoading]=useState(true)
  const [buying,setBuying]=useState(false)
  const [uploading,setUploading]=useState(false)
  const [message,setMessage]=useState<string|null>(null)
  const [assets,setAssets]=useState<string[]>([])
  const [form,setForm]=useState({ businessName:'',subject:'',objective:'',audience:'',notes:'' })

  const token=typeof window!=='undefined'?localStorage.getItem('ssb_auth_token'):null
  const headers=(json=false):Record<string,string>=>({...(json?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})})

  useEffect(()=>{
    if(!user)return
    if(user.role==='admin'){router.replace('/admin/video-ad-workshop');return}
    if(!['agent','bridger','client'].includes(user.role || '')){router.replace('/dashboard')}
  },[user,router])

  const load=async()=>{
    try{
      setLoading(true)
      const response=await fetch('/api/video-ad-studio',{headers:headers(),cache:'no-store'})
      const data=await response.json()
      if(!response.ok||!data.success)throw new Error(data.error||'Unable to load Video Ad Studio')
      setPackages(data.packages||[])
      setOrders(data.orders||[])
      setBalance(Number(data.balanceFlameCoin||0))
    }catch(error:any){setMessage(error.message||'Unable to load Video Ad Studio')}finally{setLoading(false)}
  }

  useEffect(()=>{if(user&&['agent','bridger','client'].includes(user.role || ''))void load()},[user?.role])

  const canBuy=useMemo(()=>Boolean(selected&&form.businessName.trim()&&form.subject.trim()&&form.objective.trim()&&form.audience.trim()),[selected,form])

  const uploadAsset=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0]
    if(!file)return
    setUploading(true);setMessage(null)
    try{
      const body=new FormData();body.append('file',file)
      const response=await fetch('/api/video-ad-studio/upload',{method:'POST',headers:headers(),body})
      const data=await response.json()
      if(!response.ok||!data.success)throw new Error(data.error||'Upload failed')
      setAssets(current=>[...current,data.url].slice(0,12))
      setMessage('Business media added to this video brief.')
    }catch(error:any){setMessage(error.message||'Upload failed')}finally{setUploading(false);event.target.value=''}
  }

  const purchase=async()=>{
    if(!selected||!canBuy)return
    setBuying(true);setMessage(null)
    try{
      const response=await fetch('/api/video-ad-studio',{method:'POST',headers:headers(true),body:JSON.stringify({packageKey:selected.packageKey,...form,assets})})
      const data=await response.json()
      if(!response.ok||!data.success)throw new Error(data.error||'Video order could not be created')
      setMessage(`Paid. ${selected.name} entered the Studio queue. Receipt ${data.receiptNumber}.`)
      setBalance(Number(data.balanceFlameCoin||0))
      setSelected(null);setAssets([]);setForm({businessName:'',subject:'',objective:'',audience:'',notes:''})
      await load()
    }catch(error:any){setMessage(error.message||'Video order could not be created')}finally{setBuying(false)}
  }

  if(!user||!['agent','bridger','client'].includes(user.role || ''))return null

  return <main className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="overflow-hidden rounded-3xl border border-fuchsia-300/15 bg-[radial-gradient(circle_at_15%_0%,rgba(217,70,239,.15),transparent_34%),linear-gradient(140deg,#090b12,#05070c)] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5"><div><div className="inline-flex items-center gap-2 border border-fuchsia-300/15 bg-fuchsia-300/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-200"><Clapperboard className="h-3.5 w-3.5"/>WEAVE VIDEO AD STUDIO</div><h1 className="mt-4 text-3xl font-black text-white sm:text-5xl">YOUR BUSINESS. ONE VIDEO THAT CARRIES IT.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Choose the production length, tell the Studio what the business is trying to achieve, attach any real business media you want carried, and pay with Flame Coin. Administration produces and returns the finished video here.</p></div><div className="border border-white/10 bg-black/20 px-5 py-4 text-right"><p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">Available balance</p><p className="mt-1 text-2xl font-black text-white">{balance.toLocaleString(undefined,{maximumFractionDigits:8})}</p><p className="text-[10px] font-black text-orange-300">FLAME COIN</p></div></div>
    </section>

    {message&&<div className="border-y border-fuchsia-300/15 bg-fuchsia-300/[0.04] px-4 py-3 text-sm text-fuchsia-100 sm:border">{message}</div>}

    <section className="space-y-4"><div><p className="text-[9px] font-black uppercase tracking-[0.25em] text-fuchsia-300">Choose production</p><h2 className="mt-1 text-2xl font-black text-white">VIDEO CONTENT PRICES</h2></div>{loading?<Loader2 className="h-5 w-5 animate-spin text-slate-500"/>:<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{packages.map(pack=><button key={pack.packageKey} onClick={()=>setSelected(pack)} className={`min-h-48 border p-5 text-left transition ${selected?.packageKey===pack.packageKey?'border-fuchsia-300/60 bg-fuchsia-300/[0.08]':'border-white/10 bg-black/20 hover:border-white/20'}`}><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">{durationLabel(pack.durationSeconds)}</p><h3 className="mt-2 text-lg font-black text-white">{pack.name}</h3><p className="mt-2 min-h-16 text-xs leading-5 text-slate-500">{pack.description}</p><div className="mt-4 flex items-end gap-2"><Flame className="mb-1 h-4 w-4 text-orange-300"/><p className="text-3xl font-black text-white">{pack.priceFlameCoin}</p><p className="mb-1 text-[9px] font-black text-orange-300">FLAME COIN</p></div></button>)}</div>}</section>

    {selected&&<section className="grid gap-6 border-y border-white/10 bg-black/15 p-5 sm:border sm:p-6 xl:grid-cols-[1.1fr_.9fr]"><div className="space-y-4"><div><p className="text-[9px] font-black uppercase tracking-[0.24em] text-fuchsia-300">{selected.name} · {durationLabel(selected.durationSeconds)}</p><h2 className="mt-1 text-xl font-black text-white">WHAT SHOULD THIS VIDEO CARRY?</h2></div><Input value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})} placeholder="Business / platform name" className="border-white/10 bg-black/30 text-white"/><textarea rows={3} value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="What is the business, product, service or movement this video is about?" className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"/><textarea rows={3} value={form.objective} onChange={e=>setForm({...form,objective:e.target.value})} placeholder="What should people understand or do after watching?" className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"/><Input value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})} placeholder="Who is this video speaking to?" className="border-white/10 bg-black/30 text-white"/><textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Any extra direction for the Studio" className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"/></div><div className="flex flex-col justify-between border border-white/10 bg-black/20 p-5"><div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-600">Business media</p><p className="mt-2 text-xs leading-5 text-slate-500">Optional: logo, product images, screenshots or existing clips. The Studio can build the production around what you provide.</p><label className="mt-4 inline-flex cursor-pointer items-center border border-cyan-300/20 bg-cyan-300/[0.04] px-3 py-2 text-[10px] font-black text-cyan-200"><Upload className="mr-2 h-3.5 w-3.5"/>{uploading?'UPLOADING…':'ADD BUSINESS MEDIA'}<input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden" onChange={uploadAsset} disabled={uploading}/></label><p className="mt-3 text-[10px] text-slate-600">{assets.length} / 12 files attached</p></div><div className="mt-8 border-t border-white/10 pt-5"><div className="flex items-center justify-between"><p className="text-xs font-black text-white">TOTAL</p><p className="text-xl font-black text-white">{selected.priceFlameCoin} <span className="text-[10px] text-orange-300">FLAME COIN</span></p></div><Button onClick={purchase} disabled={!canBuy||buying||uploading} className="mt-4 w-full bg-fuchsia-300 font-black text-slate-950 hover:bg-fuchsia-200">{buying?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Clapperboard className="mr-2 h-4 w-4"/>}{buying?'PAYING…':'PAY & ENTER STUDIO'}</Button></div></div></section>}

    <section className="border-y border-white/10 bg-black/15 p-5 sm:border sm:p-6"><div className="flex items-center gap-3"><ReceiptText className="h-5 w-5 text-cyan-300"/><div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-600">Your productions</p><h2 className="text-xl font-black text-white">STUDIO ORDERS</h2></div></div>{orders.length===0?<p className="mt-5 text-sm text-slate-600">No Video Ad Studio order yet.</p>:<div className="mt-4 divide-y divide-white/10">{orders.map(order=><article key={order.id} className="py-4"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><p className="text-sm font-black text-white">{order.businessName} · {order.packageName}</p>{order.status==='ready'||order.status==='delivered'?<CheckCircle2 className="h-4 w-4 text-emerald-300"/>:null}</div><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">{durationLabel(order.durationSeconds)} · {order.status.replaceAll('_',' ')} · {new Date(order.createdAt).toLocaleString()}</p></div><p className="text-sm font-black text-orange-300">{order.priceFlameCoin} Flame Coin</p></div>{order.outputUrl&&<div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]"><video src={order.outputUrl} controls className="aspect-[9/16] w-full bg-black object-contain"/><div className="flex items-center"><Button asChild variant="outline" className="border-white/15 text-white"><a href={order.outputUrl} target="_blank" rel="noreferrer"><Play className="mr-2 h-4 w-4"/>OPEN FINISHED VIDEO</a></Button></div></div>}</article>)}</div>}</section>
  </main>
}
