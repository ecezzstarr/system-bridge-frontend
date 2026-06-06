"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Store,
  MessageSquare,
  Gamepad2,
  Globe,
  Code,
  LayoutDashboard,
  Settings,
  LogOut,
  Navigation,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SystemPulse } from "@/components/system-pulse"
import { PresenceIndicator } from "@/components/presence-indicator"
import { useAuth } from "@/lib/auth-context"

const navigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Market", href: "/marketplace", icon: Store },
  { name: "Lounge", href: "/lounge", icon: MessageSquare },
  { name: "Casino", href: "/casino", icon: Gamepad2 },
  { name: "Arena", href: "/arena", icon: Globe },
]

const adminNavigation = [
  { name: "Workshop", href: "/admin/workshop", icon: Code },
  { name: "System Navigation", href: "/admin/origin-systems", icon: Navigation },
  { name: "Admin Panel", href: "/admin/dashboard", icon: LayoutDashboard },
]

interface AppSidebarProps {
  user?: {
    name: string
    role: string
    avatar?: string
  }
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const { logout } = useAuth()

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo and System Status */}
      <div className="flex items-center gap-3 border-b border-sidebar-border p-4">
        <SystemPulse />
        <div className="flex flex-col">
          <span className="text-xs font-bold text-sidebar-foreground uppercase">
            SSBCOMPANY
          </span>
          <span className="text-xs text-muted-foreground">Weave of Presence</span>
        </div>
      </div>

      {/* User Profile */}
      {user && (
        <div className="flex items-center gap-3 border-b border-sidebar-border p-4">
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
            <span className="text-sm font-medium text-sidebar-foreground">
              {user.name}
            </span>
            <span className="text-xs capitalize text-muted-foreground">
              {user.role}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </li>
            )
          })}

          {user?.role === "admin" && (
            <>
              <li className="my-2 border-t border-sidebar-border pt-2">
                <span className="px-3 text-[10px] font-semibold text-muted-foreground uppercase">
                  Admin Tools
                </span>
              </li>
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </>
          )}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-sidebar-border p-3">
        <div className="space-y-1">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <Settings className="h-4 w-4" />
            Settings
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
