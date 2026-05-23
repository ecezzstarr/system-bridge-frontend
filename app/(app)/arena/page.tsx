"use client"

import { useState } from "react"
import {
  Trophy,
  Plus,
  Users,
  Clock,
  DollarSign,
  Swords,
  Crown,
  Calendar,
  Play,
  Target,
  X,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { useArenaMatches } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { useAuth } from "@/lib/auth-provider"

const statusConfig = {
  upcoming: { label: "Upcoming", color: "bg-blue-500/10 text-blue-500", icon: Calendar },
  live: { label: "Live", color: "bg-destructive/10 text-destructive", icon: Play },
  completed: { label: "Completed", color: "bg-muted text-muted-foreground", icon: Trophy },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground", icon: Target },
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  return {
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  }
}

export default function ArenaPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState("upcoming")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState<string | null>(null)
  const [newMatch, setNewMatch] = useState({
    title: '',
    description: '',
    entryFee: 10,
    maxParticipants: 10,
    category: 'general',
    startsAt: '',
  })

  const { data: matchesData, isLoading, mutate } = useArenaMatches({
    status: tab === "all" ? undefined : tab,
    limit: 20,
  })

  const matches = matchesData?.matches || matchesData?.data?.matches || []

  const handleJoinMatch = async (matchId: string) => {
    if (!user?.id) return
    setJoining(matchId)
    try {
      await api.joinArenaMatch(matchId, user.id)
      mutate()
    } catch (e) {
      console.error('Failed to join match:', e)
    }
    setJoining(null)
  }

  const handleCreateMatch = async () => {
    if (!user?.id || !newMatch.title || !newMatch.startsAt) return
    setCreating(true)
    try {
      await api.createArenaMatch({
        ...newMatch,
        hostId: user.id,
      })
      mutate()
      setShowCreateModal(false)
      setNewMatch({
        title: '',
        description: '',
        entryFee: 10,
        maxParticipants: 10,
        category: 'general',
        startsAt: '',
      })
    } catch (e) {
      console.error('Failed to create match:', e)
    }
    setCreating(false)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Swords className="h-6 w-6 text-primary" />
            Arena
          </h1>
          <p className="text-muted-foreground">
            Compete in matches and win TRX prizes
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Create Match
        </Button>
      </div>

      {/* Create Match Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create Match</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newMatch.title}
                  onChange={(e) => setNewMatch({ ...newMatch, title: e.target.value })}
                  placeholder="Match title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={newMatch.description}
                  onChange={(e) => setNewMatch({ ...newMatch, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Entry Fee (TRX)</label>
                  <Input
                    type="number"
                    value={newMatch.entryFee}
                    onChange={(e) => setNewMatch({ ...newMatch, entryFee: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Players</label>
                  <Input
                    type="number"
                    value={newMatch.maxParticipants}
                    onChange={(e) => setNewMatch({ ...newMatch, maxParticipants: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="datetime-local"
                  value={newMatch.startsAt}
                  onChange={(e) => setNewMatch({ ...newMatch, startsAt: e.target.value })}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleCreateMatch}
                disabled={creating || !newMatch.title || !newMatch.startsAt}
              >
                {creating ? 'Creating...' : 'Create Match'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <Play className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Live Now</p>
                <p className="text-2xl font-bold">
                  {matches.filter((m) => m.status === "live").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">
                  {matches.filter((m) => m.status === "upcoming").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Prizes</p>
                <p className="text-2xl font-bold">
                  {matches
                    .reduce((sum, m) => sum + m.prizePool, 0)
                    .toLocaleString()}{" "}
                  <span className="text-sm font-normal text-muted-foreground">TRX</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Participants</p>
                <p className="text-2xl font-bold">
                  {matches.reduce((sum, m) => sum + m.participants.length, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="live" className="gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
            </span>
            Live
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="h-5 w-48 rounded bg-secondary" />
                      <div className="h-4 w-full rounded bg-secondary" />
                      <div className="flex gap-2">
                        {[...Array(4)].map((_, j) => (
                          <div key={j} className="h-8 w-8 rounded-full bg-secondary" />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Swords className="h-16 w-16 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No matches found</p>
              <p className="text-sm text-muted-foreground">
                {tab === "upcoming"
                  ? "Create a match to get started"
                  : "Matches will appear here"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {matches.map((match) => {
                const config = statusConfig[match.status]
                const StatusIcon = config.icon
                const { date, time } = formatDateTime(match.scheduledAt)
                const spotsLeft = match.maxParticipants - match.participants.length
                const fillPercent =
                  (match.participants.length / match.maxParticipants) * 100
                return (
                  <Card
                    key={match.id}
                    className="group transition-colors hover:border-primary/50"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{match.title}</CardTitle>
                          {match.description && (
                            <CardDescription className="mt-1 line-clamp-1">
                              {match.description}
                            </CardDescription>
                          )}
                        </div>
                        <Badge variant="secondary" className={cn("gap-1", config.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Host */}
                      <div className="mb-4 flex items-center gap-2 text-sm">
                        <Crown className="h-4 w-4 text-warning" />
                        <span className="text-muted-foreground">Host:</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={match.host.avatar} />
                            <AvatarFallback className="text-xs">
                              {match.host.displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{match.host.displayName}</span>
                        </div>
                      </div>

                      {/* Prize & Entry */}
                      <div className="mb-4 grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-primary/10 p-3 text-center">
                          <Trophy className="mx-auto h-5 w-5 text-primary" />
                          <p className="mt-1 font-mono text-lg font-bold">
                            {match.prizePool.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Prize Pool (TRX)</p>
                        </div>
                        <div className="rounded-lg bg-secondary p-3 text-center">
                          <DollarSign className="mx-auto h-5 w-5 text-muted-foreground" />
                          <p className="mt-1 font-mono text-lg font-bold">
                            {match.entryFee.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Entry Fee (TRX)</p>
                        </div>
                      </div>

                      {/* Participants Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Participants</span>
                          <span>
                            {match.participants.length}/{match.maxParticipants}
                          </span>
                        </div>
                        <Progress value={fillPercent} className="mt-2 h-2" />
                        {spotsLeft > 0 && spotsLeft <= 3 && (
                          <p className="mt-1 text-xs text-warning">
                            Only {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left!
                          </p>
                        )}
                      </div>

                      {/* Participants Avatars */}
                      <div className="mb-4 flex -space-x-2">
                        {match.participants.slice(0, 6).map((participant) => (
                          <Avatar
                            key={participant.id}
                            className="h-8 w-8 border-2 border-background"
                          >
                            <AvatarImage src={participant.avatar} />
                            <AvatarFallback className="text-xs">
                              {participant.displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {match.participants.length > 6 && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-secondary text-xs font-medium">
                            +{match.participants.length - 6}
                          </div>
                        )}
                      </div>

                      {/* Winner (if completed) */}
                      {match.status === "completed" && match.winner && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 p-3">
                          <Trophy className="h-5 w-5 text-primary" />
                          <span className="text-sm">Winner:</span>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={match.winner.avatar} />
                              <AvatarFallback className="text-xs">
                                {match.winner.displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{match.winner.displayName}</span>
                          </div>
                        </div>
                      )}

                      {/* Schedule & Action */}
                      <div className="flex items-center justify-between border-t border-border pt-4">
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
                        {match.status === "upcoming" && spotsLeft > 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleJoinMatch(match.id)}
                            disabled={joining === match.id}
                            className="gap-2"
                          >
                            <Swords className="h-4 w-4" />
                            {joining === match.id ? 'Joining...' : 'Join Match'}
                          </Button>
                        )}
                        {match.status === "live" && (
                          <Button size="sm" variant="destructive" className="gap-2">
                            <Play className="h-4 w-4" />
                            Watch Live
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
