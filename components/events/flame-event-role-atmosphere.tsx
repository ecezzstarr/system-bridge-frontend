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
  const [loopTwo,setLoopTwo]=useState(false)

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
    const read=()=>{
      setActive(root.dataset.weaveEvent==='flame-live')
      setLoopTwo(root.dataset.weaveCompanyLoop==='2')
    }
    read()
    const observer=new MutationObserver(read)
    observer.observe(root,{attributes:true,attributeFilter:['data-weave-event','data-weave-company-loop']})
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
          className={"flame-event-role-signal flex min-w-0 items-center justify-between gap-3 border-y px-3 py-1.5 text-[7px] font-black uppercase tracking-[.16em] sm:px-5 "+(loopTwo?"border-emerald-200/30 bg-[#008751]/20 text-white":"border-orange-300/10 bg-orange-400/[.025] text-orange-100/70")}
          aria-label="Flame Event live state"
          data-flame-event-marker={loopTwo?"one-nigerian":"burning-river"}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            {loopTwo?<span className="h-3 w-3 shrink-0 rounded-sm bg-[linear-gradient(90deg,#008751_0_33%,white_33%_67%,#008751_67%_100%)]" aria-hidden="true"/>:<Waves className="h-3 w-3 shrink-0 text-sky-200/70"/>}
            <span className="truncate">{loopTwo?"One Nigerian · Company Loop 2 · Flame Event Live":"Burning River · Flame Event Live · The River that Burns"}</span>
            {!loopTwo&&<Flame className="h-3 w-3 shrink-0 text-orange-200/80"/>}
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
