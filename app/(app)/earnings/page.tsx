"use client"

import { useState } from "react"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  ArrowUpRight,
  Calendar,
  Download,
  Filter,
  PieChart,
  BarChart3,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { useEarningsSummary, useEarningsHistory } from "@/lib/hooks"
import { cn } from "@/lib/utils"

const earningCategories = [
  { key: "commission", label: "Commissions", color: "bg-primary" },
  { key: "referral", label: "Referrals", color: "bg-blue-500" },
  { key: "tip", label: "Tips", color: "bg-amber-500" },
  { key: "session", label: "Sessions", color: "bg-purple-500" },
  { key: "arena", label: "Arena Wins", color: "bg-blue-600" },
  { key: "other", label: "Other", color: "bg-gray-500" },
]

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function EarningsPage() {
  const [period, setPeriod] = useState("month")
  const { data: summary, isLoading: summaryLoading } = useEarningsSummary()
  const { data: historyData, isLoading: historyLoading } = useEarningsHistory({ limit: 20 })

  const history = historyData?.data || []
  const totalByType = summary?.byType || {}
  const totalEarningsFromTypes = Object.values(totalByType).reduce((sum, val) => sum + (val as number), 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Earnings
          </h1>
          <p className="text-muted-foreground">
            Track your income and revenue streams
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold">
                  {summaryLoading ? "..." : (summary?.totalEarnings || 0).toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground ml-1">TRX</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {summaryLoading ? "..." : (summary?.pendingEarnings || 0).toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground ml-1">TRX</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">
                  {summaryLoading ? "..." : (summary?.thisWeek || 0).toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground ml-1">TRX</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Withdrawn</p>
                <p className="text-2xl font-bold">
                  {summaryLoading ? "..." : (summary?.withdrawnEarnings || 0).toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground ml-1">TRX</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Earnings by Category */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              By Category
            </CardTitle>
            <CardDescription>Revenue breakdown by source</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {earningCategories.map((cat) => {
                const amount = (totalByType[cat.key] as number) || 0
                const percent = totalEarningsFromTypes > 0 
                  ? (amount / totalEarningsFromTypes) * 100 
                  : 0
                return (
                  <div key={cat.key}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-3 w-3 rounded-full", cat.color)} />
                        <span>{cat.label}</span>
                      </div>
                      <span className="font-mono font-medium">
                        {amount.toLocaleString()} TRX
                      </span>
                    </div>
                    <Progress value={percent} className="mt-2 h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Earnings */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recent Earnings
              </CardTitle>
              <CardDescription>Your latest income transactions</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-secondary" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 rounded bg-secondary" />
                        <div className="h-3 w-24 rounded bg-secondary" />
                      </div>
                    </div>
                    <div className="h-4 w-20 rounded bg-secondary" />
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium">No earnings yet</p>
                <p className="text-sm text-muted-foreground">
                  Your earnings will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <TrendingUp className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium capitalize">{tx.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {tx.description || formatDate(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium text-primary">
                        +{tx.amount.toLocaleString()} TRX
                      </p>
                      <Badge
                        variant="secondary"
                        className={cn(
                          tx.status === "completed"
                            ? "bg-primary/10 text-primary"
                            : "bg-warning/10 text-warning"
                        )}
                      >
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
