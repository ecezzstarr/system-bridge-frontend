'use client'
import { visiblePoll } from '@/lib/visible-poll'

import { useEffect, useMemo, useState } from 'react'
import { FLAME_EVENT, type WeaveEvent, resolveEventStatus } from '@/lib/weave-event'
import { WeaveWorldBackdrop } from '@/components/world/weave-world-backdrop'

export function FlameEventWorldGate({ intensity = 'normal' }: { intensity?: 'soft' | 'normal' | 'event' }) {
  const [event, setEvent] = useState<WeaveEvent>(FLAME_EVENT)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let mounted = true
    const load = (signal:AbortSignal) => {
      return fetch('/api/events/flame', { cache: 'no-store',signal })
        .then(res => res.json())
        .then(data => {
          if (mounted && data?.success && data.event) setEvent(data.event)
        })
        .catch(() => {})
    }

    const refresh = visiblePoll(load, 60000)
    const clock = visiblePoll(() => setNow(new Date()), 30000)
    return () => {
      mounted = false
      refresh()
      clock()
    }
  }, [])

  const active = useMemo(
    () => (event.effectiveStatus || resolveEventStatus(event, now)) === 'active',
    [event, now]
  )

  if (!active) return null
  return <WeaveWorldBackdrop intensity={intensity} />
}
