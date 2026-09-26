'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ReceiptText, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

type Receipt = {
  id:string; receipt_number:string; kind:string; source:string; amount:string|number;
  currency:string; status:string; description:string|null; created_at:string
}

export default function ReceiptsPage() {
  const { token } = useAuth()
  const [receipts,setReceipts] = useState<Receipt[]>([])
  const [loading,setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch('/api/receipts',{ headers:{ Authorization:`Bearer ${token}` }, cache:'no-store' })
      .then(r=>r.json()).then(data=>setReceipts(data.receipts || [])).finally(()=>setLoading(false))
  },[token])

  return <main className="mx-auto w-full max-w-5xl p-3 md:p-6">
    <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-[#030a15]/72 backdrop-blur-xl">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,.14),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(245,158,11,.07),transparent_28%)] p-5 md:p-7">
        <Link href="/wallet" className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-sky-300"><ArrowLeft className="h-3.5 w-3.5"/>Wallet</Link>
        <div className="mt-4 flex items-center gap-3"><ReceiptText className="h-7 w-7 text-cyan-300"/><div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">WEAVE Receipt Registry</p><h1 className="mt-1 text-2xl font-black text-white">Your recorded value movements.</h1></div></div>
        <p className="mt-3 max-w-3xl text-xs leading-6 text-slate-400">Payments, withdrawals and purchases receive a WEAVE receipt number at the transaction boundary. Pending receipts remain valid records of a submitted movement; their status does not imply final settlement.</p>
      </header>
      <div className="p-4 md:p-6">
        {loading ? <p className="text-sm text-slate-400">Loading receipts…</p> : receipts.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No WEAVE receipts have been issued to this account yet.</div> :
        <div className="space-y-2">{receipts.map(r=><article key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-mono text-[10px] font-bold text-cyan-200">{r.receipt_number}</p><p className="mt-1 text-sm font-black text-white">{r.description || r.source.replaceAll('_',' ')}</p><p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-slate-500">{r.kind} · {r.status} · {new Date(r.created_at).toLocaleString()}</p></div><p className="text-lg font-black text-white">{Number(r.amount).toLocaleString(undefined,{maximumFractionDigits:8})} <span className="text-xs text-slate-400">{r.currency}</span></p></div>
        </article>)}</div>}
      </div>
    </section>
  </main>
}
