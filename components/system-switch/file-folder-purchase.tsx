'use client'

import { useState } from 'react'
import { CreditCard, Copy, Wallet } from 'lucide-react'

const STANDARD_PRICE_TRX = 35800
const MINIMUM_PROSPECT_PRICE_TRX = 1800

export default function FileFolderPurchase() {
  const [customPrice, setCustomPrice] = useState('')
  const [copied, setCopied] = useState(false)
  const [wallet, setWallet] = useState('')
  const [loadingWallet, setLoadingWallet] = useState(true)

  const selectedPrice = customPrice ? Number(customPrice) : STANDARD_PRICE_TRX
  const validCustomPrice = !customPrice || (Number.isFinite(selectedPrice) && selectedPrice >= MINIMUM_PROSPECT_PRICE_TRX)

  useState(() => {
    fetch('/api/system-switch/file-folder')
      .then(async response => response.ok ? response.json() : null)
      .then(data => setWallet(data?.depositWallet || ''))
      .catch(() => setWallet(''))
      .finally(() => setLoadingWallet(false))
  })

  const copyWallet = async () => {
    if (!wallet) return
    await navigator.clipboard.writeText(wallet)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <section className="mt-4 rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 text-white md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-sky-300">System Switch · File Folder</p>
          <h2 className="mt-2 text-2xl font-semibold">Establish your File Folder</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">The standard File Folder is 35,800 TRX. A prospect may choose another value, beginning at 1,800 TRX and moving upward.</p>
        </div>
        <div className="rounded-2xl border border-sky-400/20 bg-sky-400/5 px-4 py-3 text-right">
          <p className="text-[9px] uppercase tracking-[0.25em] text-sky-300">Standard</p>
          <p className="mt-1 text-xl font-semibold">35,800 TRX</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 lg:col-span-2">
          <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-sky-300"/><p className="text-[9px] uppercase tracking-[0.22em] text-slate-500">TRX deposit for File Folder</p></div>
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500">Company TRX wallet</p>
            <p className="mt-2 break-all font-mono text-xs text-slate-200">{loadingWallet ? 'Loading deposit wallet…' : wallet || 'Deposit wallet is not configured.'}</p>
            <button type="button" disabled={!wallet} onClick={copyWallet} className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.15em] disabled:opacity-40"><Copy className="h-3.5 w-3.5"/>{copied ? 'Copied' : 'Copy wallet'}</button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Send the selected File Folder value in TRX to the displayed company wallet. Administration confirms the payment and establishes the File Folder.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-emerald-300"/><p className="text-[9px] uppercase tracking-[0.22em] text-slate-500">Flutterwave</p></div>
          <p className="mt-3 text-sm font-semibold">Pay by Flutterwave</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">Flutterwave is available as an alternative deposit route. The payment is credited into the platform's TRX denomination after verification.</p>
          <a href="/client/deposit" className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">Open Flutterwave</a>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5">
        <p className="text-[9px] uppercase tracking-[0.22em] text-slate-500">File Folder pricing</p>
        <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label htmlFor="folder-price" className="text-xs text-slate-400">Choose your File Folder value</label>
            <div className="mt-2 flex items-center rounded-xl border border-white/10 bg-slate-900/60 px-4">
              <input id="folder-price" type="number" min={MINIMUM_PROSPECT_PRICE_TRX} step="1" value={customPrice} onChange={event => setCustomPrice(event.target.value)} placeholder="35,800" className="w-full bg-transparent py-3 text-lg text-white outline-none" />
              <span className="text-xs font-semibold text-slate-500">TRX</span>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">Minimum prospect value: 1,800 TRX. Leave blank to use 35,800 TRX.</p>
          </div>
          <div className={`rounded-xl border px-5 py-3 text-right ${validCustomPrice ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-red-400/20 bg-red-400/5'}`}>
            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Selected value</p>
            <p className="mt-1 text-xl font-semibold">{Number.isFinite(selectedPrice) ? selectedPrice.toLocaleString() : '—'} TRX</p>
            {!validCustomPrice && <p className="mt-1 text-[10px] text-red-300">Must be at least 1,800 TRX.</p>}
          </div>
        </div>
      </div>
    </section>
  )
}
