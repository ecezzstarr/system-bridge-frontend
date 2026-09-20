"use client"
import { cn } from "@/lib/utils"

interface WeaveLogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

/**
 * Temporary institutional wordmark.
 * WEAVE does not yet have an approved official logo.
 * Do not replace this with an invented symbol; install the official asset here when approved.
 */
export function WeaveLogo({ className, size = "md", showText = true }: WeaveLogoProps) {
  const markSize = { sm:"h-8 w-8", md:"h-12 w-12", lg:"h-20 w-20" }
  const letterSize = { sm:"text-base", md:"text-xl", lg:"text-3xl" }

  return (
    <div className={cn("flex items-center gap-3 select-none",className)} aria-label="Weave of Presence">
      <div className={cn("relative flex items-center justify-center rounded-xl border border-white/15 bg-black text-white",markSize[size])}>
        <span className={cn("font-black tracking-[-0.12em] pr-[0.12em]",letterSize[size])}>W</span>
        <span className="absolute bottom-1 h-px w-1/2 bg-gradient-to-r from-blue-500 via-white to-red-500" />
      </div>
      {showText && <div className="leading-none">
        <div className={cn("font-black tracking-[0.22em] text-white",letterSize[size])}>WEAVE</div>
        <div className="mt-1 text-[7px] font-medium uppercase tracking-[0.26em] text-slate-400">of Presence</div>
      </div>}
    </div>
  )
}
