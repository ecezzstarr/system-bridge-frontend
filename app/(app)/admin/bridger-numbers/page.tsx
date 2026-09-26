'use client'
import { useEffect,useState } from 'react'
import { getAuthHeaders } from '@/lib/auth-client'
import { Phone,Plus,RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminBridgerNumbersPage(){
 const [numbers,setNumbers]=useState<any[]>([]); const [loading,setLoading]=useState(true)
 const [form,setForm]=useState({phone:'',country:'Nigeria',provider:'',providerReference:'',priceFlameCoin:'',notes:''})
 const load=async()=>{setLoading(true);try{const r=await fetch('/api/admin/bridger-numbers',{headers:getAuthHeaders(),cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);setNumbers(d.numbers||[])}catch(e:any){toast.error(e.message||'Unable to load numbers')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[])
 const add=async(e:React.FormEvent)=>{e.preventDefault();const r=await fetch('/api/admin/bridger-numbers',{method:'POST',headers:getAuthHeaders(),body:JSON.stringify(form)});const d=await r.json();if(!r.ok)return toast.error(d.error||'Unable to add number');toast.success('Number added to Bridger inventory');setForm({...form,phone:'',providerReference:'',notes:''});void load()}
 return <main className="mx-auto max-w-6xl p-4 md:p-7">
  <header className="rounded-[2rem] border border-emerald-300/15 bg-[#03120f]/80 p-6 backdrop-blur-xl"><p className="text-[9px] font-black uppercase tracking-[.24em] text-emerald-300">Administration · Bridger Infrastructure</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-white"><Phone className="h-7 w-7"/>WhatsApp Number Engine</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Place provisioned WhatsApp-capable business numbers into WEAVE inventory, price them in Flame Coin, and track assignment to Bridgers. WEAVE does not store WhatsApp OTPs or account passwords.</p></header>
  <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
   <form onSubmit={add} className="rounded-[1.6rem] border border-white/10 bg-black/30 p-5 space-y-3">
    <h2 className="font-black text-white">Add provisioned number</h2>
    {['phone','country','provider','providerReference','priceFlameCoin','notes'].map(k=><label key={k} className="block"><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{k.replace(/([A-Z])/g,' $1')}</span><input value={(form as any)[k]} onChange={e=>setForm(v=>({...v,[k]:e.target.value}))} placeholder={k==='phone'?'+2348012345678':''} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-sm text-white outline-none"/></label>)}
    <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-black"><Plus className="h-4 w-4"/>Add to inventory</button>
   </form>
   <section className="rounded-[1.6rem] border border-white/10 bg-black/30 p-5"><div className="flex items-center justify-between"><h2 className="font-black text-white">Number inventory</h2><button onClick={()=>void load()} className="text-slate-400"><RefreshCw className="h-4 w-4"/></button></div>
    <div className="mt-4 space-y-2">{loading?<p className="text-sm text-slate-500">Loading…</p>:numbers.length===0?<p className="text-sm text-slate-500">No numbers in inventory.</p>:numbers.map(n=><article key={n.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="flex justify-between gap-3"><div><p className="font-mono text-sm font-bold text-white">{n.phone_e164}</p><p className="mt-1 text-[10px] uppercase text-slate-500">{n.country} · {n.provider||'Provider not recorded'} · {n.status}</p>{n.assigned_name&&<p className="mt-1 text-xs text-emerald-300">Assigned to {n.assigned_name}</p>}</div><p className="font-black text-white">{Number(n.price_flame_coin).toLocaleString()} FC</p></div></article>)}</div>
   </section>
  </div>
 </main>
}