'use client'
import { visiblePoll } from '@/lib/visible-poll'

import { useEffect, useMemo, useState } from 'react'
import { FLAME_EVENT, type WeaveEvent, resolveEventStatus } from '@/lib/weave-event'
import { WeaveLiveFlameField } from '@/components/world/weave-live-flame-field'
import { isOneNigerianLoopActive } from '@/lib/weave-loop-two'

export function WeaveWorldEnvironment({ soft }: { soft?: boolean }) {
  void soft
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

  const oneNigerianActive = useMemo(() => isOneNigerianLoopActive(now), [now])
  const eventLive = active || oneNigerianActive

  useEffect(() => {
    const root = document.documentElement
    root.dataset.weaveEvent = eventLive ? 'flame-live' : 'normal'
    if (oneNigerianActive) root.dataset.weaveEventTheme = 'one-nigerian'
    else delete root.dataset.weaveEventTheme
    return () => {
      delete root.dataset.weaveEvent
    }
  }, [eventLive, oneNigerianActive])

  return <WeaveLiveFlameField flameLive={eventLive} />
}
