"use client"
import { cn } from "@/lib/utils"

interface WeaveLogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export function WeaveLogo({ className, size = "md", showText = true }: WeaveLogoProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-20 w-20",
  }

  const textClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  }

  return (
    <div className={cn("flex items-center gap-2 font-black tracking-tighter select-none", className)}>
      <img
        src="/icon.svg"
        alt="WEAVE"
        className={cn("rounded-xl", sizeClasses[size])}
      />
      {showText && (
        <span className={cn("bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500", textClasses[size])}>
          WEAVE
        </span>
      )}
    </div>
  )
}
