'use client'

import { useAuth } from '@/lib/auth-provider'
import { WeaveDashboardWorld } from '@/components/world/weave-dashboard-world'

export default function BridgerDashboardPage() {
  const { user } = useAuth()
  return <WeaveDashboardWorld role="bridger" userName={user?.name} />
}
