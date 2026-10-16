'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock3, CreditCard, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type PaymentOrder={
  id:string
  agent_id:string
  agent_name:string
  agent_email?:string|null
  variant_id:string
  quantity_packages:number
  total_ngn:number|string
  customer_name:string
  customer_phone:string
  delivery_location:string
  customer_note?:string|null
  status:string
  payment_method:string
  payment_account_number:string
  payment_reference?:string|null
  opay_transaction_reference?:string|null
  payment_status:string
  payment_proof_submitted_at?:string|null
  payment_verified_at?:string|null
  payment_rejected_at?:string|null
  payment_admin_note?:string|null
  created_at:string
}

const money=(value:number|string)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value||0))
const productName=(id:string)=>id==='electrolyte'?'Electrolyte':id==='classic'?'Agility':`Agility · ${id}`

export default function AdminCarrierFoodPaymentsPage(){
  const {user,token}=useAuth()
  const router=useRouter()
  const [orders,setOrders]=useState<PaymentOrder[]>([])
  const [notes,setNotes]=useState<Record<string,string>>({})
  const [loading,setLoading]=useState(true)
  const [moving,setMoving]=useState<string|null>(null)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')

  const load=async()=>{
    if(!token)return
    setLoading(true);setError('')
    try{
      const response=await fetch('/api/admin/carrier-food-payments',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'Unable to load Carrier food payments')
      setOrders(body.orders||[])
    }catch(err){setError(err instanceof Error?err.message:'Unable to load Carrier food payments')}
    finally{setLoading(false)}
  }

  useEffect(()=>{
    if(user&&user.role!=='admin'){router.replace('/dashboard');return}
    if(user?.role==='admin'&&token)void load()
  },[user?.role,token])

  const summary=useMemo(()=>({
    waiting:orders.filter(order=>order.payment_status==='proof_submitted').length,
    paid:orders.filter(order=>order.payment_status==='paid').length,
    rejected:orders.filter(order=>order.payment_status==='rejected').length,
    waitingValue:orders.filter(order=>order.payment_status==='proof_submitted').reduce((sum,order)=>sum+Number(order.total_ngn||0),0),
  }),[orders])

  const decide=async(order:PaymentOrder,action:'approve'|'reject')=>{
    if(!token)return
    setMoving(order.id);setMessage('');setError('')
    try{
      const response=await fetch('/api/admin/carrier-food-payments',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({orderId:order.id,action,adminNote:notes[order.id]||''}),
      })
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'Unable to verify Carrier payment')
      setMessage(body.message||`Carrier payment ${action}d.`)
      await load()
    }catch(err){setError(err instanceof Error?err.message:'Unable to verify Carrier payment')}
    finally{setMoving(null)}
  }

  if(!user||user.role!=='admin')return null

  return <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 text-white md:px-7 md:py-12">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-amber-300/15 pb-7">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[.26em] text-amber-300">Administration · Carrier payments</p>
        <h1 className="mt-2 text-3xl font-black sm:text-5xl">FOOD PAYMENT VERIFICATION</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Customers pay WEAVE before their Agility or Electrolyte order is released to the Agent. Compare the exact amount and OPay transaction reference, then approve or reject the payment.</p>
      </div>
      <Button onClick={()=>void load()} variant="outline" className="border-white/15 text-white"><RefreshCw className="mr-2 h-4 w-4"/>REFRESH</Button>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="border border-amber-300/20 bg-amber-300/[.035] p-4"><Clock3 className="h-5 w-5 text-amber-300"/><p className="mt-3 text-2xl font-black">{summary.waiting}</p><p className="text-[9px] uppercase tracking-wider text-slate-500">Proofs waiting</p></div>
      <div className="border border-white/10 bg-white/[.025] p-4"><CreditCard className="h-5 w-5 text-sky-300"/><p className="mt-3 text-xl font-black">{money(summary.waitingValue)}</p><p className="text-[9px] uppercase tracking-wider text-slate-500">Waiting value</p></div>
      <div className="border border-emerald-300/20 bg-emerald-300/[.035] p-4"><CheckCircle2 className="h-5 w-5 text-emerald-300"/><p className="mt-3 text-2xl font-black">{summary.paid}</p><p className="text-[9px] uppercase tracking-wider text-slate-500">Verified paid</p></div>
      <div className="border border-red-300/20 bg-red-300/[.025] p-4"><XCircle className="h-5 w-5 text-red-300"/><p className="mt-3 text-2xl font-black">{summary.rejected}</p><p className="text-[9px] uppercase tracking-wider text-slate-500">Rejected</p></div>
    </section>

    {message&&<div className="border border-emerald-300/20 bg-emerald-300/[.05] p-3 text-sm text-emerald-100">{message}</div>}
    {error&&<div className="border border-red-300/20 bg-red-300/[.05] p-3 text-sm text-red-200">{error}</div>}

    {loading?<div className="flex min-h-72 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-amber-300"/></div>:<div className="space-y-4">
      {orders.map(order=>{
        const waiting=order.payment_status==='proof_submitted'
        return <article key={order.id} className={`border p-5 ${waiting?'border-amber-300/25 bg-amber-300/[.035]':'border-white/10 bg-black/15'}`}>
          <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{productName(order.variant_id)} · {order.quantity_packages} pack{Number(order.quantity_packages)===1?'':'s'}</h2><span className={`px-2 py-1 text-[8px] font-black uppercase ${order.payment_status==='paid'?'bg-emerald-300/10 text-emerald-300':order.payment_status==='rejected'?'bg-red-300/10 text-red-300':'bg-amber-300/10 text-amber-300'}`}>{order.payment_status.replaceAll('_',' ')}</span></div>
              <p className="mt-2 text-sm text-slate-300">Customer · <strong className="text-white">{order.customer_name}</strong> · {order.customer_phone}</p>
              <p className="mt-1 text-xs text-slate-500">Delivery / pickup · {order.delivery_location}</p>
              <p className="mt-3 text-sm text-slate-300">Agent · <strong className="text-white">{order.agent_name}</strong>{order.agent_email?` · ${order.agent_email}`:''}</p>
              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div className="border border-white/10 bg-black/20 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-600">WEAVE payment reference</p><p className="mt-1 break-all font-bold text-white">{order.payment_reference||'—'}</p></div>
                <div className="border border-white/10 bg-black/20 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-600">Customer OPay reference</p><p className="mt-1 break-all font-bold text-white">{order.opay_transaction_reference||'—'}</p></div>
              </div>
              {order.customer_note&&<p className="mt-3 text-xs text-slate-500">Customer note · {order.customer_note}</p>}
              {waiting&&<div className="mt-4"><Input value={notes[order.id]||''} onChange={e=>setNotes(current=>({...current,[order.id]:e.target.value}))} placeholder="Administration note · optional" className="border-white/10 bg-black/25 text-white"/></div>}
              {!waiting&&order.payment_admin_note&&<p className="mt-3 text-xs text-slate-500">Administration note · {order.payment_admin_note}</p>}
            </div>
            <div className="border-l-0 border-white/10 lg:border-l lg:pl-5">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">Exact amount expected</p>
              <p className="mt-1 text-3xl font-black">{money(order.total_ngn)}</p>
              <p className="mt-3 text-xs text-slate-500">Rail · {order.payment_method} · {order.payment_account_number}</p>
              <p className="mt-2 text-xs text-slate-600">Submitted · {order.payment_proof_submitted_at?new Date(order.payment_proof_submitted_at).toLocaleString():'—'}</p>
              {waiting&&<div className="mt-5 grid gap-2"><Button onClick={()=>void decide(order,'approve')} disabled={moving===order.id} className="bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200"><CheckCircle2 className="mr-2 h-4 w-4"/>VERIFY PAID</Button><Button onClick={()=>void decide(order,'reject')} disabled={moving===order.id} variant="outline" className="border-red-300/25 text-red-200"><XCircle className="mr-2 h-4 w-4"/>REJECT PROOF</Button></div>}
            </div>
          </div>
        </article>
      })}
      {!orders.length&&<div className="border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">No Carrier food payments yet.</div>}
    </div>}
  </main>
}
