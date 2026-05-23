'use client'

import { useEffect, useState } from 'react'
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
  const [data, setData] = useState<LedgerData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const response = await fetch('/api/ledger')
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error('[v0] Error fetching ledger:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLedger()
  }, [])

  if (loading) {
    return <div className="p-8 text-center">Loading ledger...</div>
  }

  return (
    <div className="space-y-8 p-8">
      {/* Balance Summary */}
      {data?.balance && (
        <BalanceSummary
          available={data.balance.available}
          locked={data.balance.locked}
          currency="TRX"
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
