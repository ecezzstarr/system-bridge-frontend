"use client"

import { useState } from "react"
import {
  Plus,
  Users,
  Lock,
  Unlock,
  Crown,
  MessageSquare,
  Volume2,
  VolumeX,
  DoorOpen,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PresenceIndicator } from "@/components/presence-indicator"
import { useLoungeRooms } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import api from "@/lib/api"

const statusConfig = {
  open: { label: "Open", color: "bg-primary/10 text-primary" },
  full: { label: "Full", color: "bg-warning/10 text-warning" },
  closed: { label: "Closed", color: "bg-muted text-muted-foreground" },
}

export default function LoungePage() {
  const [search, setSearch] = useState("")
  const { data: roomsData, isLoading, mutate } = useLoungeRooms({ limit: 20 })

  const rooms = roomsData?.data || []
  const filteredRooms = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
  )

  const handleJoinRoom = async (roomId: string) => {
    await api.joinLoungeRoom(roomId)
    mutate()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Lounge
          </h1>
          <p className="text-muted-foreground">
            Join rooms and connect with the community
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Room
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MessageSquare className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search rooms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Active Rooms */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Active Rooms</h2>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-5 w-32 rounded bg-secondary" />
                    <div className="h-4 w-full rounded bg-secondary" />
                    <div className="flex -space-x-2">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="h-8 w-8 rounded-full bg-secondary" />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">No rooms found</p>
            <p className="text-sm text-muted-foreground">
              {search ? "Try adjusting your search" : "Create a room to get started"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRooms.map((room) => {
              const config = statusConfig[room.status]
              const isFull = room.participants.length >= room.maxParticipants
              return (
                <Card
                  key={room.id}
                  className="group transition-colors hover:border-primary/50"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {room.isPrivate ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Unlock className="h-4 w-4 text-primary" />
                        )}
                        <CardTitle className="text-base">{room.name}</CardTitle>
                      </div>
                      <Badge variant="secondary" className={cn(config.color)}>
                        {config.label}
                      </Badge>
                    </div>
                    {room.description && (
                      <CardDescription className="line-clamp-2">
                        {room.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {/* Host */}
                    <div className="mb-4 flex items-center gap-2 text-sm">
                      <Crown className="h-4 w-4 text-warning" />
                      <span className="text-muted-foreground">Host:</span>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={room.host.avatar} />
                          <AvatarFallback className="text-xs">
                            {room.host.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{room.host.displayName}</span>
                      </div>
                    </div>

                    {/* Participants */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Participants</span>
                        <span>
                          {room.participants.length}/{room.maxParticipants}
                        </span>
                      </div>
                      <div className="mt-2 flex -space-x-2">
                        {room.participants.slice(0, 5).map((participant) => (
                          <div key={participant.id} className="relative">
                            <Avatar className="h-8 w-8 border-2 border-background">
                              <AvatarImage src={participant.avatar} />
                              <AvatarFallback className="text-xs">
                                {participant.displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <PresenceIndicator
                              status={participant.presence}
                              size="sm"
                              className="absolute -bottom-0.5 -right-0.5"
                            />
                          </div>
                        ))}
                        {room.participants.length > 5 && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-secondary text-xs font-medium">
                            +{room.participants.length - 5}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Entry Fee & Actions */}
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <div>
                        {room.entryFee > 0 ? (
                          <p className="font-mono text-sm font-medium">
                            {room.entryFee.toLocaleString()} TRX
                          </p>
                        ) : (
                          <p className="text-sm text-primary">Free Entry</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        disabled={isFull || room.status === "closed"}
                        onClick={() => handleJoinRoom(room.id)}
                        className="gap-2"
                      >
                        <DoorOpen className="h-4 w-4" />
                        Join
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
