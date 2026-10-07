'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export function LifestyleEntry(){
  return <Link href="/weave/lifestyles" data-lifestyle-entry="position" className="fixed bottom-40 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-[#171408]/95 px-4 py-3 text-[10px] font-black uppercase tracking-[.12em] text-yellow-100 shadow-2xl backdrop-blur md:right-7">
    <Sparkles className="h-4 w-4"/>Lifestyle
  </Link>
}

// Keep the existing export while dashboards migrate without creating a second
// Manager-specific entrance. Manager now lives inside the position Lifestyle catalog.
export const ManagerLifestyleEntry = LifestyleEntry
