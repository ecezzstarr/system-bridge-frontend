'use client'
import { visiblePoll } from '@/lib/visible-poll'

import { useEffect, useMemo, useState } from 'react'
import { FLAME_EVENT, type WeaveEvent, resolveEventStatus } from '@/lib/weave-event'
import { WeaveLiveFlameField } from '@/components/world/weave-live-flame-field'
import { isOneNigerianLoopActive } from '@/lib/company-loop-two'

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

  const loopTwoActive=isOneNigerianLoopActive(now)

  useEffect(() => {
    const root=document.documentElement
    root.dataset.weaveEvent=active||loopTwoActive?'flame-live':'normal'
    if(loopTwoActive){
      root.dataset.weaveLoopTheme='one-nigerian'
      root.dataset.weaveCompanyLoop='2'
    } else {
      delete root.dataset.weaveLoopTheme
      delete root.dataset.weaveCompanyLoop
    }
    return () => {
      delete root.dataset.weaveEvent
      delete root.dataset.weaveLoopTheme
      delete root.dataset.weaveCompanyLoop
    }
  }, [active,loopTwoActive])

  return <WeaveLiveFlameField flameLive={active||loopTwoActive} />
}
