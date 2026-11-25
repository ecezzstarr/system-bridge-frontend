'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { visiblePoll } from '@/lib/visible-poll'

const Quote = createContext<number | null>(null)
const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function UsdQuoteProvider({ children }: { children: ReactNode }) {
  const [rate, setRate] = useState<number | null>(null)
  useEffect(() => visiblePoll(async signal => {
    try {
      const response = await fetch('/api/rate/trx-usd', { signal })
      const value = response.ok ? (await response.json()).usdPerTrx : null
      if (!signal.aborted) setRate(typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null)
    } catch {
      setRate(null)
    }
  }, 60000), [])
  return <Quote.Provider value={rate}>{children}</Quote.Provider>
}

export function formatUsdValue(trx: number | string | null | undefined, rate: number | null) {
  if (trx == null || String(trx).trim() === '' || !Number.isFinite(Number(trx))) return '—'
  const amount = Number(trx)
  if (amount === 0) return dollars.format(0)
  if (rate == null || !Number.isFinite(rate) || rate <= 0) {
    const units = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
    return `USD unavailable (${units} TRX)`
  }
  return dollars.format(amount * rate)
}

export function useUsdValue() {
  const rate = useContext(Quote)
  return (trx: number | string | null | undefined) => formatUsdValue(trx, rate)
}

export function UsdValue({ trx }: { trx: number | string | null | undefined }) {
  const format = useUsdValue()
  return <>{format(trx)}</>
}
