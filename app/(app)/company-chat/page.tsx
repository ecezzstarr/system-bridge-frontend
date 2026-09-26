'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import { useEffect } from 'react'
import {
  ArrowRight,
  FileCheck,
  Landmark,
  MessageCircle,
  Scale,
  Search,
  ShieldCheck,
} from 'lucide-react'

const POSITIONS = [
  {
    id:'mandate',
    name:'Mandate',
    detail:'Turn clarified Client movement into authorized execution.',
    output:'Action → execution',
    icon:FileCheck,
    tone:'border-sky-300/20 bg-sky-400/[0.05] text-sky-200',
  },
  {
    id:'lawyer',
    name:'Attorney',
    detail:'Clarify obligations, agreements and what must be done before action.',
    output:'Question → clarity',
    icon:Scale,
    tone:'border-violet-300/20 bg-violet-400/[0.05] text-violet-200',
  },
  {
    id:'forensic',
    name:'Forensics',
    detail:'Verify records, movement and claims before they become accepted state.',
    output:'Movement → confirmation',
    icon:Search,
    tone:'border-emerald-300/20 bg-emerald-400/[0.05] text-emerald-200',
  },
  {
    id:'admin',
    name:'Administration',
    detail:'Resolve higher-order structure, authority and institutional continuity.',
    output:'Confirmed need → elevation',
    icon:Landmark,
    tone:'border-amber-300/20 bg-amber-400/[0.05] text-amber-200',
  },
]

export default function CompanyGuidanceRouterPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) router.push('/login')
  }, [user, router])

  if (!user) return null

  return (
    <main className="mx-auto w-full max-w-6xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-[#030a15]/72">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,.13),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(245,158,11,.07),transparent_28%)] p-5 md:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10"><MessageCircle className="h-5 w-5 text-cyan-200"/></div>
            <div>
              <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">Company Guidance Router</p>
              <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">Choose the company position by the movement you need.</h1>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
                Guidance is not a generic support inbox. Each company position owns a different transition in the Client process, so the correct conversation begins with the function required.
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_300px]">
          <section className="weave-reading-surface rounded-3xl p-4 md:p-5">
            <div className="grid gap-3 md:grid-cols-2">
              {POSITIONS.map(position=>{
                const Icon=position.icon
                return (
                  <Link key={position.id} href={`/company-chat/${position.id}`} className={`group rounded-2xl border p-5 transition hover:-translate-y-0.5 ${position.tone}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/25"><Icon className="h-4 w-4"/></div>
                      <ArrowRight className="h-4 w-4 opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100"/>
                    </div>
                    <h2 className="mt-4 text-lg font-black text-white">{position.name}</h2>
                    <p className="mt-2 text-xs leading-5 text-slate-300">{position.detail}</p>
                    <p className="mt-4 text-[9px] font-black uppercase tracking-[0.12em]">{position.output}</p>
                  </Link>
                )
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Service chain</p></div>
              <div className="mt-3 space-y-2 text-xs font-semibold text-slate-300">
                <p>Connection → clarity.</p>
                <p>Clarity → action.</p>
                <p>Action → execution.</p>
                <p>Execution → confirmation.</p>
                <p>Confirmation → elevation.</p>
              </div>
            </section>

            <section className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.04] p-4">
              <div className="flex items-center gap-2"><Landmark className="h-4 w-4 text-amber-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Current identity</p></div>
              <p className="mt-3 text-sm font-black text-white">{user.name}</p>
              <p className="mt-1 text-xs capitalize text-slate-400">{user.role}</p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}
