'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
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
import { WEAVE_WRITING } from '@/lib/weave-writing'

const {
  premiumFlameCoin: PREMIUM_PRICE,
  proNegotiatedMinimumFlameCoin: PRO_NEGOTIATED_MIN,
  proStartingFlameCoin: PRO_STARTING_PRICE,
} = FILE_FOLDER_PRICING

// PUBLIC_DOOR_THRESHOLD is intentionally retired from prospect purchase gating.
// Every valid File Folder purchase includes Customer Door construction after verification.

type PurchaseState = {
  id: string
  status: string
  fileNumber?: string | null
  amountFlameCoin?: number
  amountNgn?: number
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
  const router = useRouter()
  const purchaseStorageKey = bridgeCode ? `weave:bridge-purchase:${bridgeCode}` : `weave:file-folder-purchase:${fileNumber || 'direct'}`
  const [selectedTier, setSelectedTier] = useState<'pro' | 'premium'>('pro')
  const [proPrice, setProPrice] = useState(String(PRO_STARTING_PRICE))
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [purchase, setPurchase] = useState<PurchaseState | null>(null)
  const [registerUrl, setRegisterUrl] = useState('')
  const [checking, setChecking] = useState(false)

  const selectedPrice = selectedTier === 'premium' ? PREMIUM_PRICE : Number(proPrice)
  const resolvedTier = getFileFolderTier(selectedPrice, selectedTier)
  const validPrice = resolvedTier === selectedTier

  const crossingStage = useMemo(() => {
    if (purchase?.status === 'confirmed' && purchase.fileNumber) return 5
    if (purchase?.status === 'rejected') return 3
    if (purchase) return 4
    if (validPrice && name.trim() && phone.trim()) return 2
    return 1
  }, [purchase, validPrice, name, phone])

  useEffect(() => {
    if (!purchaseStorageKey || purchase) return
    try {
      const storedPurchaseId = window.sessionStorage.getItem(purchaseStorageKey)
      if (storedPurchaseId) {
        setPurchase({ id: storedPurchaseId, status: 'pending_admin_confirmation' })
        setMessage('Restoring this File Folder crossing while Administration verification is pending…')
      }
    } catch {
      // Session storage is optional. The live Bridge still works without it.
    }
  }, [purchaseStorageKey, purchase])

  const openReleasedCrossing = (url: string, fileNumber?: string | null) => {
    if (!url) return
    setRegisterUrl(url)
    if (purchaseStorageKey) {
      try { window.sessionStorage.removeItem(purchaseStorageKey) } catch {}
    }
    setMessage(`Administration verified the payment and issued File Number ${fileNumber || ''}. Opening the Client crossing…`)
    window.setTimeout(() => router.replace(url), 900)
  }

  useEffect(() => {
    if (!purchase?.id || !['pending_payment', 'pending_admin_confirmation'].includes(purchase.status)) return

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
          `/api/bridge/file-folder/purchase?purchaseId=${encodeURIComponent(purchase.id)}${bridgeCode ? `&bridgeCode=${encodeURIComponent(bridgeCode)}` : ''}`,
          { cache: 'no-store' },
        )
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to read crossing status')

        const next = body.purchase as PurchaseState
        setPurchase(next)

        if (body.crossing?.ready && body.crossing?.registerUrl) {
          openReleasedCrossing(body.crossing.registerUrl, next.fileNumber)
          return
        }

        if (next.status === 'rejected') {
          setMessage('Administration could not verify this File Folder payment. Contact Administration before starting another checkout.')
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

  const startPaystackCheckout = async () => {
    if (!validPrice || !name.trim() || !phone.trim() || !email.trim() || busy) return
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
          paymentMethod: 'paystack',
          buyerName: name.trim(),
          buyerPhone: phone.trim(),
          buyerEmail: email.trim(),
          bridgeCode,
          providerKey,
          providerName,
          flameName,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Unable to start Paystack checkout')
      const nextPurchase = body.purchase || null
      if (!nextPurchase?.id || !body.paymentLink) throw new Error('Paystack checkout did not return a valid purchase and payment link.')
      setPurchase(nextPurchase)
      if (purchaseStorageKey) {
        try { window.sessionStorage.setItem(purchaseStorageKey, String(nextPurchase.id)) } catch {}
      }
      setMessage(body.message || 'Continue to Paystack to complete the File Folder payment.')
      window.location.assign(body.paymentLink)
    } catch (error: any) {
      setMessage(error.message || 'Unable to start Paystack checkout')
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
            {['pending_payment', 'pending_admin_confirmation'].includes(purchase?.status || '') && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[.14em] text-amber-200">
                <Radio className="h-3 w-3" /> {checking ? 'Reading Administration decision' : 'Awaiting Administration verification'}
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
                <span className="text-[9px] font-bold uppercase tracking-[.12em] text-stone-500">Email · required for Paystack checkout</span>
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
                onClick={() => setSelectedTier('pro')}
                className={`min-h-36 border-b border-white/8 p-4 text-left transition sm:border-b-0 sm:border-r ${selectedTier === 'pro' ? 'bg-sky-300/[.06]' : 'bg-transparent'}`}
              >
                <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-sky-200" /><p className="text-[9px] font-black uppercase tracking-[.14em]">Pro File Folder</p></div>
                <p className="mt-4 text-2xl font-black text-sky-100">From {PRO_STARTING_PRICE.toLocaleString()}</p>
                <p className="mt-1 text-[9px] text-stone-500">Flame Coin · negotiable to {PRO_NEGOTIATED_MIN.toLocaleString()}</p>
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

            {selectedTier === 'pro' && !purchase && (
              <div className="mt-5">
                <label htmlFor="pro-folder-price" className="text-[9px] font-bold uppercase tracking-[.12em] text-stone-500">Negotiated Pro value</label>
                <div className="mt-2 flex items-end gap-3 border-b border-white/12 pb-2">
                  <input
                    id="pro-folder-price"
                    type="number"
                    min={PRO_NEGOTIATED_MIN}
                    max={PREMIUM_PRICE - 0.000001}
                    step="0.000001"
                    value={proPrice}
                    onChange={event => setProPrice(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-2xl font-black text-white outline-none"
                  />
                  <span className="pb-1 text-[9px] font-bold uppercase tracking-[.12em] text-stone-500">Flame Coin</span>
                </div>
                <p className="mt-2 text-[9px] leading-4 text-stone-500">Normal Pro starting value is {PRO_STARTING_PRICE.toLocaleString()} Flame Coin. Administration may approve a negotiated Pro sale down to {PRO_NEGOTIATED_MIN.toLocaleString()}.</p>
              </div>
            )}

            <p className="mt-4 text-[10px] leading-5 text-stone-500">
              File Folder value establishes starting Build Power. After verification, the purchased File Folder begins with its included Customer Door construction; later verified participation can increase construction capacity.
            </p>
          </div>
        </section>

        <section className="grid border-b border-white/8 lg:grid-cols-[1.05fr_.95fr]">
          <div className="border-b border-white/8 px-4 py-6 sm:px-6 lg:border-b-0 lg:border-r lg:px-8">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-200" />
              <p className="text-[8px] font-black uppercase tracking-[.22em] text-sky-200">Paystack Checkout</p>
            </div>
            <p className="mt-4 text-xs leading-6 text-stone-400">
              Pay securely in Naira through Paystack. The checkout amount is calculated from the current Flame Coin/TRX payment rate. Do not send TRX or submit a manual transaction hash for this purchase.
            </p>
            <div className="mt-6 border-y border-white/8 py-4">
              <p className="text-[8px] uppercase tracking-[.15em] text-stone-500">File Folder value</p>
              <p className="mt-1 text-2xl font-black text-white">{Number.isFinite(selectedPrice) ? selectedPrice.toLocaleString() : '—'} Flame Coin</p>
              <p className="mt-1 text-[9px] text-stone-500">The exact NGN total appears in Paystack checkout.</p>
            </div>
          </div>

          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <p className="text-[8px] font-black uppercase tracking-[.22em] text-orange-200">{WEAVE_WRITING.fileFolderCrossing.administration}</p>

            {!purchase && (
              <>
                <p className="mt-4 text-xs leading-6 text-stone-400">
                  Continue to Paystack to pay the File Folder amount. After Paystack verifies the payment, Administration reviews the purchase before the File Number is issued and the Client crossing opens.
                </p>
                <button
                  type="button"
                  disabled={!validPrice || !name.trim() || !phone.trim() || !email.trim() || busy}
                  onClick={startPaystackCheckout}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-orange-200/25 bg-orange-300/10 px-5 py-3 text-[10px] font-black uppercase tracking-[.16em] text-orange-50 transition hover:bg-orange-300/15 disabled:opacity-30"
                >
                  {busy ? 'Opening Paystack…' : 'Continue to Paystack'} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {['pending_payment', 'pending_admin_confirmation'].includes(purchase?.status || '') && (
              <div className="mt-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-200/25 bg-amber-300/[.06]">
                  <ShieldCheck className="h-6 w-6 text-amber-200" />
                </div>
                <h3 className="mt-4 text-xl font-black text-white">{WEAVE_WRITING.fileFolderCrossing.pendingTitle}</h3>
                <p className="mt-2 text-xs leading-6 text-stone-400">Paystack has verified your payment and sent the purchase to Administration. The crossing stays closed until Administration approves it and issues your File Number.</p>
                <p className="mt-4 text-[8px] font-black uppercase tracking-[.16em] text-amber-200">{purchase?.status === 'pending_payment' ? 'Waiting for Paystack payment verification' : checking ? 'Reading Administration verification…' : 'Waiting for Administration approval and File Number'}</p>
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