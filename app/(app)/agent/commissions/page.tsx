'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { getAuthHeaders } from '@/lib/auth-client'
import { CheckCircle2, CircleDollarSign, ShoppingBag, TrendingUp } from 'lucide-react'

type ProspectPurchaseRow = {
  bridgerId: string
  bridgerName: string
  prospectPurchaseCount: number
  prospectPurchaseValue: number
  commissionValue: number
}

type CommissionState = {
  commissionRate: number
  totalEarnings: number
  purchases: ProspectPurchaseRow[]
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
    if (!user || user.role !== 'agent') router.replace('/dashboard')
  }, [user, router])

  if (!user || user.role !== 'agent') return null

  const rate = Math.round((commissions?.commissionRate || 0.30) * 100)

  return (
    <main className="mx-auto w-full max-w-6xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-emerald-300/15 bg-[#030d0b]/78">
        <header className="border-b border-white/10 px-5 py-6 md:px-7">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300">Agent</p>
          <h1 className="mt-2 text-3xl font-black text-white">Prospect Commissions</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            When a Bridger assigned to your Agent position purchases a Prospect package, the eligible Agent commission is recorded here.
          </p>
        </header>

        <div className="grid gap-5 p-4 md:p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.05] p-5">
              <div className="flex items-center gap-2 text-emerald-300">
                <CircleDollarSign className="h-4 w-4" />
                <p className="text-[9px] font-black uppercase tracking-[0.16em]">Commission balance</p>
              </div>
              <p className="mt-3 text-3xl font-black text-white">
                {commissions ? commissions.totalEarnings.toFixed(2) : '—'}
              </p>
              <p className="mt-1 text-xs font-bold text-emerald-200">Flame Coin credited</p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Prospect purchase rate</p>
              <p className="mt-2 text-5xl font-black text-emerald-300">{rate}%</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                This account does not calculate Agent commission from Number Bay purchases, Client deposits, Arena, Casino or other Bridger activity.
              </p>
            </section>
          </aside>

          <section className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.035] p-5">
              <div className="flex items-center gap-2 text-cyan-300">
                <ShoppingBag className="h-4 w-4" />
                <h2 className="text-sm font-black">Bridger Prospect purchases</h2>
              </div>

              {loading ? (
                <div className="mt-4 h-28 animate-pulse rounded-xl bg-white/[0.03]" />
              ) : !commissions || commissions.purchases.length === 0 ? (
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  No qualifying Bridger Prospect purchase has been recorded for this Agent position yet.
                </p>
              ) : (
                <div className="mt-4 divide-y divide-white/[0.07]">
                  {commissions.purchases.map(row => (
                    <div key={row.bridgerId} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{row.bridgerName}</p>
                        <p className="mt-1 text-[10px] text-slate-500">{row.prospectPurchaseCount} Prospect purchase{row.prospectPurchaseCount === 1 ? '' : 's'}</p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-[9px] uppercase tracking-[0.12em] text-slate-600">Purchase value</p>
                        <p className="mt-1 text-sm font-black text-slate-200">{row.prospectPurchaseValue.toFixed(2)} Flame Coin</p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-[9px] uppercase tracking-[0.12em] text-emerald-400/70">Agent commission</p>
                        <p className="mt-1 text-sm font-black text-emerald-300">+{row.commissionValue.toFixed(2)} Flame Coin</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-300" />
                <h2 className="text-sm font-black text-white">Recent commission activity</h2>
              </div>

              {!commissions || commissions.recentCommissions.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No Prospect commission has been credited yet.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {commissions.recentCommissions.map((item, index) => (
                    <div key={item.createdAt + index} className="flex flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        <div>
                          <p className="text-sm text-slate-300">{item.description}</p>
                          <p className="mt-1 text-[10px] text-slate-600">{new Date(item.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="font-black text-emerald-300">+{item.amount.toFixed(2)} Flame Coin</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      </section>
    </main>
  )
}
