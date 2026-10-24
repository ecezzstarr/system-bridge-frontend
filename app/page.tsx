'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Crown,
  DoorOpen,
  Flame,
  Network,
  Orbit,
  Radio,
  Store,
  Workflow,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { WeaveLogo } from '@/components/weave-logo'

const departments = [
  { name: 'Stability', people: 'Agents' },
  { name: 'Hope', people: 'Bridgers' },
  { name: 'A Cat', people: 'Administration' },
  { name: 'Dream', people: 'Clients' },
] as const

const systems = [
  {
    icon: Workflow,
    title: 'Services',
    copy: 'Functions people can enter, use and participate in as real work moves through WEAVE.',
  },
  {
    icon: Orbit,
    title: 'Instruments',
    copy: 'Practical tools that recognize movement, record participation and help people act from where they already are.',
  },
  {
    icon: Network,
    title: 'Systems',
    copy: 'Organized structures that connect people, roles, work, value and opportunity without separating them from real life.',
  },
] as const

const staffEntrances = [
  { name: 'Agent', department: 'Stability', enter: '/login', registration: '/register?role=agent', registrationLabel: 'Join as an Agent' },
  { name: 'Bridger', department: 'Hope', enter: '/login', registration: '/register?role=bridger', registrationLabel: 'Join as a Bridger' },
  { name: 'Client', department: 'Dream', enter: '/client/login', registration: '/client/register', registrationLabel: 'Register with File Number' },
  { name: 'Administration', department: 'A Cat', enter: '/login?portal=admin', registration: null, registrationLabel: null },
] as const

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()
  const [posterMissing, setPosterMissing] = useState(false)

  useEffect(() => {
    if (!user) return
    if (user.role === 'client') router.replace('/client/dashboard')
    else if (user.role === 'agent') router.replace('/agent/dashboard')
    else if (user.role === 'bridger') router.replace('/bridger/dashboard')
    else if (user.role === 'admin') router.replace('/admin/dashboard')
    else router.replace('/dashboard')
  }, [user, router])

  return (
    <div className="weave-public-home relative min-h-screen overflow-x-hidden" data-public-weave-world>
      <div className="relative z-10 min-h-screen">
        <nav className="weave-home-nav sticky top-0 z-50 px-3 py-3 sm:px-5">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <Link href="/" aria-label="WEAVE home"><WeaveLogo size="sm" /></Link>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <Link href="/market" className="rounded-lg px-3 py-2.5 text-slate-200 hover:bg-white/10">Customer Market</Link>
              <Link href="/client/login" className="rounded-lg border border-sky-200/20 px-3 py-2.5 text-sky-100 hover:bg-sky-200/10">Client Portal</Link>
              <Link href="/login" className="rounded-lg px-3 py-2.5 text-slate-200 hover:bg-white/10">Sign In</Link>
            </div>
          </div>
        </nav>

        <main className="weave-home-content mx-auto w-full px-3 pb-16 sm:px-5" data-weave-public-entry-world="true">
          <section className="weave-home-hero relative px-3 py-10 text-center sm:px-8 sm:py-14" data-company-of-time="introduction">
            <div className="weave-home-hero-light pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className="relative mx-auto max-w-5xl">
              <h1 className="weave-home-title text-4xl font-black leading-tight tracking-tight sm:text-6xl md:text-7xl">The Company of Time</h1>
              <p className="weave-home-credit mt-5 text-base font-semibold tracking-wide sm:text-lg">Interaction in Motion presents</p>
              <h2 className="weave-home-subtitle mx-auto mt-5 max-w-4xl text-2xl font-black leading-snug tracking-tight sm:text-4xl">
                The Weave of Presence: System Switch — Bridge of Radiance
              </h2>
              <div className="weave-home-departments mx-auto mt-9 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4" data-company-time-departments>
                {departments.map(department => (
                  <div key={department.name} className="weave-home-department px-3 py-4">
                    <h3 className="text-lg font-black text-white sm:text-xl">{department.name}</h3>
                    <p className="mt-1 text-sm font-medium text-slate-300">{department.people}</p>
                  </div>
                ))}
              </div>
              <p className="weave-home-department-summary mt-6 text-base font-medium leading-relaxed sm:text-lg">The company through the people of its departments</p>
              <div className="weave-home-loops mx-auto mt-9 grid max-w-4xl gap-3 text-left sm:grid-cols-2" data-company-time-loops>
                <div className="weave-home-loop weave-home-loop-flame p-5">
                  <p className="text-base font-black text-white sm:text-lg">Company Loop 1 — Flame Event: Burning River</p>
                  <Link href="/flame-event" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-orange-100 hover:text-white">
                    Explore Burning River <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="weave-home-loop weave-home-loop-country p-5">
                  <p className="text-base font-black text-white sm:text-lg">Company Loop 2 — Country Event: One Nigeria</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">The next company movement, carried by the same departments and their people.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="weave-home-plus-world relative" data-home-plus-file-folder="official-picture">
            <div className="weave-home-plus-heading px-5 pb-3 pt-5 text-center sm:px-8">
              <h2 className="text-2xl font-black sm:text-3xl">Plus File Folder</h2>
            </div>
            {!posterMissing ? (
              <img
                src="/weave/plus-file-folder-white-official.webp"
                alt="Official white Plus File Folder picture with its environment, capabilities, price and market promises"
                width={1229}
                height={1536}
                loading="eager"
                decoding="async"
                onError={() => setPosterMissing(true)}
                className="weave-home-plus-image mx-auto h-auto w-full max-w-[930px] object-contain"
                data-plus-file-folder-official-image
              />
            ) : (
              <div className="mx-auto max-w-xl px-5 py-12 text-center" role="status">
                <p className="text-lg font-bold">Plus File Folder</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">The approved official picture is awaiting publication with this release.</p>
              </div>
            )}
            <div className="weave-home-plus-actions flex flex-wrap justify-center gap-3 px-4 py-4">
              <Link href="/file-folder" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#283d52] px-5 py-3 text-sm font-bold text-white hover:bg-[#16293e]">
                Explore File Folders <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/file-folder-preview" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b9ab8c] px-5 py-3 text-sm font-bold text-[#283d52] hover:bg-[#e8e0d1]">
                View File Folder Preview
              </Link>
            </div>
          </section>

          <section className="weave-home-work-section grid gap-5 lg:grid-cols-[1.15fr_.85fr]" data-home-what-weave-builds>
            <div className="weave-home-work-copy p-5 sm:p-7">
              <p className="text-sm font-bold text-sky-200">What WEAVE Builds</p>
              <h2 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">Technology and systems formed around movement already present in human life.</h2>
              <p className="mt-4 text-base leading-7 text-slate-200">Weave of Presence builds systems, services and instruments around human participation. We work with people and their existing movement to create organized functions, work and value.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {systems.map(({ icon: Icon, title, copy }) => (
                  <article key={title} className="weave-home-system p-4">
                    <Icon className="h-6 w-6 text-sky-200" aria-hidden="true" />
                    <h3 className="mt-3 text-lg font-bold text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-200">{copy}</p>
                  </article>
                ))}
              </div>
            </div>

            <aside className="weave-home-client-entry p-5 sm:p-7" data-home-client-access>
              <p className="text-sm font-bold text-amber-200">Client Access Point</p>
              <h2 className="mt-3 text-2xl font-black sm:text-3xl">Already a WEAVE Client?</h2>
              <p className="mt-4 text-base leading-7 text-slate-200">Enter your Client Portal with your issued WEAVE File Number and secure passkey. Your File Folder, System Switch and Client movement continue from there.</p>
              <p className="mt-7 text-sm font-bold text-amber-200">Authorized Access</p>
              <Link href="/client/login" className="mt-2 inline-flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-amber-200/35 bg-amber-200/10 px-4 py-3 text-base font-bold text-white hover:bg-amber-200/15">
                Open Client Portal <DoorOpen className="h-5 w-5" />
              </Link>
              <Link href="/client/register" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-amber-100 hover:text-white">
                Register with your File Number <ArrowRight className="h-4 w-4" />
              </Link>
            </aside>
          </section>

          <section className="weave-home-staff p-5 sm:p-7" data-home-staff-entry>
            <p className="text-sm font-bold text-sky-200">The Company of Time · Department Entrances</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">Enter WEAVE as staff</h2>
            <p className="mt-3 text-base leading-7 text-slate-200">Agent, Bridger, Client and Administration. Enter through your existing position, or establish a position through the appropriate company route.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {staffEntrances.map(entrance => (
                <div key={entrance.name} className="weave-home-staff-position flex flex-col p-4">
                  <p className="text-sm font-bold text-amber-200">{entrance.department}</p>
                  <h3 className="mt-1 text-xl font-black">{entrance.name}</h3>
                  <Link href={entrance.enter} className="mt-5 inline-flex min-h-11 items-center justify-between gap-2 rounded-lg bg-sky-100 px-4 py-3 text-sm font-bold text-[#09243c] hover:bg-white">
                    Enter position <ArrowRight className="h-4 w-4" />
                  </Link>
                  {entrance.registration && (
                    <Link href={entrance.registration} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-sky-100 hover:underline">
                      {entrance.registrationLabel}
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <Link href="/register" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-100 hover:underline">
              Register for Agent or Bridger participation <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          <section className="weave-home-participation p-5 sm:p-7" data-home-farm-to-family>
            <p className="text-sm font-bold text-emerald-200">WEAVE · Stability and Lifestyle</p>
            <h2 className="mt-2 text-xl font-black sm:text-2xl">Continue into real company activity</h2>
            <p className="mt-3 text-sm leading-6 text-slate-200">Browse WEAVE Family Food, explore Farm to Family and find available ways to participate. Published products and actual recorded orders remain distinct from artwork or estimates.</p>
            <Link href="/food-store" className="weave-home-food-picture mt-5 block w-full max-w-md overflow-hidden" aria-label="Browse WEAVE Family Food products">
              <img src="/weave-food/weave-family-products.avif" alt="WEAVE Family Food collection — the company's food products, with stock and pricing verified inside the Family Food Store" width={1200} height={700} loading="lazy" className="h-auto w-full object-cover"/>
            </Link>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/food-store" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-200/30 px-4 py-3 text-sm font-bold text-emerald-100 hover:bg-emerald-200/10"><Store className="h-4 w-4" /> Family Food Store</Link>
              <Link href="/lifestyle" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-200/30 px-4 py-3 text-sm font-bold text-emerald-100 hover:bg-emerald-200/10"><BriefcaseBusiness className="h-4 w-4" /> Lifestyle</Link>
              <Link href="/market" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-200/30 px-4 py-3 text-sm font-bold text-emerald-100 hover:bg-emerald-200/10"><Crown className="h-4 w-4" /> Customer Market</Link>
              <Link href="/stream" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-200/30 px-4 py-3 text-sm font-bold text-emerald-100 hover:bg-emerald-200/10"><Radio className="h-4 w-4" /> Stream Network</Link>
              <Link href="/enterprise" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-200/30 px-4 py-3 text-sm font-bold text-emerald-100 hover:bg-emerald-200/10"><Network className="h-4 w-4" /> Enterprise Territory</Link>
              <Link href="/flame-event" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-orange-200/30 px-4 py-3 text-sm font-bold text-orange-100 hover:bg-orange-200/10"><Flame className="h-4 w-4" /> Burning River</Link>
            </div>
          </section>

          <section className="weave-home-ai p-5 sm:p-7" data-ai-participation="public-world">
            <div className="flex items-start gap-3">
              <Bot className="mt-1 h-6 w-6 shrink-0 text-violet-200" />
              <div>
                <h2 className="text-lg font-bold">AI has a place inside participation</h2>
                <p className="mt-2 text-sm leading-6 text-slate-200">AI participates where human movement is happening: recognizing authorized context, preparing work, guiding routes and extending capability. People remain the source of authority, ownership, approval and value movement.</p>
              </div>
            </div>
          </section>
        </main>

        <footer className="weave-home-footer px-4 py-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <WeaveLogo size="sm" />
            <p className="text-sm font-semibold text-slate-300">The Company of Time · Interaction in Motion</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
