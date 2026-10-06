'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Copy, Share2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'

export function ReferralCodePanel() {
  const { user, token } = useAuth()
  const [code, setCode] = useState('')
  const [sharePath, setSharePath] = useState('')
  const [bonusNgn, setBonusNgn] = useState<number | null>(null)
  const [successfulReferrals, setSuccessfulReferrals] = useState(0)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.id || !token || !['agent','bridger','client'].includes(user.role || '')) return
    let active = true
    fetch('/api/referral/me', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load referral code')
        if (!active) return
        setCode(data.referralCode || '')
        setSharePath(data.sharePath || '')
        setBonusNgn(data.referralBonus?.amountNgn ?? null)
        setSuccessfulReferrals(Number(data.core?.successfulReferrals || 0))
      })
      .catch(err => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load referral code')
      })
    return () => { active = false }
  }, [user?.id, user?.role, token])

  if (!user || !['agent','bridger','client'].includes(user.role || '')) return null

  const isStaffReferral = user.role === 'agent' || user.role === 'bridger'

  const copy = async () => {
    if (!code) return
    const absolute = sharePath && typeof window !== 'undefined' ? `${window.location.origin}${sharePath}` : code
    try {
      await navigator.clipboard.writeText(absolute)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="rounded-3xl border border-cyan-300/15 bg-cyan-400/[0.04] p-4">
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 text-cyan-300"/>
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">Referral identity</p>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-300">
        This is your stable WEAVE referral code. Share the code or its registration link; attribution remains attached to your account.
      </p>
      {isStaffReferral && bonusNgn !== null && (
        <div className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-400/[.04] px-3 py-3">
          <p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">Core referral return</p>
          <p className="mt-1 text-lg font-black text-white">₦{bonusNgn.toLocaleString()} per verified Agent/Bridger</p>
          <p className="mt-1 text-[10px] text-slate-500">{successfulReferrals} successful referral{successfulReferrals===1?'':'s'}</p>
        </div>
      )}
      {code ? (
        <>
          <div className="mt-3 rounded-xl border border-white/10 bg-black/25 px-3 py-3">
            <p className="break-all font-mono text-sm font-black tracking-[0.08em] text-white">{code}</p>
          </div>
          <Button onClick={()=>void copy()} variant="outline" className="mt-3 w-full border-cyan-300/15 bg-cyan-400/[0.04] text-cyan-100 hover:bg-cyan-400/[0.08]">
            <Copy className="mr-2 h-4 w-4"/>{copied ? 'Referral link copied' : 'Copy referral link'}
          </Button>
          {isStaffReferral && <Link href="/referrals" className="mt-2 flex w-full items-center justify-center rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950">Open Referral Movement</Link>}
        </>
      ) : error ? (
        <p className="mt-3 text-xs text-rose-200">{error}</p>
      ) : (
        <p className="mt-3 text-xs text-slate-500">Resolving referral identity…</p>
      )}
    </section>
  )
}
