'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  Activity,
  ArrowRight,
  Bot,
  Box,
  Boxes,
  Camera,
  CheckCircle2,
  Cloud,
  Cpu,
  Dices,
  Flame,
  Headphones,
  Home,
  Link2,
  Monitor,
  Network,
  Orbit,
  Radio,
  Shield,
  Smartphone,
  Sparkles,
  Store,
  Swords,
  UserCircle,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import type { WeaveEvent } from '@/lib/weave-event'
import { getEventProgress } from '@/lib/weave-event'
import { useAuth } from '@/lib/auth-provider'
import { FlameEventRiverField } from '@/components/events/flame-event-river-field'

type WorldNode = {
  label: string
  detail: string
  href: string
  icon: ComponentType<{ className?: string }>
  accent: 'blue' | 'red' | 'violet' | 'emerald'
}

const leftNodes: WorldNode[] = [
  { label: 'Home', detail: 'Start here · your space · your journey', href: '/client/dashboard', icon: Home, accent: 'blue' },
  { label: 'Market', detail: 'Opportunities · real value · ideas to impact', href: '/marketplace', icon: Store, accent: 'blue' },
  { label: 'Arena', detail: 'Ideas into action · real competition', href: '/client/arena', icon: Swords, accent: 'violet' },
  { label: 'Casino', detail: 'Engagement · more possibilities', href: '/client/casino', icon: Dices, accent: 'red' },
  { label: 'Vault', detail: 'Assets · movement · your progress', href: '/client/deposit', icon: Wallet, accent: 'blue' },
]

const rightNodes: WorldNode[] = [
  { label: 'System Switch', detail: 'Your crossing continues as movement', href: '/client/system-switch', icon: Orbit, accent: 'blue' },
  { label: 'Client Workshop', detail: 'Speak · place · build', href: '/client/system-switch?workshop=composition&source=flame-event', icon: Boxes, accent: 'blue' },
  { label: 'Bridger Path', detail: 'Your Bridger carries and extends movement', href: '/client/chat/bridger', icon: Link2, accent: 'emerald' },
  { label: 'Administration', detail: 'Recognition · organization · continuity', href: '/client/chat/admin', icon: Shield, accent: 'red' },
]

const accentClasses = {
  blue: 'border-sky-400/25 bg-sky-400/[0.06] text-sky-300 hover:border-sky-300/50',
  red: 'border-red-400/25 bg-red-400/[0.06] text-red-300 hover:border-red-300/50',
  violet: 'border-violet-400/25 bg-violet-400/[0.06] text-violet-300 hover:border-violet-300/50',
  emerald: 'border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-300 hover:border-emerald-300/50',
}

const cadence = [
  ['Presence', 'Be here. Be real.'],
  ['Possibility', 'See what can be.'],
  ['Movement', 'Take action together.'],
  ['Response', 'Create and deliver.'],
  ['Recognition', 'Movement becomes value.'],
]

function WorldNodeCard({ node }: { node: WorldNode }) {
  const Icon = node.icon
  return (
    <Link
      href={node.href}
      className={`group block rounded-2xl border p-3 transition duration-300 hover:-translate-y-0.5 ${accentClasses[node.accent]}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/35">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-white">{node.label}</p>
          <p className="mt-1 text-[9px] uppercase leading-4 tracking-[0.08em] text-slate-500">{node.detail}</p>
        </div>
      </div>
    </Link>
  )
}

function CompositionWorkshop() {
  return (
    <section className="rounded-[1.75rem] border border-sky-400/25 bg-[#04101f]/90 p-4 shadow-[0_0_45px_rgba(56,189,248,0.08)] lg:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/10 text-sky-300">
          <Box className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-sky-300">Workshop Type 01</p>
          <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white">Composition Workshop</h2>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">The Client speaks. Weave builds.</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-sky-400/20 bg-black/30 p-4">
        <p className="text-xs leading-5 text-slate-300">
          What you think and say becomes a placement. Weave composes those placements into hardware, software and useful real-life systems.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Hardware Tech</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-slate-400">
            <Camera className="h-4 w-4" />
            <Cpu className="h-4 w-4" />
            <Bot className="h-4 w-4" />
          </div>
          <p className="mt-3 text-[9px] leading-4 text-slate-500">Devices · robotics · sensors · electronics · physical systems</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Software Tech</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-slate-400">
            <Smartphone className="h-4 w-4" />
            <Monitor className="h-4 w-4" />
            <Cloud className="h-4 w-4" />
          </div>
          <p className="mt-3 text-[9px] leading-4 text-slate-500">Apps · AI · platforms · dashboards · digital systems</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">
        <Cpu className="h-3.5 w-3.5 text-sky-300" /> Device
        <span>+</span>
        <Sparkles className="h-3.5 w-3.5 text-sky-300" /> AI
        <span>+</span>
        <Boxes className="h-3.5 w-3.5 text-sky-300" /> Platform
        <span>+</span>
        <Network className="h-3.5 w-3.5 text-sky-300" /> Network
        <span>+</span>
        <Users className="h-3.5 w-3.5 text-sky-300" /> People
      </div>

      <Link
        href="/client/system-switch?workshop=composition&source=flame-event"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300/30 bg-sky-400/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-sky-200 transition hover:bg-sky-400/20"
      >
        Enter Composition Workshop <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  )
}

export default function ClientFlameEventDashboard({ event }: { event: WeaveEvent }) {
  const { user } = useAuth()
  const progress = getEventProgress(event, new Date())
  const day = Math.max(1, progress.day || 1)
  const isDayOne = day === 1

  return (
    <main className="min-h-screen overflow-hidden bg-[#010713] text-white">
      <div className="relative mx-auto max-w-[1800px]">
        <FlameEventRiverField />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(14,165,233,0.12),transparent_34%),radial-gradient(circle_at_46%_46%,rgba(239,68,68,0.10),transparent_25%),radial-gradient(circle_at_80%_25%,rgba(37,99,235,0.09),transparent_28%)]" />

        <div className="relative grid min-h-screen lg:grid-cols-[205px_1fr]">
          <aside className="border-b border-white/10 bg-[#020813]/95 p-4 lg:border-b-0 lg:border-r lg:p-5">
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-400/30 bg-gradient-to-b from-sky-500/10 to-red-500/10">
                  <Flame className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-black tracking-[0.24em]">WEAVE</p>
                  <p className="text-[8px] uppercase tracking-[0.28em] text-slate-500">of Presence</p>
                </div>
              </div>
              <p className="mt-3 text-[8px] uppercase tracking-[0.18em] text-slate-600">System Switch — Bridge Radiance</p>
            </div>

            <SidebarGroup title="Core" items={[
              ['Home', '/client/dashboard', Home],
              ['Event', '/client/event', Flame],
              ['System Switch', '/client/system-switch', Orbit],
            ]} active="Event" />
            <SidebarGroup title="Positions" items={[
              ['Client', '#client-core', UserCircle],
              ['Bridger', '/client/chat/bridger', Link2],
              ['Agent', '#support-positions', Users],
              ['Administration', '/client/chat/admin', Shield],
            ]} />
            <SidebarGroup title="Districts" items={[
              ['Market', '/marketplace', Store],
              ['Arena', '/client/arena', Swords],
              ['Casino', '/client/casino', Dices],
              ['Vault', '/client/deposit', Wallet],
            ]} />
            <SidebarGroup title="Help" items={[
              ['Support', '#support-positions', Headphones],
            ]} />
          </aside>

          <div className="min-w-0 p-3 sm:p-4 lg:p-6">
            <header className="text-center">
              <div className="flex flex-wrap items-center justify-center gap-2 text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500">
                <span>Real People</span><span>·</span><span>Real Participation</span><span>·</span><span>A More Coherent World</span>
              </div>
              <h1 className="mt-3 bg-gradient-to-r from-red-300 via-white to-sky-300 bg-clip-text text-4xl font-black uppercase tracking-[0.08em] text-transparent sm:text-5xl lg:text-6xl">
                Flame Event
              </h1>
              <p className="mt-1 text-sm font-black uppercase tracking-[0.35em] text-slate-200">Company Loop 1</p>
              <div className="mx-auto mt-3 inline-flex rounded-full border border-sky-400/30 bg-sky-400/5 px-5 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-sky-200">
                Client Dashboard
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em]">
                <span className="text-red-300">Day {day}</span>
                <span className="text-slate-700">•</span>
                <span className="text-emerald-300"><Radio className="mr-1 inline h-3 w-3" /> Event Live</span>
                {isDayOne && <><span className="text-slate-700">•</span><span className="text-white">Event Start</span></>}
              </div>
              <p className="mt-2 text-[9px] uppercase tracking-[0.16em] text-slate-500">
                {isDayOne ? 'The Flame is open · Movement begins · A living system' : 'Interaction in Motion · The world continues moving'}
              </p>
            </header>

            <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_330px]">
              <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#030a16]/90 p-4 shadow-2xl lg:p-5">
                <div className="pointer-events-none absolute inset-0 opacity-90">
                  <div className="absolute left-[10%] top-[18%] h-px w-[80%] bg-gradient-to-r from-transparent via-sky-400/35 to-transparent animate-pulse" />
                  <div className="absolute left-[20%] top-[52%] h-px w-[60%] rotate-[-8deg] bg-gradient-to-r from-red-400/10 via-red-400/35 to-transparent animate-pulse" />
                  <div className="absolute left-[24%] top-[67%] h-px w-[56%] rotate-[7deg] bg-gradient-to-r from-transparent via-sky-400/35 to-red-400/20 animate-pulse" />
                </div>

                <div className="relative grid gap-4 lg:grid-cols-[230px_1fr_230px]">
                  <div className="space-y-3">
                    {leftNodes.map(node => <WorldNodeCard key={node.label} node={node} />)}
                  </div>

                  <div id="client-core" className="flex min-h-[520px] flex-col items-center justify-center text-center">
                    <Link href="/client/event" className="group relative mb-7">
                      <div className="absolute -inset-8 rounded-full bg-red-500/10 blur-3xl transition group-hover:bg-red-500/20" />
                      <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-sky-300/30 bg-gradient-to-b from-sky-500/10 via-black/50 to-red-500/10 shadow-[0_0_80px_rgba(56,189,248,0.15)]">
                        <div className="absolute inset-3 rounded-full border border-red-300/20 animate-pulse" />
                        <Flame className="h-12 w-12 text-white" />
                      </div>
                      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-red-300">Flame Event</p>
                      <p className="mt-1 text-[8px] uppercase tracking-[0.16em] text-slate-500">Ideas · participation · global movement</p>
                    </Link>

                    <div className="relative w-full max-w-md rounded-[2rem] border border-sky-300/30 bg-gradient-to-b from-sky-500/10 to-red-500/[0.04] px-5 py-7 shadow-[0_0_60px_rgba(14,165,233,0.12)]">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-black/40">
                        <UserCircle className="h-8 w-8 text-white" />
                      </div>
                      <p className="mt-4 text-2xl font-black uppercase tracking-[0.18em]">Client</p>
                      <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-sky-200">Your Life · Your Ideas · Real Systems</p>
                      <p className="mx-auto mt-4 max-w-sm text-xs leading-5 text-slate-400">
                        {user?.name ? `${user.name}, ` : ''}you are the player. Speak what you are thinking, building or trying to solve. Weave turns the interaction into placements and composes useful systems around your real movement.
                      </p>
                      <Link
                        href="/client/system-switch?workshop=composition&source=flame-event"
                        className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-white transition hover:border-sky-300/40 hover:bg-sky-400/10"
                      >
                        Speak · Place · Build <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div id="support-positions" className="mt-5 grid w-full max-w-lg grid-cols-3 gap-2">
                      {[
                        ['Bridger', Link2, 'Carries movement'],
                        ['Agent', Users, 'Supports continuity'],
                        ['Administration', Shield, 'Recognizes movement'],
                      ].map(([label, Icon, detail]) => {
                        const I = Icon as ComponentType<{ className?: string }>
                        return (
                          <div key={String(label)} className="rounded-xl border border-white/10 bg-black/30 p-3">
                            <I className="mx-auto h-4 w-4 text-sky-300" />
                            <p className="mt-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-200">{String(label)}</p>
                            <p className="mt-1 text-[8px] text-slate-600">{String(detail)}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {rightNodes.map(node => <WorldNodeCard key={node.label} node={node} />)}
                    <div className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.04] p-4">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-sky-300" />
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Interaction in Motion</p>
                      </div>
                      <p className="mt-2 text-[9px] leading-4 text-slate-500">Every real interaction can move another part of the world. Your words are not decoration; they are placements.</p>
                    </div>
                  </div>
                </div>
              </section>

              <CompositionWorkshop />
            </div>

            <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_330px]">
              <div className="rounded-[1.75rem] border border-white/10 bg-[#030a16]/90 p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-sky-300" />
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">The Moving Cadence</p>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-5">
                  {cadence.map(([title, detail], index) => (
                    <div key={title} className="relative rounded-xl border border-white/10 bg-black/25 p-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-sky-300/30 bg-sky-400/5 text-[10px] font-black text-white">{index + 1}</div>
                      <p className="mt-2 text-[9px] font-black uppercase tracking-[0.12em] text-white">{title}</p>
                      <p className="mt-1 text-[8px] leading-4 text-slate-600">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
                <p className="text-2xl font-black uppercase tracking-[0.12em] text-white">Day {day}</p>
                <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-sky-300">{isDayOne ? 'Event Start' : 'Interaction Continues'}</p>
                <p className="mt-3 text-[9px] uppercase leading-5 tracking-[0.1em] text-slate-500">
                  {isDayOne ? 'The Flame is open. The world is open. Composition Workshop is ready.' : 'The world remains open. Your movement continues to change what becomes possible.'}
                </p>
                <div className="mt-4 space-y-2">
                  {['Event live', 'World open', 'Client player active', 'Composition Workshop ready'].map(item => (
                    <div key={item} className="flex items-center gap-2 text-[9px] uppercase tracking-[0.1em] text-slate-400">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <footer className="mt-4 flex flex-col gap-2 border-t border-white/10 py-4 text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>A living platform · A moving world · Real systems</span>
              <span>People · Ideas · Opportunities · Value · Livelihood</span>
            </footer>
          </div>
        </div>
      </div>
    </main>
  )
}

function SidebarGroup({
  title,
  items,
  active,
}: {
  title: string
  items: [string, string, ComponentType<{ className?: string }>][]
  active?: string
}) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">{title}</p>
      <div className="space-y-1">
        {items.map(([label, href, Icon]) => {
          const isActive = active === label
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-[10px] font-semibold transition ${
                isActive
                  ? 'border-red-400/35 bg-red-500/10 text-white shadow-[0_0_20px_rgba(239,68,68,0.08)]'
                  : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.03] hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-red-300' : 'text-sky-300'}`} />
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
