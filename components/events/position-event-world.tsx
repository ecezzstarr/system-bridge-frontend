'use client'

import Link from 'next/link'
import { ArrowRight, Orbit } from 'lucide-react'
import type { EventRole } from '@/lib/weave-event'
import { FlameEventRiverField } from '@/components/events/flame-event-river-field'
import { BurningRiverOfficialGateway } from '@/components/events/burning-river-official-gateway'

/**
 * The event is a place people enter, not a second information dashboard.
 * Actual work stays in its owning department and the System Switch crossing.
 */
const ROLE_WORK_ENTRANCES: Record<EventRole, { label: string; detail: string; href: string }[]> = {
  admin: [
    { label: 'Administration Work', detail: 'People, approvals and operating systems.', href: '/admin/control-center' },
    { label: 'Staff Applications', detail: 'Review company employment.', href: '/admin/employment-applications' },
    { label: 'Flame Event Control', detail: 'Operate the event.', href: '/admin/flame-event' },
    { label: 'Staff Communications', detail: 'Reach the four positions.', href: '/communications' },
  ],
  agent: [
    { label: 'Agent Work · Stability', detail: 'Stock, customers and commissions.', href: '/agent/work' },
    { label: 'My Staff Workspace', detail: 'Jobs, teams and assignments.', href: '/weave/lifestyles/work' },
    { label: 'Team Communications', detail: 'Reach the team.', href: '/communications' },
    { label: 'Distribution Route', detail: 'Supply outlets and customers.', href: '/agent/distribution' },
  ],
  bridger: [
    { label: 'Hope · Prospect Work', detail: 'Prospects and responses.', href: '/weave/market/prospects' },
    { label: 'My Staff Workspace', detail: 'Jobs, teams and assignments.', href: '/weave/lifestyles/work' },
    { label: 'Bridge AI Assistance', detail: 'Support Client File Folders.', href: '/bridger/bridge-ai' },
    { label: 'Team Communications', detail: 'Reach the team.', href: '/communications' },
  ],
  client: [
    { label: 'My File Folder', detail: 'Build and operate your systems.', href: '/client/system-switch' },
    { label: 'Client World', detail: 'Continue Client work.', href: '/client/dashboard' },
    { label: 'Your Bridger', detail: 'Reach your Bridger.', href: '/client/chat/bridger' },
    { label: 'Notifications', detail: 'Read company messages.', href: '/notifications' },
  ],
}

export default function PositionEventWorld({
  role,
}: {
  role: EventRole
  context?: { label: string; value: string | number }[]
}) {
  const switchHref = role === 'client' ? '/client/system-switch' : '/system-switch'

  return (
    <section
      className="weave-operating-environment relative isolate w-full min-h-[85svh] overflow-hidden bg-[#06101c] text-white"
      data-loop-one-environment="burning-river"
      data-weave-environment="flame-event-loop-one"
      data-flame-event-compact-entrance="true"
    >
      <FlameEventRiverField />
      <div className="relative z-10">
        <nav
          aria-label="Department work and System Switch"
          data-flame-event-staff-flow="role-directed"
          className="grid gap-2 border-b border-amber-300/15 bg-[#061323]/90 px-3 py-3 sm:grid-cols-2 sm:px-5 lg:grid-cols-5"
        >
          {ROLE_WORK_ENTRANCES[role].map(action => (
            <Link
              key={action.href}
              href={action.href}
              className="flex min-h-16 items-center justify-between gap-2 rounded-xl border border-sky-200/15 bg-white/[.035] px-3 py-2 transition hover:border-amber-200/40 hover:bg-white/[.075]"
            >
              <span className="min-w-0">
                <span className="block text-xs font-bold text-white">{action.label}</span>
                <span className="mt-1 block text-[10px] leading-4 text-sky-100/65">{action.detail}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-amber-200" />
            </Link>
          ))}
          <Link
            href={switchHref}
            data-flame-event-system-switch-entry="true"
            className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-amber-300/45 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-100 transition hover:bg-amber-300/20"
          >
            System Switch · Bridge of Radiance
            <Orbit className="h-5 w-5 shrink-0" />
          </Link>
        </nav>
        <BurningRiverOfficialGateway staff staffHref={switchHref} />
      </div>
    </section>
  )
}
