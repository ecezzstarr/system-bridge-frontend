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
  Globe,
  Globe2,
  Headphones,
  MessageSquare,
  Network,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Trophy,
  UserCircle,
  Users,
  Video,
  Wallet,
} from 'lucide-react'
import { DailyProspectClaim } from '@/components/bridger/daily-prospect-claim'
import { getAuthHeaders } from '@/lib/auth-client'
import { WEAVE_SYSTEM_MAP } from '@/lib/weave-system-map'
import { ClientBuildPull } from '@/components/world/client-build-pull'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import { WeaveRouteNetwork, type WeaveRouteTone } from '@/components/world/weave-route-network'

const commands = [
  { label: 'Company Loops', detail: 'Shared company movement and current participation.', href: '/company/loops', icon: Network, district: 'Shared WEAVE' },
  { label: 'Human Cadences', detail: 'Find people through recorded participation and movement.', href: '/search', icon: MessageSquare, district: 'Shared WEAVE' },
  { label: 'Presences', detail: 'See people and their place in the WEAVE.', href: '/profiles', icon: UserCircle, district: 'Shared WEAVE' },
  { label: 'Private Lounge', detail: 'Private WEAVE communication.', href: '/lounge?view=private', icon: Shield, district: 'Shared WEAVE' },
  { label: 'Lounge', detail: 'Shared WEAVE communication space.', href: '/lounge', icon: MessageSquare, district: 'Shared WEAVE' },
  { label: WEAVE_SYSTEM_MAP.language.marketplace, detail: 'Enterprise-scale systems available through WEAVE.', href: '/marketplace', icon: Store, district: 'Shared WEAVE' },
  { label: 'Echo', detail: 'Use the WEAVE Echo surface.', href: '/echo', icon: Sparkles, district: 'Shared WEAVE' },
  { label: 'Stream', detail: 'Shared WEAVE media stream.', href: '/video-feed', icon: Video, district: 'Shared WEAVE' },
  { label: 'Standing', detail: 'Shared WEAVE standing and position.', href: '/weave/standing', icon: Globe, district: 'Shared WEAVE' },
  { label: 'Bridge AI Paths', detail: 'Crossing → Client AI support.', href: '/bridger/bridge-ai', icon: Bot, district: 'Crossing' },
  { label: 'Prospect Market', detail: 'Acquire available Prospect movement.', href: '/weave/market/prospects', icon: ShoppingBag, district: 'Crossing' },
  { label: 'My Clients', detail: 'Client continuity and service channels.', href: '/bridger/clients', icon: Users, district: 'Client continuity' },
  { label: 'Bridge Plaza', detail: 'Enter shared Client worlds as support.', href: '/weave', icon: Globe2, district: 'Client continuity' },
  { label: 'Bridger Continuance', detail: 'Partnership renewal and standing.', href: '/bridger/subscription', icon: ShieldCheck, district: 'Company continuity' },
  { label: 'Company Guidance', detail: 'Internal company support and clarification.', href: '/company-chat', icon: Headphones, district: 'Company continuity' },
  { label: WEAVE_SYSTEM_MAP.language.wallet, detail: 'Operational holding and funds.', href: '/wallet', icon: Wallet, district: 'Company continuity' },
  { label: WEAVE_SYSTEM_MAP.language.ledger, detail: 'Preserved movement and value record.', href: '/ledger', icon: BookOpen, district: 'Company continuity' },
  { label: 'Company Loops', detail: 'Current company movement and participation.', href: '/company/loops', icon: Network, district: 'Participation' },
  { label: 'Loop 1 Ground', detail: 'Current event movement.', href: '/event', icon: Flame, district: 'Participation' },
  { label: 'Arena', detail: 'Participant contest.', href: '/arena', icon: Gamepad2, district: 'Participation' },
  { label: 'Casino', detail: 'System pattern play.', href: '/casino', icon: Trophy, district: 'Participation' },
  { label: 'Lounge', detail: 'Shared WEAVE communication space.', href: '/lounge', icon: MessageSquare, district: 'Participation' },
]

const DISTRICT_ROUTE_TONE:Record<string,WeaveRouteTone>={
  'Shared WEAVE':'sky',
  'Crossing':'amber',
  'Client continuity':'emerald',
  'Company continuity':'violet',
  'Participation':'cyan',
}

export function BridgerOperatingEnvironment() {
  const [referral,setReferral]=useState<any>(null)
  const { isVisible, orderFor } = useEnvironmentOrganizer()
  const visibleCommands = commands.filter(item => isVisible(item.href)).sort((a,b)=>orderFor(a.href)-orderFor(b.href))
  const stations=visibleCommands.map(item=>({...item,tone:DISTRICT_ROUTE_TONE[item.district]||'sky' as WeaveRouteTone}))

  useEffect(()=>{
    fetch('/api/bridger/referral-commissions',{headers:getAuthHeaders()})
      .then(async response=>response.ok?response.json():null)
      .then(data=>data&&setReferral(data))
      .catch(()=>{})
  },[])

  const referralLink=referral?.referralLink
    ? (typeof window!=='undefined' ? window.location.origin : '') + referral.referralLink
    : ''

  return (
    <main className="mx-auto w-full max-w-[1500px] p-0 sm:p-3 md:p-6">
      <section className="weave-system-depth weave-operating-environment overflow-hidden border-y border-emerald-300/15 bg-[#03100f]/82 backdrop-blur-xl sm:rounded-[2rem] sm:border">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_10%_0%,rgba(52,211,153,.13),transparent_36%),radial-gradient(circle_at_90%_0%,rgba(56,189,248,.08),transparent_30%)] p-5 md:p-7">
          <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">Bridger Operating Room</p>
          <h1 data-weave-live-word="title" className="mt-2 text-2xl font-black text-white md:text-3xl">Connection carried in the right order.</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
            The Bridger is a WEAVE partner who opens and maintains the human connection. The central panel keeps Prospect movement, Client continuity, partnership work and records together while the Client remains the player.
          </p>
        </header>

        <div className="grid min-h-[620px] xl:grid-cols-[minmax(0,1fr)_250px]">
          <section className="min-w-0 border-b border-white/[0.07] p-4 md:p-6 xl:border-b-0 xl:border-r">
            <section className="border-b border-amber-300/15 pb-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <Network className="mt-0.5 h-5 w-5 text-amber-300"/>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Prospect intake dock</p>
                    <p data-weave-live-word="station" className="mt-1 text-sm font-black text-white">Daily Prospect movement</p>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">Prospect intake is a live station in the Bridger environment. It is not repeated as an advertisement elsewhere.</p>
                  </div>
                </div>
                <span className="border-l border-amber-300/20 pl-3 text-[8px] font-black uppercase tracking-[0.14em] text-amber-200">Crossing route</span>
              </div>
              <div className="mt-4" data-weave-station="prospect-intake"><DailyProspectClaim/></div>
            </section>

            <div className="mt-5">
              <WeaveRouteNetwork
                stations={stations}
                title="Bridger route network"
                detail="Crossing, Client continuity, company continuity and participation remain lanes in one Bridger environment."
              />
            </div>
          </section>

          <aside className="bg-black/10 p-4 md:p-5">
            <div className="sticky top-20 space-y-6">
              <section className="border-l border-sky-300/20 pl-4">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4 text-sky-300"/>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Referral continuity</p>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-400">Invite another Bridger through the recorded partnership route.</p>
                {referralLink&&<input readOnly value={referralLink} className="mt-3 w-full border-b border-white/10 bg-transparent px-0 py-2 text-[10px] font-semibold text-white outline-none"/>}
                <div className="mt-4 grid grid-cols-2 divide-x divide-white/10 border-y border-white/10 py-3 text-center">
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-slate-500">Referred</p>
                    <p className="mt-1 text-lg font-black text-white">{referral?.referralCount??0}</p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-slate-500">Earnings</p>
                    <p className="mt-1 text-sm font-black text-emerald-200">{referral?.referralEarnings??0} TRX</p>
                  </div>
                </div>
              </section>

              <section className="border-l border-emerald-300/20 pl-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-300"/>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">System pulse</p>
                </div>
                <p data-weave-live-word="station" className="mt-3 text-sm font-black text-white">Connection active</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">Crossing → Client continuity → company record remains one Bridger movement.</p>
              </section>

              <ClientBuildPull role="bridger" />

              <Link href="/bridger/dashboard" className="group flex items-center justify-between border-y border-white/10 py-3 text-xs font-black text-white transition hover:border-emerald-300/20">
                WEAVE World <ArrowRight className="h-4 w-4 text-emerald-300 transition group-hover:translate-x-1"/>
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
