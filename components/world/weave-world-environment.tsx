'use client'

import { useEffect, useMemo, useState } from 'react'
import { FLAME_EVENT, type WeaveEvent, resolveEventStatus } from '@/lib/weave-event'
import { WeaveWorldBackdrop } from '@/components/world/weave-world-backdrop'
import { WeaveNormalWorldBackdrop } from '@/components/world/weave-normal-world-backdrop'

export function WeaveWorldEnvironment({ soft = false }: { soft?: boolean }) {
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

  if (active) return <WeaveWorldBackdrop intensity={soft ? 'soft' : 'event'} />
  return <WeaveNormalWorldBackdrop />
}
