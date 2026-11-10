'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'
import { SYSTEM_SWITCH_NAME, displayCurrencyName } from '@/lib/flame-coin'

export interface BalanceSummaryProps {
  available: number | string | null
  locked: number | string | null
  currency?: string
}

export function BalanceSummary({ available, locked, currency = SYSTEM_SWITCH_NAME }: BalanceSummaryProps) {
  const safeAvailable = available == null || !Number.isFinite(Number(available)) ? null : Number(available)
  const safeLocked = locked == null || !Number.isFinite(Number(locked)) ? null : Number(locked)
  const total = safeAvailable == null || safeLocked == null ? null : safeAvailable + safeLocked
  const amount = (value:number|null) => value==null?'Unavailable':value.toLocaleString(undefined,{
    minimumFractionDigits:2,maximumFractionDigits:6,
  })

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Available Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{amount(safeAvailable)} {displayCurrencyName(currency)}</div>
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
          <div className="text-2xl font-bold text-yellow-600">{amount(safeLocked)} {displayCurrencyName(currency)}</div>
          <p className="text-xs text-muted-foreground mt-1">In active transactions</p>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{amount(total)} {displayCurrencyName(currency)}</div>
          <p className="text-xs text-muted-foreground mt-1">Available + Locked</p>
        </CardContent>
      </Card>
    </div>
  )
}
