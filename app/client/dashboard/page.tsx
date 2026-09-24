'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import ClientFlameEventDashboard from '@/components/events/client-flame-event-dashboard'
import LegacyClientDashboard from '@/components/client/client-terminal-legacy'
import { FLAME_EVENT, type WeaveEvent, resolveEventStatus } from '@/lib/weave-event'

export default function ClientDashboardPage() {
  const { user, isInitialized } = useAuth()
  const [event, setEvent] = useState<WeaveEvent>(FLAME_EVENT)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(clock)
  }, [])

  useEffect(() => {
    if (!isInitialized || !user) return
    let mounted = true

    const load = () => {
      fetch('/api/events/flame', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (mounted && data?.success && data.event) setEvent(data.event)
        })
        .catch(() => {
          // Hard-coded October 1 schedule remains the safe fallback.
        })
    }

    load()
    const timer = window.setInterval(load, 60000)
    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [isInitialized, user?.id])

  const eventIsLive = useMemo(
    () => (event.effectiveStatus || resolveEventStatus(event, now)) === 'active',
    [event, now]
  )

  if (eventIsLive) {
    return <ClientFlameEventDashboard event={event} />
  }

  return <LegacyClientDashboard />
}
