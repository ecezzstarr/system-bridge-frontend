"use client"

import { useState } from "react"
import {
  Plus,
  Lock,
  Calendar,
  Clock,
  DollarSign,
  Video,
  Users,
  Play,
  Check,
  X,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PresenceIndicator } from "@/components/presence-indicator"
import { usePrivateSessions } from "@/lib/hooks"
import { cn } from "@/lib/utils"

const statusConfig = {
  scheduled: { label: "Scheduled", color: "bg-blue-500/10 text-blue-500" },
  active: { label: "Live", color: "bg-primary/10 text-primary" },
  completed: { label: "Completed", color: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive" },
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  return {
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  }
}

export default function PrivateGroundPage() {
  const [tab, setTab] = useState("upcoming")
  const { data: sessionsData, isLoading } = usePrivateSessions({
    status: tab === "upcoming" ? "scheduled" : tab === "active" ? "active" : undefined,
    limit: 20,
  })

  const sessions = sessionsData?.data || []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="h-6 w-6 text-primary" />
            Private Ground
          </h1>
          <p className="text-muted-foreground">
            Schedule and manage private one-on-one sessions
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Schedule Session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">
                  {sessions.filter((s) => s.status === "scheduled").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Now</p>
                <p className="text-2xl font-bold">
                  {sessions.filter((s) => s.status === "active").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Check className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {sessions.filter((s) => s.status === "completed").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Earnings</p>
                <p className="text-2xl font-bold">
                  {sessions
                    .filter((s) => s.status === "completed")
                    .reduce((sum, s) => sum + (s.totalAmount || 0), 0)
                    .toLocaleString()}{" "}
                  <span className="text-sm font-normal text-muted-foreground">TRX</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {tab === "upcoming"
                  ? "Scheduled Sessions"
                  : tab === "active"
                  ? "Live Sessions"
                  : "Past Sessions"}
              </CardTitle>
              <CardDescription>
                {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse rounded-lg border border-border p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-secondary" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-40 rounded bg-secondary" />
                          <div className="h-3 w-24 rounded bg-secondary" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Lock className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-lg font-medium">No sessions found</p>
                  <p className="text-sm text-muted-foreground">
                    {tab === "upcoming"
                      ? "Schedule a private session to get started"
                      : "Your session history will appear here"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => {
                    const config = statusConfig[session.status]
                    const { date, time } = formatDateTime(session.scheduledAt)
                    return (
                      <div
                        key={session.id}
                        className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-secondary/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={session.guest.avatar} />
                              <AvatarFallback>
                                {session.guest.displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <PresenceIndicator
                              status={session.guest.presence}
                              className="absolute -bottom-1 -right-1"
                            />
                          </div>
                          <div>
                            <h3 className="font-medium">{session.guest.displayName}</h3>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {time}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-mono font-medium">
                              {session.rate.toLocaleString()} TRX
                            </p>
                            <p className="text-xs text-muted-foreground">per hour</p>
                          </div>
                          <Badge variant="secondary" className={cn(config.color)}>
                            {config.label}
                          </Badge>
                          {session.status === "scheduled" && (
                            <div className="flex items-center gap-2">
                              <Button size="sm" className="gap-2">
                                <Play className="h-3 w-3" />
                                Start
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          {session.status === "active" && (
                            <Button size="sm" variant="destructive">
                              End Session
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
