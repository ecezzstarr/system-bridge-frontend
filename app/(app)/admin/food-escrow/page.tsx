'use client'
import { useCallback,useEffect,useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-provider'
type FarmOrder={
 order_id:string;escrow_status:string;reference:string;buyer_total_ngn:string;food_amount_ngn:string;
 delivery_amount_ngn:string;weave_commission_ngn:string;seller_payout_ngn:string;proof_reference?:string;
 order_status:string;buyer_name:string;buyer_phone_private:string;destination_area:string;destination_state:string;
 farmer_phone:string;farm_name:string;produce:string;unit:string;quantity:string;
 payout_bank_name?:string|null;payout_account_number?:string|null;payout_account_name?:string|null;
 seller_agent_name:string;verified_bank_reference?:string;verified_at?:string;dispute_note?:string;
}
const fmt=(v:unknown)=>'₦'+Number(v||0).toLocaleString('en-NG',{maximumFractionDigits:2})
export default function AdminFarmEscrow(){
 const {user,token,isInitialized}=useAuth()
 const [orders,setOrders]=useState<FarmOrder[]>([])
 const [references,setReferences]=useState<Record<string,string>>({})
 const [notes,setNotes]=useState<Record<string,string>>({})
 const [amounts,setAmounts]=useState<Record<string,string>>({})
 const [confirmed,setConfirmed]=useState<Record<string,boolean>>({})
 const [busy,setBusy]=useState('')
 const [message,setMessage]=useState('')
 const [error,setError]=useState('')
 const load=useCallback(async()=>{
  if(!token||user?.role!=='admin')return
  try{
   const r=await fetch('/api/admin/food-escrow',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
   const d=await r.json()
   if(!r.ok)throw Error(d.error||'Escrow desk unavailable')
   setOrders(d.orders||[]);setError('')
  }catch(e){setError(e instanceof Error?e.message:'Unable to load')}
 },[token,user?.role])
 useEffect(()=>{void load()},[load])
 const act=async(o:FarmOrder,action:string)=>{
  if(!token)return
  setBusy(o.order_id);setError('');setMessage('')
  try{
   const r=await fetch('/api/admin/food-escrow',{method:'PATCH',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({orderId:o.order_id,action,bankReference:references[o.order_id]||'',
      verifiedAmountNgn:Number(amounts[o.order_id]||o.buyer_total_ngn),confirmedBankTransfer:confirmed[o.order_id]===true,
      note:notes[o.order_id]||''})})
   const d=await r.json()
   if(!r.ok)throw Error(d.error||'Escrow review failed')
   setMessage(d.message||'Review recorded');await load()
  }catch(e){setError(e instanceof Error?e.message:'Review failed')}
  finally{setBusy('')}
 }
 if(!isInitialized)return <main className="p-6 text-white">Opening Farm-to-Family settlement desk…</main>
 if(user?.role!=='admin')return <main className="p-6 text-white">Administration only.</main>
 return <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 text-white" data-admin-farm-escrow="zero-commission">
  <Link href="/admin/food-bridge" className="text-xs text-emerald-200">← Farm-to-Family Administration</Link>
  <h1 className="mt-5 text-3xl font-black">FARM-TO-FAMILY · PAYMENT HOLD & SETTLEMENT</h1>
  <p className="mt-3 text-sm leading-6 text-stone-300">Weave charges farmers <strong>₦0 commission</strong>. Confirm actual bank credit before releasing goods. After the buyer confirms receipt, send the entire food + delivery amount to the farmer’s verified bank account, then record the actual transfer reference. These controls record external payment movements; they cannot initiate or prove a bank transfer automatically.</p>
  {error&&<p role="alert" className="mt-4 border border-rose-300/20 p-3 text-sm text-rose-200">{error}</p>}
  {message&&<p role="status" className="mt-4 border border-emerald-300/20 p-3 text-sm text-emerald-200">{message}</p>}
  <button type="button" onClick={()=>void load()} className="mt-5 border border-white/15 px-4 py-2 text-xs">Refresh bank verification queue</button>
  <section className="mt-6 space-y-4">
   {!orders.length&&<p className="p-6 text-stone-500">No escrow transactions have been created.</p>}
   {orders.map(o=><article key={o.order_id} className="border border-white/10 bg-white/[.025] p-5">
    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200">{o.escrow_status.replaceAll('_',' ')} · {o.order_status}</p>
    <h2 className="mt-2 text-lg font-black">{o.produce} · {o.quantity} {o.unit}</h2>
    <p className="mt-2 text-xs text-stone-300">Farm: {o.farm_name} ({o.seller_agent_name}) · Buyer: {o.buyer_name}</p>
    <p className="mt-2 text-xs text-stone-400">Buyer destination: {o.destination_area}, {o.destination_state} · Buyer contact: {o.buyer_phone_private}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
     <div><p className="text-[10px] text-stone-500">Food amount</p><p className="text-lg font-black">{fmt(o.food_amount_ngn)}</p></div>
     <div><p className="text-[10px] text-stone-500">Transport quote</p><p className="text-lg font-black">{fmt(o.delivery_amount_ngn)}</p></div>
     <div><p className="text-[10px] text-stone-500">Buyer total / seller due</p><p className="text-lg font-black text-emerald-200">{fmt(o.seller_payout_ngn)}</p></div>
    </div>
    <p className="mt-3 text-xs text-amber-200">WEAVE commission: ₦0 · Order reference: {o.reference}</p>
    {o.proof_reference&&<p className="mt-2 text-xs text-stone-300">Buyer payment evidence: {o.proof_reference} (not independently verified)</p>}
    <p className="mt-3 text-xs text-stone-400">Farmer bank: {o.payout_bank_name||'Not registered'} · {o.payout_account_name||'No owner name'} · {o.payout_account_number||'No account'}</p>
    {o.dispute_note&&<p className="mt-3 text-xs text-rose-200">Buyer dispute: {o.dispute_note}</p>}
    {['proof_submitted','release_due','disputed'].includes(o.escrow_status)&&<div className="mt-5 space-y-3 border-t border-white/10 pt-4">
     <label className="block text-xs text-stone-300">{o.escrow_status==='proof_submitted'?'Bank statement credit / reference confirmed from provider':'External bank payout / refund reference'}
      <input value={references[o.order_id]||''} onChange={e=>setReferences(p=>({...p,[o.order_id]:e.target.value}))}
       className="mt-2 w-full border border-white/10 bg-[#14251c] p-3 text-white" placeholder="Transaction reference from actual bank records"/>
     </label>
     {o.escrow_status==='proof_submitted'&&<label className="block text-xs text-stone-300">Amount confirmed received (₦)
      <input type="number" min="0" step=".01" value={amounts[o.order_id]||o.buyer_total_ngn}
       onChange={e=>setAmounts(p=>({...p,[o.order_id]:e.target.value}))}
       className="mt-2 w-full border border-white/10 bg-[#14251c] p-3 text-white"/>
     </label>}
     {['release_due','disputed'].includes(o.escrow_status)&&<label className="flex items-center gap-2 text-xs text-stone-300">
      <input type="checkbox" checked={confirmed[o.order_id]||false} onChange={e=>setConfirmed(p=>({...p,[o.order_id]:e.target.checked}))}/>
      I have completed and reconciled the external bank transfer; not merely initiated it.
     </label>}
     <label className="block text-xs text-stone-300">Administration verification or resolution note
      <textarea minLength={12} rows={3} value={notes[o.order_id]||''} onChange={e=>setNotes(p=>({...p,[o.order_id]:e.target.value}))}
       className="mt-2 w-full border border-white/10 bg-[#14251c] p-3 text-white"/>
     </label>
     <div className="flex flex-wrap gap-2">
      {o.escrow_status==='proof_submitted'&&<>
       <button disabled={busy===o.order_id} onClick={()=>void act(o,'verify_payment')} className="bg-emerald-300 px-4 py-3 text-xs font-black text-black">Confirm received money · notify farmer</button>
       <button disabled={busy===o.order_id} onClick={()=>void act(o,'reject_proof')} className="border border-rose-300/30 px-4 py-3 text-xs text-rose-200">Reject incorrect proof</button>
      </>}
      {o.escrow_status==='release_due'&&<>
       <button disabled={busy===o.order_id} onClick={()=>void act(o,'record_payout')} className="bg-emerald-300 px-4 py-3 text-xs font-black text-black">Record completed seller payout</button>
       <button disabled={busy===o.order_id} onClick={()=>void act(o,'hold_dispute')} className="border border-rose-300/30 px-4 py-3 text-xs text-rose-200">Hold for dispute review</button>
      </>}
      {o.escrow_status==='disputed'&&<button disabled={busy===o.order_id} onClick={()=>void act(o,'record_refund')}
       className="border border-amber-300/30 px-4 py-3 text-xs text-amber-200">Record completed buyer refund</button>}
     </div>
    </div>}
   </article>)}
  </section>
 </main>
}
