'use client'

import { useAuth } from '@/lib/auth-provider'
import { WeaveDashboardWorld } from '@/components/world/weave-dashboard-world'

export default function AdministrationDashboardPage() {
  const { user } = useAuth()
  return <WeaveDashboardWorld role="admin" userName={user?.name} />
}
