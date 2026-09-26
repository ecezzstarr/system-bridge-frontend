'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  ArrowRight,
  BookOpen,
  Building2,
  FileText,
  FolderOpen,
  Gamepad2,
  Globe2,
  Headphones,
  Landmark,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { WEAVE_SYSTEM_MAP } from '@/lib/weave-system-map'

type Item = {
  label: string
  detail: string
  href: string
  icon: ComponentType<{ className?: string }>
  district: string
  tone: 'sky' | 'emerald' | 'violet' | 'amber'
}

const districts = [
  { title: 'File Folder', detail: 'The Client operating environment: build, operate, business and enterprise.' },
  { title: 'Money + records', detail: 'Main wallet movement and Client value records.' },
  { title: 'Human support', detail: 'Bridger and company positions supporting the Client.' },
  { title: 'Shared WEAVE', detail: 'Common participation and communication spaces.' },
]

const commands: Item[] = [
  { label: 'Main File Folder', detail: 'Enter System Switch and the persistent Client operating environment.', href: '/client/system-switch', icon: FolderOpen, district: 'File Folder', tone: 'sky' },
  { label: 'Company Loops', detail: 'Events, responsibilities, agreements and Client participation.', href: '/client/loops', icon: FileText, district: 'File Folder', tone: 'amber' },
  { label: WEAVE_SYSTEM_MAP.language.marketplace, detail: 'Explore enterprise-scale systems available through WEAVE.', href: '/marketplace', icon: Store, district: 'File Folder', tone: 'violet' },
  { label: 'Client Settings', detail: 'Manage Client account and operating preferences.', href: '/client/settings', icon: Settings, district: 'File Folder', tone: 'sky' },

  { label: 'Deposit', detail: 'Move funds into the Main Client Wallet.', href: '/client/deposit', icon: Wallet, district: 'Money + records', tone: 'emerald' },
  { label: 'Withdraw', detail: 'Request movement out of the Main Client Wallet.', href: '/client/withdraw', icon: Wallet, district: 'Money + records', tone: 'amber' },
  { label: 'Record', detail: 'Preserved movement and value record across WEAVE.', href: '/ledger', icon: BookOpen, district: 'Money + records', tone: 'sky' },

  { label: 'Your Bridger', detail: 'Primary human relationship carrying the Client connection.', href: '/client/chat/bridger', icon: Users, district: 'Human support', tone: 'emerald' },
  { label: 'Mandate', detail: 'Company position supporting authorized Client movement.', href: '/client/chat/mandate', icon: ShieldCheck, district: 'Human support', tone: 'sky' },
  { label: 'Forensics', detail: 'Verification and confirmation support.', href: '/client/chat/forensic', icon: ShieldCheck, district: 'Human support', tone: 'violet' },
  { label: 'Attorney', detail: 'Clarity and legal-position support.', href: '/client/chat/lawyer', icon: Building2, district: 'Human support', tone: 'amber' },
  { label: 'Administration', detail: 'Institutional support and higher structure.', href: '/client/chat/admin', icon: Landmark, district: 'Human support', tone: 'violet' },

  { label: 'Bridge Plaza', detail: 'Enter the shared WEAVE world.', href: '/weave', icon: Globe2, district: 'Shared WEAVE', tone: 'sky' },
  { label: 'Human Cadences', detail: 'Find people through recorded participation and movement.', href: '/search', icon: MessageCircle, district: 'Shared WEAVE', tone: 'sky' },
  { label: 'Company Guidance', detail: 'Use the shared company clarification channel.', href: '/company-chat', icon: Headphones, district: 'Shared WEAVE', tone: 'emerald' },
  { label: 'Echo Board', detail: 'Authorized intelligence, world routing and continuity.', href: '/echo', icon: Sparkles, district: 'Shared WEAVE', tone: 'violet' },
  { label: 'Standing', detail: 'See shared WEAVE standing and position.', href: '/weave/standing', icon: Globe2, district: 'Shared WEAVE', tone: 'emerald' },
  { label: 'Presences', detail: 'See people and their place in WEAVE.', href: '/profiles', icon: UserCircle, district: 'Shared WEAVE', tone: 'amber' },
  { label: 'Arena', detail: 'Participant contest movement.', href: '/client/arena', icon: Gamepad2, district: 'Shared WEAVE', tone: 'amber' },
  { label: 'Casino', detail: 'System pattern play.', href: '/client/casino', icon: Sparkles, district: 'Shared WEAVE', tone: 'violet' },
  { label: 'Event Ground', detail: 'Enter the current Client event position.', href: '/client/event', icon: Headphones, district: 'Shared WEAVE', tone: 'emerald' },
]

const tone = {
  sky: 'border-sky-300/20 bg-sky-400/[0.055] hover:bg-sky-400/[0.09]',
  emerald: 'border-emerald-300/20 bg-emerald-400/[0.055] hover:bg-emerald-400/[0.09]',
  violet: 'border-violet-300/20 bg-violet-400/[0.055] hover:bg-violet-400/[0.09]',
  amber: 'border-amber-300/20 bg-amber-400/[0.055] hover:bg-amber-400/[0.09]',
}

export function ClientOperatingRoom() {
  const { user } = useAuth()

  return (
    <main className="mx-auto w-full max-w-[1500px] p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-sky-300/15 bg-[#030a15]/82 backdrop-blur-xl">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(56,189,248,.15),transparent_35%),radial-gradient(circle_at_88%_0%,rgba(139,92,246,.09),transparent_30%)] p-5 md:p-7">
          <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Client Operating Room</p>
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">The Client is the player. The File Folder is the working world.</h1>
          <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-300">
            {user?.name ? `${user.name}, ` : ''}your movement begins in the Main File Folder. Builds become live systems there; money, support and shared WEAVE spaces remain connected around that same Client position.
          </p>
        </header>

        <div className="grid gap-4 p-4 md:p-6 xl:grid-cols-[220px_minmax(0,1fr)_240px]">
          <aside className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.2em] text-sky-300">Client map</p>
            <div className="mt-4 space-y-3">
              {districts.map((district,index)=>(
                <div key={district.title} className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-sky-300/20 bg-sky-400/[0.06] text-[9px] font-black text-sky-200">{index+1}</span>
                    <p className="text-xs font-black text-white">{district.title}</p>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-slate-400">{district.detail}</p>
                </div>
              ))}
            </div>
          </aside>

          <section className="weave-reading-surface min-w-0 rounded-[1.75rem] p-4 md:p-5">
            <div className="rounded-3xl border border-sky-300/25 bg-[linear-gradient(135deg,rgba(14,165,233,.13),rgba(139,92,246,.07))] p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10"><FolderOpen className="h-6 w-6 text-sky-200"/></div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-300">Primary Client environment</p>
                    <h2 className="mt-1 text-xl font-black text-white md:text-2xl">Main File Folder</h2>
                    <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-300">Recognize → Preview → Build → Activate → Operate. This is where the Client's systems live after construction.</p>
                  </div>
                </div>
                <Link href="/client/system-switch" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-sky-300 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950">
                  Enter File Folder <ArrowRight className="h-4 w-4"/>
                </Link>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {commands.map(item=>{
                const Icon=item.icon
                return (
                  <Link key={item.label+item.href} href={item.href} className={`group min-h-[120px] rounded-2xl border p-3.5 transition hover:-translate-y-0.5 ${tone[item.tone]}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/25"><Icon className="h-4 w-4 text-white"/></div>
                      <span className="max-w-[52%] text-right text-[8px] font-black uppercase tracking-[0.11em] text-slate-400">{item.district}</span>
                    </div>
                    <p className="mt-3 text-sm font-black leading-5 text-white">{item.label}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-300">{item.detail}</p>
                  </Link>
                )
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Client movement</p>
              <div className="mt-3 space-y-2 text-xs font-semibold text-slate-300">
                <p>1. Enter File Folder.</p>
                <p>2. Build what you need.</p>
                <p>3. Use the finished system.</p>
                <p>4. Record real activity.</p>
                <p>5. Grow into business or enterprise.</p>
              </div>
            </section>
            <section className="rounded-3xl border border-violet-300/15 bg-violet-400/[0.04] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Support rule</p>
              <p className="mt-3 text-xs leading-5 text-slate-300">Bridgers and company positions support the Client's movement. They do not replace the Client as the player.</p>
            </section>
            <Link href="/client/dashboard" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs font-black text-white">
              Client World <ArrowRight className="h-4 w-4 text-sky-300"/>
            </Link>
          </aside>
        </div>
      </section>
    </main>
  )
}
