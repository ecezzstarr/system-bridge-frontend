"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  LayoutTemplate,
  Sparkles,
  Flame,
  Radio,
  Megaphone,
  Headphones,
  Wallet,
  Users,
  UserCircle,
  MessageSquare,
  Shield,
  Globe,
  Store,
  DollarSign,
  Settings,
  LogOut,
  ShieldCheck,
  BookOpen,
  Briefcase,
  Trophy,
  CreditCard,
  FileCheck,
  Rocket,
  GitBranch,
  Phone,
  Zap,
  FileBox,
  ShoppingCart,
  UserCog,
  Gamepad2,
  Dices,
  Crown,
  Cloud,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PresenceIndicator } from "@/components/presence-indicator"
import { WeaveLogo } from "@/components/weave-logo"
import { useAuth } from "@/lib/auth-provider"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { WEAVE_SYSTEM_MAP } from "@/lib/weave-system-map"

const navigation = [
  // 1. PRESENCE — identity, participation, value and record.
  { group: "Presence", items: [
    { name: "Home", href: "/", icon: Home },
    { name: "Loop 1 Ground", href: "/event", icon: Flame },
    { name: "Company Loops", href: "/company/loops", icon: GitBranch },
    { name: "Human Cadences", href: "/search", icon: MessageSquare },
    { name: "Presences", href: "/profiles", icon: UserCircle },
    { name: WEAVE_SYSTEM_MAP.language.wallet, href: "/wallet", icon: Wallet },
    { name: WEAVE_SYSTEM_MAP.language.ledger, href: "/ledger", icon: BookOpen },
    { name: "Reserve", href: "/fund-wall", icon: DollarSign, creatorOnly: true },
  ]},

  // 2. POSITION — the operating room for the current role.
  { group: "Position", items: [
    { name: "Bridger Operating Room", href: "/bridger/functions", icon: LayoutTemplate, bridgerOnly: true },
    { name: "WhatsApp Numbers", href: "/bridger/numbers", icon: Phone, bridgerOnly: true },
    { name: "Agent Operating Room", href: "/agent/functions", icon: LayoutTemplate, agentOnly: true },
    { name: "Administration Operating Room", href: "/admin/functions", icon: ShieldCheck, adminOnly: true },
    { name: "My Bridgers", href: "/agent/bridgers", icon: Users, agentOnly: true },
    { name: "Agent Channels", href: "/agent/channels", icon: ShieldCheck, agentOnly: true },
    { name: "Agent Continuance", href: "/agent/commissions", icon: DollarSign, agentOnly: true },
  ]},

  // 3. BRIDGE — connection, support and movement between people.
  { group: "Bridge", items: [
    { name: WEAVE_SYSTEM_MAP.language.supportEntrance, href: "/weave", icon: LayoutTemplate },
    { name: WEAVE_SYSTEM_MAP.language.bridgeAI, href: "/bridger/bridge-ai", icon: GitBranch, bridgerOnly: true },
    { name: "Prospect Market", href: "/weave/market/prospects", icon: ShoppingCart, bridgerOnly: true },
    { name: "Company Guidance", href: "/company-chat", icon: Headphones },
    { name: "Clients", href: "/clients", icon: Users },
  ]},

  // 4. ENTERPRISE — technology, products and commercial systems.
  { group: "Enterprise", items: [
    { name: WEAVE_SYSTEM_MAP.language.marketplace, href: "/marketplace", icon: Store },
    { name: "Agility Agent Store", href: "/agility", icon: Store, agentOnly: true },
    { name: "Echo Board", href: "/echo", icon: Sparkles },
  ]},

  // 5. WEAVE — shared participation across positions.
  { group: "WEAVE", items: [
    { name: "Contest", href: "/arena", icon: Gamepad2 },
    { name: "Pattern", href: "/casino", icon: Dices },
    { name: "Standing", href: "/weave/standing", icon: Globe },
  ]},

  // 6. ADMINISTRATION — company authority and control surfaces.
  { group: "Administration", items: [
    { name: "Message Hub", href: "/admin/hub", icon: MessageSquare, adminOnly: true },
    { name: "Prospect Engine", href: "/admin/prospect-engine", icon: Zap, adminOnly: true },
    { name: "WhatsApp Number Engine", href: "/admin/bridger-numbers", icon: Phone, adminOnly: true },
    { name: "Bridge Templates", href: "/admin/bridge-templates", icon: Briefcase, adminOnly: true },
    { name: "File Number Engine", href: "/admin/file-number-engine", icon: FileBox, adminOnly: true },
    { name: "Fulfillment Agent", href: "/admin/outreach", icon: ShieldCheck, adminOnly: true },
    { name: "Agent Channel Requests", href: "/admin/agent-channels", icon: UserCog, adminOnly: true },
    { name: "Verify Continuances", href: "/admin/control-center#bridgers", icon: FileCheck, adminOnly: true },
    { name: "Verification Center", href: "/admin/control-center#users", icon: Shield, adminOnly: true },
    { name: "Client Deposits", href: "/admin/client-deposits", icon: Wallet, adminOnly: true },
    { name: "Client Vaults", href: "/admin/client-vault", icon: Wallet, adminOnly: true },
    { name: "Enterprise Systems Workshop", href: "/admin/enterprise-systems", icon: Cloud, adminOnly: true },
    { name: "Agility Fulfillment", href: "/admin/agility", icon: FileBox, adminOnly: true },
    { name: "Enterprise Dream", href: "/admin/enterprise-dream", icon: Crown, adminOnly: true },
    { name: "Client Build Catalog", href: "/admin/client-build-catalog", icon: FileBox, adminOnly: true },
    { name: "Loop Workshop", href: "/admin/loop-workshop", icon: FileCheck, adminOnly: true },
    { name: "Authority Workshop", href: "/authority/workshops", icon: Rocket, adminOnly: true },
    { name: "Infrastructure", href: "/admin/infrastructure", icon: Cloud, adminOnly: true },
    { name: "DJ Workshop", href: "/admin/dj-workshop", icon: Radio, adminOnly: true },
    { name: "Ad Workshop", href: "/admin/ad-workshop", icon: Megaphone, adminOnly: true },
    { name: "Flame Event · Loop 1", href: "/admin/flame-event", icon: Sparkles, adminOnly: true },
  ]},
]

interface AppSidebarProps {
  user?: {
    id: string
    name: string
    role: string
    avatar?: string
  }
}

export function AppSidebar({ user: propUser }: AppSidebarProps) {
  const pathname = usePathname()
  const { user: authUser, logout } = useAuth()
  const user = propUser || authUser
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
    <aside className="relative flex h-screen w-64 flex-col overflow-hidden border-r border-sky-300/10 bg-[#020b17]/92 shadow-[22px_0_70px_rgba(2,8,23,.38)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_10%,rgba(56,189,248,.09),transparent_25%),radial-gradient(circle_at_72%_82%,rgba(245,158,11,.055),transparent_28%)]" />
      {/* Logo and System Status */}
      <div className="relative flex flex-col items-center justify-center border-b border-sky-300/10 p-6">
        <WeaveLogo size="md" className="mb-1" />
        <span className="text-[9px] text-slate-500 uppercase tracking-[0.22em] font-bold">System Switch · Bridge Radiance</span>

        {/* PWA Download Button */}
        <Button
          variant="outline"
          size="sm"
          className="mt-4 w-full h-8 text-[10px] border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10 gap-2"
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
        <div className="relative flex items-center gap-3 border-b border-sky-300/10 p-4">
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
      <nav className="relative flex-1 overflow-y-auto p-3 scrollbar-hide">
        <div className="space-y-6">
          {navigation.map((group) => {
            const visibleItems = group.items.filter((item: any) => {
              if (item.adminOnly && user?.role !== "admin") return false
              if (item.creatorOnly && user?.role !== "creator") return false
              if (item.bridgerOnly && user?.role !== "bridger") return false
              if (item.agentOnly && user?.role !== "agent") return false
              if (item.staffOnly && user?.role !== "admin" && user?.role !== "agent") return false
              return true
            })

            if (visibleItems.length === 0) return null

            return (
              <div key={group.group}>
                <h3 className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/70">
                  {group.group} District
                </h3>
                <ul className="space-y-0.5">
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
                          className={cn(
                            "flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition-all",
                            isActive
                              ? "border-sky-300/25 bg-sky-400/10 text-sky-100 shadow-[0_0_20px_rgba(56,189,248,.07)]"
                              : "border-transparent text-sidebar-foreground hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="h-4 w-4" />
                            {item.name}
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
              </div>
            )
          })}
        </div>

      </nav>

      {/* Bottom Actions */}
      <div className="relative border-t border-sky-300/10 bg-black/10 p-3">
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
