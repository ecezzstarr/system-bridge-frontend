'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Bot, CircleDollarSign, Flame } from 'lucide-react'
import { getRolePlaces } from '@/lib/weave-role-districts'
import { getAuthHeaders } from '@/lib/auth-client'
import { ClientBuildPull } from '@/components/world/client-build-pull'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import { WeaveRouteNetwork, type WeaveRouteTone } from '@/components/world/weave-route-network'
import { visiblePoll } from '@/lib/visible-poll'

const commands = getRolePlaces('bridger').map(item=>({...item,icon:Bot}))

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
  bridgeAiContinuance: string
  bridgeAiExpiry: string | null
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
  bridgeAiContinuance: 'inactive',
  bridgeAiExpiry: null,
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
    const [daily, radiance, clients, numbers, continuance, bridgeAi] = await Promise.allSettled([
      readJson('/api/bridger/daily-prospect', signal),
      readJson('/api/bridger/support-inbox', signal),
      readJson('/api/bridger/clients', signal),
      readJson('/api/bridger/numbers', signal),
      readJson('/api/bridger/subscription', signal),
      readJson('/api/bridger/bridge-ai/subscribe', signal),
    ])

    const dailyData = daily.status === 'fulfilled' ? daily.value : null
    const radianceData = radiance.status === 'fulfilled' ? radiance.value : null
    const clientsData = clients.status === 'fulfilled' ? clients.value : null
    const numbersData = numbers.status === 'fulfilled' ? numbers.value : null
    const continuanceData = continuance.status === 'fulfilled' ? continuance.value : null
    const bridgeAiData = bridgeAi.status === 'fulfilled' ? bridgeAi.value : null

    const bridgerThreads = Array.isArray(radianceData?.threads)
      ? radianceData.threads.filter((thread: any) => thread.position === 'bridger')
      : []
    const activeOrders = Array.isArray(numbersData?.orders)
      ? numbersData.orders.filter((order: any) => ['requested', 'fulfilling'].includes(String(order.status)))
      : []
    const standing = continuanceData?.continuance || continuanceData?.subscription
    const bridgeAiStanding = bridgeAiData?.subscription
    const bridgeAiActive = Boolean(
      bridgeAiStanding?.status === 'active'
      && bridgeAiStanding?.expiry
      && new Date(bridgeAiStanding.expiry) > new Date()
    )
    if (signal?.aborted) return

    setPulse(prev => ({
      dailyClaimed: dailyData ? Boolean(dailyData.claimed) : prev.dailyClaimed,
      radianceThreads: radianceData ? bridgerThreads.length : prev.radianceThreads,
      unreadRadiance: radianceData ? bridgerThreads.reduce((sum: number, thread: any) => sum + (Number(thread.unreadCount) || 0), 0) : prev.unreadRadiance,
      clients: clientsData && Array.isArray(clientsData.clients) ? clientsData.clients.length : prev.clients,
      ownedNumbers: numbersData && Array.isArray(numbersData.mine) ? numbersData.mine.length : prev.ownedNumbers,
      activeNumberOrders: numbersData ? activeOrders.length : prev.activeNumberOrders,
      continuance: standing?.subscription_status ? String(standing.subscription_status) : prev.continuance,
      bridgeAiContinuance: bridgeAiData
        ? (bridgeAiActive ? 'active' : bridgeAiStanding?.status === 'active' ? 'expired' : String(bridgeAiStanding?.status || 'inactive'))
        : prev.bridgeAiContinuance,
      bridgeAiExpiry: bridgeAiStanding?.expiry ? String(bridgeAiStanding.expiry) : prev.bridgeAiExpiry,
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
    {
      label: 'Bridge AI Subscription',
      value: pulse.bridgeAiContinuance.toUpperCase(),
      detail: pulse.bridgeAiContinuance === 'active'
        ? `Bridge AI paths active${pulse.bridgeAiExpiry ? ` until ${new Date(pulse.bridgeAiExpiry).toLocaleDateString()}` : ''}.`
        : '15 Flame Coin/month is required to open and maintain Bridge AI crossing paths.',
      href: '/bridger/bridge-ai',
      tone: pulse.bridgeAiContinuance === 'active' ? 'text-emerald-200' : 'text-amber-200',
    },
  ]

  return (
    <main className="mx-auto w-full max-w-[1500px] p-0 sm:p-3 md:p-6" data-operating-room="bridger">
      <section className="weave-system-depth weave-operating-environment overflow-hidden border-y border-emerald-300/15 bg-[#03100f]/82 backdrop-blur-xl sm:rounded-[2rem] sm:border">
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


            <div className="mt-5">
              <WeaveRouteNetwork
                stations={stations}
                title="Bridger operating routes"
                detail="Acquire prospects, continue conversations and support their crossing into Client File Folders."
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
