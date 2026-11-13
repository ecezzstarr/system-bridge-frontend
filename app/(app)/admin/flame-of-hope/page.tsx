'use client'
import { useEffect,useState } from 'react'
import Link from 'next/link'
import { getAuthHeaders } from '@/lib/auth-client'
import { useAuth } from '@/lib/auth-provider'
type Claim={id:string;bridger_name:string;bridger_email:string;product_id:string;actual_spend_system_switch:string;required_spend_system_switch:string;fulfillment_status:string;fulfillment_reference:string|null;week_start:string;claimed_at:string}
const food=(value:string)=>value==='electrolyte'?'Electrolyte · Small Bowl':'Ember · Small Box'
export default function AdminFlameOfHope(){
  const {user,isInitialized}=useAuth()
  const [claims,setClaims]=useState<Claim[]>([])
  const [refs,setRefs]=useState<Record<string,string>>({})
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  const [working,setWorking]=useState('')
  async function load(){
    setLoading(true);setError('')
    try {
      const response=await fetch('/api/admin/flame-of-hope',{headers:getAuthHeaders(),cache:'no-store'})
      const data=await response.json().catch(()=>({}))
      if(!response.ok||!data.success)throw Error(data.error||'Unable to load reward claims')
      setClaims(data.claims||[])
    }catch(e){setError(e instanceof Error?e.message:'Unable to load reward claims')}
    finally{setLoading(false)}
  }
  useEffect(()=>{if(isInitialized&&user?.role==='admin')void load()},[isInitialized,user?.role])
  async function change(c:Claim,status:'preparing'|'fulfilled'){
    setWorking(c.id);setError('')
    try{
      const response=await fetch('/api/admin/flame-of-hope',{method:'POST',headers:getAuthHeaders(),body:JSON.stringify({claimId:c.id,status,fulfillmentReference:refs[c.id]||''})})
      const data=await response.json().catch(()=>({}))
      if(!response.ok||!data.success)throw Error(data.error||'Unable to record fulfilment')
      await load()
    }catch(e){setError(e instanceof Error?e.message:'Unable to record fulfilment')}
    finally{setWorking('')}
  }
  if(!isInitialized)return null
  if(user?.role!=='admin')return <main className="p-6">Administrations only.</main>
  return <main className="mx-auto max-w-5xl px-4 py-8 text-white">
    <Link href="/admin/dashboard" className="text-sm text-amber-200">Administrations · A Time</Link>
    <h1 className="mt-4 text-3xl font-black">Flame of Hope · Food Fulfilment</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Bridgers unlock one Electrolyte or Ember reward after spending at least five times the official food retail value in qualified System Switch services during a Nigeria-time calendar week. Claiming does not prove physical delivery. Arrange stock, a real contact and collection or shipping before marking fulfilled.</p>
    <button type="button" onClick={()=>void load()} className="mt-5 min-h-11 rounded-xl border border-white/20 px-4 text-sm font-bold">Refresh claims</button>
    {loading&&<p className="mt-4 text-sm text-slate-400">Loading reward records...</p>}
    {error&&<p className="mt-4 text-sm text-red-300" role="alert">{error}</p>}
    <div className="mt-5 grid gap-4">{claims.map(c=><section key={c.id} className="rounded-2xl border border-amber-300/20 bg-[#121923] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">{c.bridger_name} · {food(c.product_id)}</h2>
          <p className="mt-1 text-xs text-slate-300">{c.bridger_email} · Week starting {c.week_start}</p>
          <p className="mt-2 text-xs text-slate-300">Spent {c.actual_spend_system_switch} System Switch · Required {c.required_spend_system_switch} System Switch</p>
        </div>
        <span className="rounded-full border border-amber-200/25 px-3 py-1 text-xs text-amber-200">{c.fulfillment_status.replaceAll('_',' ')}</span>
      </div>
      <p className="mt-3 break-all text-xs text-slate-400">Claim ID: {c.id}</p>
      {c.fulfillment_status==='pending_fulfillment'&&<button disabled={!!working} onClick={()=>void change(c,'preparing')} className="mt-4 min-h-11 rounded-xl bg-amber-300 px-4 font-bold text-stone-950 disabled:opacity-50">Confirm preparation started</button>}
      {c.fulfillment_status==='preparing'&&<div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input aria-label={'Delivery or collection reference for '+c.bridger_name} placeholder="Actual handoff evidence/reference" className="min-h-11 flex-1 rounded-xl border border-white/20 bg-black/30 px-3 text-white" value={refs[c.id]||''} onChange={e=>setRefs(p=>({...p,[c.id]:e.target.value}))}/>
        <button disabled={!!working} onClick={()=>void change(c,'fulfilled')} className="min-h-11 rounded-xl bg-emerald-300 px-4 font-bold text-stone-950 disabled:opacity-50">Record fulfilled handoff</button>
      </div>}
      {c.fulfillment_status==='fulfilled'&&<p className="mt-3 text-xs text-emerald-200">Recorded handoff: {c.fulfillment_reference}</p>}
    </section>)}</div>
    {!loading&&!claims.length&&<p className="mt-5 text-sm text-slate-400">No recorded Flame of Hope food claims.</p>}
  </main>
}
