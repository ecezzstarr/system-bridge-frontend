'use client'

import Link from 'next/link'
import { ArrowRight, Boxes, FolderOpen, Rocket, Store } from 'lucide-react'

export function ClientBuildPull({ role }: { role: 'agent' | 'bridger' | 'admin' }) {
  const roleLine =
    role === 'bridger'
      ? 'You open Client paths without entering a Client private File Folder. After login, Client Customer Doors meet your Bridger position inside Flame Event.'
      : role === 'agent'
        ? 'You support Client movement without entering a Client private File Folder. After login, Client Customer Doors meet your Agent position inside Flame Event.'
        : 'Administration governs Client movement without entering a Client private File Folder. Client Customer Doors meet Administration inside Flame Event.'

  return (
    <section className="rounded-3xl border border-violet-300/20 bg-[linear-gradient(135deg,rgba(139,92,246,.10),rgba(14,165,233,.055),rgba(16,185,129,.045))] p-4 shadow-[0_18px_55px_rgba(2,8,23,.32)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-400/10">
          <Rocket className="h-5 w-5 text-violet-200" />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-300">Client enterprise visibility</p>
          <h3 className="mt-1 text-base font-black text-white">The Client owns System Switch. The Customer Door carries the enterprise outward.</h3>
          <p className="mt-2 text-[11px] leading-5 text-slate-300">{roleLine}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-1.5 text-center">
        {[
          ['Recognize', FolderOpen],
          ['Build', Boxes],
          ['Operate', Rocket],
          ['Grow', Store],
        ].map(([label, Icon]: any) => (
          <div key={label} className="rounded-xl border border-white/8 bg-black/20 px-2 py-2.5">
            <Icon className="mx-auto h-3.5 w-3.5 text-sky-200" />
            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-300">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Link
          href="/event"
          className="inline-flex w-full items-center justify-between rounded-xl border border-violet-300/15 bg-violet-400/[0.06] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-violet-100"
        >
          Enter Flame Event · Client Customer Doors <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <p className="mt-3 text-[9px] leading-4 text-slate-400">
        Staff do not browse into another Client's System Switch. Their Client-door route begins inside Flame Event.
      </p>
    </section>
  )
}
