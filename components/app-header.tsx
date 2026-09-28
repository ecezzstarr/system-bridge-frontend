"use client"

import { useRouter } from "next/navigation"
import { Search, Wallet, Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PresenceIndicator } from "@/components/presence-indicator"
import { NotificationBell } from "@/components/notification-bell"
import { useEffect, useState } from "react"
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
      <header className="weave-header fixed left-3 right-3 top-3 z-40 flex h-12 items-center justify-between rounded-full border border-sky-200/10 bg-[#020914]/72 px-3 shadow-[0_12px_40px_rgba(2,8,23,.22)] backdrop-blur-xl md:left-5 md:right-5 md:px-4" data-weave-world-header="top">
        <div className="flex min-w-0 items-center gap-3">
          <div data-weave-live-word="station" className="weave-flame-live-indicator items-center gap-1.5 rounded-full border border-orange-300/20 bg-orange-400/[0.07] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-orange-100">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-300 shadow-[0_0_12px_rgba(251,146,60,.8)]" />
            Flame Live
          </div>
          <Button
            variant="ghost"
            className="h-9 gap-2 px-2 text-slate-400 hover:text-white sm:px-3"
            onClick={() => router.push('/weave')}
            aria-label="Enter Bridge Plaza"
            data-bridge-plaza-return="true"
          >
            <Landmark className="h-4 w-4" />
            <span className="hidden text-[9px] font-black uppercase tracking-[0.12em] sm:inline">Bridge Plaza</span>
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

    </>
  )
}
