'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TransactionItem } from '@/components/transaction-item'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface LedgerEntry {
  id: string
  entry_type: string
  amount: number
  currency: string
  description: string
  created_at: Date
  balance_after: number
}

export default function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const itemsPerPage = 10

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/ledger')
        const result = await response.json()
        if (result.success) {
          setTransactions(result.data.ledger.map((t: any) => ({
            ...t,
            created_at: new Date(t.created_at)
          })))
        }
      } catch (error) {
        console.error('[v0] Error fetching transactions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  const filtered = selectedType 
    ? transactions.filter(t => t.entry_type === selectedType)
    : transactions

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedTransactions = filtered.slice(startIndex, startIndex + itemsPerPage)

  const transactionTypes = ['deposit', 'withdrawal', 'transfer', 'escrow_lock', 'escrow_release', 'earning', 'fee']

  if (loading) {
    return <div className="p-8 text-center">Loading transactions...</div>
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground mt-1">View all your ledger entries and balance changes</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filter by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedType === null ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedType(null)
                setCurrentPage(1)
              }}
            >
              All Transactions ({transactions.length})
            </Button>
            {transactionTypes.map(type => {
              const count = transactions.filter(t => t.entry_type === type).length
              return count > 0 && (
                <Button
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedType(type)
                    setCurrentPage(1)
                  }}
                >
                  {type.replace('_', ' ')} ({count})
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>Page {currentPage} of {totalPages || 1}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paginatedTransactions.length > 0 ? (
            <>
              <div className="space-y-2">
                {paginatedTransactions.map(transaction => (
                  <TransactionItem
                    key={transaction.id}
                    type={transaction.entry_type as any}
                    amount={transaction.amount}
                    currency={transaction.currency}
                    description={transaction.description || 'Transaction'}
                    date={transaction.created_at}
                    balanceAfter={transaction.balance_after}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No transactions found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
