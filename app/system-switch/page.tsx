'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import '../client/system-switch/file-folder-phone.css'
const StaffFileFolderWorld = dynamic(() => import('@/components/system-switch/staff-file-folder-world'), { ssr: false })
import { redirect } from 'next/navigation'
import { ArrowRight, Flame, FolderOpen } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

export default function SystemSwitchEntryPage() {
  const { user, isInitialized, isLoading } = useAuth()

  if (!isInitialized || isLoading) return null
  if (!user || !user.role) redirect('/login')
  if (user.role === 'client') redirect('/client/system-switch')
  if (!['admin', 'agent', 'bridger'].includes(user.role)) redirect('/login')

  const role = user.role as 'admin' | 'agent' | 'bridger'
  const backHref = role === 'admin' ? '/admin/dashboard' : role === 'agent' ? '/agent/dashboard' : '/bridger/dashboard'
  const position = role === 'admin' ? 'Administration' : role === 'agent' ? 'Agent' : 'Bridger'

  return (
    <main
      className="mx-auto flex min-h-[72vh] w-full max-w-7xl items-center justify-center px-2 py-3 text-white"
      data-system-switch-gate="file-folder"
      data-weave-world="file-folder"
      data-system-switch-role={role}
    >
      <section className="w-full overflow-hidden rounded-[2rem] border border-cyan-200/15 bg-[#030914]/94 shadow-[0_34px_120px_rgba(0,0,0,.42)]">
        <header className="border-b border-cyan-100/10 px-5 py-4">
          <Link href={backHref} className="text-xs text-slate-400">Return to {position}</Link>
          <h1 className="mt-2 text-xl font-black">System Switch · File Folder</h1>
        </header>

        <StaffFileFolderWorld role={role} identity={user.name || user.username} userId={user.id} />
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
