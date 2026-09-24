'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { FLAME_EVENT, type WeaveEvent, resolveEventStatus } from '@/lib/weave-event'
import { WeaveDashboardWorld, type WorldRole } from '@/components/world/weave-dashboard-world'

const DASHBOARDS = new Set(['/dashboard', '/bridger/dashboard', '/agent/dashboard', '/admin/dashboard'])

export function NormalWeaveRoleAtmosphere({
  userRole,
  userName,
  pathname,
  children,
}: {
  userRole?: string | null
  userName?: string | null
  pathname: string
  children: ReactNode
}) {
  const [event, setEvent] = useState<WeaveEvent>(FLAME_EVENT)
  const [now, setNow] = useState(() => new Date())

  const eligible = userRole === 'bridger' || userRole === 'agent' || userRole === 'admin'
  const isDashboard = DASHBOARDS.has(pathname)

  useEffect(() => {
    if (!eligible || !isDashboard) return
    let mounted = true
    const load = () => {
      fetch('/api/events/flame', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (mounted && data?.success && data.event) setEvent(data.event)
        })
        .catch(() => {})
    }
    load()
    const refresh = window.setInterval(load, 60000)
    const clock = window.setInterval(() => setNow(new Date()), 30000)
    return () => {
      mounted = false
      window.clearInterval(refresh)
      window.clearInterval(clock)
    }
  }, [eligible, isDashboard])

  const eventActive = useMemo(
    () => (event.effectiveStatus || resolveEventStatus(event, now)) === 'active',
    [event, now]
  )

  if (!eligible || !isDashboard || eventActive) return <>{children}</>

  return (
    <WeaveDashboardWorld role={userRole as WorldRole} userName={userName}>
      {children}
    </WeaveDashboardWorld>
  )
}
