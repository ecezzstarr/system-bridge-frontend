"use client"

import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"

type Tier = "bronze" | "silver" | "gold" | "platinum" | "diamond"

interface WealthTierProps {
  tier: Tier
  balance?: number
  className?: string
}

const tierConfig: Record<Tier, { label: string; color: string; minBalance: number }> = {
  bronze: {
    label: "Bronze",
    color: "text-orange-400 border-orange-400/30 bg-orange-400/10",
    minBalance: 0,
  },
  silver: {
    label: "Silver",
    color: "text-zinc-400 border-zinc-400/30 bg-zinc-400/10",
    minBalance: 1000,
  },
  gold: {
    label: "Gold",
    color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
    minBalance: 5000,
  },
  platinum: {
    label: "Platinum",
    color: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
    minBalance: 25000,
  },
  diamond: {
    label: "Diamond",
    color: "text-primary border-primary/30 bg-primary/10",
    minBalance: 100000,
  },
}

export function getTierFromBalance(balance: number): Tier {
  if (balance >= 100000) return "diamond"
  if (balance >= 25000) return "platinum"
  if (balance >= 5000) return "gold"
  if (balance >= 1000) return "silver"
  return "bronze"
}

export function WealthTier({ tier, balance, className }: WealthTierProps) {
  const config = tierConfig[tier]

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        config.color,
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      <span>{config.label}</span>
      {balance !== undefined && (
        <span className="text-muted-foreground">
          {balance.toLocaleString()} TRX
        </span>
      )}
    </div>
  )
}
