'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Cloud, GitBranch, LayoutTemplate, Megaphone, Palette, Radio, Sparkles, Wrench } from 'lucide-react'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'

const workshops = [
  {
    href: '/admin/infrastructure',
    title: 'Infrastructure Workshop',
    description: 'Operate Origin systems, Cloud Run health, EIGHT web access, deployment authority and Divine Shield.',
    icon: Cloud,
  },
  {
    href: '/admin/dev-workshop?tab=terminal',
    title: 'WEAVE Integrity Engine',
    description: 'Scan and safely repair Prospect reserve, Number Bay inventory, Bridger position and wallet state without a code deployment.',
    icon: Wrench,
  },
  {
    href: '/admin/ad-workshop',
    title: 'Ad Workshop',
    description: 'Create live advertisements, target participant roles, choose placement and publish without redeploying the app.',
    icon: Megaphone,
  },
  {
    href: '/admin/visual-systems',
    title: 'Visual Systems · Interaction in Motion',
    description: 'Operate WEAVE world motion live: Flame Field, Burning River, route current, system emergence, visual artifacts and rollback without a Cloud Run deployment.',
    icon: Palette,
  },
  {
    href: '/admin/environment-organizer',
    title: 'Environment Organizer',
    description: 'Control environment loading/settling, presence ambience, and withdraw, restore or reorder WEAVE pages/cards live without rebuilding Cloud Run.',
    icon: LayoutTemplate,
  },
  {
    href: '/admin/loop-workshop',
    title: 'Company Loop Workshop',
    description: 'Create and organize Company Loop movement.',
    icon: GitBranch,
  },
  {
    href: '/admin/flame-event',
    title: 'Flame Event · Loop 1',
    description: 'Control the opening event and its shared movement.',
    icon: Sparkles,
  },
  {
    href: '/admin/dj-workshop',
    title: 'DJ Workshop',
    description: 'Control music, voice and institutional broadcast.',
    icon: Radio,
  },
]

export default function AdminWorkshop() {
  const { user } = useAuth()
  const router = useRouter()
  const { isVisible, orderFor } = useEnvironmentOrganizer()
  const visibleWorkshops = workshops.filter(item=>isVisible(item.href)).sort((a,b)=>orderFor(a.href)-orderFor(b.href))

  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard')
  }, [user, router])

  if (!user || user.role !== 'admin') return null

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-400">Administration</p>
        <h1 className="mt-2 text-4xl font-black text-white">Admin Workshop</h1>
        <p className="mt-2 text-sm text-slate-500">Create and control living Weave systems from Administration.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleWorkshops.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group rounded-2xl border border-slate-800 bg-slate-900/55 p-6 transition hover:border-cyan-500/40 hover:bg-slate-900">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white group-hover:text-cyan-200">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
