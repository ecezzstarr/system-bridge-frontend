import type { ReactNode } from 'react'
import { RoleRouteGuard } from '@/components/role-route-guard'

export default function BridgerRoleLayout({ children }: { children: ReactNode }) {
  return <RoleRouteGuard role="bridger">{children}</RoleRouteGuard>
}
