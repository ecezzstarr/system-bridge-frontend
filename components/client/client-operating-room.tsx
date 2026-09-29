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
  const stations=commands.map(item=>({...item,tone:ROUTE_TONE[item.tone]}))

  return (
    <main className="mx-auto w-full max-w-[1500px] p-0 sm:p-3 md:p-6" data-operating-room="client">
      <section className="weave-system-depth weave-operating-environment min-h-[620px] overflow-hidden border-y border-sky-300/15 bg-[#030a15]/82 p-4 backdrop-blur-xl sm:rounded-[2rem] sm:border md:p-6">
        <WeaveRouteNetwork
          stations={stations}
          title="Client operating routes"
          detail="Enter the File Folder, value, support, participation or enterprise station directly from the Client Operating Room."
        />
        <Link href="/client/dashboard" className="mt-6 inline-flex items-center gap-2 border-y border-white/10 py-3 text-xs font-black text-white">
          Client World <ArrowRight className="h-4 w-4 text-sky-300"/>
        </Link>
      </section>
    </main>
  )
}
