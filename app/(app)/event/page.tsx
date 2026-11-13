'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import PositionEventWorld from '@/components/events/position-event-world'
import Link from 'next/link'
import type { EventRole } from '@/lib/weave-event'

/** The Flame Event is the staff arrival ground. System Switch is a choice made from here. */
export default function StaffFlameEventPage() {
  const { user, isInitialized, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isInitialized || isLoading) return
    if (user?.role === 'client') router.replace('/client/event')
    else if (user && !['admin', 'agent', 'bridger'].includes(user.role || '')) router.replace('/dashboard')
  }, [isInitialized, isLoading, user?.role, router])

  if (!isInitialized || isLoading || !user?.role || !['admin', 'agent', 'bridger'].includes(user.role)) return null

  const role = user.role as EventRole
  const context = [
    { label: 'Position', value: role === 'admin' ? 'Administrations' : role === 'agent' ? 'Agent' : 'Bridger' },
    { label: 'Department', value: user.departmental_code || (role === 'admin' ? 'Administrations' : role === 'agent' ? 'Stability' : 'Hope') },
    { label: 'Movement', value: 'Burning River · Event ground' },
  ]

  return (
    <main data-flame-event-location="burning-river" data-system-switch-crossed="false" data-weave-world="flame-event">
      {role === 'bridger' && <div className="mx-auto max-w-5xl px-4 pt-4"><Link href="/bridger/flame-of-hope" className="flex min-h-12 items-center justify-center rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 text-sm font-bold text-amber-100">Flame of Hope · Claim your activity mystery box (1–8 System Switch)</Link></div>}
      <PositionEventWorld role={role} context={context} />
    </main>
  )
}
