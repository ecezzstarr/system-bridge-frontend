'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  CircleDollarSign,
  Phone,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import { WeaveRouteNetwork, type WeaveRouteTone } from '@/components/world/weave-route-network'

const commands = [
  { label: 'Bridge AI', detail: 'Prospect crossing and continuity.', href: '/bridger/bridge-ai', icon: Bot, district: 'Bridger' },
  { label: 'Deposit & Withdrawal', detail: 'Move Flame Coin value into or out of the Bridger account.', href: '/wallet/deposit-withdraw', icon: CircleDollarSign, district: 'Bridger' },
  { label: 'Worldwide Number Bay', detail: 'Purchase and receive authenticated WhatsApp numbers.', href: '/bridger/numbers', icon: Phone, district: 'Bridger' },
  { label: 'Prospect Market', detail: 'Purchase and manage authorized Prospect packages.', href: '/weave/market/prospects', icon: ShoppingBag, district: 'Bridger' },
  { label: 'Echo', detail: 'Operate Echo intelligence and routing.', href: '/echo', icon: Sparkles, district: 'Bridger' },
  { label: 'Presences', detail: 'See recognized people and presences inside WEAVE.', href: '/profiles', icon: Users, district: 'Bridger' },
]

export function BridgerOperatingEnvironment() {
  const { isVisible, orderFor } = useEnvironmentOrganizer()
  const stations = commands
    .filter(item => isVisible(item.href))
    .sort((a, b) => orderFor(a.href) - orderFor(b.href))
    .map(item => ({ ...item, tone: 'sky' as WeaveRouteTone }))

  return (
    <main className="mx-auto w-full max-w-[1200px] p-0 sm:p-3 md:p-6" data-operating-room="bridger">
      <section className="weave-system-depth weave-operating-environment overflow-hidden border-y border-sky-300/15 bg-[#030a15]/78 backdrop-blur-xl sm:rounded-[2rem] sm:border">
        <header className="border-b border-white/10 px-5 py-5 md:px-7">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-300">Bridger</p>
          <h1 className="mt-2 text-2xl font-black text-white">Six places. One account.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Bridge AI, Deposit & Withdrawal, Number Bay, Prospect Market, Echo and Presences are the complete Bridger operating surface.
          </p>
        </header>

        <section className="p-4 md:p-6">
          <WeaveRouteNetwork
            stations={stations}
            title="Bridger places"
            detail="Choose the place required for the current movement."
          />

          <Link
            href="/bridger/dashboard"
            className="mt-6 inline-flex items-center gap-2 border-y border-white/10 py-3 text-xs font-black text-white transition hover:border-sky-300/20"
          >
            Return to Bridger World
            <ArrowRight className="h-4 w-4 text-sky-300" />
          </Link>
        </section>
      </section>
    </main>
  )
}
