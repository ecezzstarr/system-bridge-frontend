"use client"

import { useRouter } from "next/navigation"
import { Search, Wallet, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PresenceIndicator } from "@/components/presence-indicator"
import { NotificationBell } from "@/components/notification-bell"
import { useState, useEffect } from "react"
import { AppSidebar } from "./app-sidebar"
import { useAuth } from "@/lib/auth-provider"

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user: authUser } = useAuth()
  const [flameCoinBalance, setFlameCoinBalance] = useState<number | null>(null)

  useEffect(() => {
    if (!authUser?.id) return
    const token = localStorage.getItem('ssb_auth_token')
    fetch('/api/wallet/balance', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => { if (data.success) setFlameCoinBalance(data.flameCoinBalance) })
      .catch(() => {})
  }, [authUser?.id])

  return (
    <>
      <header className="weave-header fixed inset-x-0 top-0 z-40 flex h-12 items-center justify-between border-b border-sky-200/10 bg-[#020914]/58 px-3 backdrop-blur-xl md:px-5" data-weave-world-header="top">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search - Hidden on small mobile */}
          <div className="relative hidden md:block w-64 lg:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              type="search"
              placeholder="Search human cadences..." aria-label="Search human cadences" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === "Enter") router.push(`/search?q=${encodeURIComponent(search.trim())}`) }}
              className="pl-10 bg-transparent border-transparent text-xs h-8 focus-visible:ring-cyan-500/30"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Wallet Quick View - Icon only on mobile */}
          <Button variant="outline" size="sm" className="gap-2 bg-transparent border-white/5 h-8 px-2 md:px-3">
            <Wallet className="h-4 w-4 text-cyan-400" />
            <span data-weave-live-word="station" className="font-mono text-[10px] md:text-xs hidden sm:inline">{flameCoinBalance !== null ? `${flameCoinBalance.toLocaleString()} Flame Coin` : '—'}</span>
          </Button>

          {/* User Avatar */}
          {user && (
            <div className="relative ml-1">
              <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 p-[1px]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] md:text-xs font-black text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <PresenceIndicator className="absolute -bottom-0.5 -right-0.5" />
            </div>
          )}

          {/* Real notifications, rightmost element in the header */}
          <NotificationBell />
        </div>
      </header>

      {/* World navigator: the same role-aware radar is available on phone and desktop. */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50" data-weave-world-navigator="role-radar">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[88vw] animate-in slide-in-from-left duration-300">
            <div className="absolute right-2 top-2 z-[60]">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <AppSidebar user={authUser || undefined} />
          </div>
        </div>
      )}
    </>
  )
}
