"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  LayoutTemplate,
  Sparkles,
  Radio,
  Megaphone,
  Headphones,
  Wallet,
  Users,
  UserCircle,
  MessageSquare,
  Video,
  Shield,
  Globe,
  Store,
  TrendingUp,
  DollarSign,
  Settings,
  LogOut,
  ShieldCheck,
  BookOpen,
  ReceiptText,
  Briefcase,
  Trophy,
  CreditCard,
  FileCheck,
  Rocket,
  GitBranch,
  Camera,
  Image,
  Loader2,
  Zap,
  FileBox,
  ShoppingCart,
  UserCog,
  Gamepad2,
  Dices,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PresenceIndicator } from "@/components/presence-indicator"
import { WeaveLogo } from "@/components/weave-logo"
import { useAuth } from "@/lib/auth-provider"
import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"

const navigation = [
  // 1. PRESENCE
  { group: "Presence", items: [
    { name: "Home", href: "/", icon: Home },
    { name: "Human Cadences", href: "/search", icon: MessageSquare },
    { name: "Presences", href: "/profiles", icon: UserCircle },
    { name: "Agent Terminal", href: "/agent/dashboard", icon: LayoutTemplate, agentOnly: true },
    { name: "Ecosystem Control", href: "/admin/dashboard", icon: ShieldCheck, adminOnly: true },
    { name: "Holding", href: "/wallet", icon: Wallet },
    { name: "Record", href: "/ledger", icon: BookOpen },
    { name: "Movements", href: "/transactions", icon: ReceiptText },
    { name: "Yield", href: "/earnings", icon: TrendingUp },
    { name: "Reserve", href: "/fund-wall", icon: DollarSign, creatorOnly: true },
  ]},

  // 2. BRIDGE
  { group: "Bridge", items: [
    { name: "Bridge Plaza", href: "/weave", icon: LayoutTemplate },
    { name: "My Bridge", href: "/agent/bridgers", icon: Users, agentOnly: true },
    { name: "Bridge", href: "/bridger/bridge-ai", icon: GitBranch, bridgerOnly: true },
    { name: "Bridge Templates", href: "/admin/bridge-templates", icon: Briefcase, adminOnly: true },
    { name: "File Number Engine", href: "/admin/file-number-engine", icon: FileBox, adminOnly: true },
  ]},

  // 3. SUPPORT
  { group: "Support", items: [
    { name: "Message Hub", href: "/admin/hub", icon: MessageSquare, staffOnly: true },
    { name: "Guidance", href: "/company-chat", icon: Headphones },
    { name: "Management", href: "/lounge?view=private", icon: Shield },
    { name: "Gathering", href: "/lounge", icon: MessageSquare },
    { name: "Companions", href: "/clients", icon: Users },
    { name: "Fulfillment Agent", href: "/admin/outreach", icon: ShieldCheck, adminOnly: true },
    { name: "Channel Applications", href: "/agent/channels", icon: ShieldCheck, agentOnly: true },
    { name: "Agent Channel Requests", href: "/admin/agent-channels", icon: UserCog, adminOnly: true },
    { name: "Continuance", href: "/agent/commissions", icon: DollarSign, agentOnly: true },
    { name: "Bridger Continuance", href: "/bridger/dashboard", icon: CreditCard, bridgerOnly: true },
    { name: "Verify Continuances", href: "/admin/dashboard#bridgers", icon: FileCheck, adminOnly: true },
    { name: "Admin Verification", href: "/admin/dashboard#panel", icon: Shield, adminOnly: true },
  ]},

  // 4. ENTERPRISE
  { group: "Enterprise", items: [
    { name: "Exchange", href: "/marketplace", icon: Store },
    { name: "Agility Agent Store", href: "/agility", icon: Store, agentOnly: true },
    { name: "Agility Fulfillment", href: "/admin/agility", icon: FileBox, adminOnly: true },
    { name: "Prospect Market", href: "/weave/market/prospects", icon: ShoppingCart, bridgerOnly: true },
    { name: "Prospect Engine", href: "/admin/prospect-engine", icon: Zap, adminOnly: true },
          { name: "Company Loops", href: "/company/loops", icon: GitBranch },
      { name: "Loop Workshop", href: "/admin/loop-workshop", icon: FileCheck, adminOnly: true },
{ name: "Authority Workshop", href: "/authority/workshops", icon: Rocket, adminOnly: true },
    { name: "DJ Workshop", href: "/admin/dj-workshop", icon: Radio, adminOnly: true },
    { name: "Ad Workshop", href: "/admin/ad-workshop", icon: Megaphone, adminOnly: true },
    { name: "Flame Event · Loop 1", href: "/admin/flame-event", icon: Sparkles, adminOnly: true },
    { name: "Echo", href: "/echo", icon: Sparkles },
  ]},

  // 5. WEAVE
  { group: "Weave", items: [
    { name: "Contest", href: "/arena", icon: Gamepad2 },
    { name: "Pattern", href: "/casino", icon: Dices },
    { name: "Stream", href: "/video-feed", icon: Video },
    { name: "Standing", href: "/weave/standing", icon: Globe },
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadType, setUploadType] = useState<"image" | "video" | null>(null)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [targetRoom, setTargetRoom] = useState<"public" | string>("public")

  useEffect(() => {
    if (user?.role === 'bridger') {
      fetchContinuance()
    }
    if (user) {
      fetchUsers()
    }
  }, [user])

  const fetchContinuance = async () => {
    try {
      const res = await fetch(`/api/bridger/subscription?userId=${user?.id}`)
      const data = await res.json()
      if (data.success) {
        setContinuance(data.continuance)
      }
    } catch (error) {
      console.error('Failed to fetch subscription in sidebar:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.users) {
          setAllUsers(data.users.filter((u: any) => u.id !== user?.id))
        }
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setIsUploading(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      await sendToLounge(base64, file.type.startsWith("video") ? "video" : "image")
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
    reader.readAsDataURL(file)
  }

  const handleCaptureScreenshot = async () => {
    if (!user) return
    setIsUploading(true)
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
      })
      const video = document.createElement("video")
      video.srcObject = stream
      await video.play()

      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(video, 0, 0)

      const dataUrl = canvas.toDataURL("image/png")

      stream.getTracks().forEach((track) => track.stop())

      await sendToLounge(dataUrl, "image")
    } catch (err) {
      console.error("Error capturing screenshot:", err)
      toast.error("That didn't capture")
    } finally {
      setIsUploading(false)
    }
  }

  const sendToLounge = async (mediaUrl: string, type: "image" | "video") => {
    try {
      const isPrivate = targetRoom !== "public"
      const roomId = isPrivate ? [user?.id, targetRoom].sort().join("-") : "main"

      const response = await fetch("/api/lounge/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: user?.name,
          senderAvatar: "👤",
          senderRole: user?.role,
          content: "Shared a " + type + " via Sidebar",
          userId: user?.id,
          roomType: isPrivate ? "private" : "public",
          roomId,
          messageType: type,
          mediaUrl: mediaUrl,
          recipientId: isPrivate ? targetRoom : null,
        }),
      })

      if (response.ok) {
        toast.success(type.charAt(0).toUpperCase() + type.slice(1) + " sent to " + (isPrivate ? "Private Room" : "Public Lounge"))
      } else {
        throw new Error("Failed to send")
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      toast.error("That didn't reach")
    }
  }

  return (
    <aside className="relative flex h-screen w-64 flex-col overflow-hidden border-r border-sky-300/10 bg-[#020a16]/90 shadow-[20px_0_60px_rgba(2,8,23,0.38)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_12%,rgba(56,189,248,0.10),transparent_28%),radial-gradient(circle_at_70%_88%,rgba(239,68,68,0.07),transparent_30%)]" />
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
                  {group.group}
                </h3>
                <ul className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href
                    const isSubItem = item.name === "Bridger Continuance"

                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition-all",
                            isActive
                              ? "border-sky-300/25 bg-sky-400/10 text-sky-100 shadow-[0_0_22px_rgba(56,189,248,0.08)]"
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

        {/* Lounge Media Hub */}
        <div className="mt-6 pt-6 border-t border-white/5 px-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Lounge Media Hub</p>

          <div className="space-y-3">
            <div className="flex flex-col gap-2">
              <select
                value={targetRoom}
                onChange={(e) => setTargetRoom(e.target.value)}
                className="bg-white/5 border-0 rounded-md px-2 py-1.5 text-[10px] text-slate-300 focus:ring-1 focus:ring-cyan-500 outline-none"
              >
                <option value="public">Public Lounge</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>DM: {u.name}</option>
                ))}
              </select>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { setUploadType("image"); fileInputRef.current?.click(); }}
                  disabled={isUploading}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 transition-all group"
                  title="Send Photo"
                >
                  {isUploading && uploadType === "image" ? <Loader2 className="h-4 w-4 animate-spin text-cyan-400" /> : <Image className="h-4 w-4" />}
                  <span className="text-[9px]">Photo</span>
                </button>

                <button
                  onClick={() => { setUploadType("video"); fileInputRef.current?.click(); }}
                  disabled={isUploading}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg bg-white/5 hover:bg-purple-500/20 text-slate-400 hover:text-purple-400 transition-all group"
                  title="Send Video"
                >
                  {isUploading && uploadType === "video" ? <Loader2 className="h-4 w-4 animate-spin text-purple-400" /> : <Video className="h-4 w-4" />}
                  <span className="text-[9px]">Video</span>
                </button>

                <button
                  onClick={handleCaptureScreenshot}
                  disabled={isUploading}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-all group"
                  title="Send Screenshot"
                >
                  {isUploading && !uploadType ? <Loader2 className="h-4 w-4 animate-spin text-emerald-400" /> : <Camera className="h-4 w-4" />}
                  <span className="text-[9px]">Screen</span>
                </button>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              hidden
              accept={uploadType === "video" ? "video/*" : "image/*"}
              onChange={handleFileUpload}
            />
          </div>
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-white/5 p-3">
        <div className="space-y-1">
          <Link
            href="/roles"
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
