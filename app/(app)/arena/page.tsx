'use client'

import Link from 'next/link'
import { Megaphone } from 'lucide-react'
import Arena from '@/components/places/arena'

export default function ArenaStandalonePage() {
  return (
    <div className="space-y-3">
      <div className="flex justify-end px-1">
        <Link
          href="/weave/carrier"
          className="inline-flex items-center gap-2 border-b border-sky-300/20 px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-sky-200 transition hover:border-sky-300/50 hover:text-white"
        >
          <Megaphone className="h-3.5 w-3.5" />
          Carrier · Publish Ace Activity
        </Link>
      </div>
      <Arena />
    </div>
  )
}
