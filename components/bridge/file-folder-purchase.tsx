'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Crown,
  FileKey2,
  Flame,
  Radio,
  ShieldCheck,
  UserRound,
  Wallet,
  Waves,
} from 'lucide-react'
import { FILE_FOLDER_PRICING, getFileFolderTier } from '@/lib/file-folder-pricing'
import { WORLD_RULES } from '@/lib/world/constants'
import { WEAVE_WRITING } from '@/lib/weave-writing'

const {
  premiumFlameCoin: PREMIUM_PRICE,
  standardMinimumFlameCoin: STANDARD_MIN,
} = FILE_FOLDER_PRICING
const PUBLIC_DOOR_THRESHOLD = WORLD_RULES.FILE_FOLDER_PUBLIC_DOOR_THRESHOLD_FLAME_COIN

type PurchaseState = {
  id: string
  status: string
  fileNumber?: string | null
  amountFlameCoin?: number
}

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
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [wallet, setWallet] = useState('')
  const [loadingWallet, setLoadingWallet] = useState(true)
  const [reference, setReference] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [purchase, setPurchase] = useState<PurchaseState | null>(null)
  const [registerUrl, setRegisterUrl] = useState('')
  const [checking, setChecking] = useState(false)

  const selectedPrice = selectedTier === 'premium' ? PREMIUM_PRICE : Number(standardPrice)
  const resolvedTier = getFileFolderTier(selectedPrice)
  const validPrice =
    resolvedTier === selectedTier &&
    (selectedTier !== 'standard' || selectedPrice < PREMIUM_PRICE)

  const crossingStage = useMemo(() => {
    if (purchase?.status === 'confirmed' && purchase.fileNumber) return 5
    if (purchase?.status === 'rejected') return 3
    if (purchase) return 4
    if (reference.trim()) return 3
    if (validPrice && name.trim() && phone.trim()) return 2
    return 1
  }, [purchase, reference, validPrice, name, phone])

  useEffect(() => {
    fetch('/api/bridge/file-folder')
      .then(async response => response.ok ? response.json() : null)
      .then(data => setWallet(data?.companyTrxWallet || data?.depositWallet || ''))
      .catch(() => setWallet(''))
      .finally(() => setLoadingWallet(false))
  }, [])

  useEffect(() => {
    if (!purchase?.id || !bridgeCode || purchase.status !== 'pending_admin_confirmation') return

    let stopped = false
    let timer: number | null = null

    const check = async () => {
      if (stopped || document.visibilityState === 'hidden') {
        timer = window.setTimeout(check, 5000)
        return
      }

      setChecking(true)
      try {
        const response = await fetch(
          `/api/bridge/file-folder/purchase?purchaseId=${encodeURIComponent(purchase.id)}&bridgeCode=${encodeURIComponent(bridgeCode)}`,
          { cache: 'no-store' },
        )
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to read crossing status')

        const next = body.purchase as PurchaseState
        setPurchase(next)

        if (body.crossing?.ready && body.crossing?.registerUrl) {
          setRegisterUrl(body.crossing.registerUrl)
          setMessage(`Administration verified the File Folder. File Number ${next.fileNumber} is ready. Continue as Client to open System Switch.`)
          return
        }

        if (next.status === 'rejected') {
          setMessage('Administration could not verify this File Folder payment. Review the TRX transaction and submit the correct movement.')
          return
        }
      } catch {
        // A temporary status-read failure must not destroy the prospect crossing.
      } finally {
        setChecking(false)
      }

      if (!stopped) timer = window.setTimeout(check, 5000)
    }

    timer = window.setTimeout(check, 3500)
    return () => {
      stopped = true
      if (timer) window.clearTimeout(timer)
    }
  }, [purchase?.id, purchase?.status, bridgeCode])

  const copyWallet = async () => {
    if (!wallet) return
    await navigator.clipboard.writeText(wallet)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const recordTrxPayment = async () => {
    if (!validPrice || !reference.trim() || !name.trim() || !phone.trim()) return
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
          buyerName: name.trim(),
          buyerPhone: phone.trim(),
          buyerEmail: email.trim() || undefined,
          bridgeCode,
          providerKey,
          providerName,
          flameName,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Unable to record payment')

      setPurchase(body.purchase || null)
      setMessage(body.message || 'File Folder payment recorded. Administration verification is now open.')
    } catch (error: any) {
      setMessage(error.message || 'Unable to record payment')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id="file-folder-crossing"
      className="weave-operating-environment relative isolate mt-4 overflow-hidden border-y border-orange-200/15 bg-[#090605]/88 text-white shadow-[0_34px_120px_rgba(69,10,10,.2)] backdrop-blur-xl"
      data-file-folder-purchase-environment="prospect-crossing"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(249,115,22,.13),transparent_30%),radial-gradient(circle_at_18%_62%,rgba(56,189,248,.08),transparent_28%),linear-gradient(180deg,rgba(30,10,7,.58),rgba(3,5,8,.9))]" />
      <div className="pointer-events-none absolute inset-x-[6%] top-[18rem] h-24 -rotate-[1deg] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(255,247,237,.12),rgba(249,115,22,.14)_24%,rgba(239,68,68,.08)_43%,rgba(56,189,248,.06)_60%,transparent_76%)] blur-2xl" />
      <div className="pointer-events-none absolute inset-x-[8%] top-[21rem] h-px -rotate-[1deg] bg-gradient-to-r from-transparent via-sky-200/28 via-45% to-orange-200/50 shadow-[0_0_30px_rgba(249,115,22,.25)]" />

      <div className="relative z-10">
        <header className="grid gap-5 border-b border-white/8 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-[.22em] text-orange-200">
              <Flame className="h-3.5 w-3.5" />
              <span>Flame Event</span>
              <span className="text-white/20">·</span>
              <Waves className="h-3.5 w-3.5" />
              <span>Burning River</span>
            </div>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-[.2em] text-rose-100/45">The River that Burns</p>
            <h2 data-weave-live-word="title" className="mt-4 max-w-4xl text-3xl font-black tracking-[-.04em] sm:text-4xl">
              {WEAVE_WRITING.fileFolderCrossing.title}
            </h2>
            <p className="mt-3 max-w-3xl text-xs leading-6 text-stone-400">
              {WEAVE_WRITING.fileFolderCrossing.detail}
            </p>
          </div>

          <div className="border-l border-white/10 pl-4">
            <p className="text-[8px] font-black uppercase tracking-[.18em] text-white/30">{WEAVE_WRITING.fileFolderCrossing.state}</p>
            <p className="mt-1 text-sm font-black text-white">
              {purchase?.status === 'confirmed'
                ? WEAVE_WRITING.fileFolderCrossing.confirmedTitle
                : purchase?.status === 'rejected'
                  ? WEAVE_WRITING.fileFolderCrossing.rejectedTitle
                  : purchase
                    ? WEAVE_WRITING.fileFolderCrossing.administration
                    : WEAVE_WRITING.fileFolderCrossing.recognition}
            </p>
            {purchase?.status === 'pending_admin_confirmation' && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[.14em] text-amber-200">
                <Radio className="h-3 w-3" /> {checking ? 'Checking movement' : 'Awaiting Administration'}
              </p>
            )}
          </div>
        </header>

        <div className="grid border-b border-white/8 sm:grid-cols-5">
          {WEAVE_WRITING.fileFolderCrossing.stages.map((label, index) => {
            const step = String(index + 1).padStart(2, '0')
            const reached = crossingStage >= index + 1
            return (
              <div key={step} className="flex items-center gap-3 border-b border-white/6 px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-[8px] font-black ${reached ? 'border-orange-200/35 bg-orange-300/10 text-orange-100' : 'border-white/8 text-white/25'}`}>{step}</span>
                <p className={`text-[8px] font-black uppercase tracking-[.14em] ${reached ? 'text-white' : 'text-white/25'}`}>{label}</p>
              </div>
            )
          })}
        </div>

        <section className="grid border-b border-white/8 lg:grid-cols-[.82fr_1.18fr]">
          <div className="border-b border-white/8 px-4 py-6 sm:px-6 lg:border-b-0 lg:border-r lg:px-8">
            <p className="text-[8px] font-black uppercase tracking-[.22em] text-sky-200">{WEAVE_WRITING.fileFolderCrossing.recognition}</p>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-[9px] font-bold uppercase tracking-[.12em] text-stone-500">Prospect name</span>
                <div className="mt-2 flex items-center gap-3 border-b border-white/12 pb-2">
                  <UserRound className="h-4 w-4 text-orange-200/70" />
                  <input
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Your name"
                    disabled={Boolean(purchase)}
                    className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/20 disabled:opacity-60"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-[9px] font-bold uppercase tracking-[.12em] text-stone-500">Phone / WhatsApp</span>
                <input
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  placeholder="Phone number"
                  disabled={Boolean(purchase)}
                  className="mt-2 w-full border-b border-white/12 bg-transparent pb-2 text-sm text-white outline-none placeholder:text-white/20 disabled:opacity-60"
                />
              </label>
              <label className="block">
                <span className="text-[9px] font-bold uppercase tracking-[.12em] text-stone-500">Email · optional payment record</span>
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  disabled={Boolean(purchase)}
                  className="mt-2 w-full border-b border-white/12 bg-transparent pb-2 text-sm text-white outline-none placeholder:text-white/20 disabled:opacity-60"
                />
              </label>
            </div>
          </div>

          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <p className="text-[8px] font-black uppercase tracking-[.22em] text-orange-200">{WEAVE_WRITING.fileFolderCrossing.value}</p>
            <div className="mt-4 grid border-y border-white/8 sm:grid-cols-2">
              <button
                type="button"
                disabled={Boolean(purchase)}
                onClick={() => setSelectedTier('standard')}
                className={`min-h-36 border-b border-white/8 p-4 text-left transition sm:border-b-0 sm:border-r ${selectedTier === 'standard' ? 'bg-sky-300/[.06]' : 'bg-transparent'}`}
              >
                <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-sky-200" /><p className="text-[9px] font-black uppercase tracking-[.14em]">Standard</p></div>
                <p className="mt-4 text-2xl font-black text-sky-100">From {STANDARD_MIN.toLocaleString()}</p>
                <p className="mt-1 text-[9px] text-stone-500">Flame Coin · same amount in TRX</p>
              </button>
              <button
                type="button"
                disabled={Boolean(purchase)}
                onClick={() => setSelectedTier('premium')}
                className={`min-h-36 p-4 text-left transition ${selectedTier === 'premium' ? 'bg-orange-300/[.06]' : 'bg-transparent'}`}
              >
                <div className="flex items-center gap-2"><Crown className="h-4 w-4 text-orange-200" /><p className="text-[9px] font-black uppercase tracking-[.14em]">Premium</p></div>
                <p className="mt-4 text-2xl font-black text-orange-100">{PREMIUM_PRICE.toLocaleString()}</p>
                <p className="mt-1 text-[9px] text-stone-500">Flame Coin · fixed Premium value</p>
              </button>
            </div>

            {selectedTier === 'standard' && !purchase && (
              <div className="mt-5">
                <label htmlFor="standard-folder-price" className="text-[9px] font-bold uppercase tracking-[.12em] text-stone-500">Set Standard value</label>
                <div className="mt-2 flex items-end gap-3 border-b border-white/12 pb-2">
                  <input
                    id="standard-folder-price"
                    type="number"
                    min={STANDARD_MIN}
                    max={PREMIUM_PRICE - 0.000001}
                    step="0.000001"
                    value={standardPrice}
                    onChange={event => setStandardPrice(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-2xl font-black text-white outline-none"
                  />
                  <span className="pb-1 text-[9px] font-bold uppercase tracking-[.12em] text-stone-500">Flame Coin</span>
                </div>
              </div>
            )}

            <p className="mt-4 text-[10px] leading-5 text-stone-500">
              {validPrice && selectedPrice < PUBLIC_DOOR_THRESHOLD
                ? `You can cross and begin building after verification. The first public Customer Door remains gated until verified participation reaches ${PUBLIC_DOOR_THRESHOLD.toLocaleString()} Flame Coin.`
                : 'File Folder value establishes starting Build Power. Verified Flame Coin can increase construction capacity later.'}
            </p>
          </div>
        </section>

        <section className="grid border-b border-white/8 lg:grid-cols-[1.05fr_.95fr]">
          <div className="border-b border-white/8 px-4 py-6 sm:px-6 lg:border-b-0 lg:border-r lg:px-8">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-sky-200" />
              <p className="text-[8px] font-black uppercase tracking-[.22em] text-sky-200">{WEAVE_WRITING.fileFolderCrossing.trx}</p>
            </div>
            <p className="mt-4 text-[8px] font-bold uppercase tracking-[.15em] text-white/30">Company TRX wallet</p>
            <p className="mt-2 break-all font-mono text-xs text-stone-200">
              {loadingWallet ? 'Resolving Company TRX wallet…' : wallet || 'Company TRX wallet is not configured.'}
            </p>
            <button
              type="button"
              disabled={!wallet}
              onClick={copyWallet}
              className="mt-3 inline-flex items-center gap-2 border-b border-white/15 pb-1 text-[9px] font-black uppercase tracking-[.14em] text-white disabled:opacity-30"
            >
              <Copy className="h-3.5 w-3.5" /> {copied ? 'Wallet copied' : 'Copy wallet'}
            </button>

            <div className="mt-6 flex items-end justify-between gap-4 border-y border-white/8 py-4">
              <div>
                <p className="text-[8px] uppercase tracking-[.15em] text-stone-500">Movement amount</p>
                <p className="mt-1 text-2xl font-black text-white">{Number.isFinite(selectedPrice) ? selectedPrice.toLocaleString() : '—'} TRX</p>
              </div>
              <p className="text-right text-[8px] font-bold uppercase tracking-[.14em] text-orange-200">1 Flame Coin = 1 TRX</p>
            </div>

            {!purchase && (
              <label className="mt-5 block">
                <span className="text-[9px] font-bold uppercase tracking-[.12em] text-stone-500">TRX transaction hash</span>
                <input
                  value={reference}
                  onChange={event => setReference(event.target.value)}
                  placeholder="Paste transaction hash after sending"
                  className="mt-2 w-full border-b border-white/12 bg-transparent pb-2 font-mono text-xs text-white outline-none placeholder:text-white/20"
                />
              </label>
            )}
          </div>

          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <p className="text-[8px] font-black uppercase tracking-[.22em] text-orange-200">{WEAVE_WRITING.fileFolderCrossing.administration}</p>

            {!purchase && (
              <>
                <p className="mt-4 text-xs leading-6 text-stone-400">
                  After you send the exact TRX amount, record the transaction here. Administration verifies the real movement before WEAVE issues a File Number.
                </p>
                <button
                  type="button"
                  disabled={!validPrice || !reference.trim() || !name.trim() || !phone.trim() || busy}
                  onClick={recordTrxPayment}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-orange-200/25 bg-orange-300/10 px-5 py-3 text-[10px] font-black uppercase tracking-[.16em] text-orange-50 transition hover:bg-orange-300/15 disabled:opacity-30"
                >
                  {busy ? 'Recording movement…' : WEAVE_WRITING.fileFolderCrossing.paymentAction} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {purchase?.status === 'pending_admin_confirmation' && (
              <div className="mt-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-200/25 bg-amber-300/[.06]">
                  <ShieldCheck className="h-6 w-6 text-amber-200" />
                </div>
                <h3 className="mt-4 text-xl font-black text-white">{WEAVE_WRITING.fileFolderCrossing.pendingTitle}</h3>
                <p className="mt-2 text-xs leading-6 text-stone-400">{WEAVE_WRITING.fileFolderCrossing.pendingDetail}</p>
                <p className="mt-4 text-[8px] font-black uppercase tracking-[.16em] text-amber-200">{checking ? 'Reading verification state…' : 'Awaiting verified movement'}</p>
              </div>
            )}

            {purchase?.status === 'confirmed' && purchase.fileNumber && (
              <div className="mt-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200/25 bg-emerald-300/[.06]">
                  <CheckCircle2 className="h-6 w-6 text-emerald-200" />
                </div>
                <p className="mt-4 text-[8px] font-black uppercase tracking-[.2em] text-emerald-200">{WEAVE_WRITING.fileFolderCrossing.confirmedTitle}</p>
                <p className="mt-2 break-all font-mono text-lg font-black text-white">{purchase.fileNumber}</p>
                <p className="mt-3 text-xs leading-6 text-stone-400">{WEAVE_WRITING.fileFolderCrossing.confirmedDetail}</p>
                <Link
                  href={registerUrl || `/client/register?fileNumber=${encodeURIComponent(purchase.fileNumber)}`}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-300 px-5 py-3 text-[10px] font-black uppercase tracking-[.16em] text-[#03100a]"
                >
                  <FileKey2 className="h-4 w-4" /> {WEAVE_WRITING.fileFolderCrossing.clientAction} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {purchase?.status === 'rejected' && (
              <div className="mt-4 border-l-2 border-red-300/40 pl-4">
                <p className="text-sm font-black text-red-100">{WEAVE_WRITING.fileFolderCrossing.rejectedTitle}</p>
                <p className="mt-2 text-xs leading-5 text-stone-400">{WEAVE_WRITING.fileFolderCrossing.rejectedDetail}</p>
              </div>
            )}
          </div>
        </section>

        {message && (
          <div className="px-4 py-4 sm:px-6 lg:px-8">
            <p className="text-[10px] leading-5 text-stone-300">{message}</p>
          </div>
        )}
      </div>
    </section>
  )
}
