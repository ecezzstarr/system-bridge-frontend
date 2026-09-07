'use client'

import { useMemo, useState } from 'react'
import { Users, TrendingUp } from 'lucide-react'

const AGENT_RATE = 0.30
const ACTIVE_BRIDGER_TARGET = 6
const PROSPECT_PURCHASE_PRICE_TRX = 1.1

export function BridgePlazaEarningsAd() {
  const [prospectPrice, setProspectPrice] = useState(String(PROSPECT_PURCHASE_PRICE_TRX))
  const [purchasesPerBridger, setPurchasesPerBridger] = useState('1')

  const projection = useMemo(() => {
    const price = Math.max(0, Number(prospectPrice) || PROSPECT_PURCHASE_PRICE_TRX)
    const purchases = Math.max(1, Math.floor(Number(purchasesPerBridger) || 1))
    const dailyPurchases = ACTIVE_BRIDGER_TARGET * purchases
    return {
      price,
      purchases,
      dailyPurchases,
      dailyEarnings: price * dailyPurchases * AGENT_RATE,
    }
  }, [prospectPrice, purchasesPerBridger])

  return (
    <aside className="w-full rounded-2xl border border-cyan-500/30 bg-slate-950/90 p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15">
          <TrendingUp className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">Bridge Plaza · Agent Presence</p>
          <h3 className="text-base font-bold text-white">Your Bridgers can build your daily earnings</h3>
        </div>
      </div>

      <p className="mb-4 text-xs leading-5 text-slate-400">
        Your position is to bring and manage active Bridgers. When your Bridgers purchase prospects, your Agent share is 30% of the qualifying prospect purchase value.
      </p>

      <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-slate-400">Daily operating target</span>
          <span className="text-sm font-bold text-white">6+ active Bridgers</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Users className="h-3.5 w-3.5" />
          More than 5 active Bridgers keeps the Agent position fully active.
        </div>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-400">Prospect purchase value (TRX)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={prospectPrice}
            onChange={(event) => setProspectPrice(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
          />
          <span className="mt-1 block text-[10px] text-slate-600">Current prospect purchase price: 1.1 TRX each.</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-400">Purchases per Bridger / day</span>
          <input
            type="number"
            min="1"
            step="1"
            value={purchasesPerBridger}
            onChange={(event) => setPurchasesPerBridger(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
          />
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Illustrative daily Agent share</p>
        <p className="mt-1 text-2xl font-black text-emerald-400">{projection.dailyEarnings.toLocaleString()} TRX</p>
        <p className="mt-1 text-[11px] text-slate-500">
          {projection.dailyPurchases} prospect purchases × {projection.price.toLocaleString()} TRX × 30%
        </p>
      </div>

      <p className="mt-3 text-[10px] leading-4 text-slate-600">
        Projection only. Actual earnings depend on qualifying prospect purchases completed by your managed Bridgers. This prospect price is separate from File Folder pricing.
      </p>
    </aside>
  )
}
