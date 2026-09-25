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

  // The normal WEAVE world is the operating-system base. Events and loops
  // decorate this world; they never replace it.
  return (
    <WeaveDashboardWorld role={userRole as WorldRole} userName={userName}>
      {children}
    </WeaveDashboardWorld>
  )
}
