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
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-sky-300/10 bg-[#03101d]/78 px-4 md:px-6 backdrop-blur-2xl shadow-[0_12px_40px_rgba(2,8,23,.28)]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 text-slate-400 hover:text-white"
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
              className="pl-10 bg-[#061426]/72 border-sky-300/12 text-xs h-9 focus-visible:ring-cyan-500/50 shadow-inner"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Wallet Quick View - Icon only on mobile */}
          <Button variant="outline" size="sm" className="gap-2 bg-[#061426]/72 border-amber-300/12 h-9 px-2 md:px-3 shadow-inner">
            <Wallet className="h-4 w-4 text-cyan-400" />
            <span className="font-mono text-[10px] md:text-xs hidden sm:inline">{flameCoinBalance !== null ? `${flameCoinBalance.toLocaleString()} Flame Coin` : '—'}</span>
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

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[86vw] max-w-72 bg-slate-950 border-r border-white/10 shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="flex justify-end p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="px-2 pb-8">
              <AppSidebar user={authUser || undefined} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
