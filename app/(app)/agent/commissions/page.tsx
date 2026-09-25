'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { getAuthHeaders } from '@/lib/auth-client'
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Network,
  TrendingUp,
  Users,
} from 'lucide-react'

type BridgerCommissionRow = {
  id: string
  name: string
  email?: string
  subscriptionStatus: string
  clientCount: number
  prospectPurchaseCount: number
  prospectPurchaseValue: number
  agentLeadRate: number
  prospectCommissionValue: number
}

type CommissionState = {
  commissionRate: number
  leadCommissionRate: number
  clientCrossingRate: number
  totalEarnings: number
  loop1: {
    activeBridgers: number
    yieldTier: number
    yieldNgn: number
    maxBridgers: number
  }
  bridgers: BridgerCommissionRow[]
  recentCommissions: Array<{
    amount: number
    description: string
    createdAt: string
  }>
}

export default function AgentCommissionsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [commissions, setCommissions] = useState<CommissionState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id || user.role !== 'agent') return
    setLoading(true)
    fetch('/api/agent/commissions', { headers: getAuthHeaders(), cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.success) setCommissions(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id, user?.role])

  useEffect(() => {
    if (!user || user.role !== 'agent') router.push('/dashboard')
  }, [user, router])

  if (!user || user.role !== 'agent') return null

  const leadRate = Math.round((commissions?.leadCommissionRate || 0.30) * 100)
  const crossingRate = Math.round((commissions?.clientCrossingRate || 0.02) * 100)

  return (
    <div className="mx-auto max-w-7xl pb-20 sm:pb-0">
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
          Agent · Loop 1
        </p>
        <h1 className="mt-2 bg-gradient-to-r from-cyan-400 to-emerald-300 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
          Continuance
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          See how Bridger movement becomes Agent commission.
        </p>
      </div>

      <section className="mb-6 overflow-hidden rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-400/10 via-slate-950/70 to-cyan-400/5 p-6">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-emerald-300">
              <Network className="h-5 w-5" />
              <p className="text-xs font-black uppercase tracking-[0.2em]">Loop 1 Prospect Commission</p>
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Your Bridger buys a Prospect package. Your Agent position receives {leadRate}%.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              The Prospect Engine records the Bridger purchase and routes the eligible Agent return into your WEAVE balance. The Continuance page lets you see the movement behind that return.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-300/20 bg-black/25 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Prospect purchase rate</p>
            <p className="mt-2 text-6xl font-black text-emerald-300">{leadRate}%</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Example: 100 Flame Coin spent on a Prospect package → 30 Flame Coin Agent return.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            ['1 · Bridger', 'A Bridger is connected to your Agent position.'],
            ['2 · Prospect', 'That Bridger purchases a Prospect package from WEAVE.'],
            ['3 · Return', leadRate + '% of the eligible purchase value returns to your Agent balance.'],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <p className="text-xs text-slate-500">Total commission credited</p>
          <p className="mt-2 text-3xl font-black text-emerald-300">
            {commissions ? commissions.totalEarnings.toFixed(2) : '—'} Flame Coin
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <p className="text-xs text-slate-500">Active Loop 1 Bridgers</p>
          <p className="mt-2 text-3xl font-black text-cyan-300">
            {commissions ? commissions.loop1.activeBridgers : '—'} / {commissions?.loop1.maxBridgers || 3}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <p className="text-xs text-slate-500">Client crossing return</p>
          <p className="mt-2 text-3xl font-black text-violet-300">{crossingRate}%</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Current rule: 5% of WEAVE&apos;s 40% company share, equal to 2% of the Client File Folder value.
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-cyan-400/20 bg-slate-950/60 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-300">
              <Users className="h-5 w-5" />
              <p className="text-xs font-black uppercase tracking-[0.18em]">Your Bridgers</p>
            </div>
            <h2 className="mt-2 text-2xl font-black text-white">Prospect activity under your Agent position</h2>
            <p className="mt-1 text-sm text-slate-500">
              These are the Bridgers currently assigned to you and the Prospect-package activity recorded in their ledger.
            </p>
          </div>
          <Link
            href="/agent/bridgers"
            className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-cyan-300 hover:text-cyan-200"
          >
            Open My Bridgers <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="mt-5 h-28 animate-pulse rounded-xl bg-white/[0.03]" />
        ) : !commissions || commissions.bridgers.length === 0 ? (
          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-slate-300">No Bridger is attached to this Agent position yet.</p>
            <p className="mt-1 text-xs text-slate-500">Your Prospect commission begins when your Bridgers begin purchasing Prospect packages.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {commissions.bridgers.map((bridger) => (
              <div key={bridger.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-white">{bridger.name}</p>
                    <p className="text-[11px] text-slate-500">{bridger.subscriptionStatus} continuance</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/10 font-black text-cyan-300">
                    {bridger.name.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-black/25 p-3">
                    <p className="text-[9px] uppercase tracking-wider text-slate-600">Prospect buys</p>
                    <p className="mt-1 text-xl font-black text-white">{bridger.prospectPurchaseCount}</p>
                  </div>
                  <div className="rounded-xl bg-black/25 p-3">
                    <p className="text-[9px] uppercase tracking-wider text-slate-600">Clients</p>
                    <p className="mt-1 text-xl font-black text-white">{bridger.clientCount}</p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-300">Prospect purchase value</p>
                  <p className="mt-1 text-lg font-black text-white">{bridger.prospectPurchaseValue.toFixed(2)} Flame Coin</p>
                  <p className="mt-2 text-[10px] text-slate-500">
                    {leadRate}% represented Agent share: <span className="font-bold text-emerald-300">{bridger.prospectCommissionValue.toFixed(2)} Flame Coin</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-5 w-5 text-emerald-300" />
          <h2 className="text-lg font-black text-white">Recent commission activity</h2>
        </div>

        {!commissions || commissions.recentCommissions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No Agent commission has been credited yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {commissions.recentCommissions.map((item, index) => (
              <div key={item.createdAt + index} className="flex flex-col gap-2 rounded-xl border border-white/5 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <div>
                    <p className="text-sm text-slate-300">{item.description}</p>
                    <p className="mt-1 text-[10px] text-slate-600">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 font-black text-emerald-300">
                  <TrendingUp className="h-4 w-4" />
                  +{item.amount.toFixed(2)} Flame Coin
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
