"use client"

import { cn } from "@/lib/utils"
import { Shield, Users, Briefcase, User } from "lucide-react"

type Role = "admin" | "client" | "bridger" | "agent"

interface RoleBadgeProps {
  role: Role
  className?: string
  showIcon?: boolean
}

const roleConfig: Record<Role, { label: string; color: string; icon: typeof Shield }> = {
  admin: {
    label: "Admin",
    color: "bg-destructive/20 text-destructive border-destructive/30",
    icon: Shield,
  },
  client: {
    label: "Client",
    color: "bg-primary/20 text-primary border-primary/30",
    icon: Users,
  },
  bridger: {
    label: "Bridger",
    color: "bg-warning/20 text-warning border-warning/30",
    icon: Briefcase,
  },
  agent: {
    label: "Agent",
    color: "bg-chart-2/20 text-chart-2 border-chart-2/30",
    icon: User,
  },
}

export function RoleBadge({ role, className, showIcon = true }: RoleBadgeProps) {
  const config = roleConfig[role]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.color,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  )
}
