'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Flame, FolderOpen, Orbit } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

export default function StaffSystemSwitchGatePage() {
  const { user } = useAuth()
  if (!user || !user.role || !['admin', 'agent', 'bridger'].includes(user.role)) return null

  const role = user.role as 'admin' | 'agent' | 'bridger'
  const backHref = role === 'admin' ? '/admin/dashboard' : role === 'agent' ? '/agent/dashboard' : '/bridger/dashboard'
  const position = role === 'admin' ? 'Administration' : role === 'agent' ? 'Agent' : 'Bridger'

  return (
    <main
      className="mx-auto flex min-h-[72vh] w-full max-w-5xl items-center justify-center px-4 py-10 text-white"
      data-system-switch-gate="file-folder"
      data-weave-world="file-folder"
      data-system-switch-role={role}
    >
      <section className="w-full overflow-hidden rounded-[2rem] border border-cyan-200/15 bg-[#030914]/94 shadow-[0_34px_120px_rgba(0,0,0,.42)]">
        <header className="border-b border-cyan-100/10 px-6 py-7 sm:px-9">
          <Link href={backHref} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-slate-400 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Return to {position}
          </Link>
          <div className="mt-8 flex items-start gap-4">
            <div className="rounded-2xl border border-cyan-200/15 bg-cyan-300/[.06] p-3">
              <Orbit className="h-6 w-6 text-cyan-200" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.24em] text-cyan-200">System Switch</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Gate into the File Folder.</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
                System Switch is the crossing used by Client, Administration, Agent and Bridger. Your {position} does not become the owner of a Client File Folder; it enters the File Folder layer through the authorized shared movement inside it.
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-0 md:grid-cols-2">
          <div className="border-b border-white/10 p-6 md:border-b-0 md:border-r sm:p-9">
            <FolderOpen className="h-6 w-6 text-sky-300" />
            <p className="mt-5 text-[9px] font-black uppercase tracking-[.18em] text-sky-200">File Folder boundary</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Client-owned systems, Customer Doors, builds and the live event ground remain inside the File Folder boundary. Staff participation enters through System Switch rather than treating those places as general WEAVE rooms.
            </p>
          </div>
          <div className="p-6 sm:p-9">
            <Flame className="h-6 w-6 text-orange-300" />
            <p className="mt-5 text-[9px] font-black uppercase tracking-[.18em] text-orange-200">Inside the File Folder</p>
            <h2 className="mt-2 text-xl font-black">Flame Event · Loop 1</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Burning River is an event inside the File Folder. Cross System Switch first, then enter the event ground from here.
            </p>
            <Link
              href="/system-switch/flame-event"
              data-system-switch-crossing="flame-event-inside-file-folder"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-[#030914] hover:bg-slate-100"
            >
              Cross into Flame Event <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
