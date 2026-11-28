'use client'

import { useMemo, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Flame, ChevronDown, ArrowUpRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { isFlameEventVisualRoute } from '@/lib/weave-visual-theme'
import { usePathname } from 'next/navigation'
import { resolveWeaveEnvironment } from '@/lib/weave-environments'
import { weaveWorldBoundaryForPath } from '@/lib/weave-world-boundary'

const InlineFlame = dynamic(() => import('@/components/personal-flame').then(m => m.PersonalFlame), {
  ssr: false,
  loading: () => <p role="status" className="p-4 text-sm text-muted-foreground">Opening Flame interaction…</p>,
})

/** A deliberate, in-flow environment instrument, not an advertisement or overlay. */
function FlameEnvironmentStation({ title, district, purpose }: { title: string; district: string; purpose: string }) {
  const [opened, setOpened] = useState(false)
  const [activated, setActivated] = useState(false)
  return (
    <section data-weave-flame-presence="integrated" aria-label="Flame environment presence" className="relative mx-2 mb-3 mt-[calc(3.75rem+env(safe-area-inset-top))] min-w-0 rounded-xl border border-amber-600/20 bg-background text-foreground sm:mx-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2 px-3 py-2 sm:px-4">
        <button type="button" aria-expanded={opened} aria-controls="weave-flame-environment-interaction" onClick={() => { setActivated(true); setOpened(value => !value) }} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300"><Flame className="h-5 w-5" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Flame · Presence</span><span className="block truncate text-xs text-muted-foreground">{district} · {title}</span></span>
          <span className="hidden text-xs text-muted-foreground sm:inline">{opened ? 'Close interaction' : 'Speak or direct movement'}</span>
          <ChevronDown aria-hidden="true" className={'h-4 w-4 shrink-0 motion-safe:transition-transform '+(opened?'rotate-180':'')} />
        </button>
        <Link href="/flame" className="flex min-h-11 shrink-0 items-center gap-1 border-l border-border pl-3 text-xs font-medium" aria-label="Enter the full Flame building">Building <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
      </div>
      <div id="weave-flame-environment-interaction" hidden={!opened} className="px-2 pb-2 sm:px-3">
        <p className="px-2 pb-3 text-xs leading-relaxed text-muted-foreground">{purpose}</p>
        {activated && <InlineFlame embedded environmentTitle={title} />}
      </div>
    </section>
  )
}

export function WeaveEnvironmentSurface({
  children,
}: {
  children: ReactNode
  role?: string | null
  userName?: string | null
  compact?: boolean
}) {
  const pathname = usePathname() || '/'
  const { user, isAuthenticated } = useAuth()
  const environment = useMemo(() => resolveWeaveEnvironment(pathname), [pathname])
  const worldLayer = weaveWorldBoundaryForPath(pathname)
  const publicClientGate = ['/client', '/client/login', '/client/register', '/client/pro-verification', '/client/pro-activation'].includes(pathname)
  const showFlame = Boolean(isAuthenticated && user?.id && ['admin','bridger','agent','client'].includes(user.role || '') && pathname !== '/flame' && !publicClientGate && !isFlameEventVisualRoute(pathname) && pathname !== '/system-switch/world' && !pathname.startsWith('/system-switch/world/'))

  return (
    <section
      className="weave-environment-surface relative mx-auto w-full min-w-0 max-w-[1800px] overflow-x-clip"
      data-weave-environment={environment.key}
      data-weave-layer={environment.layer}
      data-environment-location="world-position"
      data-world-stays-mounted="true"
      data-weave-world={worldLayer}
    >
      <div
        className="relative min-h-[calc(100svh-7rem)] min-w-0 pb-[env(safe-area-inset-bottom)] sm:min-h-[calc(100dvh-7rem)]"
        data-environment-interior="station"
        data-ai-station-presence="contextual"
      >
        {showFlame && <FlameEnvironmentStation key={`${user?.id}:${user?.role}`} title={environment.title} district={environment.district} purpose={environment.purpose} />}
        {children}
      </div>
    </section>
  )
}
