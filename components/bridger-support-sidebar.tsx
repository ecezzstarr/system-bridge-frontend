'use client'

import Link from 'next/link'
import { LifeBuoy, MessageSquareText, Users, BookOpen, ArrowUpRight } from 'lucide-react'

export default function BridgerSupportSidebar() {
  return (
    <aside className="fixed right-4 top-24 z-40 hidden w-64 rounded-2xl border border-emerald-500/20 bg-slate-950/95 p-4 shadow-2xl backdrop-blur lg:block">
      <div className="mb-3 flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-emerald-400" /><span className="font-semibold text-white">Company Support</span></div>
      <p className="mb-3 text-xs leading-5 text-slate-400">For prospect questions before System Switch. Use this instead of contacting general support.</p>
      <div className="mb-4 space-y-2 text-xs text-slate-400">
        <div className="flex items-center gap-2"><MessageSquareText className="h-3.5 w-3.5 text-emerald-400" />What to say next</div>
        <div className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-cyan-400" />What Weave and System Switch are</div>
        <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-violet-400" />File Folder and Client path</div>
      </div>
      <Link href="/bridger/company-support" className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Open Company Support <ArrowUpRight className="h-4 w-4" /></Link>
    </aside>
  )
}
