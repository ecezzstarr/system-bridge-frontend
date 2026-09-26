import type { ReactNode } from 'react'
import { RoleRouteGuard } from '@/components/role-route-guard'

export default function AgentRoleLayout({ children }: { children: ReactNode }) {
  return <RoleRouteGuard role="agent">{children}</RoleRouteGuard>
}
