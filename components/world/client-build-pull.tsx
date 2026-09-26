'use client'

import Link from 'next/link'
import { ArrowRight, Boxes, FolderOpen, Rocket, Store } from 'lucide-react'

export function ClientBuildPull({ role }: { role: 'agent' | 'bridger' | 'admin' }) {
  const roleLine =
    role === 'bridger'
      ? 'You open Client paths. You can also hold your own Client File Folder when you want to build and operate a system.'
      : role === 'agent'
        ? 'You support Client movement. Client participation is where your own workshop can become a built, hosted operating system.'
        : 'Administration can inspect the Client path while governing the systems that make it possible.'

  return (
    <section className="rounded-3xl border border-violet-300/20 bg-[linear-gradient(135deg,rgba(139,92,246,.10),rgba(14,165,233,.055),rgba(16,185,129,.045))] p-4 shadow-[0_18px_55px_rgba(2,8,23,.32)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-400/10">
          <Rocket className="h-5 w-5 text-violet-200" />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-300">Client system-building path</p>
          <h3 className="mt-1 text-base font-black text-white">Your own movement can become a system.</h3>
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

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link
          href="/marketplace"
          className="inline-flex items-center justify-between rounded-xl border border-sky-300/15 bg-sky-400/[0.06] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-sky-100"
        >
          See systems <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/client"
          className="inline-flex items-center justify-between rounded-xl border border-violet-300/15 bg-violet-400/[0.06] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-violet-100"
        >
          Client path <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <p className="mt-3 text-[9px] leading-4 text-slate-400">
        Client access requires a valid WEAVE File Number. This surface does not auto-convert your current role or create a File Folder.
      </p>
    </section>
  )
}
