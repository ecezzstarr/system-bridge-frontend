'use client'

import Link from 'next/link'
import { BriefcaseBusiness } from 'lucide-react'

export function ManagerLifestyleEntry(){
  return <Link href="/manager/dashboard" data-lifestyle="manager" className="fixed bottom-40 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-[#171208]/95 px-4 py-3 text-[10px] font-black uppercase tracking-[.12em] text-amber-100 shadow-2xl backdrop-blur md:right-7">
    <BriefcaseBusiness className="h-4 w-4"/>Manager Lifestyle
  </Link>
}
