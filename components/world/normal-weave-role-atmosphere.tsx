'use client'

import type { ReactNode } from 'react'
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
  const eligible = userRole === 'bridger' || userRole === 'agent' || userRole === 'admin'
  const isDashboard = DASHBOARDS.has(pathname)

  if (!eligible || !isDashboard) return <>{children}</>

  // Home is the compact WEAVE world. Operational functions live on their own
  // role route so phones never stack the world and an entire terminal together.
  return <WeaveDashboardWorld role={userRole as WorldRole} userName={userName} />
}
