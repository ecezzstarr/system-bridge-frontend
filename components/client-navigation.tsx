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
    const load = () => {
      fetch('/api/events/flame', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (mounted && data?.success && data.event) setEvent(data.event)
        })
        .catch(() => {})
    }
    load()
    const clock = window.setInterval(() => setNow(new Date()), 30000)
    const refresh = window.setInterval(load, 60000)
    return () => {
      mounted = false
      window.clearInterval(clock)
      window.clearInterval(refresh)
    }
  }, [pathname])

  const eventIsLive = useMemo(
    () => (event.effectiveStatus || resolveEventStatus(event, now)) === 'active',
    [event, now]
  )

  // Public Client entry routes do not inherit signed-in navigation.
  const isClientEntry =
    pathname === '/client' ||
    pathname === '/client/login' ||
    pathname.startsWith('/client/login/') ||
    pathname === '/client/register' ||
    pathname.startsWith('/client/register/')

  if (isClientEntry) return null

  // During Flame Event the Client Dashboard owns the event-world navigation.
  // Outside the event the normal Client Dashboard keeps the ordinary portal nav.
  if (pathname === '/client/dashboard' && eventIsLive) return null

  return (
    <nav className="sticky top-0 z-40 flex gap-4 border-b border-sky-300/10 bg-[#03101d]/78 px-5 py-3 text-sm text-slate-300 backdrop-blur-2xl">
      <Link href="/client/dashboard">Client Portal</Link>
      <Link href="/client/system-switch">My Workshop & Store</Link>
      <Link href="/client/loops">Company Loops</Link>
    </nav>
  )
}
