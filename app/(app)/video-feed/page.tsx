"use client"

import { useState } from "react"
import {
  Play,
  Heart,
  MessageSquare,
  Share2,
  Eye,
  Clock,
  Sparkles,
  Radio,
  Filter,
  DollarSign,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PresenceIndicator } from "@/components/presence-indicator"
import { useVideoFeed } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import api from "@/lib/api"

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function formatViews(count: number) {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

function TipDialog({ videoId, onSuccess }: { videoId: string; onSuccess: () => void }) {
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleTip = async () => {
    if (!amount) return
    setIsLoading(true)
    const result = await api.tipVideo(videoId, parseFloat(amount))
    setIsLoading(false)
    if (result.success) {
      setAmount("")
      setOpen(false)
      onSuccess()
    }
  }

  const quickAmounts = [10, 50, 100, 500]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <DollarSign className="h-4 w-4" />
          Tip
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a Tip</DialogTitle>
          <DialogDescription>Support the creator with TRX</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((amt) => (
              <Button
                key={amt}
                variant={amount === amt.toString() ? "default" : "outline"}
                onClick={() => setAmount(amt.toString())}
              >
                {amt}
              </Button>
            ))}
          </div>
          <div className="relative">
            <Input
              type="number"
              placeholder="Custom amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pr-16"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              TRX
            </span>
          </div>
          <Button className="w-full" disabled={!amount || isLoading} onClick={handleTip}>
            Send {amount || "0"} TRX
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function VideoFeedPage() {
  const [tab, setTab] = useState("all")
  const { data: videosData, isLoading, mutate } = useVideoFeed({
    live: tab === "live" ? true : undefined,
    limit: 20,
  })

  const videos = videosData?.data || []
  const liveCount = videos.filter((v) => v.isLive).length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Play className="h-6 w-6 text-primary" />
            Video Feed
          </h1>
          <p className="text-muted-foreground">
            Watch and interact with creator content
          </p>
        </div>
        <Button className="gap-2">
          <Radio className="h-4 w-4" />
          Go Live
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All Videos</TabsTrigger>
          <TabsTrigger value="live" className="gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
            </span>
            Live ({liveCount})
          </TabsTrigger>
          <TabsTrigger value="trending">
            <Sparkles className="mr-2 h-4 w-4" />
            Trending
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse overflow-hidden">
                  <div className="aspect-video bg-secondary" />
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 rounded-full bg-secondary" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-full rounded bg-secondary" />
                        <div className="h-3 w-24 rounded bg-secondary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Play className="h-16 w-16 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No videos found</p>
              <p className="text-sm text-muted-foreground">
                Videos will appear here when creators upload content
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <Card
                  key={video.id}
                  className="group overflow-hidden transition-colors hover:border-primary/50"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-secondary">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Play className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    {/* Live Badge */}
                    {video.isLive && (
                      <Badge className="absolute left-2 top-2 gap-1 bg-destructive">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                        </span>
                        LIVE
                      </Badge>
                    )}
                    {/* Duration */}
                    {!video.isLive && (
                      <Badge
                        variant="secondary"
                        className="absolute bottom-2 right-2 bg-black/70 text-white"
                      >
                        {formatDuration(video.duration)}
                      </Badge>
                    )}
                    {/* Play Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Play className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={video.user.avatar} />
                          <AvatarFallback>
                            {video.user.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <PresenceIndicator
                          status={video.user.presence}
                          size="sm"
                          className="absolute -bottom-0.5 -right-0.5"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium line-clamp-2">{video.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {video.user.displayName}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {formatViews(video.views)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {formatViews(video.likes)}
                          </span>
                          {video.tips > 0 && (
                            <span className="flex items-center gap-1 text-primary">
                              <DollarSign className="h-3 w-3" />
                              {video.tips.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Heart className="h-4 w-4" />
                        Like
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Comment
                      </Button>
                      <TipDialog videoId={video.id} onSuccess={() => mutate()} />
                      <Button variant="ghost" size="icon" className="ml-auto">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
