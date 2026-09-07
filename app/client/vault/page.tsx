'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, Clock3, ShieldCheck } from 'lucide-react'

export default function ClientVaultPage() {
  const [data, setData] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [destination, setDestination] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    const res = await fetch('/api/client/vault')
    const json = await res.json()
    if (res.ok) setData(json); else setMessage(json.error || 'Unable to load Vault')
  }
  useEffect(() => { load() }, [])

  const requestWithdrawal = async () => {
    const res = await fetch('/api/client/vault', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, destination }) })
    const json = await res.json()
    setMessage(res.ok ? 'Withdrawal request sent for Admin review.' : json.error)
    if (res.ok) { setAmount(''); await load() }
  }

  const vault = data?.vault || { balance: 0, currency: 'USDT' }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/client/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Client Dashboard</Link>
        <header><p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Weave of Presence · Client</p><h1 className="mt-2 text-3xl font-bold">Client Vault</h1><p className="mt-1 text-slate-400">Your Client Siblings Fund, recorded as a company ledger.</p></header>

        {message && <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">{message}</div>}

        <section className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/60 to-slate-900 p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wider text-slate-400">Available Client Vault</p><p className="mt-2 text-4xl sm:text-5xl font-bold text-emerald-400">{vault.balance} {vault.currency}</p></div><ShieldCheck className="h-9 w-9 text-emerald-400" /></div><p className="mt-4 text-sm text-slate-400">Withdrawals remain pending until reviewed and authorized by Administration.</p></section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="font-semibold">Request Withdrawal</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="any" placeholder="Amount" className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm" /><input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Destination / wallet" className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm" /></div><button onClick={requestWithdrawal} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold hover:bg-emerald-500"><ArrowUpRight className="h-4 w-4" /> Submit for Admin Approval</button></section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden"><div className="border-b border-slate-800 p-4"><h2 className="font-semibold">Vault Record</h2></div><div className="divide-y divide-slate-800">{(data?.ledger || []).map((entry: any) => <div key={entry.id} className="flex items-center justify-between gap-4 p-4"><div><p className="text-sm font-medium">{entry.source}</p><p className="text-xs text-slate-500">{entry.reason || entry.reference || 'Recorded transaction'} · {new Date(entry.created_at).toLocaleString()}</p></div><div className="text-right"><p className={`font-semibold ${Number(entry.amount) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{Number(entry.amount) >= 0 ? '+' : ''}{entry.amount} {entry.currency}</p><p className="text-xs text-slate-500">Balance {entry.balance_after}</p></div></div>)}{!data?.ledger?.length && <div className="p-6 text-sm text-slate-500">No Vault transactions recorded yet.</div>}</div></section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden"><div className="border-b border-slate-800 p-4 flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-400" /><h2 className="font-semibold">Withdrawal Requests</h2></div><div className="divide-y divide-slate-800">{(data?.withdrawals || []).map((w: any) => <div key={w.id} className="flex justify-between gap-4 p-4"><div><p className="text-sm">{w.amount} {w.currency}</p><p className="text-xs text-slate-500">{new Date(w.requested_at).toLocaleString()}</p></div><span className="text-xs uppercase text-amber-400">{w.status}</span></div>)}{!data?.withdrawals?.length && <div className="p-6 text-sm text-slate-500">No withdrawal requests.</div>}</div></section>
      </div>
    </main>
  )
}
