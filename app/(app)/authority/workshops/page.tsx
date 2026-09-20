'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Bot,
  ChevronRight,
  Code,
  Database,
  FileText,
  Globe,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EcosystemNav } from '@/components/ecosystem-nav'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth-provider'

const panels = {
  workshops: {
    eyebrow: 'Authority Workshop',
    title: 'Company Loops & Client workshops',
    description:
      'Publish company loops, shape participant positions, and manage the workshop surfaces already exposed through Ecosystem Authority.',
    cards: [
      { title: 'EIGHT Developer Workshop', description: 'Open the existing live developer workspace and system tools.', href: '/admin/dev-workshop', icon: Code, tags: ['EIGHT', 'DEVELOPMENT'] },
      { title: 'Client Vault', description: 'Review client balances and withdrawal requests.', href: '/admin/client-vault', icon: Database, tags: ['CLIENTS', 'VAULT'] },
      { title: 'Campaign Flame', description: 'Review crossings and originating provider allocations.', href: '/admin/campaign-flame', icon: Sparkles, tags: ['FLAME', 'REPORTS'] },
      {
        title: 'Company Loop Workshop',
        description:
          'Create and publish company loops, agreement references, participant positions, functions, and boundaries.',
        href: '/admin/loop-workshop',
        icon: FileText,
        tags: ['LOOPS', 'AGREEMENTS', 'POSITIONS'],
      },
      {
        title: 'Client Workshop Support',
        description:
          'Approve agent participation for Client workshops and review the authorized support already attached to a File Folder.',
        href: '/admin/bridge-ai',
        icon: Database,
        tags: ['CLIENT WORKSHOP', 'SUPPORT', 'APPROVAL'],
      },
    ],
  },
  'ai-foundry': {
    eyebrow: 'Authority Workshop',
    title: 'AI registry & interaction intelligence',
    description:
      'Open the Bridge AI reporting and registry surfaces connected to the current Ecosystem Authority flow.',
    cards: [
      {
        title: 'Bridge AI Reports',
        description:
          'Review interaction intelligence reports, connect approved agents, and observe what the workshop has learned.',
        href: '/admin/bridge-ai',
        icon: Bot,
        tags: ['BRIDGE AI', 'REPORTS', 'REGISTRY'],
      },
      {
        title: 'Origin Systems Network',
        description:
          'Inspect the current origin systems network and ecosystem authority inventory from the same administration surface.',
        href: '/admin/origin-systems',
        icon: Globe,
        tags: ['ORIGIN', 'SYSTEMS', 'AUTHORITY'],
      },
    ],
  },
} as const

type PanelKey = keyof typeof panels

export default function AuthorityWorkshopsPage() {
  const { user, isLoading, isInitialized } = useAuth()
  const loading = isLoading || !isInitialized
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentTab = (searchParams.get('tab') as PanelKey) || 'workshops'
  const activeTab = currentTab in panels ? currentTab : 'workshops'
  const panel = panels[activeTab]

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard')
    }
  }, [loading, router, user])

  if (loading || !user || user.role !== 'admin') {
    return (
      <main className="min-h-screen bg-[#05050f] px-5 py-8 text-slate-200 md:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-sm text-slate-400">
          {loading ? 'Loading Authority Workshop…' : 'Redirecting to the dashboard…'}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#05050f] text-slate-200">
      <div className="min-h-screen bg-[radial-gradient(circle_at_50%_10%,rgba(88,28,135,0.18),transparent_38%)] px-5 py-8 md:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400">
                  Weave of Presence
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
                  Authority Workshop
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Ecosystem Authority surface for Company Loops, Client workshops, and AI
                  registry work.
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/authority">
                  <Button variant="outline" className="border-slate-700 bg-transparent text-slate-300">
                    Ecosystem Authority
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-slate-400 hover:text-white">
                    Exit
                  </Button>
                </Link>
              </div>
            </div>

            <EcosystemNav currentSystem="authority" />

            <Tabs value={activeTab} className="w-full">
              <TabsList className="grid w-full max-w-xl grid-cols-2 bg-slate-900/70">
                <TabsTrigger value="workshops" asChild>
                  <Link href="/authority/workshops">Workshops</Link>
                </TabsTrigger>
                <TabsTrigger value="ai-foundry" asChild>
                  <Link href="/authority/workshops?tab=ai-foundry">AI Registry</Link>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </header>

          <section className="rounded-3xl border border-white/10 bg-[#10152a]/90 p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge className="border border-cyan-400/20 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/10">
                  {panel.eyebrow}
                </Badge>
                <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
                  {panel.title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                  {panel.description}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  Active route
                </p>
                <p className="mt-2 text-sm font-semibold text-white">/authority/workshops</p>
              </div>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {panel.cards.map(({ title, description, href, icon: Icon, tags }) => (
                <Link key={title} href={href} className="block">
                  <Card className="group h-full rounded-3xl border-white/10 bg-black/20 p-6 transition hover:border-purple-400/30 hover:bg-black/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="rounded-2xl bg-purple-500/10 p-3 text-purple-300">
                        <Icon className="h-6 w-6" />
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-500 transition group-hover:text-white" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="mt-8 rounded-3xl border border-emerald-400/15 bg-emerald-400/5 p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 text-emerald-300" />
                <div>
                  <p className="text-sm font-semibold text-white">Current authority path</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Authority work is now reached through <span className="text-white">Ecosystem Authority</span>{' '}
                    and this <span className="text-white">/authority/workshops</span> route, rather than an
                    obsolete standalone admin workshop page.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <SummaryCard
              icon={Code}
              title="Origin refinement"
              description="Use the Developer Workshop and Origin Systems Network to refine the ecosystem base."
            />
            <SummaryCard
              icon={Database}
              title="Company loops"
              description="Keep Company Loops and Client workshops aligned with the current participant positions."
            />
            <SummaryCard
              icon={Bot}
              title="Bridge AI"
              description="Review interaction intelligence and workshop support from the current authority surface."
            />
          </section>
        </div>
      </div>
    </main>
  )
}

function SummaryCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Code
  title: string
  description: string
}) {
  return (
    <Card className="rounded-3xl border-white/10 bg-black/20 p-5">
      <Icon className="h-5 w-5 text-cyan-300" />
      <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </Card>
  )
}
