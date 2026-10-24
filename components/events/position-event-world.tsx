'use client'

import Link from 'next/link'
import { ArrowRight, Orbit } from 'lucide-react'
import type { EventRole } from '@/lib/weave-event'
import { FlameEventRiverField } from '@/components/events/flame-event-river-field'
import { BurningRiverOfficialGateway } from '@/components/events/burning-river-official-gateway'

/**
 * Each position receives its own world on the SAME Company Loop 1 ground.
 * These are real existing role worlds, not copies or public File Folders.
 * A participant never receives a different department's entrance.
 */
const ROLE_DEPARTMENT_WORLD: Record<EventRole,{label:string;department:string;detail:string;href:string}>={
  admin:{label:'Administration World',department:'Administration · A Cat',detail:'Enter your Administration districts, workrooms, oversight and company operations.',href:'/admin/dashboard'},
  agent:{label:'Agent World',department:'Stability',detail:'Enter your Agent districts, supply operations, company work and participation.',href:'/agent/dashboard'},
  bridger:{label:'Bridger World',department:'Hope',detail:'Enter your Bridger districts, prospects, Bridge AI and Client assistance.',href:'/bridger/dashboard'},
  client:{label:'Client World',department:'Dream Lovely',detail:'Enter your Client world, File Folder work and enterprise participation.',href:'/client/dashboard'},
}

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
  const departmentWorld = ROLE_DEPARTMENT_WORLD[role]

  return (
    <section
      className="weave-operating-environment relative isolate w-full min-h-[85svh] overflow-hidden bg-[#06101c] text-white"
      data-loop-one-environment="burning-river"
      data-weave-environment="flame-event-loop-one"
      data-flame-event-compact-entrance="true"
    >
      <FlameEventRiverField />
      <div className="relative z-10">
        <div className="border-b border-amber-300/15 bg-[#061323]/90 px-3 pb-3 pt-4 sm:px-5" data-flame-event-department-world={role}>
          <Link href={departmentWorld.href}
            data-flame-event-own-world-entry={role}
            aria-label={'Enter '+departmentWorld.label}
            className="group flex min-h-20 w-full items-center justify-between gap-4 rounded-2xl border border-sky-200/35 bg-[linear-gradient(110deg,rgba(15,60,82,.89),rgba(15,30,45,.94)_64%,rgba(88,48,25,.7))] px-4 py-4 text-white shadow-lg transition hover:border-amber-200/65 hover:bg-sky-900/70 sm:max-w-xl sm:px-5">
            <span className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-[.15em] text-cyan-200">{departmentWorld.department} · My Department</span>
              <span className="mt-1 block text-lg font-black leading-6 text-white">{departmentWorld.label}</span>
              <span className="mt-1 block text-xs leading-5 text-sky-100/75">{departmentWorld.detail}</span>
            </span>
            <ArrowRight className="h-6 w-6 shrink-0 text-amber-200 transition group-hover:translate-x-1"/>
          </Link>
        </div>
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
