'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { getAuthHeaders } from '@/lib/auth-client'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'

const market = '/weave/market/prospects'
const studio = '/distribution-studio'
const rooms = [
  { label: 'Social Studio', href: studio },
  { label: 'Prospect desk', href: market },
  { label: 'Bridge AI', href: '/bridger/bridge-ai' },
]

type Prospect = { outreachId: string; name: string; status: string }
type Action = { label: string; href: string }

export function HopeHall() {
  const { user } = useAuth()
  const { isVisible } = useEnvironmentOrganizer()
  const canRead = user?.role === 'bridger' && isVisible(market)
  return <section aria-label="Hope hall" className="mt-4 overflow-hidden rounded-2xl border border-[#d6bf8e] bg-[#fffaf0]">
    <nav aria-label="Hope hall rooms" className="relative isolate grid grid-cols-3 overflow-hidden">
      <img src="/images/hope-working-hall.webp" width={1560} height={520}
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-fill" alt=""/>
      {rooms.map(room => <div key={room.href} className="flex aspect-square items-end justify-center pb-2 sm:pb-4">
        {isVisible(room.href) && <Link href={room.href} className="inline-flex min-h-11 items-center rounded-full border border-[#e4c995] bg-[#30271e]/95 px-2 text-center text-xs font-semibold text-white focus-visible:outline sm:px-4 sm:text-base">{room.label}</Link>}
      </div>)}
    </nav>
    <p className="px-4 pt-3 text-sm leading-6 text-[#4c5a61]">Use Social Studio to reach new prospects and amplify a Client’s business. Follow up at the Prospect Desk and open Bridge AI when someone agrees to explore a File Folder.</p>
    <FlameDesk key={String(user?.id)+'-'+canRead} canRead={canRead} studioVisible={isVisible(studio)}/>
  </section>
}

function FlameDesk({canRead, studioVisible}:{canRead:boolean; studioVisible:boolean}) {
  const [action, setAction] = useState<Action | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!canRead) return
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch('/api/bridger/prospects', {headers:getAuthHeaders(), cache:'no-store', signal:controller.signal})
        if (!response.ok) throw new Error()
        const data = await response.json()
        if (!data.success || !Array.isArray(data.prospects)) throw new Error()
        const prospects: Prospect[] = data.prospects
        // Within a stage the API supplies most recent activity first.
        const next = ['responded','opened','pending','sent']
          .map(status => prospects.find(person => person.status === status && person.outreachId))
          .find(person => person !== undefined)
        if (!controller.signal.aborted && next) {
          const verb = next.status === 'pending' ? 'Meet ' : 'Return to '
          setAction({label:verb+(next.name || 'your prospect'), href:market+'?tab=mine&outreach='+encodeURIComponent(next.outreachId)})
        }
      } catch {
        if (!controller.signal.aborted) setAction({label:'Check My Prospects', href:market+'?tab=mine'})
      } finally {
        if (!controller.signal.aborted) setReady(true)
      }
    }
    void load()
    return () => controller.abort()
  }, [canRead])
  const next = action ?? (studioVisible ? {label:'Open Social Presence', href:studio} : canRead ? {label:'Open Prospect Market', href:market} : null)
  return <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
    <span className="inline-flex items-center gap-2 font-semibold text-[#6e491a]"><Flame size={19} aria-hidden="true"/>The Flame</span>
    {canRead && !ready ? <span role="status">Opening your desk…</span> : next && <Link href={next.href} className="inline-flex min-h-11 items-center rounded-full bg-[#33464a] px-4 text-sm font-semibold text-white">{next.label}</Link>}
  </div>
}
