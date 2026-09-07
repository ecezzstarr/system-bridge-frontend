'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'

export default function AdminFileFolderPurchasesPage() {
  const { user, token } = useAuth()
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/file-folder-purchases', { headers: { Authorization: `Bearer ${token}` } })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Unable to load purchases')
      setPurchases(body.purchases || [])
    } catch (error: any) { setMessage(error.message || 'Unable to load purchases') } finally { setLoading(false) }
  }

  useEffect(() => { if (user?.role === 'admin') load() }, [user, token])
  if (!user || user.role !== 'admin') return null

  const issue = async (purchase: any) => {
    setBusy(purchase.id); setMessage('')
    try {
      const res = await fetch('/api/admin/file-folder-purchases', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ purchaseId: purchase.id }) })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Unable to issue File Folder')
      setMessage(`File Folder issued: ${body.folder.file_number}`)
      await load()
    } catch (error: any) { setMessage(error.message || 'Unable to issue File Folder') } finally { setBusy('') }
  }

  return <main className="min-h-screen bg-slate-950 text-white p-5 md:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header><p className="text-[10px] uppercase tracking-[0.3em] text-sky-300">Administration · System Switch</p><h1 className="mt-2 text-3xl font-semibold">File Folder Purchases</h1><p className="mt-2 text-sm text-slate-400">Confirm TRX payments or review verified Flutterwave payments, then issue the File Number that opens the Client's File Folder.</p></header>
    {message && <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-slate-300">{message}</div>}
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20"><table className="w-full min-w-[900px] text-left text-xs"><thead className="border-b border-white/10 text-[9px] uppercase tracking-[0.18em] text-slate-500"><tr><th className="p-4">Buyer</th><th className="p-4">Value</th><th className="p-4">Method</th><th className="p-4">Reference</th><th className="p-4">Status</th><th className="p-4">File Number</th><th className="p-4"></th></tr></thead><tbody className="divide-y divide-white/5">{loading ? <tr><td colSpan={7} className="p-8 text-center text-slate-500">Loading…</td></tr> : purchases.map(p => <tr key={p.id}><td className="p-4"><p className="font-medium">{p.buyer_name || 'Unidentified buyer'}</p><p className="mt-1 text-slate-500">{p.buyer_email || p.buyer_phone || '—'}</p></td><td className="p-4 font-semibold">{Number(p.amount_trx).toLocaleString()} TRX</td><td className="p-4 uppercase text-slate-400">{p.payment_method}</td><td className="p-4 font-mono text-[10px] text-slate-400">{p.payment_reference}</td><td className="p-4"><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px]">{p.status}</span></td><td className="p-4 font-mono text-[10px] text-slate-300">{p.file_number || 'Not issued'}</td><td className="p-4">{!['confirmed','folder_issued'].includes(p.status) && <button onClick={() => issue(p)} disabled={busy === p.id} className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-emerald-200 disabled:opacity-40">{busy === p.id ? 'Issuing…' : 'Confirm & Issue'}</button>}</td></tr>)}</tbody></table></div>
  </div></main>
}
