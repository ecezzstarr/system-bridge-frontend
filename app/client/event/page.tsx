'use client'

import { useAuth } from '@/lib/auth-provider'
import PositionEventWorld from '@/components/events/position-event-world'
import CompanyStaffWorkspaceEntry from '@/components/client/company-staff-workspace-entry'

/** The Client first meets the company event; crossing to the private File Folder remains deliberate. */
export default function ClientFlameEventPage() {
  const { user, isInitialized } = useAuth()
  if (!isInitialized || user?.role !== 'client') return null

  return (
    <main data-flame-event-location="burning-river" data-system-switch-crossed="false" data-weave-world="flame-event">
      <CompanyStaffWorkspaceEntry />
      <PositionEventWorld
        role="client"
        context={[
          { label: 'Position', value: 'Client · Dream Lovely' },
          { label: 'File Number', value: user.file_number || 'Open your File Folder' },
          { label: 'Movement', value: 'Burning River · Event ground' },
        ]}
      />
    </main>
  )
}
