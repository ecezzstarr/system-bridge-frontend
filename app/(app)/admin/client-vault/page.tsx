'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import {
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import Link from 'next/link'

export default function ClientVaultAuthorityEnginePage() {
  const { user, token }=useAuth()
  const [q,setQ]=useState('')
  const [clients,setClients]=useState<any[]>([])
  const [withdrawals,setWithdrawals]=useState<any[]>([])
  const [selected,setSelected]=useState<any>(null)
  const [amount,setAmount]=useState('')
  const [reason,setReason]=useState('')
  const [message,setMessage]=useState('')
  const [loading,setLoading]=useState(false)

  const headers=token?{Authorization:`Bearer ${token}`}:{}

  const load=async(query='')=>{
    if(!token) return
    setLoading(true)
    try{
      const response=await fetch(`/api/admin/client-vault${query?`?q=${encodeURIComponent(query)}`:''}`,{headers,cache:'no-store'})
      const data=await response.json()
      if(!response.ok) throw new Error(data.error||data.message||'Unable to read Client Vault state')
      setClients(data.clients||[])
      setWithdrawals(data.withdrawals||[])
      if(selected){
        const next=(data.clients||[]).find((client:any)=>client.id===selected.id)
        if(next) setSelected(next)
      }
    }catch(err){setMessage(err instanceof Error?err.message:'Unable to read Client Vault state')}
    finally{setLoading(false)}
  }

  useEffect(()=>{if(user?.role==='admin'&&token) void load()},[user?.role,token])

  const credit=async()=>{
    if(!selected||!token) return
    const numeric=Number(amount)
    if(!Number.isFinite(numeric)||numeric<=0){setMessage('Enter a positive Flame Coin credit amount.');return}
    const response=await fetch('/api/admin/client-vault/credit',{
      method:'POST',
      headers:{...headers,'Content-Type':'application/json'},
      body:JSON.stringify({client_id:selected.id,amount:numeric,reference:'Admin Client Vault',note:reason||'Administration Flame Coin credit'}),
    })
    const data=await response.json()
    setMessage(response.ok?`Vault credit recorded. New balance: ${data.balance} ${data.currency}`:data.error||data.message||'Credit failed')
    if(response.ok){setAmount('');setReason('');await load(q)}
  }

  const approve=async(id:string)=>{
    if(!token) return
    const response=await fetch(`/api/admin/client-vault/withdrawals/${id}/approve`,{method:'POST',headers})
    const data=await response.json()
    setMessage(response.ok?`Withdrawal approved. ${data.withdrawal.amount} ${data.withdrawal.currency} is now ready for manual settlement.`:data.error||data.message||'Approval failed')
    if(response.ok) await load(q)
  }

  const stats=useMemo(()=>({
    clients:clients.length,
    vault:clients.reduce((sum,c)=>sum+Number(c.vault_balance||0),0),
    main:clients.reduce((sum,c)=>sum+Number(c.main_flame_coin||0),0),
    withdrawals:withdrawals.filter(w=>w.status==='pending_approval').length,
  }),[clients,withdrawals])

  if(!user||user.role!=='admin') return null

  return <main className="mx-auto w-full max-w-7xl p-3 md:p-6">
    <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-emerald-300/15 bg-[#030a15]/72">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(16,185,129,.13),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(139,92,246,.08),transparent_28%)] p-5 md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div><p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">Administration · Client Vault Authority Engine</p><h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Vault credit, Main Wallet and withdrawal settlement remain distinct states.</h1><p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">Administration may credit the Client Vault and approve withdrawal requests. Siblings Funds and Main Client Wallet remain separate balances; withdrawal approval means ready for settlement, not completed settlement.</p></div>
          <button onClick={()=>void load(q)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/>Refresh</button>
        </div>
      </header>

      <div className="p-4 md:p-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Clients" value={stats.clients.toLocaleString()} tone="sky"/>
          <Metric label="Vault total" value={stats.vault.toLocaleString(undefined,{maximumFractionDigits:2})} tone="emerald"/>
          <Metric label="Main Wallet" value={stats.main.toLocaleString(undefined,{maximumFractionDigits:2})} tone="violet"/>
          <Metric label="Pending withdrawals" value={stats.withdrawals.toLocaleString()} tone="amber"/>
        </div>

        {message&&<div className="mt-4 rounded-xl border border-sky-300/15 bg-sky-400/[0.04] p-3 text-sm text-sky-100">{message}</div>}

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
          <section className="weave-reading-surface rounded-3xl p-4 md:p-5">
            <div className="flex gap-2 border-b border-white/10 pb-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"/><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&void load(q)} placeholder="Search Client, email or File Number" className="h-11 w-full rounded-xl border border-white/10 bg-black/25 pl-9 pr-3 text-xs text-white outline-none focus:border-emerald-300/30"/></div><button onClick={()=>void load(q)} disabled={loading} className="rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] px-4 text-[10px] font-black uppercase text-emerald-100">Search</button></div>
            <div className="mt-4 space-y-2">{clients.map(client=><button key={client.id} onClick={()=>setSelected(client)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id===client.id?'border-emerald-300/25 bg-emerald-400/[0.06]':'border-white/8 bg-black/20 hover:border-white/15'}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-white">{client.name}</p><p className="mt-1 text-[10px] text-slate-500">{client.file_number||'No File Number'} · {client.email}</p></div><div className="grid grid-cols-3 gap-2 text-center"><State label="Vault" value={client.vault_balance}/><State label="Siblings" value={client.sibling_flame_coin}/><State label="Main" value={client.main_flame_coin}/></div></div></button>)}</div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
              <div className="flex items-center gap-2"><WalletCards className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Vault credit operation</p></div>
              {selected?<div className="mt-3 space-y-3"><div><p className="text-sm font-black text-white">{selected.name}</p><p className="mt-1 text-2xl font-black text-emerald-200">{Number(selected.vault_balance||0).toLocaleString()} Flame Coin</p></div><input value={amount} onChange={e=>setAmount(e.target.value)} type="number" min="0" step="any" placeholder="Credit amount" className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white"/><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason / reference" className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-xs text-white"/><button onClick={()=>void credit()} disabled={!amount} className="w-full rounded-xl bg-emerald-300 px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-slate-950 disabled:opacity-40">Record Vault credit</button><p className="text-[10px] leading-5 text-slate-400">This operation credits only the Administration Client Vault.</p></div>:<p className="mt-3 text-xs text-slate-400">Select a Client before creating a Vault credit.</p>}
            </section>
            <section className="rounded-3xl border border-violet-300/15 bg-violet-400/[0.04] p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-violet-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Balance separation</p></div><p className="mt-3 text-xs leading-5 text-slate-300">Vault, Siblings Funds and Main Client Wallet are separate ledgers. A Vault credit does not silently rewrite the other balances.</p></section>
          </aside>
        </div>

        <section className="mt-4 weave-reading-surface rounded-3xl p-4 md:p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Withdrawal approval queue</p><p className="mt-1 text-xs text-slate-400">Approval moves a request to ready-for-manual-settlement state.</p></div><CheckCircle2 className="h-5 w-5 text-amber-300"/></div>
          <div className="mt-4 space-y-2">{withdrawals.map(w=><div key={w.id} className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 md:flex-row md:items-center md:justify-between"><div><p className="text-sm font-black text-white">{w.client_name}</p><p className="mt-1 text-[10px] text-slate-500">{w.file_number||'No File Number'} · {w.destination||'No destination supplied'}</p><p className="mt-2 text-xs text-slate-300">{w.amount} {w.currency} · <span className="font-black text-amber-300">{w.status}</span></p></div>{w.status==='pending_approval'&&<button onClick={()=>void approve(w.id)} className="rounded-xl bg-emerald-300 px-4 py-2.5 text-[9px] font-black uppercase text-slate-950">Approve for settlement</button>}</div>)}{withdrawals.length===0&&<p className="py-8 text-center text-xs text-slate-400">No withdrawal request is recorded.</p>}</div>
        </section>

        <Link href="/ledger" className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-sky-300">Open institutional Record <ArrowRight className="h-3.5 w-3.5"/></Link>
      </div>
    </section>
  </main>
}

function Metric({label,value,tone}:{label:string;value:string;tone:'sky'|'emerald'|'violet'|'amber'}){const c=tone==='emerald'?'text-emerald-300 border-emerald-300/15 bg-emerald-400/[0.04]':tone==='violet'?'text-violet-300 border-violet-300/15 bg-violet-400/[0.04]':tone==='amber'?'text-amber-300 border-amber-300/15 bg-amber-400/[0.04]':'text-sky-300 border-sky-300/15 bg-sky-400/[0.04]';return <div className={`rounded-xl border px-3 py-3 ${c}`}><p className="text-[8px] font-black uppercase tracking-wider">{label}</p><p className="mt-1 text-lg font-black text-white">{value}</p></div>}
function State({label,value}:{label:string;value:any}){return <div className="rounded-lg border border-white/8 bg-black/20 px-2 py-2"><p className="text-[8px] uppercase text-slate-500">{label}</p><p className="mt-1 text-[10px] font-black text-white">{Number(value||0).toLocaleString()}</p></div>}
