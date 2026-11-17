'use client'

import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import Link from 'next/link'
type FundingSource='bybit'|'bitget'|'tron_wallet'|'other_tron_wallet'
type FundingData={fundingEnabled:boolean;companyTrxWallet:string|null;network:'tron-mainnet';supportedSources:FundingSource[]}
export function ClientTronFunding({onSubmitted}:{onSubmitted?:()=>void}){
 const {token}=useAuth()
 const [status,setStatus]=useState<FundingData|null>(null)
 const [loading,setLoading]=useState(true)
 const [amount,setAmount]=useState('')
 const [txHash,setTxHash]=useState('')
 const [source,setSource]=useState<FundingSource>('tron_wallet')
 const [networkConfirmed,setNetworkConfirmed]=useState(false)
 const [ownershipConfirmed,setOwnershipConfirmed]=useState(false)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const load=useCallback(async()=>{
  if(!token){setLoading(false);return}
  const r=await fetch('/api/deposit/tron',{cache:'no-store',headers:{Authorization:'Bearer '+token}})
  const d=await r.json()
  if(!r.ok)throw new Error(d.error||'TRON funding unavailable')
  setStatus(d);setLoading(false)
 },[token])
 useEffect(()=>{void load().catch(err=>{setLoading(false);setMessage(String(err))})},[load])
 const submit=async()=>{
  if(!token||!status?.fundingEnabled||busy)return
  setBusy(true);setMessage('')
  try{
   const r=await fetch('/api/deposit/tron',{method:'POST',headers:{
      Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({amountTrx:Number(amount),txHash:txHash.trim(),source,network:'tron-mainnet',
      confirmSentToCompany:networkConfirmed,confirmSourceOwnTransaction:ownershipConfirmed})
   })
   const d=await r.json()
   if(!r.ok)throw new Error(d.error||'The deposit evidence was not accepted')
   setMessage('TRON transaction recorded as pending. Forensics must verify confirmed on-chain receipt before System Switch is credited.')
   setTxHash('');setNetworkConfirmed(false);setOwnershipConfirmed(false)
   onSubmitted?.()
  }catch(err){setMessage(err instanceof Error?err.message:'Deposit submission failed')}
  finally{setBusy(false)}
 }
 return <section data-client-verified-tron-funding className="rounded-2xl border border-amber-200/25 bg-[#11202d] p-5 text-white">
  <h2 className="text-xl font-bold">Client · TRON to System Switch</h2>
  <p className="mt-2 text-sm leading-7 text-slate-200">Send native TRX from Bybit, Bitget, Tron Wallet or another TRON-compatible wallet to the single designated Weave company address. Forensics independently checks the solidified transaction before the same TRX value is credited in System Switch. Bybit and Bitget are sending exchanges, not integrated payment partners.</p>
  {loading&&<p className="mt-4 text-sm">Checking Weave TRON settlement availability…</p>}
  {!loading&&!status?.fundingEnabled&&<p role="status" className="mt-4 rounded-lg border border-amber-300/30 p-3 text-sm text-amber-100">TRON funding is not enabled. Administrations must verify custody of the official company account and enable independent on-chain verification before any funds are sent. Do not transfer TRX to an address copied from an old receipt or message.</p>}
  {status?.fundingEnabled&&<div className="mt-4 space-y-4">
    <div className="rounded-lg border border-emerald-300/30 bg-emerald-300/[.05] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-200">Weave company receiving address · TRON mainnet · native TRX only</p>
      <p className="mt-2 break-all font-mono text-sm">{status.companyTrxWallet}</p>
      <button type="button" className="mt-3 min-h-10 rounded-lg border border-cyan-200/40 px-3 py-2 text-sm"
        onClick={()=>{if(status.companyTrxWallet)void navigator.clipboard.writeText(status.companyTrxWallet).then(()=>setMessage('Company TRON receiving address copied.'))}}>Copy address</button>
      <p className="mt-2 text-xs text-amber-100">Confirm the Tron/TRC-10 native TRX network at your source wallet. Do not use ERC-20, BEP-20, TRC-20 USDT or a different address. Failed or wrong-network transfers cannot be credited here.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Sender
        <select className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3"
          value={source} onChange={e=>setSource(e.target.value as FundingSource)}>
          <option value="bybit">Bybit · TRX withdrawal</option>
          <option value="bitget">Bitget · TRX withdrawal</option>
          <option value="tron_wallet">Tron Wallet</option>
          <option value="other_tron_wallet">Other TRON wallet</option>
        </select>
      </label>
      <label className="text-sm">Native TRX actually sent
        <input type="number" min="0.000001" max="1000000000" step="0.000001" value={amount}
          onChange={e=>setAmount(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3"/>
      </label>
    </div>
    <label className="block text-sm">Confirmed TRON mainnet transaction ID (64 hex characters)
      <input value={txHash} onChange={e=>setTxHash(e.target.value)} maxLength={64}
        placeholder="Paste the blockchain transaction hash, not a withdrawal order ID"
        className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3 font-mono text-xs"/>
    </label>
    <label className="flex gap-3 text-sm leading-6"><input type="checkbox" checked={networkConfirmed} onChange={e=>setNetworkConfirmed(e.target.checked)}/>
      <span>I sent native TRX through TRON mainnet to the displayed verified Weave receiving address.</span>
    </label>
    <label className="flex gap-3 text-sm leading-6"><input type="checkbox" checked={ownershipConfirmed} onChange={e=>setOwnershipConfirmed(e.target.checked)}/>
      <span>I control this transfer or am its authorized beneficiary, and understand no credit is issued until independent Forensics confirmation.</span>
    </label>
    <button disabled={busy||!networkConfirmed||!ownershipConfirmed||Number(amount)<=0||!/^[0-9a-f]{64}$/i.test(txHash)}
      onClick={()=>void submit()} type="button" className="min-h-12 rounded-lg bg-amber-200 px-4 py-2 font-bold text-slate-950 disabled:opacity-40">
      Submit transaction for Forensics verification
    </button>
  </div>}
  {message&&<p role="status" className="mt-3 text-sm text-amber-100">{message}</p>}
  <p className="mt-4 text-xs text-slate-300">Withdrawals: <Link className="text-cyan-200 underline" href="/wallet/deposit-withdraw">use Weave’s approved TRON withdrawal request</Link>. Weave must separately approve and execute the external transfer; submitting a request is not confirmation of a completed payout.</p>
 </section>
}
