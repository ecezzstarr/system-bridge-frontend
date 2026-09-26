'use client'

import { useAuth } from '@/lib/auth-provider'
import { WeaveDashboardWorld } from '@/components/world/weave-dashboard-world'

export default function AgentDashboardPage() {
  const { user } = useAuth()
  return <WeaveDashboardWorld role="agent" userName={user?.name} />
}
