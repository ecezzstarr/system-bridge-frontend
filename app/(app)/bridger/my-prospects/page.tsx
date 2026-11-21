'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-provider'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import ProspectWorkplace from '../../weave/market/prospects/page'

export default function MyProspectsBuilding() {
  const { user, isInitialized } = useAuth()
  const { isVisible, ready } = useEnvironmentOrganizer()
  if (!isInitialized || !ready) return <p role="status">Opening My Prospects…</p>
  if (user?.role !== 'bridger' || !isVisible('/weave/market/prospects')) {
    return <p>My Prospects is unavailable to this account. <Link href="/dashboard">Return to my department</Link></p>
  }
  return <ProspectWorkplace />
}
