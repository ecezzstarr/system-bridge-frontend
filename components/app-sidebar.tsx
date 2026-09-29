"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, LayoutTemplate, Flame, Settings, LogOut, ShieldCheck, Rocket } from 'lucide-react'
import { getRoleDistricts } from '@/lib/weave-role-districts'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PresenceIndicator } from "@/components/presence-indicator"
import { WeaveLogo } from "@/components/weave-logo"
import { useAuth } from "@/lib/auth-provider"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useEnvironmentOrganizer } from "@/components/world/environment-organizer-provider"

interface AppSidebarProps {
  user?: {
    id?: string
    name: string
    role?: string
    avatar?: string
  }
}

export function AppSidebar({ user: propUser }: AppSidebarProps) {
  const pathname = usePathname()
  const { user: authUser, logout } = useAuth()
  const { isVisible, orderFor } = useEnvironmentOrganizer()
  const user = propUser || authUser
  const navigation = getRoleDistricts(user?.role).map(district=>({group:district.name,items:district.places.map(place=>({name:place.label,href:place.href,icon:LayoutTemplate}))}))
  const [subscription, setContinuance] = useState<any>(null)
  useEffect(() => {
    if (user?.role === 'bridger') {
      fetchContinuance()
    }
  }, [user])

  const fetchContinuance = async () => {
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const res = await fetch('/api/bridger/subscription', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (data.success) {
        setContinuance(data.continuance)
      }
    } catch (error) {
      console.error('Failed to fetch subscription in sidebar:', error)
    }
  }

  return (
    <aside className="weave-sidebar relative flex h-dvh w-72 max-w-[88vw] flex-col overflow-hidden border-r border-sky-300/10 bg-[#020b17]/96 shadow-[22px_0_70px_rgba(2,8,23,.38)] backdrop-blur-2xl">
      {/* Logo and System Status */}
      <div className="relative border-b border-sky-300/10 p-4">
        <div className="flex items-center gap-3">
          <WeaveLogo size="md" className="shrink-0" />
          <div className="min-w-0">
            <p data-weave-live-word="title" className="truncate text-xs font-black uppercase tracking-[0.14em] text-white">WEAVE of Presence</p>
            <span className="mt-1 block truncate text-[8px] font-bold uppercase tracking-[0.16em] text-slate-500">System Switch · Bridge Radiance</span>
          </div>
        </div>
        <div className="weave-flame-live-indicator mt-3 items-center gap-2 rounded-full border border-orange-300/25 bg-orange-400/[0.08] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-orange-100">
          <Flame className="h-3.5 w-3.5" />
          Flame Live · Company Loop 1
        </div>

        {/* PWA Download Button */}
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full h-9 text-[9px] border-cyan-500/25 bg-cyan-500/[0.045] text-cyan-300 hover:bg-cyan-500/10 gap-2"
          onClick={() => {
            const prompt = (window as any).deferredPrompt;
            if (prompt) {
              prompt.prompt();
              prompt.userChoice.then((choice: any) => {
                if (choice.outcome === 'accepted') {
                  toast.success("Beginning...");
                }
              });
            } else {
              toast.info("To download, use 'Add to Home Screen' in your browser menu.");
            }
          }}
        >
          <Rocket className="h-3 w-3" />
          Download App
        </Button>
      </div>

      {/* User Profile */}
      {user && (
        <div className="relative flex items-center gap-3 border-b border-sky-300/10 px-4 py-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <PresenceIndicator className="absolute -bottom-0.5 -right-0.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-sidebar-foreground">
                {user.name}
              </span>
              {user.role === 'admin' && (
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              )}
            </div>
            <span className="text-xs capitalize text-muted-foreground">
              {user.role}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="relative min-h-0 flex-1 overflow-y-auto p-2.5 scrollbar-hide">
        <div className="space-y-2.5">
          {navigation.map((group) => {
            const visibleItems = group.items.filter((item: any) => {
              if (item.adminOnly && user?.role !== "admin") return false
              if (item.bridgerOnly && user?.role !== "bridger") return false
              if (item.agentOnly && user?.role !== "agent") return false
              if (item.hideForBridger && user?.role === "bridger") return false
              if (item.staffOnly && user?.role !== "admin" && user?.role !== "agent") return false
              return isVisible(item.href)
            }).sort((a:any,b:any)=>orderFor(a.href)-orderFor(b.href))

            if (visibleItems.length === 0) return null

            return (
              <section key={group.group} className="weave-nav-group rounded-2xl border border-white/[0.055] bg-white/[0.018] p-2">
                <div className="mb-1.5 flex items-center justify-between px-2 py-1">
                  <h3 data-weave-live-word="station" className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {group.group} District
                  </h3>
                  <span className="font-mono text-[8px] text-slate-600">{String(visibleItems.length).padStart(2,'0')}</span>
                </div>
                <ul className="space-y-1">
                  {visibleItems.map((item) => {
                    const homeHref =
                      user?.role === 'admin' ? '/admin/dashboard'
                      : user?.role === 'agent' ? '/agent/dashboard'
                      : user?.role === 'bridger' ? '/bridger/dashboard'
                      : user?.role === 'client' ? '/client/dashboard'
                      : '/dashboard'
                    const href = item.name === 'Home' ? homeHref : item.href
                    const isActive = pathname === href
                    const isSubItem = item.name === "Bridger Continuance"

                    return (
                      <li key={item.name}>
                        <Link
                          href={href}
                          data-active={isActive ? 'true' : 'false'}
                          className={cn(
                            "weave-nav-item flex min-h-11 items-center justify-between rounded-xl border px-3 py-2.5 text-[11px] font-semibold transition-all",
                            isActive
                              ? "border-sky-300/25 bg-sky-400/10 text-sky-100 shadow-[0_0_20px_rgba(56,189,248,.07)]"
                              : "border-transparent text-sidebar-foreground hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.055] bg-black/15">
                              <item.icon className="h-3.5 w-3.5" />
                            </span>
                            <span data-weave-live-word="station" className="min-w-0 truncate">{item.name}</span>
                          </div>
                          {isSubItem && subscription && (
                            <span className={cn(
                              "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border",
                              subscription.subscription_status === 'active'
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : subscription.subscription_status === 'due'
                                  ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                  : "bg-red-500/10 text-red-500 border-red-500/20"
                            )}>
                              {subscription.subscription_status}
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>

      </nav>

      {/* Bottom Actions */}
      <div className="relative border-t border-sky-300/10 bg-black/20 p-2.5">
        <div className="space-y-1">
          <Link
            href="/roles"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <Settings className="h-4 w-4" />
            Position + Identity
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-3 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-destructive"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </aside>
  )
}
