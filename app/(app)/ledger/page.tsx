'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BalanceSummary } from '@/components/balance-summary'
import { EscrowList } from '@/components/escrow-list'
import { TransactionItem } from '@/components/transaction-item'

interface LedgerData {
  ledger: any[]
  escrow: any[]
  balance: {
    available: number
    locked: number
    total: number
  }
}

export default function LedgerPage() {
  const { token, isInitialized } = useAuth()
  const [data, setData] = useState<LedgerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isInitialized) return
    if (!token) {
      setError('Your WEAVE session is not available. Sign in again to open Record.')
      setLoading(false)
      return
    }

    let cancelled = false
    const fetchLedger = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch('/api/ledger', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const result = await response.json().catch(() => null)
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || `Record could not load (status ${response.status})`)
        }
        if (!cancelled) setData(result.data)
      } catch (error) {
        console.error('[Record] Error fetching ledger:', error)
        if (!cancelled) setError(error instanceof Error ? error.message : 'Record could not load.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchLedger()
    return () => { cancelled = true }
  }, [isInitialized, token])

  if (!isInitialized || loading) {
    return <div className="p-8 text-center text-base text-slate-300">Opening Record...</div>
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6">
          <p className="text-sm font-black uppercase tracking-wider text-red-300">Record unavailable</p>
          <p className="mt-3 text-base leading-7 text-slate-300">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">WEAVE Record</p>
        <h1 className="mt-2 text-3xl font-black text-white">Record</h1>
        <p className="mt-2 text-sm text-slate-400">Your preserved financial movement: available value, value held in escrow, and ledger entries recorded by WEAVE.</p>
      </div>

      {/* Balance Summary */}
      {data?.balance && (
        <BalanceSummary
          available={data.balance.available}
          locked={data.balance.locked}
          currency="Flame Coin"
        />
      )}

      {/* Active Escrow */}
      {data?.escrow && (
        <EscrowList escrows={data.escrow.map(e => ({
          ...e,
          locked_at: new Date(e.locked_at)
        }))} />
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All ledger entries and balance changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data?.ledger && data.ledger.length > 0 ? (
              data.ledger.slice(0, 20).map((entry) => (
                <TransactionItem
                  key={entry.id}
                  type={entry.entry_type}
                  amount={entry.amount}
                  currency={entry.currency}
                  description={entry.description || 'Transaction'}
                  date={new Date(entry.created_at)}
                  balanceAfter={entry.balance_after}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
