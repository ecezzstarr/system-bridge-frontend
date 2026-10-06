'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, RefreshCcw, Share2, UsersRound, WalletCards } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { WeaveSystemRoom } from '@/components/world/weave-system-room'
import { visiblePoll } from '@/lib/visible-poll'

type ReferralCore = {
  referralCode: string
  bonusNgn: number
  successfulReferrals: number
  totalBonusNgn: number
  totalBonusFlameCoin: number
  pendingBonusCount: number
  recent: Array<{
    id: string
    name: string
    role: string
    created_at: string
    bonus_status: string | null
    bonus_ngn: number | string | null
    bonus_flame_coin: number | string | null
    paid_at: string | null
  }>
}

type ReferralState = {
  referralCode: string
  sharePath: string
  referralBonus: { amountNgn: number; eligibility: string } | null
  core: ReferralCore | null
}

export default function ReferralMovementPage() {
  const { user, token } = useAuth()
  const allowed = user?.role === 'agent' || user?.role === 'bridger'
  const [state, setState] = useState<ReferralState | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(silent = false, signal?: AbortSignal) {
    if (!allowed || !token) {
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    try {
      const response = await fetch('/api/referral/me', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal,
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load referral movement')
      setState(data)
      setError(null)
    } catch (loadError: any) {
      if (loadError?.name !== 'AbortError') setError(loadError?.message || 'Unable to load referral movement')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    if (!allowed || !token) return
    return visiblePoll(signal => load(true, signal), 30000, false)
  }, [allowed, token, user?.id])

  const absoluteLink = useMemo(() => {
    if (!state?.sharePath) return ''
    if (typeof window === 'undefined') return state.sharePath
    return `${window.location.origin}${state.sharePath}`
  }, [state?.sharePath])

  async function copyLink() {
    if (!absoluteLink) return
    try {
      await navigator.clipboard.writeText(absoluteLink)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  async function shareLink() {
    if (!absoluteLink) return
    const text = `Join WEAVE through my referral. A departmental registration code is still required for Agent or Bridger entry. ${absoluteLink}`
    try {
      if (navigator.share) await navigator.share({ title: 'WEAVE Referral', text, url: absoluteLink })
      else await copyLink()
    } catch {}
  }

  const core = state?.core
  const left = <>
    <section className="rounded-3xl border border-cyan-300/15 bg-cyan-400/[.035] p-4">
      <Share2 className="h-5 w-5 text-cyan-300" />
      <p className="mt-3 text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Core movement</p>
      <h2 className="mt-1 text-lg font-black text-white">Referral Movement</h2>
      <p className="mt-2 text-xs leading-5 text-slate-400">Carry qualified people into WEAVE. A verified Agent or Bridger registration through your referral produces a fixed ₦500 referral bonus.</p>
    </section>
    <section className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Movement</p>
      <div className="mt-3 space-y-3 text-xs text-slate-300">
        <p>1 · Share your stable referral entrance.</p>
        <p>2 · The person completes verified Agent or Bridger registration.</p>
        <p>3 · WEAVE records attribution once.</p>
        <p>4 · ₦500 converts at the current Flame Coin rate and enters your wallet.</p>
      </div>
    </section>
  </>

  const center = !allowed
    ? <div className="rounded-2xl border border-red-300/15 bg-red-400/[.035] p-5 text-sm text-red-200">Referral Movement is a core Agent and Bridger function.</div>
    : loading
      ? <div className="flex min-h-[420px] items-center justify-center"><RefreshCcw className="h-6 w-6 animate-spin text-cyan-300" /></div>
      : <>
        {error && <div className="rounded-xl border border-red-300/15 bg-red-400/[.04] px-3 py-2 text-xs text-red-200">{error}</div>}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><UsersRound className="h-4 w-4 text-cyan-300"/><p className="mt-3 text-[9px] uppercase text-slate-500">Successful referrals</p><p className="mt-1 text-2xl font-black text-white">{core?.successfulReferrals ?? 0}</p></div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><WalletCards className="h-4 w-4 text-emerald-300"/><p className="mt-3 text-[9px] uppercase text-slate-500">Bonus earned</p><p className="mt-1 text-2xl font-black text-white">₦{Number(core?.totalBonusNgn || 0).toLocaleString()}</p><p className="mt-1 text-[10px] text-slate-500">{Number(core?.totalBonusFlameCoin || 0).toFixed(4)} Flame Coin credited</p></div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><RefreshCcw className="h-4 w-4 text-amber-300"/><p className="mt-3 text-[9px] uppercase text-slate-500">Pending settlement</p><p className="mt-1 text-2xl font-black text-white">{core?.pendingBonusCount ?? 0}</p></div>
        </div>

        <section className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-400/[.025] p-4">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Your referral entrance</p>
          <p className="mt-2 break-all font-mono text-sm font-black text-white">{state?.referralCode || 'Resolving…'}</p>
          <p className="mt-2 break-all text-xs text-slate-500">{absoluteLink || state?.sharePath}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={()=>void copyLink()} className="rounded-xl border border-cyan-300/20 bg-cyan-400/[.07] px-4 py-3 text-xs font-black uppercase tracking-wider text-cyan-100"><Copy className="mr-2 inline h-4 w-4"/>{copied ? 'Copied' : 'Copy entrance'}</button>
            <button type="button" onClick={()=>void shareLink()} className="rounded-xl bg-cyan-300 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-950"><Share2 className="mr-2 inline h-4 w-4"/>Share now</button>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-slate-500">Recent movement</p><h3 className="mt-1 text-base font-black text-white">People you carried in</h3></div><button type="button" onClick={()=>void load(true)} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-black uppercase text-slate-300">Refresh</button></div>
          <div className="mt-3 space-y-2">
            {(core?.recent || []).length === 0 && <p className="rounded-xl border border-white/10 px-3 py-3 text-xs text-slate-500">No verified Agent or Bridger referral has crossed yet.</p>}
            {(core?.recent || []).map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.02] px-3 py-3"><div><p className="text-xs font-black text-white">{item.name}</p><p className="mt-1 text-[10px] uppercase text-slate-500">{item.role} · {new Date(item.created_at).toLocaleDateString()}</p></div><div className="text-right"><p className={item.bonus_status === 'paid' ? 'text-xs font-black text-emerald-300' : 'text-xs font-black text-amber-300'}>{item.bonus_status === 'paid' ? '₦500 credited' : '₦500 pending'}</p>{item.bonus_flame_coin && <p className="mt-1 text-[10px] text-slate-500">{Number(item.bonus_flame_coin).toFixed(4)} Flame Coin</p>}</div></div>)}
          </div>
        </section>
      </>

  const right = <>
    <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[.035] p-4"><p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">Referral bonus</p><p className="mt-2 text-3xl font-black text-white">₦500</p><p className="mt-2 text-xs leading-5 text-slate-400">Fixed for each successfully verified Agent or Bridger registration attributed to your referral identity. It is separate from later commission percentages.</p></section>
    <section className="rounded-3xl border border-white/10 bg-black/20 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Rule</p><p className="mt-2 text-xs leading-5 text-slate-300">One referred account can produce the signup bonus once. Repeated requests cannot duplicate the payout.</p></section>
  </>

  return <WeaveSystemRoom roomKey="referral-movement" eyebrow={`${user?.role === 'agent' ? 'Agent' : 'Bridger'} · Growth`} title="Referral Movement" detail="Referral is a daily Agent and Bridger movement: carry qualified people into WEAVE, preserve attribution and receive the fixed ₦500 signup bonus when a verified Agent or Bridger completes entry." tone="cyan" left={left} center={center} right={right} pulse={core?.pendingBonusCount ? `${core.pendingBonusCount} bonus settlement${core.pendingBonusCount===1?'':'s'} pending` : 'Referral movement active'} />
}
