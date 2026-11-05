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

  // Each department owns a reversible workplace and the preserved original world.
  // Do not intercept these dashboards; route guards and Legacy districts remain intact.
  const ownWorkplace = (pathname === '/bridger/dashboard' && userRole === 'bridger')
    || (pathname === '/agent/dashboard' && userRole === 'agent')
    || (pathname === '/admin/dashboard' && userRole === 'admin')
  if (ownWorkplace) return <>{children}</>

  if (!eligible || !isDashboard) return <>{children}</>

  // Home is the compact WEAVE world. Operational functions live on their own
  // role route so phones never stack the world and an entire terminal together.
  return <WeaveDashboardWorld role={userRole as WorldRole} userName={userName} />
}
