'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { FLAME_EVENT, type WeaveEvent, resolveEventStatus } from '@/lib/weave-event'

export function ClientNavigation() {
  const pathname = usePathname()
  const [event, setEvent] = useState<WeaveEvent>(FLAME_EVENT)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (pathname !== '/client/dashboard') return
    let mounted = true
    fetch('/api/events/flame', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (mounted && data?.success && data.event) setEvent(data.event)
      })
      .catch(() => {})
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [pathname])

  const eventIsLive = useMemo(
    () => (event.effectiveStatus || resolveEventStatus(event, now)) === 'active',
    [event, now]
  )

  // Login is an entry gate. During Flame Event, the Client Dashboard owns its
  // open-world sidebar and should not inherit the ordinary horizontal nav.
  if (pathname === '/client/login' || (pathname === '/client/dashboard' && eventIsLive)) return null

  return (
    <nav className="flex gap-4 border-b border-white/10 px-5 py-3 text-sm text-slate-300">
      <Link href="/client/dashboard">Client Portal</Link>
      <Link href="/client/system-switch">My Workshop & Store</Link>
      <Link href="/client/loops">Company Loops</Link>
    </nav>
  )
}
