'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Flame, Waves } from 'lucide-react'

export function FlameEventRoleAtmosphere({
  children,
  userRole,
  userName,
  pathname,
}: {
  children: ReactNode
  userRole?: string | null
  userName?: string | null
  pathname?: string
}) {
  const routePath = usePathname()
  const currentPath = pathname || routePath || '/'
  const roleLabel = userRole === 'admin'
    ? 'ADMINISTRATION'
    : userRole === 'agent'
      ? 'AGENT'
      : userRole === 'bridger'
        ? 'BRIDGER'
        : userRole === 'client'
          ? 'CLIENT'
          : 'WEAVE'

  return (
    <div
      className="flame-event-role-atmosphere relative min-w-0"
      data-flame-event-role={roleLabel.toLowerCase()}
      data-flame-event-path={currentPath}
    >
      <div className="flame-event-role-signal pointer-events-none fixed inset-0 z-[2] overflow-hidden" aria-hidden="true">
        <div className="flame-event-burning-river absolute inset-x-[5%] bottom-[7%] h-28 -rotate-[1.5deg] rounded-[50%] blur-2xl" />
        <div className="flame-event-burning-river-line absolute inset-x-[8%] bottom-[13%] h-px -rotate-[1.5deg]" />
        <div className="flame-event-burning-river-line flame-event-burning-river-line-secondary absolute inset-x-[16%] bottom-[20%] h-px rotate-[1deg]" />
        <div className="flame-event-ember-column absolute bottom-0 left-[18%] h-[38%] w-px" />
        <div className="flame-event-ember-column absolute bottom-0 right-[21%] h-[32%] w-px" />

        <div className="absolute right-4 top-20 max-w-[15rem] rounded-2xl border border-orange-300/20 bg-[#160805]/82 px-3 py-2.5 text-right shadow-[0_18px_55px_rgba(69,10,10,.28)] backdrop-blur-xl lg:right-8">
          <div className="flex items-center justify-end gap-2 text-orange-200">
            <Waves className="h-3.5 w-3.5" />
            <p className="text-[8px] font-black uppercase tracking-[.24em]">Burning River</p>
            <Flame className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1 text-[7px] font-bold uppercase tracking-[.18em] text-rose-100/60">
            Flame Event · The River that Burns
          </p>
          <p className="mt-1 text-[7px] uppercase tracking-[.14em] text-white/30">
            {roleLabel}{userName ? ` · ${userName}` : ''}
          </p>
        </div>
      </div>

      <div className="relative z-[3] min-w-0">{children}</div>
    </div>
  )
}
