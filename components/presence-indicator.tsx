"use client"

import { cn } from "@/lib/utils"

interface PresenceIndicatorProps {
  className?: string
  status?: "online" | "offline" | "away" | "busy"
  size?: "sm" | "md" | "lg"
}

export function PresenceIndicator({
  className,
  status = "online",
  size = "sm",
}: PresenceIndicatorProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  const statusColors = {
    online: "bg-primary",
    offline: "bg-muted-foreground",
    away: "bg-warning",
    busy: "bg-destructive",
  }

  return (
    <div
      className={cn(
        "rounded-full border-2 border-background",
        sizeClasses[size],
        statusColors[status],
        status === "online" && "animate-presence",
        className
      )}
    />
  )
}
