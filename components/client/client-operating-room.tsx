'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  ArrowRight,
  Building2,
  FileText,
  FolderOpen,
  Globe2,
  Settings,
  Users,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { WeaveRouteNetwork, type WeaveRouteTone } from '@/components/world/weave-route-network'

type Item={
  label:string
  detail:string
  href:string
  icon:ComponentType<{className?:string}>
  district:string
  tone:WeaveRouteTone
}

const commands:Item[]=[
  {label:'Main File Folder',detail:'',href:'/client/system-switch',icon:FolderOpen,district:'Build',tone:'sky'},
  {label:'Wallet',detail:'',href:'/client/deposit',icon:Wallet,district:'Value',tone:'emerald'},
  {label:'Your Bridger',detail:'',href:'/client/chat/bridger',icon:Users,district:'Support',tone:'emerald'},
  {label:'Company Loops',detail:'',href:'/client/loops',icon:FileText,district:'Participation',tone:'amber'},
  {label:'Enterprise',detail:'',href:'/marketplace',icon:Building2,district:'Enterprise',tone:'violet'},
  {label:'Settings',detail:'',href:'/client/settings',icon:Settings,district:'Position',tone:'sky'},
]

export function ClientOperatingRoom(){
  const {user}=useAuth()

  return <main className="mx-auto w-full max-w-[1280px] p-0 sm:p-3 md:p-5" data-client-operating-room="true">
    <section className="relative min-h-[calc(100dvh-5rem)] overflow-hidden border-y border-sky-300/15 bg-[#02070d]/74 sm:rounded-[2rem] sm:border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(56,189,248,.11),transparent_28%),linear-gradient(180deg,rgba(2,7,13,.45),rgba(2,7,13,.92))]"/>
      <header className="relative flex items-end justify-between gap-4 border-b border-white/[0.07] px-5 py-5 md:px-7">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[.22em] text-sky-300">Client</p>
          <h1 className="mt-1 text-xl font-black text-white md:text-2xl">{user?.name||'Client'} · Operating Room</h1>
        </div>
        <span className="text-[8px] font-black uppercase tracking-[.14em] text-emerald-300">LIVE</span>
      </header>

      <section className="relative mx-auto max-w-5xl px-4 py-7 md:px-6">
        <WeaveRouteNetwork stations={commands} title="Client districts" compact />
      </section>

      <footer className="relative flex items-center justify-between border-t border-white/[0.07] px-5 py-4 md:px-7">
        <Link href="/client/system-switch" className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-amber-200">
          File Folder <FolderOpen className="h-3.5 w-3.5"/>
        </Link>
        <Link href="/client/dashboard" className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-sky-200">
          World <ArrowRight className="h-3.5 w-3.5"/>
        </Link>
      </footer>
    </section>
  </main>
}
