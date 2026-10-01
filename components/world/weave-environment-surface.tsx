'use client'

import { useMemo, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { resolveWeaveEnvironment, weaveWorldForPath } from '@/lib/weave-environments'

export function WeaveEnvironmentSurface({
  children,
}: {
  children: ReactNode
  role?: string | null
  userName?: string | null
  compact?: boolean
}) {
  const pathname = usePathname() || '/'
  const environment = useMemo(() => resolveWeaveEnvironment(pathname), [pathname])
  const worldLayer = weaveWorldForPath(pathname)

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
        {children}
      </div>
    </section>
  )
}
