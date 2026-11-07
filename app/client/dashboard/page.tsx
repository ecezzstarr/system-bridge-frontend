'use client'

import { useAuth } from '@/lib/auth-provider'
import { WeaveDashboardWorld } from '@/components/world/weave-dashboard-world'
import { LifestyleEntry } from '@/components/manager-lifestyle-entry'
import CompanyStaffWorkspaceEntry from '@/components/client/company-staff-workspace-entry'
import ProFolderUpgradeReminder from '@/components/client/pro-folder-upgrade-reminder'\nimport Link from 'next/link'
import ClientSiblingsEventCard from '@/components/client/client-siblings-event-card'

export default function ClientDashboardPage() {
  const { user } = useAuth()
  return <>
    <WeaveDashboardWorld role="client" userName={user?.name} />\n    <nav aria-label="Find Client business systems" className="mx-auto max-w-5xl px-4 py-3"><Link href="/search" data-role-company-search="client" className="inline-flex min-h-11 items-center rounded-xl border border-sky-300/30 bg-[#062034] px-4 py-2 text-sm font-semibold text-sky-100">Find my next File Folder or business action</Link></nav>
    <LifestyleEntry />
    <ProFolderUpgradeReminder />
    <ClientSiblingsEventCard />
    <CompanyStaffWorkspaceEntry />
  </>
}
