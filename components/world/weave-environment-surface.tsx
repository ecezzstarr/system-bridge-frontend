'use client'

import { useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, ChevronLeft, Layers3, MoveRight } from 'lucide-react'
import { resolveWeaveEnvironment, weaveWorldForPath } from '@/lib/weave-environments'

function worldReturnFor(_role?:string|null){
  return '/weave'
}

export function WeaveEnvironmentSurface({
  children,
  role,
  userName,
  compact = false,
}: {
  children: ReactNode
  role?: string | null
  userName?: string | null
  compact?: boolean
}) {
  const pathname = usePathname() || '/'
  const environment = useMemo(() => resolveWeaveEnvironment(pathname), [pathname])
  const worldLayer=weaveWorldForPath(pathname)
  const returnHref=worldLayer==='file-folder'?'/client/system-switch':worldReturnFor(role)
  const isWorldHome=pathname===returnHref||pathname==='/weave'

  return (
    <section
      className="weave-environment-surface relative mx-auto w-full max-w-[1800px]"
      data-weave-environment={environment.key}
      data-weave-layer={environment.layer}
      data-world-stays-mounted="true"
      data-weave-world={worldLayer}
    >
      <header className={`sticky top-[4.15rem] z-30 mx-2 border-y border-amber-200/10 bg-[#05080d]/68 px-3 py-2 backdrop-blur-xl sm:mx-4 ${compact?'':'sm:px-4'}`} data-environment-location="world-position">
        <div className="flex min-w-0 items-center gap-3">
          {!isWorldHome&&<Link href={returnHref} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-200/15 bg-sky-300/[.04] text-sky-100" aria-label="Return to Bridge Plaza"><ChevronLeft className="h-4 w-4"/></Link>}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-[7px] font-black uppercase tracking-[.16em]">
              <span className="inline-flex items-center gap-1 text-amber-200"><Layers3 className="h-3 w-3"/>{worldLayer==='file-folder'?'FILE FOLDER WORLD':'OPEN WEAVE WORLD'}</span><span className="text-white/20">→</span><span className="text-sky-300">{environment.district}</span>
              <span className="text-white/20">→</span>
              <span className="text-slate-400">place</span>
              <span className="text-white/20">·</span>
              <span className="text-slate-500">{environment.layer}</span>
              {role&&<><span className="text-white/20">·</span><span className="text-emerald-300">{role} presence</span></>}
            </div>
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              <h2 data-weave-live-word="title" className="truncate text-[11px] font-black text-white sm:text-sm">{environment.title}</h2>
              <MoveRight className="h-3 w-3 shrink-0 text-orange-300"/>
              <span data-weave-live-word="station" className="truncate text-[8px] font-bold text-slate-500 sm:text-[9px]">{environment.movement}</span>
            </div>
          </div>
          <div className="hidden max-w-[280px] items-center gap-2 border-l border-violet-300/15 pl-3 md:flex" data-ai-station-presence="contextual">
            <Bot className="h-3.5 w-3.5 shrink-0 text-violet-300"/>
            <p className="text-[7px] leading-3 text-slate-500">AI may assist this movement within granted authority. {userName||'Human presence'} remains the decision source.</p>
          </div>
        </div>
      </header>
      <div className="relative min-h-[calc(100dvh-7rem)]" data-environment-interior="place">{children}</div>
    </section>
  )
}
