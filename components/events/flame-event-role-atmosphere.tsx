'use client'

import { useEffect, useState, type ReactNode } from 'react'
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
  const [active,setActive]=useState(false)

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
    const root=document.documentElement
    const read=()=>setActive(root.dataset.weaveEvent==='flame-live')
    read()
    const observer=new MutationObserver(read)
    observer.observe(root,{attributes:true,attributeFilter:['data-weave-event']})
    return ()=>observer.disconnect()
  },[])

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
            <span className="truncate">Burning River · Flame Event Live · The River that Burns</span>
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
