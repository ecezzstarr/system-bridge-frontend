'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'

export interface EscrowRecord {
  id: string
  amount: number
  currency: string
  reason?: string
  locked_at: Date
}

interface EscrowListProps {
  escrows: EscrowRecord[]
}

export function EscrowList({ escrows }: EscrowListProps) {
  if (escrows.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-yellow-600" />
          Active Escrow
        </CardTitle>
        <CardDescription>{escrows.length} transaction(s) locked</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {escrows.map((record) => (
            <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">
                  {record.amount} {record.currency}
                </p>
                <p className="text-sm text-muted-foreground">{record.reason || 'Escrow locked'}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(record.locked_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
