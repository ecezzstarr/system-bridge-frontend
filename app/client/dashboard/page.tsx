'use client'

import { useAuth } from '@/lib/auth-provider'
import LegacyClientDashboard from '@/components/client/client-terminal-legacy'
import { WeaveDashboardWorld } from '@/components/world/weave-dashboard-world'

export default function ClientDashboardPage() {
  const { user } = useAuth()

  // The Client World is persistent. Company Loops change the system state,
  // not the identity or navigation of the Client operating environment.
  return (
    <WeaveDashboardWorld role="client" userName={user?.name}>
      <LegacyClientDashboard />
    </WeaveDashboardWorld>
  )
}
