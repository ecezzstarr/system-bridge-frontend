'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, RefreshCw, WalletCards, XCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

type Deposit = {
  id: string
  user_id: string
  amount_trx: number | string
  currency: string
  method: string
  status: string
  receipt_data?: string | null
  created_at: string
  updated_at?: string
  client_name: string
  client_email: string
  file_number?: string | null
}

export default function AdminClientDepositsPage() {
  const { user, token, isInitialized } = useAuth()
  const [pending, setPending] = useState<Deposit[]>([])
  const [recent, setRecent] = useState<Deposit[]>([])
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  const headers = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  })

  const load = async () => {
    if (!token) return
    setBusy('load')
    try {
      const res = await fetch('/api/admin/client-deposits', { headers: headers(), cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to load Client deposits')
      setPending(data.pending || [])
      setRecent(data.recent || [])
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load Client deposits')
    } finally {
      setBusy('')
    }
  }

  useEffect(() => {
    if (isInitialized && token && user?.role === 'admin') void load()
  }, [isInitialized, token, user?.role])

  const decide = async (depositId: string, status: 'approved' | 'rejected') => {
    setBusy(depositId)
    try {
      const res = await fetch('/api/admin/deposit/tron/verify', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ depositId, status }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Deposit decision failed')
      setMessage(data.message || `Deposit ${status}.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Deposit decision failed')
    } finally {
      setBusy('')
    }
  }

  if (!isInitialized) return <main className="p-8 text-base text-slate-300">Opening Client deposits...</main>
  if (user?.role !== 'admin') return <main className="p-8 text-base text-red-300">Administration access required.</main>

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-5 text-white md:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">Administration · Client Funding</p>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">Client Deposit Requests</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
            Clients fund Flame Coin by sending TRX to the Company wallet. Review the Client, File Number, amount and transaction hash here before approving or rejecting the request.
          </p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold">
          <RefreshCw className={`h-4 w-4 ${busy === 'load' ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      {message && <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] p-4 text-base text-cyan-100">{message}</div>}

      <section className="rounded-3xl border border-amber-300/15 bg-black/20 p-5">
        <div className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-amber-300" />
          <h2 className="text-xl font-black">Pending Client requests</h2>
          <span className="rounded-full bg-amber-300/10 px-3 py-1 text-sm font-bold text-amber-200">{pending.length}</span>
        </div>

        {pending.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-base text-slate-400">No Client TRX deposit is waiting for review.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {pending.map(deposit => (
              <article key={deposit.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <div className="grid gap-4 lg:grid-cols-[1.1fr_.75fr_1.3fr_auto] lg:items-center">
                  <div>
                    <p className="text-lg font-black text-white">{deposit.client_name || 'Client'}</p>
                    <p className="mt-1 text-sm text-slate-400">{deposit.client_email}</p>
                    <p className="mt-1 font-mono text-sm text-cyan-300">{deposit.file_number || 'File Number unavailable'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Amount</p>
                    <p className="mt-1 text-2xl font-black text-emerald-300">{Number(deposit.amount_trx || 0).toLocaleString()} TRX</p>
                    <p className="text-sm text-slate-500">→ same Flame Coin after verification</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Transaction hash</p>
                    <p className="mt-2 break-all font-mono text-sm leading-6 text-slate-300">{deposit.receipt_data || 'No hash supplied'}</p>
                    <p className="mt-2 text-sm text-slate-500">{new Date(deposit.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 lg:flex-col">
                    <button
                      onClick={() => void decide(deposit.id, 'approved')}
                      disabled={busy === deposit.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => void decide(deposit.id, 'rejected')}
                      disabled={busy === deposit.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/15 px-4 py-3 text-sm font-black text-red-200 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-center gap-2">
          <WalletCards className="h-5 w-5 text-cyan-300" />
          <h2 className="text-xl font-black">Recent Client deposit decisions</h2>
        </div>
        <div className="mt-5 space-y-2">
          {recent.length === 0 ? <p className="text-base text-slate-500">No completed Client deposit decisions yet.</p> : recent.map(deposit => (
            <div key={deposit.id} className="grid gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <p className="text-base font-bold text-white">{deposit.client_name} · <span className="font-mono text-cyan-300">{deposit.file_number || 'No File Number'}</span></p>
                <p className="mt-1 text-sm text-slate-500">{new Date(deposit.created_at).toLocaleString()}</p>
              </div>
              <p className="text-base font-black text-white">{Number(deposit.amount_trx || 0).toLocaleString()} TRX</p>
              <span className={`rounded-full px-3 py-1 text-sm font-black uppercase ${deposit.status === 'approved' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300'}`}>
                {deposit.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
