'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

export function FlameEventRoleAtmosphere({
  children,
  userRole,
  pathname,
}:{
  children:ReactNode
  userRole?:string|null
  userName?:string|null
  pathname?:string
}){
  const routePath=usePathname()
  const currentPath=pathname||routePath||'/'
  const roleLabel=userRole==='admin'?'administration':userRole==='agent'?'agent':userRole==='bridger'?'bridger':userRole==='client'?'client':'weave'

  return <div
    className="flame-event-role-atmosphere relative min-w-0"
    data-flame-event-role={roleLabel}
    data-flame-event-path={currentPath}
  >
    <div className="flame-event-role-signal pointer-events-none fixed inset-0 z-[2] overflow-hidden" aria-hidden="true">
      <div className="flame-event-burning-river absolute inset-x-[5%] bottom-[7%] h-28 -rotate-[1.5deg] rounded-[50%] blur-2xl"/>
      <div className="flame-event-burning-river-line absolute inset-x-[8%] bottom-[13%] h-px -rotate-[1.5deg]"/>
      <div className="flame-event-burning-river-line flame-event-burning-river-line-secondary absolute inset-x-[16%] bottom-[20%] h-px rotate-[1deg]"/>
      <div className="flame-event-ember-column absolute bottom-0 left-[18%] h-[38%] w-px"/>
      <div className="flame-event-ember-column absolute bottom-0 right-[21%] h-[32%] w-px"/>
    </div>
    <div className="relative z-[3] min-w-0">{children}</div>
  </div>
}
