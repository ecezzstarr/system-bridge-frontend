import type { ReactNode } from 'react'
import { DistributionParticipantOversight } from '@/components/admin/distribution-participant-oversight'

export default function DistributionStudioAdministrationLayout({ children }: { children: ReactNode }) {
  return <>
    {children}
    <DistributionParticipantOversight />
  </>
}
