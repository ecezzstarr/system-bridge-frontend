'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
type Farm={id:string;farm_name:string;contact_private:string;state:string;community:string;status:string;review_note?:string|null;created_at:string}
type Order={id:string;status:string;quantity:string;produce:string;unit:string;farm_name:string;origin_state:string;destination_state:string;destination_area:string;food_subtotal_ngn:string;delivery_quote_ngn:string|null}
export default function AdministrationFoodBridge(){
  const {user,token,isInitialized}=useAuth()
  const [farmers,setFarmers]=useState<Farm[]>([])
  const [orders,setOrders]=useState<Order[]>([])
  const [notes,setNotes]=useState<Record<string,string>>({})
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const load=useCallback(async()=>{
    if(user?.role!=='admin'||!token)return
    try{
      const response=await fetch('/api/admin/flame-food',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Unable to open food verification queue')
      setFarmers(data.farmers||[]);setOrders(data.orders||[]);setError('')
    }catch(e){setError(e instanceof Error?e.message:'Unable to load food verification')}
  },[user?.role,token])
  useEffect(()=>{void load()},[load])
  async function review(id:string,decision:'approved'|'rejected'){
    if(!token)return
    setBusy(true)
    try{
      const response=await fetch('/api/admin/flame-food',{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({farmerId:id,decision,reviewNote:notes[id]||''})})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Verification failed')
      await load()
    }catch(e){setError(e instanceof Error?e.message:'Verification failed')}finally{setBusy(false)}
  }
  if(!isInitialized)return <main className="p-8 text-white">Opening Food Bridge verification…</main>
  if(user?.role!=='admin')return <main className="p-8 text-white">Administration required</main>
  return <main className="mx-auto max-w-6xl space-y-6 p-5 pb-16 text-white" data-food-admin-review>
    <header className="border-b border-amber-300/20 pb-6">
      <p className="flex items-center gap-2 text-xs text-amber-200"><ShieldCheck className="h-4 w-4"/> Administration · Flame Event</p>
      <h1 className="mt-3 text-3xl font-black">Farmer Supply Verification</h1>
      <p className="mt-2 text-xs leading-6 text-stone-400">Agent farms require independent supplier review before their stock enters Lifestyle. Audit pending farms and see movement from origin state to receiving household. Never publish private contact data.</p>
      <div className="mt-4 flex flex-wrap gap-4"><Link href="/admin/flame-event" className="text-xs text-sky-200">Flame Event Command</Link><button onClick={()=>void load()} className="flex items-center gap-2 text-xs text-emerald-200"><RefreshCw className="h-4 w-4"/> Refresh</button></div>
    </header>
    {error&&<p role="alert" className="text-xs text-rose-200">{error}</p>}
    <section><h2 className="text-xl font-black">Farmers awaiting verification ({farmers.filter(f=>f.status==='pending').length})</h2>
      <div className="mt-4 space-y-3">{farmers.filter(f=>f.status==='pending').map(f=><article key={f.id} className="border border-white/10 p-5">
        <h3 className="font-black">{f.farm_name} · {f.community}, {f.state}</h3>
        <p className="mt-1 text-xs text-stone-400">Supplier contact (private): {f.contact_private}</p>
        <label className="mt-4 block text-xs">Verification evidence and decision reason
          <textarea rows={2} minLength={15} maxLength={2000} value={notes[f.id]||''} onChange={e=>setNotes(s=>({...s,[f.id]:e.target.value}))}
            className="mt-2 w-full border border-white/15 bg-slate-950 p-3 text-white"/>
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={busy||(notes[f.id]||'').trim().length<15} onClick={()=>void review(f.id,'approved')} className="border border-emerald-300/30 px-4 py-2 text-xs text-emerald-200 disabled:opacity-40">Approve verified farmer</button>
          <button disabled={busy||(notes[f.id]||'').trim().length<15} onClick={()=>void review(f.id,'rejected')} className="border border-rose-300/30 px-4 py-2 text-xs text-rose-200 disabled:opacity-40">Reject unverified farmer</button>
        </div>
      </article>)}
      {!farmers.some(f=>f.status==='pending')&&<p className="text-xs text-stone-500">No farmer waiting for review.</p>}
      </div>
    </section>
    <section className="border-t border-white/10 pt-6"><h2 className="text-xl font-black">Cross-state trade current</h2>
      <p className="mt-2 text-xs text-stone-400">Real system orders only; no unverified activity is counted as delivered.</p>
      <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
        {orders.map(o=><div key={o.id} className="flex flex-wrap justify-between gap-3 py-4 text-xs">
          <span>{o.produce} · {o.quantity} {o.unit} · {o.origin_state} → {o.destination_area}, {o.destination_state}</span>
          <span className={o.status==='delivered'?'text-emerald-200':'text-stone-400'}>{o.status.replaceAll('_',' ')}</span>
        </div>)}
        {!orders.length&&<p className="py-6 text-xs text-stone-500">No trades have been requested yet.</p>}
      </div>
    </section>
    <section className="border-t border-white/10 pt-5">
      <p className="text-xs text-stone-400">Approved farms: {farmers.filter(f=>f.status==='approved').length} · Rejected applications: {farmers.filter(f=>f.status==='rejected').length}</p>
    </section>
  </main>
}
