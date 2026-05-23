"use client"

import { useState } from "react"
import { Search, MapPin, Globe, User, MessageSquare, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RoleBadge } from "@/components/role-badge"
import { PresenceIndicator } from "@/components/presence-indicator"
import { WealthTier, getTierFromBalance } from "@/components/wealth-tier"
import { usePublicProfiles } from "@/lib/hooks"
import Link from "next/link"

export default function ProfilesPage() {
  const [search, setSearch] = useState("")
  const { data: profilesData, isLoading } = usePublicProfiles({ limit: 20 })

  const profiles = profilesData?.data || []
  const filteredProfiles = profiles.filter(
    (p) =>
      p.user.displayName.toLowerCase().includes(search.toLowerCase()) ||
      p.bio?.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profiles</h1>
          <p className="text-muted-foreground">Discover and connect with community members</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search profiles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Profiles Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-secondary" />
                    <div className="h-3 w-24 rounded bg-secondary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <User className="h-16 w-16 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No profiles found</p>
          <p className="text-sm text-muted-foreground">
            {search ? "Try adjusting your search" : "Profiles will appear here"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProfiles.map((profile) => (
            <Card key={profile.id} className="group transition-colors hover:border-primary/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={profile.user.avatar} />
                      <AvatarFallback>
                        {profile.user.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <PresenceIndicator
                      status={profile.user.presence}
                      className="absolute -bottom-1 -right-1"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{profile.user.displayName}</h3>
                      <RoleBadge role={profile.user.role} size="sm" />
                    </div>
                    {profile.location && (
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {profile.location}
                      </p>
                    )}
                    {profile.bio && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {profile.bio}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <WealthTier tier={getTierFromBalance(5000)} size="sm" />
                  <div className="flex items-center gap-2">
                    {profile.website && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={profile.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/profiles/${profile.userId}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
