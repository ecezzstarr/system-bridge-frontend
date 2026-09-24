'use client'

import { useEffect, useState } from 'react'
import { Copy, Wallet } from 'lucide-react'
import { FILE_FOLDER_PRICING } from '@/lib/file-folder-pricing'

const {
  standardFlameCoin: STANDARD_PRICE_FLAME_COIN,
  minimumFlameCoin: MINIMUM_PROSPECT_PRICE_FLAME_COIN,
} = FILE_FOLDER_PRICING

export default function FileFolderPurchase({
  fileNumber = '',
  bridgeCode,
  providerKey,
  providerName,
  flameName,
}: {
  fileNumber?: string
  bridgeCode?: string
  providerKey?: string
  providerName?: string
  flameName?: string
}) {
  const [customPrice, setCustomPrice] = useState('')
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [wallet, setWallet] = useState('')
  const [loadingWallet, setLoadingWallet] = useState(true)
  const [reference, setReference] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const selectedPrice = customPrice ? Number(customPrice) : STANDARD_PRICE_FLAME_COIN
  const validPrice =
    Number.isFinite(selectedPrice) &&
    selectedPrice >= MINIMUM_PROSPECT_PRICE_FLAME_COIN

  useEffect(() => {
    fetch('/api/system-switch/file-folder')
      .then(async response => response.ok ? response.json() : null)
      .then(data => setWallet(data?.companyTrxWallet || data?.depositWallet || ''))
      .catch(() => setWallet(''))
      .finally(() => setLoadingWallet(false))
  }, [])

  const copyWallet = async () => {
    if (!wallet) return
    await navigator.clipboard.writeText(wallet)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const recordTrxPayment = async () => {
    if (!validPrice || !reference.trim()) return
    setBusy(true)
    setMessage('')

    try {
      const res = await fetch('/api/system-switch/file-folder/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileNumber: fileNumber || undefined,
          amountFlameCoin: selectedPrice,
          paymentMethod: 'trx',
          paymentReference: reference.trim(),
          buyerEmail: email.trim() || undefined,
          bridgeCode,
          providerKey,
          providerName,
          flameName,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Unable to record payment')

      setMessage(
        `Payment recorded as ${body.purchase.status}. Administration will verify the TRX payment. 1 TRX = 1 Flame Coin inside Weave.`
      )
    } catch (error: any) {
      setMessage(error.message || 'Unable to record payment')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-4 rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 text-white md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-sky-300">System Switch · File Folder</p>
          <h2 className="mt-2 text-2xl font-semibold">Establish your File Folder</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            The standard File Folder is {STANDARD_PRICE_FLAME_COIN.toLocaleString()} Flame Coin.
            Flame Coin is Weave&apos;s internal wrapper for TRX value, so the same numeric amount is paid in TRX.
          </p>
        </div>
        <div className="rounded-2xl border border-sky-400/20 bg-sky-400/5 px-4 py-3 text-right">
          <p className="text-[9px] uppercase tracking-[0.25em] text-sky-300">Standard</p>
          <p className="mt-1 text-xl font-semibold">{STANDARD_PRICE_FLAME_COIN.toLocaleString()} Flame Coin</p>
          <p className="mt-1 text-[10px] text-slate-500">{STANDARD_PRICE_FLAME_COIN.toLocaleString()} TRX payment</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
        <p className="text-[9px] uppercase tracking-[0.22em] text-slate-500">File Folder pricing</p>
        <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label htmlFor="folder-price" className="text-xs text-slate-400">Choose your File Folder value</label>
            <div className="mt-2 flex items-center rounded-xl border border-white/10 bg-slate-900/60 px-4">
              <input
                id="folder-price"
                type="number"
                min={MINIMUM_PROSPECT_PRICE_FLAME_COIN}
                step="1"
                value={customPrice}
                onChange={event => setCustomPrice(event.target.value)}
                placeholder={STANDARD_PRICE_FLAME_COIN.toLocaleString()}
                className="w-full bg-transparent py-3 text-lg text-white outline-none"
              />
              <span className="text-xs font-semibold text-slate-500">Flame Coin</span>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              Minimum prospect value: {MINIMUM_PROSPECT_PRICE_FLAME_COIN.toLocaleString()} Flame Coin.
              Required TRX payment is the same number because 1 Flame Coin = 1 TRX.
            </p>
          </div>
          <div className={`rounded-xl border px-5 py-3 text-right ${validPrice ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-red-400/20 bg-red-400/5'}`}>
            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Selected value</p>
            <p className="mt-1 text-xl font-semibold">{Number.isFinite(selectedPrice) ? selectedPrice.toLocaleString() : '—'} Flame Coin</p>
            <p className="mt-1 text-[10px] text-slate-500">{Number.isFinite(selectedPrice) ? selectedPrice.toLocaleString() : '—'} TRX required</p>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="folder-email" className="text-xs text-slate-400">Email for payment record</label>
          <input
            id="folder-email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none"
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-sky-400/30 bg-sky-400/5 p-5">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-sky-300" />
          <p className="text-sm font-semibold">Pay with TRX</p>
        </div>
        <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-slate-500">Company TRX payment wallet</p>
        <p className="mt-2 break-all font-mono text-xs text-slate-200">
          {loadingWallet ? 'Loading Company TRX wallet…' : wallet || 'Company TRX wallet is not configured.'}
        </p>
        <button
          type="button"
          disabled={!wallet}
          onClick={copyWallet}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.15em] disabled:opacity-40"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? 'Copied' : 'Copy wallet'}
        </button>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Send exactly {Number.isFinite(selectedPrice) ? selectedPrice.toLocaleString() : 'the selected amount'} TRX,
          then enter the transaction hash. Administration verifies the payment before activating the File Folder.
        </p>
        <input
          value={reference}
          onChange={event => setReference(event.target.value)}
          placeholder="TRX transaction hash"
          className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-xs text-white outline-none"
        />
        <button
          type="button"
          disabled={!validPrice || !reference.trim() || busy}
          onClick={recordTrxPayment}
          className="mt-3 w-full rounded-full bg-white/10 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] disabled:opacity-30"
        >
          {busy ? 'Recording…' : 'I sent the TRX payment'}
        </button>
      </div>

      {message && (
        <p className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-5 text-slate-300">
          {message}
        </p>
      )}
    </section>
  )
}
