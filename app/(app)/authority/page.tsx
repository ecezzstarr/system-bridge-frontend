'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Code, Database, Brain, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const authoritySystems = [
  {
    title: 'Developer Workshop',
    description: 'System refinement layer for ecosystem operators. Build and refine origin systems.',
    tags: ['NEXT.JS 16', 'POSTGRES', 'GCLOUD'],
    href: '/admin/dev-workshop',
    icon: Code,
    iconClass: 'text-purple-400',
  },
  {
    title: 'Authority Workshops',
    description: 'Define and govern the core protocols and permissions of the WEAVE ecosystem.',
    tags: ['PROTOCOL', 'GOVERNANCE', 'KEYS'],
    href: '/authority/workshops',
    icon: Database,
    iconClass: 'text-emerald-400',
  },
  {
    title: 'AI Registry',
    description: 'EIGHT, RIVER and ECHO — the intelligence layer connected to Ecosystem Authority.',
    tags: ['EIGHT', 'RIVER', 'ECHO'],
    href: '/authority/workshops?tab=ai-foundry',
    icon: Brain,
    iconClass: 'text-blue-400',
  },
]

export default function EcosystemAuthority() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard')
  }, [user, router])

  if (!user || user.role !== 'admin') return null

  return (
    <div className="min-h-screen bg-[#05050f] text-slate-200">
      <div className="min-h-screen bg-[radial-gradient(circle_at_50%_10%,rgba(88,28,135,0.18),transparent_38%)] px-5 py-8 md:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400">Weave of Presence</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Ecosystem Authority</h1>
              <p className="mt-2 text-sm text-slate-400">Authority Space · Registry, Workshops & Intelligence</p>
            </div>
            <Button variant="ghost" onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-white">Exit</Button>
          </header>

          <section className="space-y-5">
            {authoritySystems.map(({ title, description, tags, href, icon: Icon, iconClass }) => (
              <Link key={title} href={href} className="block">
                <Card className="group relative overflow-hidden rounded-3xl border-white/10 bg-[#10152a]/90 p-7 md:p-10 shadow-[0_0_40px_rgba(59,130,246,0.06)] transition-all hover:border-purple-400/30 hover:bg-[#131a32]">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex min-w-0 items-start gap-5">
                      <div className={`mt-1 shrink-0 ${iconClass}`}><Icon className="h-12 w-12 md:h-14 md:w-14" strokeWidth={1.8} /></div>
                      <div>
                        <h2 className="text-2xl font-bold text-white md:text-3xl">{title}</h2>
                        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">{description}</p>
                        <div className="mt-6 flex flex-wrap gap-3">
                          {tags.map(tag => <span key={tag} className="rounded-md border border-slate-600/70 bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-300">{tag}</span>)}
                        </div>
                      </div>
                    </div>
                    <div className="hidden shrink-0 items-center gap-2 text-lg font-semibold text-slate-400 md:flex">Open <ChevronRight className="h-6 w-6" /></div>
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-400 md:hidden">Open <ChevronRight className="h-5 w-5" /></div>
                </Card>
              </Link>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
