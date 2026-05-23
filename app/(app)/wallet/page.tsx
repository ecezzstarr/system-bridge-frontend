"use client"

import { useState } from "react"
import useSWR from "swr"
import { Send, RefreshCw, Copy, Check, Loader2, TrendingUp, Wallet } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface WalletData {
  wallet: {
    id: string
    address: string
    trx: number
    usdt: number
    tokens: Record<string, number>
  }
  transactions: Array<{
    id: string
    type: string
    amount: number
    currency: string
    status: string
    txHash?: string
    createdAt: string
  }>
}

export default function WalletPage() {
  const [toAddress, setToAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [tokenType, setTokenType] = useState("TRX")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copiedAddress, setCopiedAddress] = useState(false)

  // Live balance updates with SWR - refreshes every 5 seconds and on focus
  const { data, error: fetchError, mutate, isLoading: isFetching } = useSWR<WalletData>(
    "/api/wallet",
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch wallet")
      return res.json()
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      focusThrottleInterval: 30000,
      refreshInterval: 5000,
    }
  )

  const handleRefresh = async () => {
    await mutate()
  }

  const handleCopyAddress = () => {
    if (data?.wallet.address) {
      navigator.clipboard.writeText(data.wallet.address)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          toAddress,
          amount: parseFloat(amount),
          tokenType,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Transfer failed")

      setSuccess(result.message || "Transfer submitted successfully")
      setToAddress("")
      setAmount("")
      await mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Personal Wallet</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Your TRX Balance</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Live Balance Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Available Balance</CardTitle>
            <Wallet className="h-5 w-5 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold text-blue-900">
              {isFetching ? '...' : (data?.wallet.trx ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </span>
            <span className="text-lg sm:text-xl text-blue-700 font-semibold">TRX</span>
          </div>
          <p className="text-xs text-blue-600">Real-time balance • Updated every 5 seconds</p>
        </CardContent>
      </Card>

      {/* Wallet Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Wallet Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs sm:text-sm bg-muted p-2 rounded overflow-auto font-mono">
              {data?.wallet.address || "No wallet connected"}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyAddress}
            >
              {copiedAddress ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Send TRX Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Send TRX</CardTitle>
          <CardDescription className="text-xs">Transfer requires Eight approval for security</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-3">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-50 p-2.5 text-xs text-green-700">
                {success}
              </div>
            )}

            <Input
              type="text"
              placeholder="Recipient address"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              className="text-sm"
              disabled={isLoading}
              required
            />

            <Input
              type="number"
              placeholder="Amount (TRX)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              className="text-sm"
              disabled={isLoading}
              required
            />

            <Button
              type="submit"
              className="w-full text-sm"
              disabled={isLoading || !data?.wallet.address}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Transfer Request
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <CardDescription className="text-xs">Last 20 transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.transactions || data.transactions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg border border-border text-xs sm:text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium capitalize truncate">{tx.type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-semibold">{tx.amount} {tx.currency}</p>
                      <Badge variant="outline" className="text-xs">{tx.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
