'use client'

import { useMemo, useState } from 'react'
import { Copy, ExternalLink, Plus, Store, TimerReset } from 'lucide-react'
import { getClientToken } from '@/lib/client-auth'

export default function ClientCustomerDoorPanel({ initialStore }: { initialStore?: any | null }) {
  const [data,setData]=useState<any>({
    store: initialStore || null,
    items: initialStore?.items || [],
    orders: initialStore?.orders || [],
  })
  const [form,setForm]=useState({name:'',description:'',price:'',currency:'NGN',offer_type:'product'})
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  const publicUrl=data.store?.public_url || (data.store?.public_slug ? `/store/${data.store.public_slug}` : null)
  const dueText=useMemo(()=>{
    if(!data.store?.formation_due_at) return 'First days'
    const ms=new Date(data.store.formation_due_at).getTime()-Date.now()
    if(ms<=0) return 'Formation window reached'
    const hours=Math.ceil(ms/3600000)
    return hours>24?`${Math.ceil(hours/24)} days remaining`:`${hours} hours remaining`
  },[data.store?.formation_due_at])

  const publish=async()=>{
    setBusy(true);setMessage('')
    try{
      const token=getClientToken()
      const response=await fetch('/api/client/business-store',{
        method:'POST',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({...form,price:Number(form.price)}),
      })
      const body=await response.json()
      if(!response.ok) throw new Error(body.error||'Unable to publish offer')
      const store={...body.store,public_url:publicUrl || (body.store?.public_slug?`/store/${body.store.public_slug}`:null)}
      setData({store,items:body.items||[],orders:body.orders||[]})
      setForm({name:'',description:'',price:'',currency:'NGN',offer_type:'product'})
      setMessage('Offer published. Your Customer Door is selling to the public.')
    }catch(error:any){
      setMessage(error?.message||'Unable to publish offer')
    }finally{setBusy(false)}
  }

  return <div className="mt-6 space-y-4">
    <div className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-sky-300">Public Customer Door</p>
          <h4 className="mt-2 text-lg font-semibold">{data.store?.name || 'Your public customer door'}</h4>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">People outside WEAVE can open this page, see your offers and place a purchase/request without creating a WEAVE account.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-right">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">Formation</p>
          <p className="mt-1 text-xs font-bold text-white">{data.store?.formation_status || 'forming'}</p>
          <p className="mt-1 flex items-center justify-end gap-1 text-[9px] text-amber-300"><TimerReset className="h-3 w-3"/>{dueText}</p>
        </div>
      </div>
      {publicUrl&&<div className="mt-4 flex flex-wrap gap-2">
        <button onClick={()=>navigator.clipboard?.writeText(`${window.location.origin}${publicUrl}`)} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] text-slate-300"><Copy className="h-3.5 w-3.5"/>Copy customer link</button>
        <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] text-slate-300"><ExternalLink className="h-3.5 w-3.5"/>Open public door</a>
      </div>}
    </div>

    <div className="rounded-2xl border border-violet-400/15 bg-violet-400/[0.035] p-5">
      <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-violet-300"/><p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-300">Publish an offer</p></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-[10px] text-slate-500">Offer name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="What can customers buy?" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
        <label className="text-[10px] text-slate-500">Offer type<select value={form.offer_type} onChange={e=>setForm({...form,offer_type:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"><option value="product">Product</option><option value="service">Service</option><option value="digital">Digital</option><option value="crypto">Crypto / exchange</option></select></label>
        <label className="text-[10px] text-slate-500">Price<input type="number" min="0" step="any" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
        <label className="text-[10px] text-slate-500">Currency<input value={form.currency} onChange={e=>setForm({...form,currency:e.target.value.toUpperCase()})} placeholder="NGN, USD, USDT…" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
      </div>
      <label className="mt-3 block text-[10px] text-slate-500">What the customer receives<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
      <button onClick={publish} disabled={busy||!form.name.trim()||form.price===''} className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-40"><Store className="h-3.5 w-3.5"/>{busy?'Publishing…':'Publish to customers'}</button>
      {message&&<p className="mt-3 text-xs text-emerald-300">{message}</p>}
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-white/10 p-5">
        <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Public offers</p>
        <p className="mt-2 text-2xl font-semibold">{data.items?.length||0}</p>
        <div className="mt-3 space-y-2">{data.items?.slice(0,5).map((item:any)=><div key={item.id} className="rounded-xl bg-black/30 p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-white">{item.name}</p><p className="text-[10px] text-sky-300">{item.price} {item.currency}</p></div><p className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">{item.offer_type||'product'}</p></div>)}</div>
      </div>
      <div className="rounded-2xl border border-white/10 p-5">
        <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Outsider customer activity</p>
        <p className="mt-2 text-2xl font-semibold">{data.orders?.length||0}</p>
        <div className="mt-3 space-y-2">{data.orders?.slice(0,5).map((order:any)=><div key={order.id} className="rounded-xl bg-black/30 p-3 text-[10px] text-slate-400"><p className="font-semibold text-slate-200">{order.customer_name} · {order.amount} {order.currency}</p><p className="mt-1">Payment: {order.payment_status||'awaiting_payment'} · Order: {order.status}</p></div>)}</div>
      </div>
    </div>
  </div>
}
