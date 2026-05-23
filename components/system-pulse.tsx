"use client"

import { cn } from "@/lib/utils"

interface SystemPulseProps {
  className?: string
  size?: "sm" | "md" | "lg"
  status?: "online" | "offline" | "busy"
}

export function SystemPulse({
  className,
  size = "md",
  status = "online",
}: SystemPulseProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  }

  const statusColors = {
    online: "bg-primary",
    offline: "bg-muted-foreground",
    busy: "bg-warning",
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-lg",
        sizeClasses[size],
        statusColors[status],
        status === "online" && "animate-pulse-glow",
        className
      )}
    >
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent" />
      <svg
        className="h-4 w-4 text-primary-foreground"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>
  )
}
