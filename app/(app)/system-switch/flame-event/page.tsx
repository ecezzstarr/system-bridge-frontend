'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import PositionEventWorld from '@/components/events/position-event-world'
import type { EventRole } from '@/lib/weave-event'

export default function StaffFileFolderFlameEventPage() {
  const { user } = useAuth()
  if (!user || !user.role || !['agent', 'bridger', 'admin'].includes(user.role)) return null

  const role = user.role as EventRole
  const context = [
    { label: 'Position', value: role === 'admin' ? 'Administration' : role === 'agent' ? 'Agent' : 'Bridger' },
    { label: 'Department', value: user.departmental_code || '—' },
    { label: 'Boundary', value: 'File Folder · System Switch crossed' },
  ]

  return (
    <div
      className="mx-auto w-full max-w-none text-white"
      data-flame-event-location="file-folder"
      data-system-switch-crossed="true"
      data-weave-world="file-folder"
    >
      <Link href="/system-switch" className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> System Switch Gate
      </Link>
      <PositionEventWorld role={role} context={context} />
    </div>
  )
}
