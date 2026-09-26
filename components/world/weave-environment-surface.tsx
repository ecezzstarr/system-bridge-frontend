'use client'

import { useMemo, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Layers3, MoveRight } from 'lucide-react'
import { resolveWeaveEnvironment } from '@/lib/weave-environments'

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

  return (
    <section
      className="relative mx-auto w-full max-w-[1600px]"
      data-weave-environment={environment.key}
      data-weave-layer={environment.layer}
    >
      <div className={`mb-3 overflow-hidden rounded-2xl border border-sky-300/10 bg-[#030b17]/48 shadow-[0_18px_70px_rgba(2,8,23,.18)] backdrop-blur-xl ${compact ? 'p-2.5' : 'p-3 sm:p-4'}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[7px] font-black uppercase tracking-[0.18em]">
              <span className="inline-flex items-center gap-1.5 text-sky-300">
                <Layers3 className="h-3 w-3" />
                {environment.district} District
              </span>
              <span className="text-white/20">•</span>
              <span className="text-amber-300">{environment.layer} environment</span>
              {role && (
                <>
                  <span className="text-white/20">•</span>
                  <span className="text-emerald-300">{role} position</span>
                </>
              )}
            </div>
            <h2 className="mt-1.5 truncate text-base font-black tracking-tight text-white sm:text-lg">
              {environment.title}
            </h2>
            {!compact && (
              <p className="mt-1 max-w-4xl text-[10px] leading-4 text-slate-400 sm:text-[11px]">
                {environment.purpose}
              </p>
            )}
          </div>

          <div className="shrink-0 rounded-xl border border-white/[0.07] bg-black/15 px-3 py-2">
            <p className="text-[7px] font-black uppercase tracking-[0.16em] text-slate-600">
              {userName ? `${userName} · movement` : 'Movement'}
            </p>
            <div className="mt-1 flex items-center gap-2 text-[9px] font-bold text-slate-300">
              <MoveRight className="h-3 w-3 text-sky-300" />
              <span>{environment.movement}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">{children}</div>
    </section>
  )
}
