"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { RefreshCw, Copy, Check, Loader2, Wallet, ArrowUpRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

interface FundWallData {
  companyWallet: {
    id: string
    address: string
    trx: number
    usdt: number
  }
  platformWallet: {
    id: string
    address: string
    trx: number
    usdt: number
  }
  stats: {
    totalLocked: number
    totalTransactions: number
    lastSweep: string | null
  }
  recentSweeps: Array<{
    id: string
    amount: number
    from: string
    to: string
    completedAt: string
  }>
}

export default function FundWallPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [accessDenied, setAccessDenied] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)

  // Check if user is creator (only creator can access company wallet)
  useEffect(() => {
    if (user && user.role !== 'creator') {
      setAccessDenied(true)
    }
  }, [user])

  // Live balance updates with SWR - refreshes every 5 seconds
  const { data, error: fetchError, mutate, isLoading: isFetching } = useSWR<FundWallData>(
    "/api/fund-wall",
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch fund wall")
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

  const handleCopyAddress = (address: string) => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {accessDenied && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
          <p className="font-semibold">Access Denied</p>
          <p className="text-xs mt-1">Only Creator role can access the Company Wallet. Contact your administrator if you believe this is an error.</p>
        </div>
      )}

      {!accessDenied ? (
        <>
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Fund Wall</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Platform & Company Wallets</p>
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

      {fetchError && (
        <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
          {fetchError instanceof Error ? fetchError.message : 'Failed to load fund wall data'}
        </div>
      )}

      {/* Platform Wallet Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm text-muted-foreground">Platform Wallet</CardTitle>
              <p className="text-xs text-blue-600 mt-1">System funds from Arena & Marketplace</p>
            </div>
            <Wallet className="h-5 w-5 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold text-blue-900">
              {isFetching ? '...' : (data?.platformWallet.trx ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </span>
            <span className="text-lg sm:text-xl text-blue-700 font-semibold">TRX</span>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Address</p>
            <div className="flex items-center gap-2 bg-white rounded p-2">
              <code className="text-xs flex-1 truncate text-blue-900">{data?.platformWallet.address}</code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopyAddress(data?.platformWallet.address || '')}
                className="h-7 w-7 p-0"
              >
                {copiedAddress ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Wallet Card */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm text-muted-foreground">Company Wallet</CardTitle>
              <p className="text-xs text-green-600 mt-1">RAY's Personal Wallet</p>
            </div>
            <Wallet className="h-5 w-5 text-green-600" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold text-green-900">
              {isFetching ? '...' : (data?.companyWallet.trx ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </span>
            <span className="text-lg sm:text-xl text-green-700 font-semibold">TRX</span>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Address</p>
            <div className="flex items-center gap-2 bg-white rounded p-2">
              <code className="text-xs flex-1 truncate text-green-900">{data?.companyWallet.address}</code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopyAddress(data?.companyWallet.address || '')}
                className="h-7 w-7 p-0"
              >
                {copiedAddress ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Locked Funds</p>
              <p className="text-lg sm:text-2xl font-bold">
                {isFetching ? '...' : (data?.stats.totalLocked ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">TRX in escrow</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Transactions</p>
              <p className="text-lg sm:text-2xl font-bold">
                {isFetching ? '...' : (data?.stats.totalTransactions ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total completed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Last Sweep</p>
              <p className="text-lg sm:text-2xl font-bold">
                {data?.stats.lastSweep ? (
                  new Date(data.stats.lastSweep).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                ) : (
                  '-'
                )}
              </p>
              <p className="text-xs text-muted-foreground">By Eight Engine</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Company Wallet Address</CardTitle>
          <CardDescription className="text-xs">All platform funds consolidated here</CardDescription>
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

      {/* Recent Sweeps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Sweeps</CardTitle>
          <CardDescription className="text-xs">Automated transfers by Eight Engine</CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.recentSweeps || data.recentSweeps.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No recent sweeps</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.recentSweeps.map((sweep) => (
                <div key={sweep.id} className="flex items-center justify-between p-2 rounded-lg border border-border text-xs sm:text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <ArrowUpRight className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">Sweep from {sweep.from?.slice(0, 10)}...</p>
                      <p className="text-xs text-muted-foreground">{new Date(sweep.completedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">+{sweep.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} TRX</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm text-blue-900">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-xs sm:text-sm text-blue-800 space-y-2">
          <p>✓ All Arena and Marketplace funds are stored in the Platform Wallet</p>
          <p>✓ Eight Engine executes automated sweeps to the Company Wallet</p>
          <p>✓ Locked funds shown as escrow balances awaiting release</p>
          <p>✓ All balances update every 5 seconds in real-time</p>
        </CardContent>
      </Card>
    </>
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      )}
    </div>
  )
}
