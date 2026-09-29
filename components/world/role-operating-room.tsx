'use client'

import Link from 'next/link'
import { ArrowRight, LayoutTemplate } from 'lucide-react'
import { getRolePlaces } from '@/lib/weave-role-districts'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import { WeaveRouteNetwork, type WeaveRouteTone } from '@/components/world/weave-route-network'

type Role = 'agent' | 'admin'


export function RoleOperatingRoom({ role }: { role: Role }) {
  const { isVisible, orderFor } = useEnvironmentOrganizer()
  const stations = getRolePlaces(role).filter(item=>role==='admin'||!item.href.endsWith('/presence')).filter(item=>isVisible(item.href))
    .sort((a,b)=>orderFor(a.href)-orderFor(b.href))
    .map(item=>({...item,icon:LayoutTemplate,tone:'sky' as WeaveRouteTone}))

  return (
    <main className="relative mx-auto w-full max-w-[1500px] p-0 sm:p-3 md:p-6" data-operating-room={role}>
      <section className="weave-system-depth weave-operating-environment relative overflow-hidden border-y border-sky-300/15 bg-[#030a15]/74 shadow-[0_32px_100px_rgba(2,8,23,.38)] backdrop-blur-xl sm:rounded-[2rem] sm:border">
        <div className="min-h-[560px]">
          <section className="min-w-0 p-4 md:p-6">
            <WeaveRouteNetwork
              stations={stations}
              title={role==='admin'?'Administration operating routes':'Agent movement'}
              detail={role==='admin'?'Enter an Administration system directly.':'Presence explains the Agent position; Agility and Commissions are its working functions.'}
            />
            <Link
              href={role === 'admin' ? '/admin/dashboard' : '/agent/dashboard'}
              className="mt-6 inline-flex items-center gap-2 border-y border-white/10 py-3 text-xs font-black text-white transition hover:border-sky-300/20"
            >
              Return to WEAVE World
              <ArrowRight className="h-4 w-4 text-sky-300" />
            </Link>
          </section>

        </div>
      </section>
    </main>
  )
}
