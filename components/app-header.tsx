"use client"

import { useRouter } from "next/navigation"
import { Search, Wallet, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PresenceIndicator } from "@/components/presence-indicator"
import { NotificationBell } from "@/components/notification-bell"
import { useState, useEffect } from "react"
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
  const { user: authUser, logout } = useAuth()
  const effectiveUser = user || (authUser ? { name: authUser.name || 'WEAVE User', role: authUser.role || 'user', avatar: authUser.avatar || undefined } : undefined)
  const [accountOpen, setAccountOpen] = useState(false)
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

  if (!effectiveUser) return null

  return (
    <header
      className="weave-header fixed left-2 right-2 top-[max(.5rem,env(safe-area-inset-top))] z-40 flex h-12 min-w-0 items-center justify-between gap-1 rounded-full border border-sky-200/10 bg-[#020914]/72 px-2 shadow-[0_12px_40px_rgba(2,8,23,.22)] backdrop-blur-xl sm:left-3 sm:right-3 sm:px-3 md:left-5 md:right-5 md:px-4"
      data-weave-world-header="top"
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
        <div data-weave-live-word="station" className="weave-flame-live-indicator max-w-[8rem] items-center gap-1.5 overflow-hidden rounded-full border border-orange-300/20 bg-orange-400/[0.07] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-orange-100 max-[390px]:hidden">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-300 shadow-[0_0_12px_rgba(251,146,60,.8)]" />
          Flame Live
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 rounded-full px-0 text-slate-300 hover:bg-sky-300/[0.06] hover:text-white md:hidden"
          onClick={() => router.push('/search')}
          aria-label="Search human cadences"
        >
          <Search className="h-4 w-4" />
        </Button>

        <div className="relative hidden w-64 md:block lg:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            type="search"
            placeholder="Search human cadences..."
            aria-label="Search human cadences"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && search.trim()) {
                router.push(`/search?q=${encodeURIComponent(search.trim())}`)
              }
            }}
            className="h-8 border-transparent bg-transparent pl-10 text-xs focus-visible:ring-cyan-500/30"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-4">
        <Button
          variant="outline"
          size="sm"
          className="h-8 min-w-10 gap-2 border-white/5 bg-transparent px-2 md:px-3"
          onClick={() => router.push('/wallet')}
          aria-label="Open Flame Coin wallet"
        >
          <Wallet className="h-4 w-4 text-cyan-400" />
          <span data-weave-live-word="station" className="hidden font-mono text-[10px] sm:inline md:text-xs">
            {flameCoinBalance !== null ? `${flameCoinBalance.toLocaleString()} Flame Coin` : '—'}
          </span>
        </Button>

        <div className="relative ml-0.5 sm:ml-1">
            <button
              type="button"
              onClick={() => setAccountOpen(open => !open)}
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 p-[1px] md:h-9 md:w-9"
              aria-label="Open position controls"
              aria-expanded={accountOpen}
            >
              <span className="flex h-full w-full items-center justify-center rounded-full bg-slate-950">
                {effectiveUser.avatar ? (
                  <img
                    src={effectiveUser.avatar}
                    alt={effectiveUser.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] font-black text-white md:text-xs">
                    {effectiveUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <PresenceIndicator className="absolute -bottom-0.5 -right-0.5" />
            </button>

            {accountOpen && (
              <div className="absolute right-0 top-12 w-[min(14rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#030914]/96 p-2 shadow-2xl backdrop-blur-xl">
                <div className="border-b border-white/[.07] px-3 py-2">
                  <p className="truncate text-[10px] font-black text-white">{effectiveUser.name}</p>
                  <p className="mt-0.5 text-[8px] font-black uppercase tracking-[.14em] text-slate-500">{effectiveUser.role} position</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setAccountOpen(false); router.push(effectiveUser.role === 'client' ? '/client/settings' : '/settings') }}
                  className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-bold text-slate-300 hover:bg-white/[.04] hover:text-white"
                >
                  <Settings className="h-4 w-4" />Settings
                </button>
                <button
                  type="button"
                  onClick={() => { setAccountOpen(false); logout(); router.replace(effectiveUser.role === 'client' ? '/client/login' : '/login') }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 hover:bg-red-400/[.06] hover:text-red-200"
                >
                  <LogOut className="h-4 w-4" />Sign Out
                </button>
              </div>
            )}
          </div>

        <NotificationBell />
      </div>
    </header>
  )
}
