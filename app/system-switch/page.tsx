'use client'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, Flame, FolderOpen, Orbit, Waves } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import StaffFileFolderWorld from '@/components/system-switch/staff-file-folder-world'

export default function SystemSwitchEntryPage() {
  const { user, isInitialized, isLoading } = useAuth()

  if (!isInitialized || isLoading) return null
  if (!user || !user.role) redirect('/login')
  if (user.role === 'client') redirect('/client/system-switch')
  if (!['admin', 'agent', 'bridger'].includes(user.role)) redirect('/login')

  const role = user.role as 'admin' | 'agent' | 'bridger'
  const backHref = role === 'admin' ? '/admin/dashboard' : role === 'agent' ? '/agent/dashboard' : '/bridger/dashboard'
  const position = role === 'admin' ? 'Administration' : role === 'agent' ? 'Agent' : 'Bridger'

  return <main
    className="relative isolate flex min-h-[88svh] w-full flex-col justify-center overflow-hidden bg-[#071b31] px-4 pb-12 pt-6 text-white"
    data-system-switch-gate="file-folder"
    data-weave-world="file-folder"
    data-system-switch-role={role}
    data-system-switch-threshold="staff-to-embodied-world"
  >
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-70"
      style={{backgroundImage:"linear-gradient(180deg,rgba(2,14,32,.37),rgba(2,14,32,.61) 55%,rgba(2,14,32,.95)),url('/weave/flame-event/burning-river-world.svg')"}}/>
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[12%] h-[26rem] w-[26rem] -translate-x-1/2 rounded-full border border-amber-200/15 bg-[radial-gradient(circle,rgba(255,211,131,.14),transparent_69%)] blur-sm"/>
    <div className="relative mx-auto w-full max-w-6xl" data-system-switch-gate-world>
      <Link href={backHref} className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-sky-100/90">
        <ArrowLeft className="h-4 w-4" /> Return to {position}
      </Link>
      <div className="mt-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-200/45 bg-[#082b48]/70 shadow-[0_0_43px_rgba(250,192,91,.23)]">
          <Orbit className="h-7 w-7 text-amber-100"/>
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[.28em] text-amber-200">System Switch · Bridge of Radiance</p>
        <h1 className="mt-3 text-4xl font-black leading-[1.07] tracking-[-.05em] sm:text-5xl">Go beyond the page.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-sky-100/85">
          Your {position} stays yours. When you enter Flame Event, you become a walking presence inside the Burning River. Reach the Switch arch and enter the opened Customer Doors of Client-owned worlds.
        </p>
      </div>
      <Link href="/system-switch/bridge-radiance/flame-coin" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/35 bg-amber-300/10 px-5 py-3 text-xs font-black text-amber-100">Request Flame Coin · Bridge of Radiance <ArrowRight className="h-4 w-4"/></Link>
      <Link href="/system-switch/customer-doors?entrance=flame-event" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-emerald-200/30 px-4 py-3 text-xs font-bold text-emerald-100">Visit Client-hosted Customer Doors as an avatar</Link>
      <div className="relative my-7"><StaffFileFolderWorld role={role} identity={user.name || user.username} userId={user.id}/></div>
      <p className="text-center text-[10px] font-semibold leading-5 text-white/85">
        <Waves className="mr-1 inline h-4 w-4 text-sky-200"/> River Bank → Burning River → System Switch → Customer Door
      </p>
      <Link
        href="/system-switch/flame-event"
        data-system-switch-crossing="flame-event-inside-file-folder"
        className="mx-auto mt-6 flex min-h-14 w-full max-w-md items-center justify-center gap-3 rounded-xl border border-amber-100/70 bg-amber-200 px-5 py-3 text-sm font-black text-[#0e2436] shadow-[0_9px_32px_rgba(253,197,99,.18)]"
      >
        Cross into Flame Event <ArrowRight className="h-5 w-5"/>
      </Link>
      <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-4 border-t border-white/15 pt-4 text-[10px] leading-5 text-sky-100/75">
        <p><FolderOpen className="mb-1 h-4 w-4 text-amber-200"/>File Folder boundary: Client ownership and private construction stay protected.</p>
        <p><Flame className="mb-1 h-4 w-4 text-amber-200"/>Inside the File Folder layer: your position can discover opened public Client Customer Doors.</p>
      </div>
    </div>
  </main>
}
