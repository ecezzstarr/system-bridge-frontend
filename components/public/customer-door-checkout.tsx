'use client'
import {useState} from 'react'
import Link from 'next/link'

export default function CustomerDoorCheckout({orderId,amount,currency}:{orderId:string;amount:number;currency:string}){
  const [busy,setBusy]=useState(false)
  const [outcome,setOutcome]=useState('')
  const [receipt,setReceipt]=useState('')
  const walletPayable=['FLAME COIN','FLAME_COIN','FC'].includes(currency.toUpperCase()) && amount>0
  const pay=async()=>{
    const token=localStorage.getItem('ssb_auth_token')||localStorage.getItem('token')||''
    if(!token){setOutcome('Sign in to a WEAVE account with enough Flame Coin to complete this order. If you are visiting as a customer, use the external payment option published by the business.');return}
    setBusy(true);setOutcome('')
    try{
      const r=await fetch(`/api/public/store/orders/${encodeURIComponent(orderId)}/pay`,{method:'POST',headers:{Authorization:`Bearer ${token}`}})
      const j=await r.json()
      if(!r.ok)throw Error(j.error||'Unable to settle your order')
      setReceipt(j.receiptNumber||'')
      setOutcome(j.alreadyPaid?'This order has already been paid. No additional funds were deducted.':`${j.amountFlameCoin} Flame Coin transferred to the Client Main Wallet.`)
    }catch(e){setOutcome(e instanceof Error?e.message:'Payment could not be completed')}finally{setBusy(false)}
  }
  return <section className="mt-4 rounded-xl border border-amber-200/20 bg-amber-100/[.04] p-4 text-xs text-slate-200" data-customer-door-payment>
    <p className="font-black text-amber-200">Customer Door payment · {amount.toLocaleString()} {currency}</p>
    {walletPayable?<button onClick={()=>void pay()} disabled={busy||!!receipt} className="mt-3 min-h-11 rounded-xl bg-amber-200 px-5 py-3 font-black text-slate-900 disabled:opacity-50">
      {busy?'Confirming payment…':receipt?'Payment confirmed':'Pay with Flame Coin'}
    </button>:<p className="mt-2 text-slate-300">This order is priced in a different currency. Follow the business’s published external payment instructions. A reference alone does not confirm payment; Administration must verify receipt of the funds before settlement can be treated as complete.</p>}
    {outcome&&<p role="status" className="mt-3 text-slate-100">{outcome}</p>}
    {receipt&&<p className="mt-2 break-all text-emerald-200">Receipt: {receipt}</p>}
    {walletPayable&&<p className="mt-3 text-[11px] text-slate-400">The transfer is made only after confirmed balance is debited, the Client is credited, and a receipt is committed. <Link className="underline text-amber-200" href="/login">WEAVE login</Link>.</p>}
  </section>
}
