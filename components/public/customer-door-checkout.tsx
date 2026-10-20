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
    if(!token){setOutcome('Sign in to a WEAVE account with sufficient Flame Coin to pay. Visitors can use the Client’s published external payment option.');return}
    setBusy(true);setOutcome('')
    try{
      const r=await fetch(`/api/public/store/orders/${encodeURIComponent(orderId)}/pay`,{method:'POST',headers:{Authorization:`Bearer ${token}`}})
      const j=await r.json()
      if(!r.ok)throw Error(j.error||'Unable to settle your order')
      setReceipt(j.receiptNumber||'')
      setOutcome(j.alreadyPaid?'This order was previously settled. No additional funds were deducted.':`${j.amountFlameCoin} Flame Coin transferred to the Client Main Wallet.`)
    }catch(e){setOutcome(e instanceof Error?e.message:'Payment did not complete')}finally{setBusy(false)}
  }
  return <section className="mt-4 rounded-xl border border-amber-200/20 bg-amber-100/[.04] p-4 text-xs text-slate-200" data-customer-door-payment>
    <p className="font-black text-amber-200">Customer Door payment · {amount.toLocaleString()} {currency}</p>
    {walletPayable?<button onClick={()=>void pay()} disabled={busy||!!receipt} className="mt-3 min-h-11 rounded-xl bg-amber-200 px-5 py-3 font-black text-slate-900 disabled:opacity-50">
      {busy?'Confirming payment…':receipt?'Payment recorded':'Pay from WEAVE Main Wallet'}
    </button>:<p className="mt-2 text-slate-300">This order is not priced in Flame Coin. Use the Client’s available external payment instructions. A payment reference is only a claim until Administration verifies the actual receipt and funded settlement.</p>}
    {outcome&&<p role="status" className="mt-3 text-slate-100">{outcome}</p>}
    {receipt&&<p className="mt-2 break-all text-emerald-200">Receipt: {receipt}</p>}
    {walletPayable&&<p className="mt-3 text-[11px] text-slate-400">The transfer is made only after confirmed balance is debited, the Client is credited, and a receipt is committed. <Link className="underline text-amber-200" href="/login">WEAVE login</Link>.</p>}
  </section>
}
