"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Wallet,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle,
  Loader2,
  History,
  DollarSign,
  Users,
  ShieldCheck,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import useSWR from "swr"

export default function AdminPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isSweeping, setIsSweeping] = useState(false)
  const [sweepResult, setSweepResult] = useState<{
    success: boolean
    message: string
    data?: unknown
  } | null>(null)
  const [minBalance, setMinBalance] = useState("100")
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Fetch sweep history
  const { data: sweepHistory, mutate: refreshHistory } = useSWR(
    user?.role === "admin" ? "sweepHistory" : null,
    async () => {
      const res = await api.getSweepHistory({ limit: 10 })
      if (!res.success) throw new Error(res.error)
      return res.data
    }
  )

  // Fetch system stats
  const { data: systemStats } = useSWR(
    user?.role === "admin" ? "systemStats" : null,
    async () => {
      const res = await api.getSystemStats()
      if (!res.success) throw new Error(res.error)
      return res.data
    }
  )

  // Check if user is admin
  if (user && user.role !== "admin") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <ShieldCheck className="h-16 w-16 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold">Access Denied</h1>
        <p className="mt-2 text-muted-foreground">
          You need admin privileges to access this page.
        </p>
        <Button className="mt-6" onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    )
  }

  const handleSweep = async () => {
    setIsSweeping(true)
    setSweepResult(null)
    setConfirmOpen(false)

    try {
      const result = await api.sweepToCompanyWallet({
        minBalance: parseFloat(minBalance) || 0,
      })

      if (result.success) {
        setSweepResult({
          success: true,
          message: "Wallet sweep completed successfully",
          data: result.data,
        })
        refreshHistory()
      } else {
        setSweepResult({
          success: false,
          message: result.error || "Sweep operation failed",
        })
      }
    } catch (error) {
      setSweepResult({
        success: false,
        message: error instanceof Error ? error.message : "An error occurred",
      })
    } finally {
      setIsSweeping(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Eight Control Center</h1>
        <p className="text-muted-foreground">
          Eight Engine - Backend operations and wallet management. River handles all user interactions.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats?.totalUsers?.toLocaleString() || "--"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Wallet Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats?.totalWalletBalance?.toLocaleString() || "--"} TRX
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats?.systemBalance?.toLocaleString() || "--"} TRX
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transactions
            </CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats?.totalTransactions?.toLocaleString() || "--"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Sweep Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Eight Wallet Sweep
          </CardTitle>
          <CardDescription>
            Transfer funds from platform wallets to company wallet. Eight handles
            all backend operations. This action is logged and auditable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sweepResult && (
            <Alert variant={sweepResult.success ? "default" : "destructive"}>
              {sweepResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertTitle>
                {sweepResult.success ? "Success" : "Error"}
              </AlertTitle>
              <AlertDescription>{sweepResult.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="minBalance">Minimum Balance Threshold</Label>
              <Input
                id="minBalance"
                type="number"
                placeholder="100"
                value={minBalance}
                onChange={(e) => setMinBalance(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Only sweep wallets with balance above this amount (in TRX)
              </p>
            </div>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2"
                  disabled={isSweeping}
                >
                  {isSweeping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="h-4 w-4" />
                  )}
                  Initiate Sweep
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Confirm Wallet Sweep
                  </DialogTitle>
                  <DialogDescription>
                    This action will transfer funds from user wallets to the company
                    wallet. This operation cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg bg-secondary p-4">
                  <p className="text-sm">
                    <strong>Minimum Balance:</strong> {minBalance || "0"} TRX
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    All wallets with balance above this threshold will be swept.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleSweep}
                    disabled={isSweeping}
                  >
                    {isSweeping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Confirm Sweep"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Sweep History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Sweep History
            </CardTitle>
            <CardDescription>Recent wallet sweep operations</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refreshHistory()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {!sweepHistory?.sweeps || sweepHistory.sweeps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <History className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No sweep history yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sweepHistory.sweeps.map((sweep: {
                id: string
                totalAmount: number
                transactionCount: number
                status: string
                createdAt: string
              }) => (
                <div
                  key={sweep.id}
                  className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <ArrowRightLeft className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {sweep.totalAmount.toLocaleString()} TRX Swept
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {sweep.transactionCount} wallets affected
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        sweep.status === "completed"
                          ? "bg-primary/10 text-primary"
                          : sweep.status === "partial"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {sweep.status}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(sweep.createdAt).toLocaleString()}
                    </p>
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
