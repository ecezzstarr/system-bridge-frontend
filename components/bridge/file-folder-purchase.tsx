'use client'

import { useEffect, useState } from 'react'
import { Copy, Wallet, Crown } from 'lucide-react'
import { FILE_FOLDER_PRICING, getFileFolderTier } from '@/lib/file-folder-pricing'
import { WORLD_RULES } from '@/lib/world/constants'

const {
  premiumFlameCoin: PREMIUM_PRICE,
  standardMinimumFlameCoin: STANDARD_MIN,
} = FILE_FOLDER_PRICING
const PUBLIC_DOOR_THRESHOLD = WORLD_RULES.FILE_FOLDER_PUBLIC_DOOR_THRESHOLD_FLAME_COIN

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
  const [selectedTier, setSelectedTier] = useState<'standard' | 'premium'>('standard')
  const [standardPrice, setStandardPrice] = useState(String(STANDARD_MIN))
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [wallet, setWallet] = useState('')
  const [loadingWallet, setLoadingWallet] = useState(true)
  const [reference, setReference] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const selectedPrice =
    selectedTier === 'premium' ? PREMIUM_PRICE : Number(standardPrice)

  const resolvedTier = getFileFolderTier(selectedPrice)
  const validPrice =
    resolvedTier === selectedTier &&
    (selectedTier !== 'standard' || selectedPrice < PREMIUM_PRICE)

  useEffect(() => {
    fetch('/api/bridge/file-folder')
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
      const res = await fetch('/api/bridge/file-folder/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileNumber: fileNumber || undefined,
          amountFlameCoin: selectedPrice,
          fileFolderTier: selectedTier,
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
        `${selectedTier === 'premium' ? 'Premium' : 'Standard'} File Folder payment recorded. Administration will verify ${selectedPrice.toLocaleString()} TRX and recognize the same amount as Flame Coin.`
      )
    } catch (error: any) {
      setMessage(error.message || 'Unable to record payment')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-4 rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 text-white md:p-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.35em] text-sky-300">Bridge → File Folder</p>
        <h2 className="mt-2 text-2xl font-semibold">Choose your File Folder</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          The File Folder establishes the place that becomes a Client world after payment verification and Client registration. Premium remains {PREMIUM_PRICE.toLocaleString()} Flame Coin.
          Standard lets anyone enter from {STANDARD_MIN.toLocaleString()} Flame Coin up to any value below Premium.
          1 Flame Coin = 1 TRX. File Folder value also establishes starting Build Power.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setSelectedTier('premium')}
          className={`rounded-2xl border p-5 text-left transition-all ${selectedTier === 'premium' ? 'border-[#e8b93f]/50 bg-[#e8b93f]/10' : 'border-white/10 bg-black/30'}`}
        >
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-[#e8b93f]" />
            <p className="text-sm font-semibold">Premium File Folder</p>
          </div>
          <p className="mt-3 text-3xl font-black text-[#e8b93f]">{PREMIUM_PRICE.toLocaleString()}</p>
          <p className="text-xs text-slate-400">Flame Coin · {PREMIUM_PRICE.toLocaleString()} TRX</p>
          <p className="mt-3 text-xs leading-5 text-slate-500">Fixed Premium File Folder value.</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTier('standard')}
          className={`rounded-2xl border p-5 text-left transition-all ${selectedTier === 'standard' ? 'border-sky-400/40 bg-sky-400/5' : 'border-white/10 bg-black/30'}`}
        >
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-sky-300" />
            <p className="text-sm font-semibold">Standard File Folder</p>
          </div>
          <p className="mt-3 text-3xl font-black text-sky-300">From {STANDARD_MIN.toLocaleString()}</p>
          <p className="text-xs text-slate-400">Flame Coin · same amount in TRX</p>
          <p className="mt-3 text-xs leading-5 text-slate-500">Choose any amount from {STANDARD_MIN.toLocaleString()} up to anything below {PREMIUM_PRICE.toLocaleString()}. Below {PUBLIC_DOOR_THRESHOLD.toLocaleString()} Flame Coin you can cross and begin building, but the first public Customer Door requires later verified funding to reach that threshold.</p>
        </button>
      </div>

      {selectedTier === 'standard' && (
        <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-5">
          <label htmlFor="standard-folder-price" className="text-xs text-slate-300">Choose Standard File Folder value</label>
          <div className="mt-2 flex items-center rounded-xl border border-white/10 bg-slate-900/60 px-4">
            <input
              id="standard-folder-price"
              type="number"
              min={STANDARD_MIN}
              max={PREMIUM_PRICE - 0.000001}
              step="0.000001"
              value={standardPrice}
              onChange={event => setStandardPrice(event.target.value)}
              className="w-full bg-transparent py-3 text-lg text-white outline-none"
            />
            <span className="text-xs font-semibold text-slate-500">Flame Coin</span>
          </div>
          {validPrice && selectedPrice < PUBLIC_DOOR_THRESHOLD && <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[10px] leading-5 text-amber-100">This starting value is below half of Premium. After verification and Client registration, System Switch can open and the File Folder can begin early builds, but the first Customer Door will stop at a funding gate until total verified participation reaches {PUBLIC_DOOR_THRESHOLD.toLocaleString()} Flame Coin. Additional verified Flame Coin also increases build speed.</div>}
          {validPrice && selectedPrice >= PUBLIC_DOOR_THRESHOLD && <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-[10px] leading-5 text-emerald-200">This starting value clears the first Customer Door funding threshold once the Client enters System Switch. Higher File Folder value and later verified Flame Coin increase construction speed.</div>}
          <p className={`mt-2 text-[10px] ${validPrice ? 'text-slate-500' : 'text-red-300'}`}>
            {validPrice
              ? `You will send ${selectedPrice.toLocaleString()} TRX.`
              : `Standard must be at least ${STANDARD_MIN.toLocaleString()} and below ${PREMIUM_PRICE.toLocaleString()} Flame Coin.`}
          </p>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-5">
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
          Send exactly {Number.isFinite(selectedPrice) ? selectedPrice.toLocaleString() : 'the selected amount'} TRX.
          Administration verifies the payment before activating the File Folder.
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
          {busy ? 'Recording…' : `I sent ${selectedTier === 'premium' ? 'Premium' : 'Standard'} TRX payment`}
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
