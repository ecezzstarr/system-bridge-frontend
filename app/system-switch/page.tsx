'use client'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, Flame, FolderOpen, Orbit, Waves } from 'lucide-react'
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
    <div className="relative mx-auto w-full max-w-xl" data-system-switch-gate-world>
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
      <div className="relative mx-auto my-7 h-[16rem] w-[min(76vw,19rem)]" aria-hidden="true">
        <div className="absolute inset-x-[10%] bottom-0 h-7 rounded-[50%] bg-amber-300/30 blur-2xl"/>
        <div className="absolute inset-x-[18%] bottom-[8%] top-[10%] rounded-t-full border-[9px] border-[#f3d2a0]/90 bg-[radial-gradient(ellipse_at_50%_17%,rgba(246,221,145,.38),rgba(26,110,150,.50)_48%,rgba(5,28,55,.85))] shadow-[inset_0_0_60px_rgba(194,230,253,.33),0_0_52px_rgba(248,167,62,.42)]"/>
        <div className="absolute inset-x-[26%] bottom-[9%] top-[19%] rounded-t-full border-x border-t border-cyan-200/55"/>
        <div className="absolute bottom-[8%] left-1/2 h-[52%] w-[62%] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,235,172,.02),rgba(255,211,137,.41))] [clip-path:polygon(45%_0%,55%_0%,100%_100%,0%_100%)]"/>
        <div className="absolute left-1/2 top-[-7%] h-4 w-4 -translate-x-1/2 rotate-45 bg-amber-100 shadow-[0_0_26px_#f9c46c]"/>
      </div>
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
