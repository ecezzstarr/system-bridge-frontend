'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, Layers3, ReceiptText, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { WORLD_RULES } from '@/lib/world/constants'
import { WeaveSystemRoom } from '@/components/world/weave-system-room'
import { visiblePoll } from '@/lib/visible-poll'

const SUBSCRIPTION_AMOUNT = WORLD_RULES.BRIDGER_CONTINUANCE_NGN

type Continuance = {
  id: string
  role: string
  status: 'active' | 'due' | 'suspended'
  expiry: string | null
  is_exempt: boolean
  last_paid_at: string | null
}

type BundleService = {
  key: 'continuance' | 'bridge_ai' | 'echo'
  label: string
  active: boolean
  due: boolean
  exempt?: boolean
  expiry: string | null
  amountFlameCoin: number | null
}

type BundleQuote = {
  success: boolean
  services: BundleService[]
  allActive: boolean
  totalDueFlameCoin: number | null
  availableFlameCoin: number
  rateNgnPerFlameCoin: number | null
}

export default function BridgerContinuancePage() {
  const { user, token } = useAuth()
  const userId = user?.id ?? null
  const [subscription, setContinuance] = useState<Continuance | null>(null)
  const [bundle, setBundle] = useState<BundleQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [continuanceRenewing, setContinuanceRenewing] = useState(false)
  const [allRenewing, setAllRenewing] = useState(false)
  const [reference, setReference] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    void fetchContinuance()
    return visiblePoll(signal=>fetchContinuance(true,signal),30000,false)
  }, [userId, token])

  async function fetchContinuance(silent = false, signal?: AbortSignal) {
    if (!silent) setLoading(true)
    try {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
      const [continuanceRes, bundleRes] = await Promise.all([
        fetch('/api/bridger/subscription', { headers, cache: 'no-store', signal }),
        fetch('/api/bridger/subscription/all', { headers, cache: 'no-store', signal }),
      ])
      const [continuanceData, bundleData] = await Promise.all([continuanceRes.json(), bundleRes.json()])
      if (continuanceData.success) setContinuance(continuanceData.subscription)
      if (bundleRes.ok && bundleData.success) setBundle(bundleData)
      if (!continuanceData.success) setError(continuanceData.error || 'Failed to load Continuance')
      else setError(null)
    } catch (fetchError: any) {
      if (fetchError?.name !== 'AbortError') setError('Failed to load Bridger subscriptions')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function handleContinuanceOnly() {
    if (!userId) return
    setContinuanceRenewing(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/bridger/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action: 'auto_deduct' }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(data.renewed ? 'Continuance subscribed for 30 days.' : 'Continuance is already current.')
        await fetchContinuance(true)
      } else if (data.reason === 'insufficient_balance') {
        setError(`Continuance needs ${Number(data.requiredFlameCoin || 0).toLocaleString()} Flame Coin; available balance is ${Number(data.availableFlameCoin || 0).toLocaleString()}.`)
      } else {
        setError('Continuance subscription could not complete.')
      }
    } catch {
      setError('Continuance subscription could not complete.')
    } finally {
      setContinuanceRenewing(false)
    }
  }

  async function handleSubscribeAll() {
    if (!userId) return
    setAllRenewing(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/bridger/subscription/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const data = await res.json()
      if (data.success) {
        setMessage(data.renewed ? `Subscribed ${Number(data.services?.length || 0)} due Bridger service${Number(data.services?.length || 0) === 1 ? '' : 's'} together.` : 'All Bridger essentials are already current.')
        await fetchContinuance(true)
      } else if (data.reason === 'insufficient_balance') {
        setError(`Subscribe All needs ${Number(data.requiredFlameCoin || 0).toLocaleString()} Flame Coin; available balance is ${Number(data.availableFlameCoin || 0).toLocaleString()}. Nothing was charged.`)
      } else if (data.reason === 'rate_unavailable') {
        setError('Continuance conversion is temporarily unavailable. Nothing was charged.')
      } else {
        setError('Subscribe All could not complete. Nothing was charged.')
      }
    } catch {
      setError('Subscribe All could not complete. Nothing was charged.')
    } finally {
      setAllRenewing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    if (!reference.trim()) {
      setError('Enter a payment reference')
      return
    }
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/bridger/subscription/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ reference: reference.trim(), paymentMethod }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage('Continuance payment submitted to Administration for review.')
        setReference('')
      } else setError(data.message || 'Submission failed')
    } catch {
      setError('Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const status = subscription?.status || 'due'
  const statusTone = status === 'active'
    ? 'text-emerald-300 border-emerald-300/20 bg-emerald-400/[.05]'
    : status === 'suspended'
      ? 'text-red-300 border-red-300/20 bg-red-400/[.05]'
      : 'text-amber-300 border-amber-300/20 bg-amber-400/[.05]'

  const left = <>
    <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[.035] p-4">
      <ShieldCheck className="h-5 w-5 text-emerald-300" />
      <p className="mt-3 text-sm font-black text-white">Partnership continuity</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">Continuance remains its own Bridger subscription. Active Continuance opens Ace and the Agentic-Bridger lifestyle.</p>
    </section>
    <section className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Choice</p>
      <div className="mt-3 space-y-3 text-xs text-slate-300">
        <p>1 · Subscribe Continuance only when that is what you need.</p>
        <p>2 · Subscribe All activates only services that are due.</p>
        <p>3 · Current services are never charged twice.</p>
      </div>
    </section>
  </>

  const center = loading
    ? <div className="flex min-h-[420px] items-center justify-center"><Clock3 className="h-7 w-7 animate-pulse text-emerald-300" /></div>
    : !userId
      ? <div className="rounded-2xl border border-red-300/15 bg-red-400/[.035] p-5 text-sm text-red-200">A Bridger position is required.</div>
      : <>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
          <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-emerald-300">Standing console</p><h2 className="mt-1 text-xl font-black text-white">Your Bridger subscriptions</h2></div>
          <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase ${statusTone}`}>{status}</span>
        </div>

        {subscription && <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><CalendarClock className="h-4 w-4 text-sky-300" /><p className="mt-3 text-[9px] uppercase text-slate-500">Continuance expiry</p><p className="mt-1 text-sm font-black text-white">{subscription.expiry ? new Date(subscription.expiry).toLocaleDateString() : 'Not set'}</p></div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><ReceiptText className="h-4 w-4 text-amber-300" /><p className="mt-3 text-[9px] uppercase text-slate-500">Last Continuance</p><p className="mt-1 text-sm font-black text-white">{subscription.last_paid_at ? new Date(subscription.last_paid_at).toLocaleDateString() : 'Never'}</p></div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><CheckCircle2 className="h-4 w-4 text-emerald-300" /><p className="mt-3 text-[9px] uppercase text-slate-500">Position</p><p className="mt-1 text-sm font-black text-white">{subscription.is_exempt ? 'Exempt' : 'Continuance governed'}</p></div>
        </div>}

        {!subscription?.is_exempt && <section className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-400/[.03] p-4">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">Continuance only</p>
          <h3 className="mt-1 text-lg font-black text-white">₦{SUBSCRIPTION_AMOUNT.toLocaleString()} / 30 days</h3>
          <p className="mt-2 text-xs leading-5 text-slate-400">Subscribe or renew Continuance personally without buying Bridge AI or Echo.</p>
          <p className="mt-2 text-[10px] leading-4 text-slate-500">Automatic Continuance remains active at renewal time. Retry automatic wallet renewal personally with this control whenever needed.</p>
          <button type="button" onClick={() => void handleContinuanceOnly()} disabled={continuanceRenewing} className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-950 disabled:opacity-40">{continuanceRenewing ? 'Subscribing Continuance…' : 'Subscribe / Renew Continuance'}</button>
        </section>}

        <section className="mt-5 rounded-2xl border border-cyan-300/15 bg-cyan-400/[.03] p-4">
          <div className="flex items-start gap-3"><Layers3 className="mt-0.5 h-5 w-5 text-cyan-300" /><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">One movement</p><h3 className="mt-1 text-lg font-black text-white">Subscribe All Bridger Essentials</h3></div></div>
          <p className="mt-2 text-xs leading-5 text-slate-400">WEAVE checks Continuance, Bridge AI and Echo, then charges only the services that are due. If the wallet cannot cover the full due amount, nothing is charged.</p>
          <div className="mt-4 space-y-2">
            {(bundle?.services || []).map(service => <div key={service.key} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs"><span className="font-bold text-white">{service.label}</span><span className={service.active || service.exempt ? 'text-emerald-300' : 'text-amber-300'}>{service.exempt ? 'exempt' : service.active ? 'current' : `${Number(service.amountFlameCoin || 0).toLocaleString()} Flame Coin due`}</span></div>)}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs"><span className="text-slate-400">Due now</span><span className="font-black text-white">{bundle?.totalDueFlameCoin == null ? 'Quote unavailable' : `${Number(bundle.totalDueFlameCoin).toLocaleString()} Flame Coin`}</span></div>
          <button type="button" onClick={() => void handleSubscribeAll()} disabled={allRenewing || bundle?.allActive || bundle?.totalDueFlameCoin == null} className="mt-4 w-full rounded-xl border border-cyan-300/20 bg-cyan-400/[.1] px-4 py-3 text-xs font-black uppercase tracking-wider text-cyan-100 disabled:opacity-40">{allRenewing ? 'Subscribing all…' : bundle?.allActive ? 'All essentials current' : 'Subscribe / Renew All'}</button>
        </section>

        {(error || message) && <div className={`mt-4 rounded-xl border px-3 py-2 text-xs ${error ? 'border-red-300/15 bg-red-400/[.04] text-red-200' : 'border-emerald-300/15 bg-emerald-400/[.04] text-emerald-200'}`}>{error || message}</div>}

        {!subscription?.is_exempt && <form onSubmit={handleSubmit} className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-500">Continuance fallback payment proof</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">Use only when the Flame Coin wallet cannot cover personal Continuance.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label><span className="text-[9px] font-black uppercase text-slate-500">Payment method</span><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"><option value="bank_transfer">Bank Transfer</option><option value="cash">Cash</option><option value="other">Other</option></select></label>
            <label><span className="text-[9px] font-black uppercase text-slate-500">Reference / proof</span><input value={reference} onChange={e => setReference(e.target.value)} placeholder="Transaction ID or teller number" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white" /></label>
          </div>
          <button data-presence-output="Submit Bridger continuance movement" disabled={submitting} className="mt-4 w-full rounded-xl border border-white/10 bg-white/[.05] px-4 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-40">{submitting ? 'Submitting…' : 'Submit Continuance Proof'}</button>
        </form>}
      </>

  const right = <>
    <section className="rounded-3xl border border-amber-300/15 bg-amber-400/[.035] p-4"><p className="text-[9px] font-black uppercase tracking-wider text-amber-300">Continuance</p><p className="mt-2 text-2xl font-black text-white">₦{SUBSCRIPTION_AMOUNT.toLocaleString()}</p><p className="mt-2 text-xs leading-5 text-slate-400">Continuance can always be subscribed independently. When active, it opens Ace and Agentic-Bridger for the Bridger.</p></section>
    <section className="rounded-3xl border border-cyan-300/15 bg-cyan-400/[.035] p-4"><p className="text-[9px] font-black uppercase tracking-wider text-cyan-300">Other essentials</p><p className="mt-2 text-sm font-black text-white">Bridge AI · {WORLD_RULES.BRIDGE_AI_SUBSCRIPTION_FEE_FLAME_COIN} Flame Coin</p><p className="mt-1 text-sm font-black text-white">Echo · 7 Flame Coin</p><p className="mt-2 text-xs leading-5 text-slate-400">Each remains independently usable, while Subscribe All removes repeated renewal steps.</p><Link href="/bridger/bridge-ai" className="mt-3 flex items-center justify-between rounded-xl border border-cyan-300/15 bg-cyan-400/[.04] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-cyan-100"><span>Subscribe to Bridge AI</span><span>→</span></Link><Link href="/echo" className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white"><span>Open Echo</span><span>→</span></Link></section>
    <Link href="/bridger/dashboard" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3 text-xs font-black text-white"><span className="inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4 text-emerald-300" />Bridger Operating Room</span></Link>
  </>

  return <WeaveSystemRoom roomKey="bridger-continuance" eyebrow="Bridge · Partnership Continuity" title="Bridger Continuance Chamber" detail="Continuance can be subscribed personally. Subscribe All is an optional one-button movement for every due Bridger essential." tone="emerald" left={left} center={center} right={right} pulse={status === 'active' ? 'Continuance active' : status === 'suspended' ? 'Continuance suspended' : 'Continuance due'} />
}
