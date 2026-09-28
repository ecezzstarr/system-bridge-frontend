'use client'
import { useEffect,useState } from 'react'
import Link from 'next/link'
import { Radio,Users,Zap,ArrowRight } from 'lucide-react'
import { getAuthHeaders } from '@/lib/auth-client'

export default function StabilitySupplyDistrict(){
 const [data,setData]=useState<any>({numbers:[],prospects:[]})
 const [error,setError]=useState('')
 useEffect(()=>{const c=new AbortController();fetch('/api/agent/stability-supply',{headers:getAuthHeaders(),signal:c.signal}).then(r=>r.json().then(d=>({ok:r.ok,d}))).then(({ok,d})=>{if(ok)setData(d);else setError(d.error||'Supply unavailable')}).catch(e=>{if(e.name!=='AbortError')setError('Supply unavailable')});return()=>c.abort()},[])
 return <section className="relative min-h-[calc(100dvh-3.8rem)] overflow-hidden bg-[#02080e] px-4 pb-20 pt-24 text-white" data-stability-commercial-district="true">
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(34,211,238,.12),transparent_28%),radial-gradient(circle_at_70%_70%,rgba(245,158,11,.08),transparent_30%)]"/>
  <div className="relative mx-auto max-w-6xl">
   <p className="text-[9px] font-black uppercase tracking-[.24em] text-cyan-300">Stability · Commercial District</p>
   <h1 className="mt-2 text-3xl font-black sm:text-5xl">Company supply moves through Agents.</h1>
   <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Administration publishes supply. Stability Agents organize and sell it. Bridgers purchase through their own Hope stations; role authority remains separate.</p>
   {error&&<p className="mt-5 border-l-2 border-rose-300/50 pl-3 text-xs text-rose-200">{error}</p>}
   <div className="mt-10 grid gap-10 lg:grid-cols-2">
    <div data-stability-station="number-supply"><div className="flex items-center gap-3"><Radio className="h-5 w-5 text-cyan-300"/><h2 className="text-xl font-black">Number Supply</h2></div><p className="mt-2 text-xs text-slate-500">Published worldwide Number Bay supply available for Bridger participation.</p><div className="mt-5 space-y-3">{data.numbers.map((n:any)=><div key={n.country} className="border-l border-cyan-200/20 pl-4"><div className="flex justify-between gap-4"><span className="font-bold">{n.country}</span><span className="text-cyan-200">{Number(n.price_flame_coin).toLocaleString()} Flame Coin</span></div><p className="mt-1 text-[10px] text-slate-500">{n.stock_count>0?`${n.stock_count} ready now`:`Administration delivery · ${n.delivery_minutes||30} min`}</p></div>)}</div></div>
    <div data-stability-station="prospect-campaigns"><div className="flex items-center gap-3"><Zap className="h-5 w-5 text-amber-300"/><h2 className="text-xl font-black">Prospect Campaign Ground</h2></div><p className="mt-2 text-xs text-slate-500">Published prospect movement visible to Stability. Bridgers remain the authorized buyers.</p><div className="mt-5 space-y-3">{data.prospects.map((p:any)=><div key={p.id} className="border-l border-amber-200/20 pl-4"><div className="flex justify-between gap-4"><span className="font-bold">{p.title}</span><span className="text-amber-200">{Number(p.price_trx).toLocaleString()} Flame Coin</span></div><p className="mt-1 line-clamp-2 text-[10px] text-slate-500">{p.description}</p></div>)}</div></div>
   </div>
   <div className="mt-12 flex flex-wrap gap-5 text-xs font-bold"><Link href="/agent/bridgers" className="flex items-center gap-2 text-cyan-200"><Users className="h-4 w-4"/>Participation Field<ArrowRight className="h-3 w-3"/></Link><Link href="/agent/commissions" className="flex items-center gap-2 text-emerald-200">Continuance<ArrowRight className="h-3 w-3"/></Link></div>
  </div>
 </section>
}
