'use client'

import Link from 'next/link'
import { ArrowRight, FolderOpen } from 'lucide-react'
import { getRolePlaces } from '@/lib/weave-role-districts'
import { WeaveRouteNetwork, type WeaveRouteTone } from '@/components/world/weave-route-network'


export function ClientOperatingRoom() {
  const stations=getRolePlaces('client').map(item=>({...item,icon:FolderOpen,tone:'sky' as WeaveRouteTone}))

  return (
    <main className="mx-auto w-full max-w-[1500px] p-0 sm:p-3 md:p-6" data-operating-room="client">
      <section className="weave-system-depth weave-operating-environment min-h-[620px] overflow-hidden border-y border-sky-300/15 bg-[#030a15]/82 p-4 backdrop-blur-xl sm:rounded-[2rem] sm:border md:p-6">
        <WeaveRouteNetwork
          stations={stations}
          title="Client operating routes"
          detail="Enter System Switch and your File Folder to build and operate. Funds and support remain close to your work."
        />
        <Link href="/client/dashboard" className="mt-6 inline-flex items-center gap-2 border-y border-white/10 py-3 text-xs font-black text-white">
          Client World <ArrowRight className="h-4 w-4 text-sky-300"/>
        </Link>
      </section>
    </main>
  )
}
