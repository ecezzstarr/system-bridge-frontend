'use client'

import type { ReactNode } from 'react'

// Company Loops are destinations in the WEAVE operating system, not a second
// dashboard layer. The event remains reachable from navigation without
// occupying the top of Home or My Functions.
export function FlameEventRoleAtmosphere({
  children,
}: {
  children: ReactNode
  userRole?: string | null
  userName?: string | null
  pathname: string
}) {
  return <>{children}</>
}
