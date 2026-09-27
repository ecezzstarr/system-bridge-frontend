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
  Video,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { WEAVE_SYSTEM_MAP } from '@/lib/weave-system-map'
import { WeaveRouteNetwork, type WeaveRouteTone } from '@/components/world/weave-route-network'

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
  { label: 'Private Lounge', detail: 'Private WEAVE communication.', href: '/lounge?view=private', icon: ShieldCheck, district: 'Shared WEAVE', tone: 'violet' },
  { label: 'Lounge', detail: 'Shared communication across WEAVE.', href: '/lounge', icon: MessageCircle, district: 'Shared WEAVE', tone: 'emerald' },
  { label: 'Echo', detail: 'Use the WEAVE Echo surface.', href: '/echo', icon: Sparkles, district: 'Shared WEAVE', tone: 'violet' },
  { label: 'Stream', detail: 'Shared WEAVE media stream.', href: '/video-feed', icon: Video, district: 'Shared WEAVE', tone: 'sky' },
  { label: 'Standing', detail: 'See shared WEAVE standing and position.', href: '/weave/standing', icon: Globe2, district: 'Shared WEAVE', tone: 'emerald' },
  { label: 'Presences', detail: 'See people and their place in WEAVE.', href: '/profiles', icon: UserCircle, district: 'Shared WEAVE', tone: 'amber' },
  { label: 'Arena', detail: 'Participant contest movement.', href: '/client/arena', icon: Gamepad2, district: 'Shared WEAVE', tone: 'amber' },
  { label: 'Casino', detail: 'System pattern play.', href: '/client/casino', icon: Sparkles, district: 'Shared WEAVE', tone: 'violet' },
  { label: 'Event Ground', detail: 'Enter the current Client event position.', href: '/client/event', icon: Headphones, district: 'Shared WEAVE', tone: 'emerald' },
]

const ROUTE_TONE:Record<Item['tone'],WeaveRouteTone>={
  sky:'sky',
  emerald:'emerald',
  violet:'violet',
  amber:'amber',
}

export function ClientOperatingRoom() {
  const { user } = useAuth()
  const stations=commands.map(item=>({...item,tone:ROUTE_TONE[item.tone]}))

  return (
    <main className="mx-auto w-full max-w-[1500px] p-0 sm:p-3 md:p-6">
      <section className="weave-system-depth weave-operating-environment overflow-hidden border-y border-sky-300/15 bg-[#030a15]/82 backdrop-blur-xl sm:rounded-[2rem] sm:border">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(56,189,248,.15),transparent_35%),radial-gradient(circle_at_88%_0%,rgba(139,92,246,.09),transparent_30%)] p-5 md:p-7">
          <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Client Operating Room</p>
          <h1 data-weave-live-word="title" className="mt-2 text-2xl font-black text-white md:text-3xl">The Client is the player. The File Folder is the working world.</h1>
          <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-300">
            {user?.name ? `${user.name}, ` : ''}your movement begins in the Main File Folder. Builds become live systems there; money, support and shared WEAVE spaces remain connected around that same Client position.
          </p>
        </header>

        <div className="grid min-h-[620px] xl:grid-cols-[190px_minmax(0,1fr)_230px]">
          <aside className="border-b border-white/[0.07] bg-black/10 p-4 xl:border-b-0 xl:border-r">
            <div className="sticky top-20">
              <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.2em] text-sky-300">Client map</p>
              <div className="mt-5 border-l border-sky-300/15">
                {districts.map((district,index)=>(
                  <div key={district.title} className="relative border-b border-white/[0.055] px-4 py-3 last:border-b-0">
                    <span className="absolute -left-[5px] top-4 h-2.5 w-2.5 rounded-full border border-sky-200/40 bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,.35)]"/>
                    <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-600">District {String(index+1).padStart(2,'0')}</p>
                    <p data-weave-live-word="station" className="mt-1 text-xs font-black text-white">{district.title}</p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-500">{district.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="min-w-0 p-4 md:p-6">
            <div className="grid gap-4 border-b border-sky-300/15 pb-5 md:grid-cols-[minmax(0,1fr)_190px] md:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-sky-300/20 bg-sky-400/[0.06]"><FolderOpen className="h-5 w-5 text-sky-200"/></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-300">Primary Client environment</p>
                  <h2 data-weave-live-word="title" className="mt-1 text-xl font-black text-white md:text-2xl">Main File Folder</h2>
                  <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-300">Recognize → Preview → Build → Activate → Operate. The File Folder is the Client-owned world; the routes below remain connected to it.</p>
                </div>
              </div>
              <Link href="/client/system-switch" className="group flex min-h-14 items-center justify-between border-l-2 border-sky-300/35 bg-sky-300/[0.045] px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-sky-100 transition hover:bg-sky-300/[0.08]">
                Enter world <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1"/>
              </Link>
            </div>

            <div className="mt-5">
              <WeaveRouteNetwork
                stations={stations}
                title="Client route network"
                detail="Money, support, participation and enterprise are lanes around the same Client position. They are stations in one world rather than a grid of separate destinations."
              />
            </div>
          </section>

          <aside className="border-t border-white/[0.07] bg-black/10 p-4 xl:border-l xl:border-t-0">
            <div className="sticky top-20 space-y-6">
              <section className="border-l border-emerald-300/20 pl-4">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Client movement</p>
                <div className="mt-3 space-y-2 text-xs font-semibold text-slate-300">
                  <p>1. Enter File Folder.</p>
                  <p>2. Build what you need.</p>
                  <p>3. Activate the finished system.</p>
                  <p>4. Record real activity.</p>
                  <p>5. Grow into business or enterprise.</p>
                </div>
              </section>
              <section className="border-l border-violet-300/20 pl-4">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Support rule</p>
                <p className="mt-3 text-xs leading-5 text-slate-300">Bridgers and company positions support the Client's movement. They do not replace the Client as the player.</p>
              </section>
              <Link href="/client/dashboard" className="group flex items-center justify-between border-y border-white/10 py-3 text-xs font-black text-white">
                Client World <ArrowRight className="h-4 w-4 text-sky-300 transition group-hover:translate-x-1"/>
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
