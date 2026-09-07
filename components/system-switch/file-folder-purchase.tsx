'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Copy, Wallet } from 'lucide-react'

const STANDARD_PRICE_TRX = 35800
const MINIMUM_PROSPECT_PRICE_TRX = 1800
const TRX_PER_USD = 10

export default function FileFolderPurchase({ fileNumber = '' }: { fileNumber?: string }) {
  const [customPrice, setCustomPrice] = useState('')
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [wallet, setWallet] = useState('')
  const [loadingWallet, setLoadingWallet] = useState(true)
  const [reference, setReference] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [method, setMethod] = useState<'trx' | 'flutterwave'>('trx')

  const selectedPrice = customPrice ? Number(customPrice) : STANDARD_PRICE_TRX
  const validPrice = Number.isFinite(selectedPrice) && selectedPrice >= MINIMUM_PROSPECT_PRICE_TRX

  useEffect(() => {
    fetch('/api/system-switch/file-folder').then(async response => response.ok ? response.json() : null).then(data => setWallet(data?.depositWallet || '')).catch(() => setWallet('')).finally(() => setLoadingWallet(false))
  }, [])

  const copyWallet = async () => { if (!wallet) return; await navigator.clipboard.writeText(wallet); setCopied(true); setTimeout(() => setCopied(false), 1600) }

  const recordTrxPayment = async () => {
    if (!validPrice || !reference.trim()) return
    setBusy(true); setMessage('')
    try {
      const res = await fetch('/api/system-switch/file-folder/purchase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileNumber: fileNumber || undefined, amountTrx: selectedPrice, paymentMethod: 'trx', paymentReference: reference.trim(), buyerEmail: email.trim() || undefined }) })
      const body = await res.json(); if (!res.ok) throw new Error(body.error || 'Unable to record payment')
      setMessage(`Payment recorded as ${body.purchase.status}. Administration will confirm the TRX payment and establish the File Folder.`)
    } catch (error: any) { setMessage(error.message || 'Unable to record payment') } finally { setBusy(false) }
  }

  const startFlutterwave = async () => {
    if (!validPrice || !email.trim()) { setMessage('Enter an email address for the Flutterwave payment receipt.'); return }
    setBusy(true); setMessage('')
    try {
      const res = await fetch('/api/deposit/flutterwave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountUSD: selectedPrice / TRX_PER_USD, email: email.trim(), name: 'File Folder Purchase', userType: 'file_folder', fileNumber: fileNumber || undefined }) })
      const body = await res.json(); if (!res.ok || !body.paymentLink) throw new Error(body.error || 'Unable to start Flutterwave payment')
      window.location.href = body.paymentLink
    } catch (error: any) { setMessage(error.message || 'Unable to start Flutterwave payment'); setBusy(false) }
  }

  return <section className="mt-4 rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 text-white md:p-8">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] uppercase tracking-[0.35em] text-sky-300">System Switch · File Folder</p><h2 className="mt-2 text-2xl font-semibold">Establish your File Folder</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">The standard File Folder is 35,800 TRX. A prospect may choose another value, beginning at 1,800 TRX and moving upward.</p></div><div className="rounded-2xl border border-sky-400/20 bg-sky-400/5 px-4 py-3 text-right"><p className="text-[9px] uppercase tracking-[0.25em] text-sky-300">Standard</p><p className="mt-1 text-xl font-semibold">35,800 TRX</p></div></div>
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5"><p className="text-[9px] uppercase tracking-[0.22em] text-slate-500">File Folder pricing</p><div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto] md:items-end"><div><label htmlFor="folder-price" className="text-xs text-slate-400">Choose your File Folder value</label><div className="mt-2 flex items-center rounded-xl border border-white/10 bg-slate-900/60 px-4"><input id="folder-price" type="number" min={MINIMUM_PROSPECT_PRICE_TRX} step="1" value={customPrice} onChange={event => setCustomPrice(event.target.value)} placeholder="35,800" className="w-full bg-transparent py-3 text-lg text-white outline-none"/><span className="text-xs font-semibold text-slate-500">TRX</span></div><p className="mt-2 text-[10px] text-slate-500">Minimum prospect value: 1,800 TRX. Any value above the minimum is accepted.</p></div><div className={`rounded-xl border px-5 py-3 text-right ${validPrice ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-red-400/20 bg-red-400/5'}`}><p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Selected value</p><p className="mt-1 text-xl font-semibold">{Number.isFinite(selectedPrice) ? selectedPrice.toLocaleString() : '—'} TRX</p>{!validPrice && <p className="mt-1 text-[10px] text-red-300">Must be at least 1,800 TRX.</p>}</div></div><div className="mt-4"><label htmlFor="folder-email" className="text-xs text-slate-400">Email for payment record</label><input id="folder-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none"/></div></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className={`rounded-2xl border p-5 ${method === 'trx' ? 'border-sky-400/30 bg-sky-400/5' : 'border-white/10 bg-black/30'}`}><button type="button" onClick={() => setMethod('trx')} className="flex w-full items-center gap-2 text-left"><Wallet className="h-4 w-4 text-sky-300"/><p className="text-sm font-semibold">TRX deposit wallet</p></button><p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-slate-500">Company TRX wallet</p><p className="mt-2 break-all font-mono text-xs text-slate-200">{loadingWallet ? 'Loading deposit wallet…' : wallet || 'Deposit wallet is not configured.'}</p><button type="button" disabled={!wallet} onClick={copyWallet} className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.15em] disabled:opacity-40"><Copy className="h-3.5 w-3.5"/>{copied ? 'Copied' : 'Copy wallet'}</button><p className="mt-3 text-xs leading-5 text-slate-500">Send exactly the selected TRX value, then enter your transaction reference. Administration confirms the on-chain payment before activation.</p><input value={reference} onChange={e => setReference(e.target.value)} placeholder="TRX transaction reference / hash" className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-xs text-white outline-none"/><button type="button" disabled={!validPrice || !reference.trim() || busy} onClick={recordTrxPayment} className="mt-3 w-full rounded-full bg-white/10 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] disabled:opacity-30">{busy && method === 'trx' ? 'Recording…' : 'I sent the TRX payment'}</button></div>
      <div className={`rounded-2xl border p-5 ${method === 'flutterwave' ? 'border-emerald-400/30 bg-emerald-400/5' : 'border-white/10 bg-black/30'}`}><button type="button" onClick={() => setMethod('flutterwave')} className="flex w-full items-center gap-2 text-left"><CreditCard className="h-4 w-4 text-emerald-300"/><p className="text-sm font-semibold">Flutterwave</p></button><p className="mt-3 text-xs leading-5 text-slate-500">Pay the selected File Folder value through Flutterwave. The amount is converted using the platform's TRX denomination.</p><p className="mt-3 text-xs text-slate-400">Payment amount: <span className="font-semibold text-white">${(selectedPrice / TRX_PER_USD).toFixed(2)} USD</span></p><button type="button" disabled={!validPrice || busy} onClick={startFlutterwave} className="mt-5 w-full rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200 disabled:opacity-30">{busy && method === 'flutterwave' ? 'Opening payment…' : 'Pay with Flutterwave'}</button></div>
    </div>
    {message && <p className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-5 text-slate-300">{message}</p>}
  </section>
}
