import type { ReactNode } from 'react'
import { RoleRouteGuard } from '@/components/role-route-guard'

export default function AdministrationRoleLayout({ children }: { children: ReactNode }) {
  return <RoleRouteGuard role="admin">{children}</RoleRouteGuard>
}
