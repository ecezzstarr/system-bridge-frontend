'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {useAuth} from '@/lib/auth-provider'
type Order={id:string;pair:string;side:string;quantity:string;indicated_price_usdt:string;
 status:string;external_venue:string|null;external_reference:string|null;created_at:string}
export default function CjExchangeReviewPage(){
 const {user,token,isInitialized}=useAuth()
 const [orders,setOrders]=useState<Order[]>([])
 const [error,setError]=useState('')
 const [busy,setBusy]=useState('')
 const [reviewed,setReviewed]=useState<Record<string,boolean>>({})
 const load=useCallback(async()=>{
  if(!token)return
  const response=await fetch('/api/admin/cj-exchange',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
  const body=await response.json()
  if(!response.ok)throw new Error(body.error||'Unable to load CJ review queue')
  setOrders(body.orders||[])
 },[token])
 useEffect(()=>{if(user?.role==='admin')void load().catch(e=>setError(e.message))},[user?.role,load])
 const approve=async(id:string)=>{
  if(!reviewed[id])return
  setBusy(id);setError('')
  try{
   const response=await fetch('/api/admin/cj-exchange',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({id,externalProofReviewed:true}),
   })
   const body=await response.json()
   if(!response.ok)throw new Error(body.error||'Verification rejected')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Review unavailable')}
  finally{setBusy('')}
 }
 if(!isInitialized)return <main className="p-6 text-white">Loading Administration…</main>
 if(user?.role!=='admin')return <main className="p-6 text-white">Administration only.</main>
 return <main className="mx-auto max-w-5xl space-y-5 p-5 text-white">
  <Link href="/admin/client-folder-upgrades" className="text-xs text-sky-200">CJ File Folder and loan verification</Link>
  <h1 className="text-3xl font-bold">CJ Dorado · Crypto Exchange Review</h1>
  <p className="text-sm text-slate-300">Approve only independently checked external execution evidence. These are order and reconciliation records; WEAVE is not executing exchange trades or holding funds.</p>
  {error&&<p role="alert" className="rounded-xl border border-red-400/20 p-4 text-red-200">{error}</p>}
  {!orders.length&&<p className="text-sm text-slate-400">No exchange orders recorded.</p>}
  {orders.map(order=><section key={order.id} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <h2 className="font-bold">{order.side.toUpperCase()} {order.quantity} {order.pair}</h2>
    <p className="text-xs text-sky-200">{order.status.replaceAll('_',' ')}</p>
   </div>
   <p className="text-xs text-slate-300">Indicated price: {order.indicated_price_usdt} USDT · {new Date(order.created_at).toLocaleString()}</p>
   {order.external_reference&&<p className="break-all text-sm text-slate-300">External evidence: {order.external_venue} · {order.external_reference}</p>}
   {order.status==='externally_reported'&&<>
    <label className="flex items-start gap-3 text-sm text-slate-300"><input type="checkbox" checked={Boolean(reviewed[order.id])} onChange={e=>setReviewed({...reviewed,[order.id]:e.target.checked})}/>I checked this transaction against independent external execution records.</label>
    <button type="button" disabled={!reviewed[order.id]||busy===order.id} onClick={()=>void approve(order.id)} className="rounded-lg bg-sky-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40">{busy===order.id?'Verifying…':'Verify execution record'}</button>
   </>}
  </section>)}
 </main>
}
