'use client'

import { useMemo,type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { resolveWeaveEnvironment,weaveWorldForPath } from '@/lib/weave-environments'

function worldReturnFor(role?:string|null){
  if(role==='client')return '/client/dashboard'
  if(role==='agent')return '/agent/dashboard'
  if(role==='bridger')return '/bridger/dashboard'
  if(role==='admin')return '/admin/dashboard'
  return '/weave'
}

export function WeaveEnvironmentSurface({
  children,
  role,
  compact=false,
}:{
  children:ReactNode
  role?:string|null
  userName?:string|null
  compact?:boolean
}){
  const pathname=usePathname()||'/'
  const environment=useMemo(()=>resolveWeaveEnvironment(pathname),[pathname])
  const worldLayer=weaveWorldForPath(pathname)
  const returnHref=worldLayer==='file-folder'?'/client/system-switch':worldReturnFor(role)
  const isWorldHome=pathname===returnHref||pathname==='/weave'

  return <section
    className="weave-environment-surface relative mx-auto w-full max-w-[1800px]"
    data-weave-environment={environment.key}
    data-weave-layer={environment.layer}
    data-world-stays-mounted="true"
    data-weave-world={worldLayer}
  >
    {!isWorldHome&&<header
      className={`sticky top-12 z-30 border-b border-white/[0.06] bg-[#02070d]/58 px-3 py-2 backdrop-blur-xl ${compact?'':'sm:px-5'}`}
      data-environment-location="world-position"
    >
      <div className="flex items-center gap-3">
        <Link href={returnHref} className="flex h-8 w-8 shrink-0 items-center justify-center text-sky-100" aria-label="Return to role world">
          <ChevronLeft className="h-4 w-4"/>
        </Link>
        <p className="truncate text-[9px] font-black uppercase tracking-[.14em] text-white">{environment.title}</p>
      </div>
    </header>}
    <div className="relative min-h-[calc(100dvh-4rem)]" data-environment-interior="station">{children}</div>
  </section>
}
