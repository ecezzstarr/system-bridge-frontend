'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  Activity,
  ArrowRight,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Cloud,
  CreditCard,
  FileBox,
  FileCheck,
  Flame,
  Gamepad2,
  Gauge,
  GitBranch,
  Globe,
  Headphones,
  Landmark,
  LayoutTemplate,
  MessageSquare,
  Network,
  Palette,
  Radio,
  Rocket,
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
  Zap,
} from 'lucide-react'
import { WEAVE_SYSTEM_MAP } from '@/lib/weave-system-map'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import { WeaveRouteNetwork, type WeaveRouteTone } from '@/components/world/weave-route-network'

type Role = 'agent' | 'admin'

type FunctionItem = {
  label: string
  detail: string
  href: string
  icon: ComponentType<{ className?: string }>
  district: string
}

const OPERATING_SEQUENCE = {
  agent: [
    { title: 'Agent' },
  ],
  admin: [
    { title: 'Shared WEAVE' },
    { title: 'Operations center' },
    { title: 'People + recognition' },
    { title: 'Client system' },
    { title: 'Bridge system' },
    { title: 'Institution + infrastructure' },
    { title: 'Atmosphere + communication' },
  ],
} as const

const AGENT_COMMANDS: FunctionItem[] = [
  { label: 'Agility', detail: 'Operate Agility distribution and sales movement.', href: '/agility', icon: ShoppingBag, district: 'Agent' },
  { label: 'Prospect Commissions', detail: 'Commission earned from Bridger Prospect purchases.', href: '/agent/commissions', icon: Gauge, district: 'Agent' },
]

const ADMIN_COMMANDS: FunctionItem[] = [
  { label: 'Company Loops', detail: 'Shared company movement visible across WEAVE.', href: '/company/loops', icon: GitBranch, district: 'Shared WEAVE' },
  { label: 'Human Cadences', detail: 'Find people through their recorded participation and movement.', href: '/search', icon: MessageSquare, district: 'Shared WEAVE' },
  { label: 'Presences', detail: 'See people and their place in the WEAVE.', href: '/profiles', icon: UserCircle, district: 'Shared WEAVE' },
  { label: 'Bridge Plaza', detail: 'Enter the shared WEAVE world and Client support entrance.', href: '/weave', icon: Landmark, district: 'Shared WEAVE' },
  { label: 'Company Guidance', detail: 'Use the shared company clarification channel.', href: '/company-chat', icon: Headphones, district: 'Shared WEAVE' },
  { label: 'Private Lounge', detail: 'Enter private WEAVE communication.', href: '/lounge?view=private', icon: Shield, district: 'Shared WEAVE' },
  { label: 'Lounge', detail: 'Enter the shared WEAVE communication space.', href: '/lounge', icon: MessageSquare, district: 'Shared WEAVE' },
  { label: WEAVE_SYSTEM_MAP.language.marketplace, detail: 'Access enterprise-scale systems available through WEAVE.', href: '/marketplace', icon: Store, district: 'Shared WEAVE' },
  { label: 'Echo', detail: 'Use the WEAVE Echo surface.', href: '/echo', icon: Sparkles, district: 'Shared WEAVE' },
  { label: 'Contest', detail: 'Enter shared participant contest movement.', href: '/arena', icon: Gamepad2, district: 'Shared WEAVE' },
  { label: 'Pattern', detail: 'Enter shared system pattern play.', href: '/casino', icon: Trophy, district: 'Shared WEAVE' },
  { label: 'Stream', detail: 'Enter the shared WEAVE media stream.', href: '/video-feed', icon: Video, district: 'Shared WEAVE' },
  { label: 'Standing', detail: 'See shared WEAVE standing and position.', href: '/weave/standing', icon: Globe, district: 'Shared WEAVE' },
  { label: 'Loop 1 Ground', detail: 'Enter the current shared WEAVE event ground.', href: '/event', icon: Flame, district: 'Shared WEAVE' },
  { label: WEAVE_SYSTEM_MAP.language.wallet, detail: 'Administration holding inside the same value system used across WEAVE.', href: '/wallet', icon: Wallet, district: 'Shared WEAVE' },
  { label: WEAVE_SYSTEM_MAP.language.ledger, detail: 'Administration record inside the same preserved movement system used across WEAVE.', href: '/ledger', icon: BookOpen, district: 'Shared WEAVE' },
  { label: 'Receipts', detail: 'Receipts issued for Administration value movement.', href: '/receipts', icon: FileCheck, district: 'Shared WEAVE' },

  { label: 'Administration Control Center', detail: 'Open the preserved dense Administration center and its live embedded components.', href: '/admin/control-center', icon: ShieldCheck, district: 'Operations center' },
  { label: 'Administration Wallet', detail: 'Platform balances, deposit, withdrawal and participation controls.', href: '/admin/control-center#wallet', icon: Wallet, district: 'Operations center' },
  { label: 'Administration Workshops', detail: 'Developer, Authority, AI Registry, EIGHT Dev Core and event workshop access.', href: '/admin/control-center#workshops', icon: Rocket, district: 'Operations center' },
  { label: 'User Management', detail: 'Manage users, departments, roles and Bridger-to-Agent assignment.', href: '/admin/control-center#users', icon: Users, district: 'Operations center' },
  { label: 'Department Authorization', detail: 'Open the embedded departmental authorization component.', href: '/admin/control-center#departmental', icon: Network, district: 'Operations center' },
  { label: 'File Number Registry', detail: 'Open the existing File Number Engine component and registry history.', href: '/admin/control-center#fne', icon: FileBox, district: 'Operations center' },
  { label: 'Bridger Operations', detail: 'Open Bridger operations, standing and exemption controls.', href: '/admin/control-center#bridgers', icon: Users, district: 'Operations center' },
  { label: 'Client Communications', detail: 'Open the existing Client communications panel.', href: '/admin/control-center#clients', icon: MessageSquare, district: 'Operations center' },
  { label: 'OPay Deposit Review', detail: 'Review and decide pending OPay deposits.', href: '/admin/control-center#deposits', icon: CreditCard, district: 'Operations center' },
  { label: 'TRON Deposit Review', detail: 'Review and decide pending TRON deposits.', href: '/admin/control-center#tron', icon: Wallet, district: 'Operations center' },
  { label: 'Bridge Deposit Review', detail: 'Review Bridge AI and File Folder deposit movement.', href: '/admin/control-center#bridge', icon: Landmark, district: 'Operations center' },
  { label: 'Withdrawal Review', detail: 'Review and decide pending withdrawal requests.', href: '/admin/control-center#withdrawals', icon: Wallet, district: 'Operations center' },
  { label: 'Announcements', detail: 'Send role-targeted WEAVE announcements and update notices.', href: '/admin/control-center#announcements', icon: Radio, district: 'Operations center' },
  { label: 'EIGHT AI', detail: 'Direct Administration interaction with EIGHT and its Scroll.', href: '/admin/control-center#eight', icon: Bot, district: 'Operations center' },
  { label: 'Users & Participants', detail: 'People active across the WEAVE institution.', href: '/admin/control-center#users', icon: Users, district: 'People + recognition' },
  { label: 'Clients', detail: 'Client records and participation oversight.', href: '/admin/control-center#clients', icon: BriefcaseBusiness, district: 'People + recognition' },
  { label: 'Verify Continuances', detail: 'Review Bridger continuance and standing.', href: '/admin/control-center#bridgers', icon: FileCheck, district: 'People + recognition' },
  { label: 'Verification Center', detail: 'Administrative verification and review controls.', href: '/admin/control-center#users', icon: ShieldCheck, district: 'People + recognition' },
  { label: 'Departmental Registration', detail: 'Departmental codes and company placement.', href: '/admin/departmental-registration', icon: Network, district: 'People + recognition' },
  { label: 'Agent Channel Requests', detail: 'Approve Agent service channels.', href: '/admin/agent-channels', icon: Users, district: 'People + recognition' },

  { label: 'File Number Engine', detail: 'Issue and administer Client File Numbers.', href: '/admin/file-number-engine', icon: FileBox, district: 'Client system' },
  { label: 'Message Hub', detail: 'People, Client and staff communication.', href: '/admin/hub', icon: MessageSquare, district: 'Client system' },
  { label: 'Client Messages', detail: 'Direct Client communication records.', href: '/admin/client-messages', icon: MessageSquare, district: 'Client system' },
  { label: 'Client Deposits', detail: 'Review Client funding requests.', href: '/admin/client-deposits', icon: Wallet, district: 'Client system' },
  { label: 'Client Vaults', detail: 'Administer Client vault movement.', href: '/admin/client-vault', icon: ShieldCheck, district: 'Client system' },
  { label: 'Client Build Catalog', detail: 'Control Client build systems and pricing.', href: '/admin/client-build-catalog', icon: FileBox, district: 'Client system' },
  { label: 'Enterprise Dream', detail: 'Lord/Lady elevation and enterprise plans.', href: '/admin/enterprise-dream', icon: BriefcaseBusiness, district: 'Client system' },
  { label: 'Payments', detail: 'Institutional payment administration.', href: '/admin/payments', icon: CreditCard, district: 'Client system' },
  { label: 'Subscriptions', detail: 'Subscription and continuance administration.', href: '/admin/subscriptions', icon: CreditCard, district: 'Client system' },

  { label: 'Prospect Engine', detail: 'Create and organize Prospect movement.', href: '/admin/prospect-engine', icon: Zap, district: 'Bridge system' },
  { label: 'Bridge Templates', detail: 'Control Bridge AI crossing templates.', href: '/admin/bridge-templates', icon: FileCheck, district: 'Bridge system' },
  { label: 'Bridge AI Continuity', detail: 'Review Client Bridge AI support insight.', href: '/admin/bridge-ai', icon: Bot, district: 'Bridge system' },
  { label: 'Fulfillment Agent', detail: 'Authorized outreach and delivery movement.', href: '/admin/outreach', icon: ShieldCheck, district: 'Bridge system' },
  { label: 'Agility Fulfillment', detail: 'Administer Agility orders and fulfillment.', href: '/admin/agility', icon: ShoppingBag, district: 'Bridge system' },

  { label: 'Authority Workshop', detail: 'Institutional structures and authority.', href: '/authority/workshops', icon: Shield, district: 'Institution + infrastructure' },
  { label: 'Development Foundry', detail: 'Eight and persistent coding agents developing WEAVE against the real source.', href: '/admin/development-agents', icon: Rocket, district: 'Institution + infrastructure' },
  { label: 'Developer Workshop', detail: 'Develop and refine WEAVE systems.', href: '/admin/dev-workshop', icon: Rocket, district: 'Institution + infrastructure' },
  { label: 'Origin Systems', detail: 'Inspect origin runtime and system foundations.', href: '/admin/origin-systems', icon: Cloud, district: 'Institution + infrastructure' },
  { label: 'Enterprise Systems Workshop', detail: 'Million-scale software, hardware and infrastructure systems.', href: '/admin/enterprise-systems', icon: Cloud, district: 'Institution + infrastructure' },
  { label: 'Infrastructure', detail: 'Cloud Run, runtime and maintenance control.', href: '/admin/infrastructure', icon: Cloud, district: 'Institution + infrastructure' },
  { label: 'Visual Systems · Interaction in Motion', detail: 'Govern live Flame, River, route current, emergence and visual runtime with history and rollback.', href: '/admin/visual-systems', icon: Palette, district: 'Institution + infrastructure' },
  { label: 'Environment Organizer', detail: 'Withdraw, restore and reorder registered cards and pages without deleting source.', href: '/admin/environment-organizer', icon: LayoutTemplate, district: 'Institution + infrastructure' },
  { label: 'Loop Workshop', detail: 'Create and publish company loops.', href: '/admin/loop-workshop', icon: Network, district: 'Atmosphere + communication' },
  { label: 'DJ Workshop', detail: 'System sound and live atmosphere.', href: '/admin/dj-workshop', icon: Radio, district: 'Atmosphere + communication' },
  { label: 'Ad Workshop', detail: 'Role-targeted communication without deployment.', href: '/admin/ad-workshop', icon: MessageSquare, district: 'Atmosphere + communication' },
  { label: 'Campaign Flame', detail: 'Campaign construction and coordinated movement.', href: '/admin/campaign-flame', icon: Flame, district: 'Atmosphere + communication' },
  { label: 'Flame Event · Loop 1', detail: 'Event-world control and opening movement.', href: '/admin/flame-event', icon: Zap, district: 'Atmosphere + communication' },
]

const DISTRICT_ROUTE_TONE:Record<string,WeaveRouteTone>={
  'Agent':'emerald',
  'Shared WEAVE':'sky',
  'Bridger participation':'emerald',
  'Stability movement':'amber',
  'Client + company support':'cyan',
  'Record + value':'violet',
  'Operations center':'violet',
  'People + recognition':'emerald',
  'Client system':'amber',
  'Bridge system':'sky',
  'Institution + infrastructure':'cyan',
  'Atmosphere + communication':'rose',
}

const ROLE_COPY = {
  agent: {
    eyebrow: 'Agent',
    title: 'Agility and Prospect commissions.',
    detail: 'The Agent account has two working places: Agility and commission created by Bridger Prospect purchases.',
    commands: AGENT_COMMANDS,
    panelTitle: 'Agent',
    panelDetail: 'Two functions only.',
  },
  admin: {
    eyebrow: 'A Cat · Administration Department',
    title: 'The institution operating as one system.',
    detail: 'Administration remains inside the same WEAVE used by every participant. Its Operating Room begins with shared WEAVE, preserves the dense Administration control center already present in the codebase, then adds the newer institutional control surfaces.',
    commands: ADMIN_COMMANDS,
    panelTitle: 'Administration Control Panel',
    panelDetail: 'The middle panel is the Administration working center: shared WEAVE first, the preserved live control-center components next, then the newer Administration instruments for Clients, Bridge movement, infrastructure, workshops, finance, communication and events.',
  },
} as const

export function RoleOperatingRoom({ role }: { role: Role }) {
  const copy = ROLE_COPY[role]
  const { isVisible, orderFor } = useEnvironmentOrganizer()
  const sequence = OPERATING_SEQUENCE[role]
  const districtRank = new Map(sequence.map((item,index)=>[item.title,index]))
  const visibleCommands = copy.commands.filter(item => isVisible(item.href)).sort((a,b)=>{
    const districtDelta=(districtRank.get(a.district as any)??999)-(districtRank.get(b.district as any)??999)
    return districtDelta || (orderFor(a.href)-orderFor(b.href))
  })
  const stations=visibleCommands.map(item=>({
    ...item,
    tone:DISTRICT_ROUTE_TONE[item.district]||'sky' as WeaveRouteTone,
  }))

  return (
    <main className="relative mx-auto w-full max-w-[1500px] p-0 sm:p-3 md:p-6" data-operating-room={role}>
      <section className="weave-system-depth weave-operating-environment relative overflow-hidden border-y border-sky-300/15 bg-[#030a15]/74 shadow-[0_32px_100px_rgba(2,8,23,.38)] backdrop-blur-xl sm:rounded-[2rem] sm:border">
        <div className={role==='agent'?'grid min-h-[560px] xl:grid-cols-[minmax(0,1fr)_250px]':'min-h-[560px]'}>
          <section className="min-w-0 p-4 md:p-6">
            <WeaveRouteNetwork
              stations={stations}
              title={role==='admin'?'Administration operating routes':'Agent operating routes'}
              detail="Enter a working station directly. The Operating Room remains present while the selected function opens."
            />
            <Link
              href={role === 'admin' ? '/admin/dashboard' : '/agent/dashboard'}
              className="mt-6 inline-flex items-center gap-2 border-y border-white/10 py-3 text-xs font-black text-white transition hover:border-sky-300/20"
            >
              Return to WEAVE World
              <ArrowRight className="h-4 w-4 text-sky-300" />
            </Link>
          </section>
        </div>
      </section>
    </main>
  )
}
