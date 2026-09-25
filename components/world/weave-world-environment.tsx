'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { FLAME_EVENT, type WeaveEvent, resolveEventStatus } from '@/lib/weave-event'
import { WeaveNormalWorldBackdrop } from '@/components/world/weave-normal-world-backdrop'

export function WeaveWorldEnvironment({ soft }: { soft?: boolean }) {
  const pathname=usePathname() || '/'
  const autoSoft = pathname === '/' || pathname === '/login' || pathname === '/register' || pathname.startsWith('/bridge/') || pathname.startsWith('/store/') || pathname === '/system-switch'
  const effectiveSoft = soft ?? autoSoft
  const [event, setEvent] = useState<WeaveEvent>(FLAME_EVENT)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let mounted = true
    const load = () => {
      fetch('/api/events/flame', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (mounted && data?.success && data.event) setEvent(data.event)
        })
        .catch(() => {})
    }
    load()
    const refresh = window.setInterval(load, 60000)
    const clock = window.setInterval(() => setNow(new Date()), 30000)
    return () => {
      mounted = false
      window.clearInterval(refresh)
      window.clearInterval(clock)
    }
  }, [])

  const active = useMemo(
    () => (event.effectiveStatus || resolveEventStatus(event, now)) === 'active',
    [event, now]
  )

  return (
    <>
      <WeaveNormalWorldBackdrop />
      {active && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_82%_20%,rgba(239,68,68,.055),transparent_30%),radial-gradient(circle_at_50%_58%,rgba(56,189,248,.045),transparent_34%)] ${effectiveSoft ? 'opacity-45' : 'opacity-80'}`}
        />
      )}
    </>
  )
}
