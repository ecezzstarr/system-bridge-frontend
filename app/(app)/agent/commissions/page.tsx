'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AgentCommissionsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [commissions, setCommissions] = useState<{ commissionRate: number; totalEarnings: number; recentCommissions: any[] } | null>(null)

  useEffect(() => {
    if (!user?.id) return
    fetch(`/api/agent/commissions?agentId=${user.id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setCommissions(d) })
      .catch(() => {})
  }, [user?.id])

  useEffect(() => {
    if (!user || user.role !== 'agent') {
      router.push('/dashboard')
    }
  }, [user, router])

  if (!user || user.role !== 'agent') {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 sm:pb-0">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 mb-1">
          Continuance
        </h1>
        <p className="text-slate-400 text-sm">What moves through you, and what returns</p>
      </div>

      <div className="mb-6 group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-20 blur"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <h2 className="text-lg font-bold text-white">How Agent Commission Works</h2>
            <div className="text-right">
              <p className="text-xs text-slate-500">Total commission earned</p>
              <p className="text-2xl font-bold text-purple-400">
                {commissions ? `${commissions.totalEarnings.toFixed(2)} Flame Coin` : '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-1">Your Lead Rate</p>
              <p className="text-xl font-bold text-white">
                30%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">on prospect lead purchases by your Bridgers</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-1">Client Crossing</p>
              <p className="text-xl font-bold text-emerald-400">
                716 Flame Coin
              </p>
              <p className="text-[11px] text-slate-500 mt-1">per 35,800 Flame Coin File Folder purchase (5% of Weave's 40%)</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-1">How you get paid</p>
              <p className="text-sm text-slate-300">Commission lands in your Platform Balance automatically the moment the activity is approved.</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mb-3">
            This is Loop 1 for the Weave Agent. Your movement is to build and support Bridgers, and you earn from both their lead acquisitions and their client crossings.
          </p>

          {commissions && commissions.recentCommissions.length > 0 && (
            <div className="pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500 mb-2">Recent commission activity</p>
              <div className="space-y-2">
                {commissions.recentCommissions.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{c.description}</span>
                    <span className="text-purple-400 font-semibold whitespace-nowrap ml-4">+{c.amount.toFixed(2)} Flame Coin</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
