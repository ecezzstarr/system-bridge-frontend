'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'

export interface BalanceSummaryProps {
  available: number
  locked: number
  currency?: string
}

export function BalanceSummary({ available, locked, currency = 'TRX' }: BalanceSummaryProps) {
  const total = available + locked

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Available Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{available.toFixed(2)} {currency}</div>
          <p className="text-xs text-muted-foreground mt-1">Ready to use</p>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lock className="h-4 w-4" />
            Locked in Escrow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{locked.toFixed(2)} {currency}</div>
          <p className="text-xs text-muted-foreground mt-1">In active transactions</p>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{total.toFixed(2)} {currency}</div>
          <p className="text-xs text-muted-foreground mt-1">Available + Locked</p>
        </CardContent>
      </Card>
    </div>
  )
}
