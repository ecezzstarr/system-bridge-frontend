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
      <div
        className="flame-event-role-signal pointer-events-none fixed right-4 top-20 z-[4] max-w-[15rem] rounded-2xl border border-orange-300/20 bg-[#160805]/82 px-3 py-2.5 text-right shadow-[0_18px_55px_rgba(69,10,10,.2)] backdrop-blur-xl lg:right-8"
        aria-hidden="true"
        data-flame-event-marker="burning-river"
      >
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

      <div className="relative z-[3] min-w-0">{children}</div>
    </div>
  )
}
