'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, BookOpen, BriefcaseBusiness, Building2,
  CheckCircle2, Compass, FolderOpen, House, Network, Search, ShieldCheck,
  Sparkles, WalletCards, type LucideIcon,
} from 'lucide-react'
import { WeaveLogo } from '@/components/weave-logo'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import {
  BRIDGER_WORKPLACE_SPACES,
  type BridgerWorkplaceAccess,
  type BridgerWorkplacePlace,
  type BridgerWorkplaceSpaceId,
} from '@/lib/bridger-workplace-catalog'

const ICONS: Record<BridgerWorkplaceSpaceId, LucideIcon> = {
  desk: House,
  outreach: Network,
  employment: BriefcaseBusiness,
  records: WalletCards,
  company: Building2,
}

const ACCESS: Record<Exclude<BridgerWorkplaceAccess, 'core'>, string> = {
  lifestyle: 'Lifestyle eligibility',
  approval: 'Approval or appointment may be required',
  preview: 'Not yet live',
}

const BEGIN = [
  {
    title: 'Learn your position',
    detail: 'Read the human-first crossing process once. Return whenever you need it.',
    href: '/bridger/crossing-notebook',
    icon: BookOpen,
  },
  {
    title: 'Choose an outreach method',
    detail: 'Start from available prospects, your social presence or another authorized channel.',
    href: '/weave/market/prospects',
    icon: Network,
  },
  {
    title: 'Continue a real conversation',
    detail: 'Use your established channels and Bridge AI only when the person wants to continue.',
    href: '/communications',
    icon: ArrowRight,
  },
] as const

function PlaceLink({place}:{place:BridgerWorkplacePlace}){
  const label = place.access && place.access !== 'core' ? ACCESS[place.access] : null
  return (
    <Link
      href={place.href}
      className="group flex h-full min-h-[142px] flex-col justify-between rounded-[1.2rem] border border-[#dccba8]/70 bg-white/85 p-4 text-[#1c2c39] shadow-[0_8px_25px_rgba(90,68,20,.07)] transition duration-200 hover:-translate-y-0.5 hover:border-[#ba9551] hover:shadow-[0_15px_32px_rgba(90,68,20,.13)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9d7124]"
      data-bridger-place={place.href}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug">{place.label}</h3>
        <ArrowUpRight className="h-5 w-5 shrink-0 text-[#aa7a28] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/>
      </div>
      <p className="mt-2 flex-1 text-sm leading-5 text-[#4c5a61]">{place.detail}</p>
      {label && (
        <p className="mt-3 border-t border-[#e9dcc2] pt-2 text-xs font-medium text-[#896423]">{label}</p>
      )}
    </Link>
  )
}

/**
 * A clear entrance to pre-existing systems. Records and business operations
 * remain owned by their original pages and APIs. The legacy world is available
 * through the supplied onOpenDistricts action.
 */
export function BridgerWorkplace({
  userName,
  onOpenDistricts,
}:{
  userName?: string | null
  onOpenDistricts?: () => void
}){
  const [selected, setSelected] = useState<BridgerWorkplaceSpaceId>('desk')
  const [search, setSearch] = useState('')
  const { isVisible } = useEnvironmentOrganizer()

  const space = BRIDGER_WORKPLACE_SPACES.find(item => item.id === selected) || BRIDGER_WORKPLACE_SPACES[0]
  const trimmedSearch = search.trim().toLowerCase()

  const places = useMemo(() => {
    const all = trimmedSearch
      ? BRIDGER_WORKPLACE_SPACES.flatMap(item => item.places)
      : space.places
    const matched = all.filter(item => isVisible(item.href) && (!trimmedSearch ||
      [item.label, item.detail, item.href].some(value => value.toLowerCase().includes(trimmedSearch))))
    // Several destinations intentionally link to the same operating system.
    // A search shows it once while retaining each original route.
    return trimmedSearch ? matched.filter((item, index) =>
      matched.findIndex(other => other.href === item.href) === index) : matched
  }, [isVisible, space, trimmedSearch])

  return (
    <main
      className="relative mx-auto min-h-[calc(100svh-4rem)] w-full max-w-[1500px] overflow-hidden bg-[#f9f6ef] pb-20 text-[#1c2c39]"
      data-bridger-workplace="five-destinations"
      data-bridger-workplace-preserves="existing-routes-and-records"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[440px] bg-[radial-gradient(circle_at_78%_18%,rgba(229,192,117,.3),transparent_36%),radial-gradient(circle_at_9%_28%,rgba(156,193,199,.22),transparent_38%)]"/>
      <div className="relative z-10 px-4 pt-6 sm:px-8 sm:pt-10 lg:px-12">
        <header className="overflow-hidden rounded-[1.6rem] border border-[#d6bf8e]/75 bg-gradient-to-br from-[#fffcf7] via-[#fcf5e7] to-[#eaf2f1] p-5 shadow-[0_18px_55px_rgba(87,65,29,.11)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <WeaveLogo size="sm"/>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[.16em] text-[#916a25]">Hope Department · Bridger Presence</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Your company workplace{userName ? <span className="block mt-1 text-lg font-normal text-[#576872] sm:text-xl">{userName}</span> : null}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4c5a61] sm:text-base">
                Introduce people to what Weave makes possible. Understand their existing work,
                choose the right outreach instrument, and support willing participants through System Switch.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/bridger/presence" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#cdb780] bg-white/80 px-4 py-2 text-sm font-semibold text-[#655020]">
                <Compass className="h-4 w-4"/> Position guidance
              </Link>
              {onOpenDistricts && (
                <button type="button" onClick={onOpenDistricts}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#cdb780] bg-white/80 px-4 py-2 text-sm font-semibold text-[#655020]">
                  <FolderOpen className="h-4 w-4"/> Original districts
                </button>
              )}
            </div>
          </div>
        </header>

        <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Bridger workplace destinations">
          {BRIDGER_WORKPLACE_SPACES.map(item => {
            const Icon = ICONS[item.id]
            const active = selected === item.id && !trimmedSearch
            return (
              <button key={item.id} type="button" aria-pressed={active}
                onClick={() => { setSearch(''); setSelected(item.id) }}
                className={`flex min-h-16 items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#956c2d] ${active ? 'border-[#a7803c] bg-[#e9d7ab] text-[#493711] shadow-sm' : 'border-[#dbcfb6] bg-white/85 text-[#344656] hover:border-[#ba9b5c]'}`}>
                <Icon className="h-5 w-5 shrink-0"/>
                <span>{item.shortName}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-5 rounded-2xl border border-[#dac99e] bg-white/85 p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#946b29]">Your working environment</p>
              <h2 className="mt-1 text-2xl font-semibold">{trimmedSearch ? 'Search results' : space.name}</h2>
              <p className="mt-2 text-sm leading-6 text-[#4b5d65]">{trimmedSearch ? 'Matching existing Weave workstations are shown below.' : space.description}</p>
            </div>
            <label className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-[#d9c7a0] bg-[#fffdf9] px-3 sm:w-72">
              <Search className="h-4 w-4 shrink-0 text-[#9b772f]"/>
              <span className="sr-only">Search Bridger workstations</span>
              <input type="search" value={search} onChange={event => setSearch(event.target.value)}
                placeholder="Example: find Clients or send messages" className="w-full bg-transparent py-3 text-sm text-[#263c4c] outline-none placeholder:text-[#75828a]"/>
            </label>
          </div>

          <Link href="/search" data-role-company-search="bridger" className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[#b38b51] bg-white/80 px-4 py-2 text-sm font-semibold text-[#5e4823]">Describe a task instead: find Clients, explain File Folders, or follow a job.</Link>

          {selected === 'desk' && !trimmedSearch && (
            <section className="mt-6 rounded-2xl bg-[#f2f3f0] p-4 sm:p-5" aria-label="How to begin working">
              <div className="flex items-center gap-2 text-[#70551e]"><BookOpen className="h-5 w-5"/><h3 className="text-base font-semibold">How to begin your day</h3></div>
              <p className="mt-1 text-sm leading-6 text-[#53646a]">These are learning steps, not artificial daily targets. Your actual work stays in the corresponding system.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {BEGIN.filter(item => isVisible(item.href)).map((item,index) => {
                  const StepIcon = item.icon
                  return <Link key={item.title} href={item.href} className="group rounded-xl border border-[#dbd3c2] bg-white p-4 text-[#243741] transition hover:border-[#b6975f]">
                    <div className="flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2e3c1] text-sm font-bold text-[#76591f]">{index+1}</span>
                      <StepIcon className="h-5 w-5 text-[#a57d31]"/>
                    </div>
                    <p className="mt-3 text-base font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-5 text-[#516269]">{item.detail}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#855f20]">Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1"/></span>
                  </Link>
                })}
              </div>
            </section>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-bridger-workplace-links>
            {places.map((place,index) => <PlaceLink key={place.href + '-' + index} place={place}/>)}
          </div>
          {places.length === 0 && (
            <p className="mt-5 rounded-xl border border-[#dfd4bc] bg-[#fbf6eb] p-5 text-sm text-[#665a43]">
              No visible workstations match that search. Try a different name or check Company Guidance.
            </p>
          )}
        </div>

        <footer className="mt-5 grid gap-3 rounded-2xl border border-[#e0d1af] bg-[#fffaf0] p-5 text-sm text-[#4b5a61] md:grid-cols-2">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#94712f]"/>
            <p><strong className="text-[#263943]">Your core Bridger position has no recurring subscription.</strong> Optional instruments and Lifestyle specializations disclose their own costs and access rules.</p>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#94712f]"/>
            <p><strong className="text-[#263943]">Nothing has been moved out of its original system.</strong> Prospect records, Client assistance, job records and payments remain with the existing Weave pages and APIs.</p>
          </div>
        </footer>
        <div className="mt-5 flex items-center gap-2 text-xs text-[#65717a]">
          <Sparkles className="h-4 w-4 text-[#ad873b]"/>
          Echo and Company Guidance remain available when a task needs explanation.
        </div>
      </div>
    </main>
  )
}
