'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Flame, Waves } from 'lucide-react'
import { FLAME_EVENT, resolveEventStatus, type WeaveEvent } from '@/lib/weave-event'
import { visiblePoll } from '@/lib/visible-poll'

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
  const [event,setEvent]=useState<WeaveEvent>(FLAME_EVENT)
  const [now,setNow]=useState(()=>new Date())

  const roleLabel = userRole === 'admin'
    ? 'ADMINISTRATION'
    : userRole === 'agent'
      ? 'AGENT'
      : userRole === 'bridger'
        ? 'BRIDGER'
        : userRole === 'client'
          ? 'CLIENT'
          : 'WEAVE'

  useEffect(()=>{
    const stopEvent=visiblePoll(async signal=>{
      const response=await fetch('/api/events/flame',{cache:'no-store',signal})
      const data=await response.json()
      if(data?.success&&data.event)setEvent(data.event)
    },60000)
    const stopClock=visiblePoll(()=>setNow(new Date()),30000)
    return ()=>{stopEvent();stopClock()}
  },[])

  const active=useMemo(
    ()=>(event.effectiveStatus||resolveEventStatus(event,now))==='active',
    [event,now],
  )

  return (
    <div
      className="flame-event-role-atmosphere relative min-w-0"
      data-flame-event-role={roleLabel.toLowerCase()}
      data-flame-event-path={currentPath}
      data-flame-event-active={active?'true':'false'}
    >
      {active&&(
        <div
          className="flame-event-role-signal flex min-w-0 items-center justify-between gap-3 border-y border-orange-300/10 bg-orange-400/[.025] px-3 py-1.5 text-[7px] font-black uppercase tracking-[.16em] text-orange-100/70 sm:px-5"
          aria-label="Flame Event live state"
          data-flame-event-marker="burning-river"
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <Waves className="h-3 w-3 shrink-0 text-sky-200/70"/>
            <span className="truncate">Burning River · Flame Event Live</span>
            <Flame className="h-3 w-3 shrink-0 text-orange-200/80"/>
          </span>
          <span className="hidden shrink-0 text-white/30 sm:inline">
            {roleLabel}{userName ? ` · ${userName}` : ''}
          </span>
        </div>
      )}
      <div className="relative min-w-0">{children}</div>
    </div>
  )
}
