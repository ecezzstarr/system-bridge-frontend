'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Clapperboard, Flame, Loader2, RefreshCw, Users } from 'lucide-react'

type Package={packageKey:string;name:string;description:string;durationSeconds:number;priceFlameCoin:number;active:boolean;sortOrder:number}
type Order={id:string;customerName:string;customerEmail:string;userRole:string;packageName:string;durationSeconds:number;priceFlameCoin:number;businessName:string;subject:string;objective:string;audience:string;notes:string;assets:string[];status:string;projectId:string|null;outputUrl:string|null;createdAt:string}

function durationLabel(seconds:number){
  if(seconds<60)return `${seconds}s`
  const m=Math.floor(seconds/60),s=seconds%60
  return s?`${m}m ${s}s`:`${m}m`
}

export function VideoAdStudioCommerce(){
  const [packages,setPackages]=useState<Package[]>([])
  const [orders,setOrders]=useState<Order[]>([])
  const [prices,setPrices]=useState<Record<string,string>>({})
  const [loading,setLoading]=useState(true)
  const [working,setWorking]=useState<string|null>(null)
  const [message,setMessage]=useState<string|null>(null)

  const headers=(json=false):Record<string,string>=>{
    const token=localStorage.getItem('ssb_auth_token')
    return {...(json?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})}
  }

  const load=async()=>{
    setLoading(true)
    try{
      const response=await fetch('/api/admin/video-ad-studio',{headers:headers(),cache:'no-store'})
      const data=await response.json()
      if(!response.ok||!data.success)throw new Error(data.error||'Unable to load Studio orders')
      setPackages(data.packages||[])
      setOrders(data.orders||[])
      setPrices(Object.fromEntries((data.packages||[]).map((pack:Package)=>[pack.packageKey,String(pack.priceFlameCoin)])))
    }catch(error:any){setMessage(error.message||'Unable to load Studio orders')}finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[])

  const savePackage=async(pack:Package,active=pack.active)=>{
    const key=`package-${pack.packageKey}`;setWorking(key);setMessage(null)
    try{
      const response=await fetch('/api/admin/video-ad-studio',{method:'PATCH',headers:headers(true),body:JSON.stringify({type:'package',packageKey:pack.packageKey,priceFlameCoin:Number(prices[pack.packageKey]),active})})
      const data=await response.json();if(!response.ok||!data.success)throw new Error(data.error||'Package update failed')
      setMessage(`${pack.name} pricing updated.`);await load()
    }catch(error:any){setMessage(error.message||'Package update failed')}finally{setWorking(null)}
  }

  const formOrder=async(order:Order)=>{
    setWorking(order.id);setMessage(null)
    try{
      const response=await fetch('/api/admin/video-ad-studio',{method:'POST',headers:headers(true),body:JSON.stringify({action:'form_order',orderId:order.id})})
      const data=await response.json();if(!response.ok||!data.success)throw new Error(data.error||'Could not form production')
      setMessage(`${order.businessName} is now in production. Its storyboard is in the Studio production list below.`)
      await load()
      window.setTimeout(()=>window.location.reload(),400)
    }catch(error:any){setMessage(error.message||'Could not form production')}finally{setWorking(null)}
  }

  const markDelivered=async(order:Order)=>{
    setWorking(order.id);setMessage(null)
    try{
      const response=await fetch('/api/admin/video-ad-studio',{method:'PATCH',headers:headers(true),body:JSON.stringify({type:'order-status',orderId:order.id,status:'delivered'})})
      const data=await response.json();if(!response.ok||!data.success)throw new Error(data.error||'Delivery update failed')
      setMessage(`${order.businessName} marked delivered.`);await load()
    }catch(error:any){setMessage(error.message||'Delivery update failed')}finally{setWorking(null)}
  }

  return <section className="mx-auto mb-6 max-w-7xl space-y-5 border-y border-fuchsia-300/15 bg-black/20 p-5 sm:border sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.26em] text-fuchsia-300">VIDEO AD STUDIO · COMMERCE</p><h2 className="mt-1 text-2xl font-black text-white">PRICES + PAID PRODUCTIONS</h2><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">Agents, Bridgers and Clients buy a production here with Flame Coin. A paid order enters this queue; Administration forms, edits and renders the final video in the production floor below.</p></div><Button variant="outline" onClick={load} disabled={loading} className="border-white/15 text-white"><RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>REFRESH</Button></div>
    {message&&<div className="border border-fuchsia-300/15 bg-fuchsia-300/[0.04] px-4 py-3 text-xs text-fuchsia-100">{message}</div>}

    <div><div className="mb-3 flex items-center gap-2"><Flame className="h-4 w-4 text-orange-300"/><p className="text-xs font-black text-white">PUBLISHED VIDEO PRICES</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{packages.map(pack=><article key={pack.packageKey} className={`border p-4 ${pack.active?'border-white/10 bg-black/20':'border-white/5 bg-black/10 opacity-60'}`}><p className="text-[9px] font-black uppercase tracking-wider text-slate-600">{durationLabel(pack.durationSeconds)}</p><h3 className="mt-1 text-sm font-black text-white">{pack.name}</h3><div className="mt-3 flex items-center gap-2"><Input type="number" min="0" step="1" value={prices[pack.packageKey]??''} onChange={e=>setPrices(current=>({...current,[pack.packageKey]:e.target.value}))} className="h-9 border-white/10 bg-black/30 text-white"/><span className="text-[9px] font-black text-orange-300">FC</span></div><div className="mt-3 flex gap-2"><button onClick={()=>savePackage(pack)} disabled={working===`package-${pack.packageKey}`} className="border border-cyan-300/20 px-2 py-1.5 text-[9px] font-black text-cyan-200">SAVE</button><button onClick={()=>savePackage(pack,!pack.active)} disabled={working===`package-${pack.packageKey}`} className="border border-white/10 px-2 py-1.5 text-[9px] font-black text-slate-400">{pack.active?'PAUSE':'OPEN'}</button></div></article>)}</div></div>

    <div className="border-t border-white/10 pt-5"><div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-cyan-300"/><p className="text-xs font-black text-white">CUSTOMER PRODUCTION QUEUE</p></div>{loading?<Loader2 className="h-5 w-5 animate-spin text-slate-500"/>:orders.length===0?<p className="text-sm text-slate-600">No paid Studio order yet.</p>:<div className="space-y-3">{orders.map(order=><article key={order.id} className="border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-black text-white">{order.businessName}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">{order.customerName} · {order.userRole} · {order.packageName} · {durationLabel(order.durationSeconds)}</p><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">{order.subject}</p><p className="mt-1 text-xs text-slate-500">Objective: {order.objective}</p><p className="mt-1 text-xs text-slate-600">Audience: {order.audience}</p>{order.assets.length>0&&<p className="mt-2 text-[10px] font-black text-cyan-300">{order.assets.length} customer media file{order.assets.length===1?'':'s'} attached</p>}</div><div className="text-right"><p className="text-[9px] font-black uppercase tracking-wider text-fuchsia-200">{order.status.replaceAll('_',' ')}</p><p className="mt-1 text-sm font-black text-orange-300">{order.priceFlameCoin} FC</p></div></div><div className="mt-4 flex flex-wrap gap-2">{order.status==='paid'&&<Button onClick={()=>formOrder(order)} disabled={working===order.id} className="h-9 bg-fuchsia-300 text-xs font-black text-slate-950 hover:bg-fuchsia-200">{working===order.id?<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin"/>:<Clapperboard className="mr-2 h-3.5 w-3.5"/>}FORM PRODUCTION</Button>}{order.status==='ready'&&<Button onClick={()=>markDelivered(order)} disabled={working===order.id} className="h-9 bg-emerald-300 text-xs font-black text-slate-950 hover:bg-emerald-200">MARK DELIVERED</Button>}{order.outputUrl&&<Button asChild variant="outline" className="h-9 border-white/15 text-xs text-white"><a href={order.outputUrl} target="_blank" rel="noreferrer">OPEN VIDEO</a></Button>}</div></article>)}</div>}</div>
  </section>
}
