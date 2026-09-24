"use client"

import { cn } from "@/lib/utils"

interface WeaveLogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export function WeaveLogo({ className, size = "md", showText = true }: WeaveLogoProps) {
  const markSizes = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-20 w-20",
  }

  const fullSizes = {
    sm: "h-8 w-auto max-w-[190px]",
    md: "h-12 w-auto max-w-[285px]",
    lg: "h-20 w-auto max-w-[470px]",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center select-none",
        className
      )}
      aria-label="WEAVE of Presence — System Switch — Bridge Radiance"
    >
      <img
        src={showText ? "/weave-logo.svg" : "/icon.svg"}
        alt="WEAVE of Presence — System Switch — Bridge Radiance"
        className={cn(
          "block object-contain",
          showText ? fullSizes[size] : markSizes[size]
        )}
        draggable={false}
      />
    </div>
  )
}
