'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Flame, Gift, LockKeyhole, ShieldCheck, Sparkles, RefreshCw, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { getAuthHeaders } from '@/lib/auth-client'

type Claim = { id: string; day: string; reward: number; activity: string; claimed_at: string }
type HopeState = {
  success: boolean; open: boolean; claimed: boolean; eligible: boolean; available: boolean
  claim: Claim | null; activity?: string | null; minReward: number; maxReward: number; error?: string
}

export default function FlameOfHopePage() {
  const { user, isInitialized } = useAuth()
  const [state,setState] = useState<HopeState|null>(null)
  const [loading,setLoading] = useState(true)
  const [opening,setOpening] = useState(false)
  const [notice,setNotice] = useState('')
  const [revealed,setRevealed] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/bridger/flame-of-hope',{headers:getAuthHeaders(),cache:'no-store'})
      const data = await response.json()
      if(!response.ok || !data.success)throw new Error(data.error||'Unable to load your box')
      setState(data)
    } catch(error) { setNotice(error instanceof Error ? error.message : 'Unable to load your box') }
    finally { setLoading(false) }
  },[])
  useEffect(() => { if (isInitialized && user?.role==='bridger')void load() },[isInitialized,user?.role,load])
  const openBox = async () => {
    if (!state?.open || !state?.eligible || !state?.available || state.claimed || opening)return
    setOpening(true)
    setNotice('')
    try {
      const response = await fetch('/api/bridger/flame-of-hope',{method:'POST',headers:getAuthHeaders()})
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error||'Unable to open this box')
      setState(current => current ? {...current,claimed:true,claim:data.claim,eligible:false} : current)
      setRevealed(true)
    } catch(error) { setNotice(error instanceof Error ? error.message : 'Unable to open this box');void load() }
    finally { setOpening(false) }
  }
  if (!isInitialized)return null
  if (user?.role!=='bridger')return <main className="mx-auto max-w-xl p-6 text-white">Flame of Hope is reserved for Bridgers in Hope.</main>
  const prize = state?.claim?.reward
  const canClaim = !!state?.open && !!state?.eligible && !!state?.available && !state?.claimed
  return <main data-flame-of-hope="mystery-box" className="min-h-screen bg-[#080c13] px-4 py-7 text-white">
    <div className="mx-auto max-w-xl">
      <Link href="/bridger/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm text-amber-100"><ArrowLeft className="h-4 w-4"/>Hope · Work Desk</Link>
      <div className="relative mt-4 overflow-hidden rounded-[2rem] border border-amber-300/30 bg-gradient-to-b from-[#48301c] via-[#1c1723] to-[#0c101a] p-6 text-center shadow-2xl sm:p-9">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-12 top-0 h-44 rounded-full bg-amber-400/10 blur-3xl"/>
        <p className="relative text-xs font-black uppercase tracking-[.24em] text-amber-200">Company Loop 1 · Burning River</p>
        <h1 className="relative mt-3 text-3xl font-black tracking-tight sm:text-4xl">Flame of Hope</h1>
        <p className="relative mt-2 text-sm leading-6 text-orange-100/85">Your recorded work keeps Hope alive. Open one mystery box when your activity qualifies.</p>
        <div className="relative mx-auto mt-7 flex h-48 w-48 items-center justify-center rounded-[2.5rem] border border-amber-200/40 bg-gradient-to-br from-amber-400/35 via-orange-600/25 to-black/45 shadow-[0_0_70px_rgba(245,158,11,.16)]" aria-label={state?.claimed?'Opened Flame of Hope mystery box':'Unopened Flame of Hope mystery box'}>
          {state?.claimed ? <Sparkles className="h-24 w-24 text-amber-200"/> : <Gift className="h-24 w-24 text-amber-200"/>}
          <Flame className="absolute -top-5 h-10 w-10 text-orange-300"/>
        </div>
        <div className="relative mt-6 text-2xl font-black tabular-nums text-amber-100">1–8 System Switch</div>
        <p className="relative mt-1 text-xs text-amber-100/70">Free reward · no payment required · one claim per Nigeria calendar day</p>
        {state?.claimed && prize !== undefined ? <div className="relative mt-6 rounded-2xl border border-emerald-300/35 bg-emerald-400/10 p-4" role="status">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">{revealed?'Your Flame of Hope has opened':'Today’s Flame has been claimed'}</p>
          <p className="mt-2 text-4xl font-black text-white">+{prize} <span className="text-base">System Switch</span></p>
          <p className="mt-2 text-xs text-emerald-100/75">Reward recorded in your wallet and company ledger.</p>
        </div> : <button type="button" disabled={!canClaim || loading || opening} onClick={openBox}
          className="relative mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-5 py-3 font-black text-[#201309] enabled:hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200">
          {opening?<><RefreshCw className="h-5 w-5 animate-spin"/>Opening...</>:<><Gift className="h-5 w-5"/>Claim Flame of Hope</>}
        </button>}
        {notice && <p role="alert" className="mt-4 text-sm text-red-200">{notice}</p>}
        {!state?.claimed && !loading && <p className="relative mt-3 text-xs leading-5 text-amber-100/70">
          {!state?.open?'This reward is available only while Flame Event · Burning River is active.':
          !state?.eligible?'Complete a verified registration referral or settled Client File Folder crossing today to become eligible.':
          !state?.available?'Your activity qualifies. Administrations must fund the reward pool before it can be claimed.':
          'A verified activity is ready. Open your mystery box.'}
        </p>}
        {loading && <p className="mt-4 text-sm text-amber-100">Checking today’s activity...</p>}
      </div>
      <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-emerald-200"/><div>
          <h2 className="font-bold">Hope is recognized through genuine participation</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">The box is not sold. Buying prospects or simply clicking Send does not qualify. Weave checks a settled referral or verified Client File Folder crossing. Outreach alone is not sufficient until independently verified. Each claim is company-funded and recorded once.</p>
        </div></div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <Link href="/weave/market/prospects" className="flex min-h-11 items-center justify-center rounded-xl border border-white/20 p-3 text-center font-bold text-white">My Prospects</Link>
          <Link href="/wallet" className="flex min-h-11 items-center justify-center rounded-xl border border-white/20 p-3 text-center font-bold text-white">Wallet & Records</Link>
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><LockKeyhole className="h-4 w-4"/>Claim confirmation is controlled by the server, not the box animation.</p>
      </section>
    </div>
  </main>
}
