'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  BookOpen,
  Bot,
  CircleDollarSign,
  Flame,
  Gamepad2,
  Globe2,
  Headphones,
  MessageCircle,
  Network,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  Wallet,
} from 'lucide-react'
import { DailyProspectClaim } from '@/components/bridger/daily-prospect-claim'
import { getAuthHeaders } from '@/lib/auth-client'
import { WEAVE_SYSTEM_MAP } from '@/lib/weave-system-map'
import { ClientBuildPull } from '@/components/world/client-build-pull'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import { WeaveRouteNetwork, type WeaveRouteTone } from '@/components/world/weave-route-network'
import { visiblePoll } from '@/lib/visible-poll'

const commands = [
  { label: 'Bridge Radiance', detail: 'Active Prospect conversations and unread movement.', href: '/bridger/bridge-radiance', icon: MessageCircle, district: 'Prospect movement' },
  { label: 'Prospect Market', detail: 'Claim, acquire and continue available Prospect movement.', href: '/weave/market/prospects', icon: ShoppingBag, district: 'Prospect movement' },
  { label: 'Bridge AI Paths', detail: 'Crossing routes and Client AI support.', href: '/bridger/bridge-ai', icon: Bot, district: 'Prospect movement' },
  { label: 'Worldwide Number Bay', detail: 'Buy stocked numbers, order countries and complete verification.', href: '/bridger/numbers', icon: Phone, district: 'Participation supply' },
  { label: 'My Clients', detail: 'Continue with Clients after crossing and support active builds.', href: '/bridger/clients', icon: Users, district: 'Client continuity' },
  { label: 'Bridger Continuance', detail: 'Partnership standing, expiry and Administration verification.', href: '/bridger/subscription', icon: ShieldCheck, district: 'Position continuity' },
  { label: 'Company Guidance', detail: 'Internal company support and clarification.', href: '/company-chat', icon: Headphones, district: 'Position continuity' },
  { label: WEAVE_SYSTEM_MAP.language.wallet, detail: 'Operational holding and Flame Coin movement.', href: '/wallet', icon: Wallet, district: 'Value + record' },
  { label: WEAVE_SYSTEM_MAP.language.ledger, detail: 'Preserved movement and value record.', href: '/ledger', icon: BookOpen, district: 'Value + record' },
  { label: 'Company Loops', detail: 'Current company movement and participation.', href: '/company/loops', icon: Network, district: 'Participation' },
  { label: WEAVE_SYSTEM_MAP.language.marketplace, detail: 'Enterprise-scale systems available through WEAVE.', href: '/marketplace', icon: Store, district: 'Enterprise' },
  { label: 'Bridge Plaza', detail: 'Enter shared Client worlds as support.', href: '/weave', icon: Globe2, district: 'Client continuity' },
  { label: 'Loop 1 Ground', detail: 'Current Flame Event movement.', href: '/event', icon: Flame, district: 'Participation' },
  { label: 'Arena', detail: 'Participant contest.', href: '/arena', icon: Gamepad2, district: 'Participation' },
]

const DISTRICT_ROUTE_TONE: Record<string, WeaveRouteTone> = {
  'Prospect movement': 'amber',
  'Participation supply': 'cyan',
  'Client continuity': 'emerald',
  'Position continuity': 'violet',
  'Value + record': 'sky',
  'Participation': 'cyan',
  'Enterprise': 'sky',
}

type OperationalPulse = {
  dailyClaimed: boolean
  radianceThreads: number
  unreadRadiance: number
  clients: number
  ownedNumbers: number
  activeNumberOrders: number
  continuance: string
  updatedAt: number | null
}

const EMPTY_PULSE: OperationalPulse = {
  dailyClaimed: false,
  radianceThreads: 0,
  unreadRadiance: 0,
  clients: 0,
  ownedNumbers: 0,
  activeNumberOrders: 0,
  continuance: 'unknown',
  updatedAt: null,
}

async function readJson(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { headers: getAuthHeaders(), cache: 'no-store', signal })
  if (!response.ok) return null
  return response.json().catch(() => null)
}

export function BridgerOperatingEnvironment() {
  const [referral, setReferral] = useState<any>(null)
  const [pulse, setPulse] = useState<OperationalPulse>(EMPTY_PULSE)
  const { isVisible, orderFor } = useEnvironmentOrganizer()
  const visibleCommands = commands
    .filter(item => isVisible(item.href))
    .sort((a, b) => orderFor(a.href) - orderFor(b.href))
  const stations = visibleCommands.map(item => ({
    ...item,
    tone: DISTRICT_ROUTE_TONE[item.district] || 'sky' as WeaveRouteTone,
  }))

  const loadPulse = async (signal?: AbortSignal) => {
    const [daily, radiance, clients, numbers, continuance] = await Promise.allSettled([
      readJson('/api/bridger/daily-prospect', signal),
      readJson('/api/bridger/support-inbox', signal),
      readJson('/api/bridger/clients', signal),
      readJson('/api/bridger/numbers', signal),
      readJson('/api/bridger/subscription', signal),
    ])

    const dailyData = daily.status === 'fulfilled' ? daily.value : null
    const radianceData = radiance.status === 'fulfilled' ? radiance.value : null
    const clientsData = clients.status === 'fulfilled' ? clients.value : null
    const numbersData = numbers.status === 'fulfilled' ? numbers.value : null
    const continuanceData = continuance.status === 'fulfilled' ? continuance.value : null

    const bridgerThreads = Array.isArray(radianceData?.threads)
      ? radianceData.threads.filter((thread: any) => thread.position === 'bridger')
      : []
    const activeOrders = Array.isArray(numbersData?.orders)
      ? numbersData.orders.filter((order: any) => ['requested', 'fulfilling'].includes(String(order.status)))
      : []
    const standing = continuanceData?.continuance || continuanceData?.subscription
    if (signal?.aborted) return

    setPulse(prev => ({
      dailyClaimed: dailyData ? Boolean(dailyData.claimed) : prev.dailyClaimed,
      radianceThreads: radianceData ? bridgerThreads.length : prev.radianceThreads,
      unreadRadiance: radianceData ? bridgerThreads.reduce((sum: number, thread: any) => sum + (Number(thread.unreadCount) || 0), 0) : prev.unreadRadiance,
      clients: clientsData && Array.isArray(clientsData.clients) ? clientsData.clients.length : prev.clients,
      ownedNumbers: numbersData && Array.isArray(numbersData.mine) ? numbersData.mine.length : prev.ownedNumbers,
      activeNumberOrders: numbersData ? activeOrders.length : prev.activeNumberOrders,
      continuance: standing?.subscription_status ? String(standing.subscription_status) : prev.continuance,
      updatedAt: Date.now(),
    }))
  }

  useEffect(() => {
    const stopPulse = visiblePoll(signal => loadPulse(signal), 20000)
    fetch('/api/bridger/referral-commissions', { headers: getAuthHeaders(), cache: 'no-store' })
      .then(async response => response.ok ? response.json() : null)
      .then(data => data && setReferral(data))
      .catch(() => {})
    return stopPulse
  }, [])

  const referralLink = referral?.referralLink
    ? (typeof window !== 'undefined' ? window.location.origin : '') + referral.referralLink
    : ''

  const liveMoves = [
    {
      label: 'Daily Prospect',
      value: pulse.dailyClaimed ? 'CLAIMED' : 'READY',
      detail: pulse.dailyClaimed ? 'Today’s free Prospect is already in outreach.' : 'One free Prospect can enter outreach now.',
      href: '/weave/market/prospects',
      tone: pulse.dailyClaimed ? 'text-emerald-200' : 'text-amber-200',
    },
    {
      label: 'Bridge Radiance',
      value: pulse.unreadRadiance > 0 ? `${pulse.unreadRadiance} UNREAD` : `${pulse.radianceThreads} ACTIVE`,
      detail: 'Prospect conversations attached to your Bridges.',
      href: '/bridger/bridge-radiance',
      tone: pulse.unreadRadiance > 0 ? 'text-cyan-200' : 'text-slate-200',
    },
    {
      label: 'Number Bay',
      value: pulse.activeNumberOrders > 0 ? `${pulse.activeNumberOrders} WAITING` : `${pulse.ownedNumbers} OWNED`,
      detail: pulse.activeNumberOrders > 0 ? 'Administration still has a number delivery movement open.' : 'Worldwide number ownership and verification.',
      href: '/bridger/numbers',
      tone: pulse.activeNumberOrders > 0 ? 'text-amber-200' : 'text-cyan-200',
    },
    {
      label: 'Client Continuity',
      value: `${pulse.clients} CLIENT${pulse.clients === 1 ? '' : 'S'}`,
      detail: 'Clients already carried through crossing remain active relationships.',
      href: '/bridger/clients',
      tone: 'text-emerald-200',
    },
    {
      label: 'Continuance',
      value: pulse.continuance.toUpperCase(),
      detail: 'Your current Bridger partnership standing.',
      href: '/bridger/subscription',
      tone: pulse.continuance === 'active' ? 'text-emerald-200' : pulse.continuance === 'suspended' ? 'text-red-200' : 'text-amber-200',
    },
  ]

  return (
    <main className="mx-auto w-full max-w-[1500px] p-0 sm:p-3 md:p-6">
      <section className="weave-system-depth weave-operating-environment overflow-hidden border-y border-emerald-300/15 bg-[#03100f]/82 backdrop-blur-xl sm:rounded-[2rem] sm:border">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_10%_0%,rgba(52,211,153,.13),transparent_36%),radial-gradient(circle_at_90%_0%,rgba(56,189,248,.08),transparent_30%)] p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">Hope · Bridger Operating Room</p>
              <h1 data-weave-live-word="title" className="mt-2 text-2xl font-black text-white md:text-3xl">Connection moving now.</h1>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
                The Bridger carries Prospect movement into Bridge Radiance, supports the crossing into Clienthood, keeps Clients connected after crossing, and maintains the participation tools that make that movement possible.
              </p>
            </div>
            <div className="border-l border-emerald-300/20 pl-4 text-right">
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-300">Live operations</p>
              <p className="mt-1 text-xs font-black text-white">{pulse.updatedAt ? 'SYNCED' : 'CONNECTING'}</p>
              {pulse.updatedAt && <p className="mt-1 text-[8px] text-slate-500">refreshes while visible</p>}
            </div>
          </div>
        </header>

        <div className="border-b border-white/10 bg-black/15 px-4 py-3 md:px-6" data-bridger-live-operations="true">
          <div className="flex gap-5 overflow-x-auto pb-1">
            {liveMoves.map(move => (
              <Link key={move.label} href={move.href} className="min-w-[180px] border-l border-white/10 pl-3 transition hover:border-cyan-300/30">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">{move.label}</p>
                <p className={`mt-1 text-xs font-black ${move.tone}`}>{move.value}</p>
                <p className="mt-1 text-[9px] leading-4 text-slate-500">{move.detail}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid min-h-[620px] xl:grid-cols-[minmax(0,1fr)_250px]">
          <section className="min-w-0 border-b border-white/[0.07] p-4 md:p-6 xl:border-b-0 xl:border-r">
            <section className="border-b border-amber-300/15 pb-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <Network className="mt-0.5 h-5 w-5 text-amber-300" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Prospect intake</p>
                    <p data-weave-live-word="station" className="mt-1 text-sm font-black text-white">Daily Prospect → Bridge Radiance</p>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">Claiming does not end at ownership. The Prospect enters outreach, then Bridge Radiance carries the live conversation.</p>
                  </div>
                </div>
                <Link href="/bridger/bridge-radiance" className="inline-flex items-center gap-2 border-l border-cyan-300/20 pl-3 text-[8px] font-black uppercase tracking-[0.14em] text-cyan-200">
                  Open Radiance <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="mt-4" data-weave-station="prospect-intake"><DailyProspectClaim /></div>
            </section>

            <div className="mt-5">
              <WeaveRouteNetwork
                stations={stations}
                title="Bridger operating routes"
                detail="Prospect movement, number supply, Client continuity, position continuity and value record stay synchronized inside one Bridger operation."
              />
            </div>
          </section>

          <aside className="bg-black/10 p-4 md:p-5">
            <div className="sticky top-20 space-y-6">
              <section className="border-l border-sky-300/20 pl-4">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4 text-sky-300" />
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Referral continuity</p>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-400">Invite another Bridger through the recorded partnership route.</p>
                {referralLink && <input readOnly value={referralLink} className="mt-3 w-full border-b border-white/10 bg-transparent px-0 py-2 text-[10px] font-semibold text-white outline-none" />}
                <div className="mt-4 grid grid-cols-2 divide-x divide-white/10 border-y border-white/10 py-3 text-center">
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-slate-500">Referred</p>
                    <p className="mt-1 text-lg font-black text-white">{referral?.referralCount ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-slate-500">Earnings</p>
                    <p className="mt-1 text-sm font-black text-emerald-200">{referral?.referralEarnings ?? 0} Flame Coin</p>
                  </div>
                </div>
              </section>

              <section className="border-l border-emerald-300/20 pl-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-300" />
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">System pulse</p>
                </div>
                <p data-weave-live-word="station" className="mt-3 text-sm font-black text-white">
                  {pulse.unreadRadiance > 0 ? `${pulse.unreadRadiance} Prospect message${pulse.unreadRadiance === 1 ? '' : 's'} waiting` : 'Connection active'}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-400">Prospect → Bridge Radiance → Crossing → Client continuity → company record remains one Bridger movement.</p>
              </section>

              <ClientBuildPull role="bridger" />

              <Link href="/bridger/dashboard" className="group flex items-center justify-between border-y border-white/10 py-3 text-xs font-black text-white transition hover:border-emerald-300/20">
                WEAVE World <ArrowRight className="h-4 w-4 text-emerald-300 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
