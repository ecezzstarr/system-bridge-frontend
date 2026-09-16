'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { Search, ShieldCheck, WalletCards, LogOut } from 'lucide-react'

export default function AdminClientVaultPage() {
  const { user, token, isLoading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [clients, setClients] = useState<any[]>([])
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const headers = token ? { Authorization: `Bearer ${token}` } : {}

  const load = async (query = '') => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/client-vault${query ? `?q=${encodeURIComponent(query)}` : ''}`, { headers, cache: 'no-store' })
      const data = await res.json()
      if (res.ok) { setClients(data.clients || []); setWithdrawals(data.withdrawals || []) }
      else setMessage(data.error || data.message || 'Unable to load Client Vault')
    } finally { setLoading(false) }
  }

  useEffect(() => { if (user?.role === 'admin' && token) void load() }, [user?.role, token])

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">Loading...</div>
  if (!user || user.role !== 'admin') return null

  const credit = async () => {
    if (!selected || !token || !amount) return
    const res = await fetch('/api/admin/client-vault/credit', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: selected.id, amount: Number(amount), currency: selected.currency || 'TRX', reference: 'Admin Client Vault', note: reason || 'Administration credit' }),
    })
    const data = await res.json()
    setMessage(res.ok ? `Vault credited. New balance: ${data.balance} ${data.currency}` : data.error || data.message)
    if (res.ok) { setAmount(''); setReason(''); await load(q) }
  }

  const approve = async (withdrawalId: string) => {
    if (!token) return
    const res = await fetch(`/api/admin/client-vault/withdrawals/${withdrawalId}/approve`, { method: 'POST', headers })
    const data = await res.json()
    setMessage(res.ok ? `Withdrawal approved. ${data.withdrawal.amount} ${data.withdrawal.currency} is ready for manual settlement.` : data.error || data.message)
    if (res.ok) await load(q)
  }

  const handleLogout = () => { logout(); router.push('/login') }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div><p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Weave of Presence · Administration</p><h1 className="text-3xl font-bold mt-1">Client Vault</h1><p className="text-slate-400 mt-1">Credit Client Vaults and review withdrawal requests.</p></div>
          <div className="flex items-center gap-3"><div className="rounded-xl border border-slate-700 bg-slate-900 p-3"><ShieldCheck className="h-6 w-6 text-cyan-400" /></div><button onClick={handleLogout} className="rounded-lg bg-slate-800 px-3 py-2 text-sm"><LogOut className="h-4 w-4" /></button></div>
        </header>

        {message && <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">{message}</div>}

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" /><input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(q)} placeholder="Search Client name, email, or File Number" className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-cyan-500" /></div><button onClick={() => load(q)} disabled={loading} className="rounded-lg bg-cyan-600 px-5 text-sm font-semibold">{loading ? 'Loading...' : 'Search'}</button></div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
          <section className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden">
            <div className="border-b border-slate-800 p-4"><h2 className="font-semibold">Clients & Vault Balances</h2></div>
            <div className="divide-y divide-slate-800">{clients.map(c => <button key={c.id} onClick={() => setSelected(c)} className={`w-full p-4 text-left hover:bg-slate-800/60 ${selected?.id === c.id ? 'bg-slate-800/60' : ''}`}><div className="flex items-center justify-between gap-4"><div><p className="font-semibold">{c.name}</p><p className="text-xs text-slate-500">{c.file_number || 'No File Number'} · {c.email}</p></div><div className="text-right"><p className="text-lg font-bold text-emerald-400">{c.vault_balance} {c.currency}</p><p className="text-[10px] uppercase tracking-wider text-slate-500">Client Vault</p></div></div></button>)}</div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center gap-3 mb-5"><WalletCards className="h-6 w-6 text-emerald-400" /><div><h2 className="font-semibold">Vault Operation</h2><p className="text-xs text-slate-500">{selected ? selected.name : 'Select a Client'}</p></div></div>
            {selected ? <div className="space-y-3"><div className="rounded-lg bg-slate-950 p-4"><p className="text-xs text-slate-500">Current Balance</p><p className="text-3xl font-bold text-emerald-400">{selected.vault_balance} {selected.currency}</p></div><input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Credit amount" type="number" min="0" step="any" className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm" /><input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason / reference" className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm" /><button onClick={credit} disabled={!amount} className="w-full rounded-lg bg-emerald-600 py-3 font-semibold disabled:opacity-50">Credit Client Vault</button><p className="text-xs leading-5 text-slate-500">The credit is recorded against the Client Vault with the administrator as actor.</p></div> : <p className="text-sm text-slate-500">Select a Client to operate the Vault.</p>}
          </section>
        </div>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden"><div className="border-b border-slate-800 p-4"><h2 className="font-semibold">Withdrawal Review</h2></div><div className="divide-y divide-slate-800">{withdrawals.map(w => <div key={w.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold">{w.client_name}</p><p className="text-xs text-slate-500">{w.file_number || 'No File Number'} · {w.destination || 'No destination supplied'}</p><p className="text-sm text-slate-300 mt-1">{w.amount} {w.currency} · <span className="text-amber-400">{w.status}</span></p></div>{w.status === 'pending_approval' && <button onClick={() => approve(w.id)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold">Approve</button>}</div>)}{withdrawals.length === 0 && <p className="p-6 text-sm text-slate-500">No withdrawal requests.</p>}</div></section>
      </div>
    </main>
  )
}
