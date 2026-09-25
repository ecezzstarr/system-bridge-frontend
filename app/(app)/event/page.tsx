'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import PositionEventWorld from '@/components/events/position-event-world'
import type { EventRole } from '@/lib/weave-event'

export default function EventPage() {
  const { user } = useAuth()
  if (!user || !user.role || !['agent', 'bridger', 'admin'].includes(user.role)) return null

  const role = user.role as EventRole
  const context = [
    { label: 'Position', value: role === 'admin' ? 'Administration' : role === 'agent' ? 'Agent' : 'Bridger' },
    { label: 'Department', value: user.departmental_code || '—' },
  ]
  const backHref = role === 'admin' ? '/admin/dashboard' : role === 'agent' ? '/agent/dashboard' : '/bridger/dashboard'

  return (
    <div className="mx-auto max-w-7xl text-white">
      <Link href={backHref} className="mb-5 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to {role === 'admin' ? 'Administration' : role} environment
      </Link>
      <PositionEventWorld role={role} context={context} />
    </div>
  )
}
