'use client'

import Link from 'next/link'
import { LifeBuoy, MessageSquareText } from 'lucide-react'

export default function BridgerSupportSidebar() {
  return (
    <aside className="rounded-2xl border border-emerald-500/20 bg-slate-900/80 p-4">
      <div className="flex items-center gap-2 mb-2">
        <LifeBuoy className="h-5 w-5 text-emerald-400" />
        <span className="font-semibold text-white">Company Support</span>
      </div>
      <p className="text-xs leading-5 text-slate-400 mb-3">Prospect asks something you need help answering? Bring the message here. You do not need to contact general support.</p>
      <Link href="/bridger/company-support" className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
        <MessageSquareText className="h-4 w-4" />
        Open Support
      </Link>
    </aside>
  )
}
