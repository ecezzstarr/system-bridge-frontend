"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Search, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PresenceIndicator } from "@/components/presence-indicator"

interface AppHeaderProps {
  user?: {
    name: string
    role: string
    avatar?: string
  }
}

export function AppHeader({ user }: AppHeaderProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = search.trim()
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search")
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <form onSubmit={submitSearch} className="relative w-96">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="What are you encountering?"
          aria-label="Search human cadences in Weave"
          className="pl-10"
        />
      </form>

      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" className="gap-2">
          <Wallet className="h-4 w-4" />
          <span className="font-mono">12,450 TRX</span>
        </Button>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">3</span>
        </Button>
        {user && (
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary">
              {user.avatar ? <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" /> : <span className="text-sm font-medium">{user.name.charAt(0).toUpperCase()}</span>}
            </div>
            <PresenceIndicator className="absolute -bottom-0.5 -right-0.5" />
          </div>
        )}
      </div>
    </header>
  )
}
