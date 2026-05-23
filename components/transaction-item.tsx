'use client'

import { ArrowUpRight, ArrowDownLeft, Lock, Unlock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TransactionItemProps {
  type: 'deposit' | 'withdrawal' | 'transfer' | 'escrow_lock' | 'escrow_release' | 'earning' | 'fee'
  amount: number
  currency: string
  description: string
  date: Date
  balanceAfter?: number
}

export function TransactionItem({ type, amount, currency, description, date, balanceAfter }: TransactionItemProps) {
  const isIncoming = type === 'deposit' || type === 'earning' || type === 'escrow_release'
  const isEscrow = type === 'escrow_lock' || type === 'escrow_release'

  const iconColor = isIncoming ? 'text-green-600' : 'text-red-600'
  const bgColor = isIncoming ? 'bg-green-500/10' : isEscrow ? 'bg-yellow-500/10' : 'bg-red-500/10'
  const textColor = isIncoming ? 'text-green-600' : isEscrow ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-full', bgColor)}>
          {isEscrow ? (
            type === 'escrow_lock' ? (
              <Lock className={cn('h-4 w-4', iconColor)} />
            ) : (
              <Unlock className={cn('h-4 w-4', iconColor)} />
            )
          ) : isIncoming ? (
            <ArrowDownLeft className={cn('h-4 w-4', iconColor)} />
          ) : (
            <ArrowUpRight className={cn('h-4 w-4', iconColor)} />
          )}
        </div>
        <div>
          <p className="font-medium capitalize">{type.replace(/_/g, ' ')}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn('font-medium', textColor)}>
          {isIncoming ? '+' : '-'}
          {amount} {currency}
        </p>
        <p className="text-xs text-muted-foreground">
          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        {balanceAfter !== undefined && (
          <p className="text-xs text-muted-foreground">Balance: {balanceAfter} {currency}</p>
        )}
      </div>
    </div>
  )
}
