'use client'

import { useAuth } from '@/lib/auth-provider'
import { WeaveDashboardWorld } from '@/components/world/weave-dashboard-world'
import { LifestyleEntry } from '@/components/manager-lifestyle-entry'
import CompanyStaffWorkspaceEntry from '@/components/client/company-staff-workspace-entry'

export default function ClientDashboardPage() {
  const { user } = useAuth()
  return <>
    <WeaveDashboardWorld role="client" userName={user?.name} />
    <LifestyleEntry />
  </>
}
