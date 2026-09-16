"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Search, User, Store, ArrowRight, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PresenceIndicator } from "@/components/presence-indicator"
import { RoleBadge } from "@/components/role-badge"
import { usePublicProfiles } from "@/lib/hooks"
import { api } from "@/lib/api"

interface MarketplaceResult {
  id: string
  title?: string
  description?: string
  price?: number
  category?: string
  imageUrl?: string
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get("q")?.trim() || ""
  const [value, setValue] = useState(query)
  const [marketplace, setMarketplace] = useState<MarketplaceResult[]>([])
  const [marketplaceLoading, setMarketplaceLoading] = useState(false)

  const { data: profilesData, isLoading: profilesLoading } = usePublicProfiles({
    limit: 24,
    search: query || undefined,
  })

  useEffect(() => {
    setValue(query)
  }, [query])

  useEffect(() => {
    let cancelled = false

    if (!query) {
      setMarketplace([])
      setMarketplaceLoading(false)
      return
    }

    setMarketplaceLoading(true)
    api.getMarketplaceListings({ search: query }).then((response) => {
      if (cancelled) return
      setMarketplace((response.data?.listings || []) as MarketplaceResult[])
      setMarketplaceLoading(false)
    }).catch(() => {
      if (!cancelled) {
        setMarketplace([])
        setMarketplaceLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [query])

  const profiles = useMemo(() => profilesData?.data || [], [profilesData])
  const loading = profilesLoading || marketplaceLoading
  const hasResults = profiles.length > 0 || marketplace.length > 0

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = value.trim()
    router.push(next ? `/search?q=${encodeURIComponent(next)}` : "/search")
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">WEAVE SEARCH</p>
        <h1 className="text-3xl font-bold tracking-tight">Search the Weave</h1>
        <p className="text-muted-foreground">
          Find people and public marketplace offerings across the network.
        </p>
      </div>

      <form onSubmit={submitSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Search people, profiles, marketplace..."
            className="h-12 pl-11 text-base"
            aria-label="Search Weave"
          />
        </div>
        <Button type="submit" size="lg">Search</Button>
      </form>

      {!query ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
            <Search className="h-10 w-10 text-muted-foreground/50" />
            <h2 className="mt-4 font-semibold">Start with a name, topic, or offering</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Weave Search is available to every signed-in user from the global header.
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Searching Weave...
        </div>
      ) : !hasResults ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
            <Search className="h-10 w-10 text-muted-foreground/50" />
            <h2 className="mt-4 font-semibold">No results for “{query}”</h2>
            <p className="mt-1 text-sm text-muted-foreground">Try a different name or search term.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {profiles.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">People</h2>
                </div>
                <Link href="/profiles" className="text-sm text-muted-foreground hover:text-foreground">
                  View all
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {profiles.map((profile) => (
                  <Card key={profile.id} className="transition-colors hover:border-primary/50">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={profile.user.avatar} />
                            <AvatarFallback>{profile.user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <PresenceIndicator status={profile.user.presence} className="absolute -bottom-1 -right-1" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate font-semibold">{profile.user.displayName}</h3>
                            <RoleBadge role={profile.user.role} size="sm" />
                          </div>
                          {profile.location && <p className="truncate text-sm text-muted-foreground">{profile.location}</p>}
                        </div>
                      </div>
                      {profile.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{profile.bio}</p>}
                      <Button variant="ghost" size="sm" className="mt-3 px-0" asChild>
                        <Link href={`/profiles/${profile.userId}`}>
                          View profile <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {marketplace.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Marketplace</h2>
                </div>
                <Link href="/marketplace" className="text-sm text-muted-foreground hover:text-foreground">
                  View marketplace
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {marketplace.map((listing) => (
                  <Card key={listing.id} className="overflow-hidden transition-colors hover:border-primary/50">
                    {listing.imageUrl && (
                      <img src={listing.imageUrl} alt="" className="h-40 w-full object-cover" />
                    )}
                    <CardContent className="p-5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{listing.category || "Marketplace"}</p>
                      <h3 className="mt-1 font-semibold">{listing.title || "Untitled listing"}</h3>
                      {listing.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{listing.description}</p>}
                      {typeof listing.price === "number" && <p className="mt-3 font-mono font-semibold">{listing.price.toLocaleString()} TRX</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
