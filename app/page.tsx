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
import { PublicReachRequestForm } from '@/components/reach-delivery/public-request-form'
import { ReachRequestTracker } from '@/components/reach-delivery/request-tracker'

const departments = [
  { name: 'Stability', people: 'Agents', purpose: 'Serve customers and distribute products.' },
  { name: 'Hope', people: 'Bridgers', purpose: 'Introduce people to company opportunities.' },
  { name: 'A Time', people: 'Administrations', purpose: 'Coordinate, verify and support work.' },
  { name: 'Dream Lovely', people: 'Clients', purpose: 'Build businesses and serve customers.' },
] as const

const systems = [
  {
    icon: Workflow,
    title: 'Services',
    copy: 'Agents fulfil verified requests, coordinate deliveries and earn through completed, recorded work.',
  },
  {
    icon: Orbit,
    title: 'Instruments',
    copy: 'Bridgers use outreach, communication and creative tools to introduce people to useful company services.',
  },
  {
    icon: Network,
    title: 'Systems',
    copy: 'Clients form their File Folder, open Customer Doors, coordinate employees and follow real business records.',
  },
] as const

const staffEntrances = [
  { name: 'Agent', department: 'Stability', enter: '/login', registration: '/register?role=agent', registrationLabel: 'Join as an Agent' },
  { name: 'Bridger', department: 'Hope', enter: '/login', registration: '/register?role=bridger', registrationLabel: 'Join as a Bridger' },
  { name: 'Client', department: 'Dream Lovely', enter: '/client/login', registration: '/client/register', registrationLabel: 'Register with File Number' },
  { name: 'Administrations', department: 'A Time', enter: '/login?portal=admin', registration: null, registrationLabel: null },
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
                The Weave of Presence
                <span className="weave-home-subject">System Switch — Bridge of Radiance</span>
              </h2>
              <p className="weave-home-invitation">Give your work a place. Give your dreams a living form.</p>
              <p className="mx-auto mt-5 max-w-3xl text-base font-medium leading-7 text-slate-100" data-home-system-switch-explanation="website-to-3d">
                Weave connects people, company tools and real work. System Switch is the entrance to a shared 3D Open World where visitors can find Client businesses and Customer Doors. Your own position determines which private workspaces you can enter.
              </p>
              <div className="weave-home-hero-actions">
                <Link href="/file-folder-preview" className="weave-action-primary">Discover File Folders <ArrowRight className="h-4 w-4" /></Link>
                <Link href="/login" className="weave-action-secondary">Enter WEAVE <ArrowRight className="h-4 w-4" /></Link>
              </div>
              <div className="weave-home-departments mx-auto mt-9 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4" data-company-time-departments>
                {departments.map(department => (
                  <div key={department.name} className="weave-home-department px-3 py-4">
                    <h3 className="text-lg font-black text-white sm:text-xl">{department.name}</h3>
                    <p className="mt-1 text-sm font-medium text-slate-300">{department.people}</p>
                    <p className="weave-home-role-purpose mt-2">{department.purpose}</p>
                  </div>
                ))}
              </div>
              <p className="weave-home-department-summary mt-6 text-base font-medium leading-relaxed sm:text-lg">One company. Many people. Work moving through time.</p>
              <p className="mx-auto mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-200 sm:text-base" data-home-company-worldwide="true">Across borders, Agents serve customers, Bridgers connect people to opportunities, and Clients build businesses. Administrations coordinates and verifies the work so responsibilities, payments and progress can be recorded.</p>
              <div className="weave-home-loops mx-auto mt-9 grid max-w-4xl gap-3 text-left sm:grid-cols-3" data-company-time-loops>
                <div className="weave-home-loop weave-home-loop-flame p-5">
                  <p className="weave-home-loop-label">Company Loop 1 · Flame Event</p>
                  <h3>Burning River</h3>
                  <Link href="/flame-event" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-orange-100 hover:text-white">
                    Explore Burning River <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="weave-home-loop weave-home-loop-country p-5">
                  <p className="weave-home-loop-label">Company Loop 2 · Country Event</p>
                  <h3>Country Formation</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">Many potentials, moving together through the work of the departments.</p>
                </div>
                <div className="weave-home-loop weave-home-loop-time p-5">
                  <p className="weave-home-loop-label">Company Loop 3 · Individual Event</p>
                  <h3>Self Upliftment</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">Return to yourself with the experience and records of your participation.</p>
                </div>
              </div>
              <section data-burning-river-saturday-entry="true" className="mx-auto mt-6 max-w-4xl rounded-2xl border border-amber-300/35 bg-slate-950/80 p-5 text-left shadow-xl sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200">Burning River · Every Saturday</p>
                <h3 className="mt-2 text-xl font-black leading-snug text-white sm:text-2xl">Free Agent and Bridger entry · 8:00–10:00 a.m. WAT</h3>
                <p className="mt-2 text-sm leading-6 text-slate-200">During the Flame Event, new visitors can open a Stability (Agent) or Hope (Bridger) account without the entry-ticket payment. Registration must be completed within the Saturday window. Standard prices apply at other times.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/register?role=agent" className="inline-flex min-h-11 items-center rounded-lg bg-amber-200 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-100">Join as Agent</Link>
                  <Link href="/register?role=bridger" className="inline-flex min-h-11 items-center rounded-lg border border-amber-200/50 px-4 py-2.5 text-sm font-bold text-amber-100 hover:bg-white/10">Join as Bridger</Link>
                </div>
              </section>
            </div>
          </section>

          <section className="weave-home-plus-world relative" data-home-plus-file-folder="official-picture">
            <div className="weave-home-plus-heading px-5 pb-3 pt-5 text-center sm:px-8">
              <p className="weave-eyebrow">Dream Lovely · The Plus File Folder</p>
              <h2 className="text-2xl font-black sm:text-3xl">Plus File Folder</h2>
              <p className="weave-home-plus-introduction">Your business, your systems, and a place for the work to grow.</p>
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
            <div className="weave-home-plus-guide" data-home-plus-readable-explanation="true">
              <p>
                Plus File Folder is a premium Client business environment inside Weave. The private world belongs to its verified owner; visitors reach the business through its published Customer Door, while employees use only the access granted to them.
              </p>
              <ul className="weave-home-plus-facts" aria-label="Plus File Folder capabilities">
                <li>Private business world</li>
                <li>Customer Door</li>
                <li>Workshops and systems</li>
                <li>Authorized employees</li>
                <li>Activity records</li>
              </ul>
              <p>Explore the File Folder plans and verified purchase terms before choosing a tier. Building a business takes participation, customers and completed work; results are not guaranteed.</p>
            </div>
            <div className="weave-home-plus-actions flex flex-wrap justify-center gap-3 px-4 py-4">
              <Link href="/file-folder" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#283d52] px-5 py-3 text-sm font-bold text-white hover:bg-[#16293e]">
                Explore File Folders <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/file-folder-preview" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b9ab8c] px-5 py-3 text-sm font-bold text-[#283d52] hover:bg-[#e8e0d1]">
                View File Folder Preview
              </Link>
              <Link href="/file-folder" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-200/35 bg-emerald-200/10 px-5 py-3 text-sm font-bold text-emerald-50 hover:bg-emerald-200/15">
                Purchase · Paystack or TRX <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section className="weave-home-work-section grid gap-5 lg:grid-cols-[1.15fr_.85fr]" data-home-what-weave-builds>
            <div className="weave-home-work-copy p-5 sm:p-7">
              <p className="text-sm font-bold text-sky-200">What WEAVE Builds</p>
              <h2 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">From the work you know to the business you envision.</h2>
              <p className="mt-4 text-base leading-7 text-slate-200">Start with the work you already know. Weave offers distinct positions, company tools and business systems for carrying out tasks, reaching customers and keeping records. Each person remains responsible for the work they accept; Administrations supports and verifies company activity.</p>
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
              <p className="mt-4 text-base leading-7 text-slate-200">Your business and records continue beyond each visit. Sign in with your registered account to open your File Folder, review Customer Door activity, manage ongoing work and communicate with authorized staff.</p>
              <p className="mt-7 text-sm font-bold text-amber-200">Authorized Access</p>
              <Link href="/client/login" className="mt-2 inline-flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-amber-200/35 bg-amber-200/10 px-4 py-3 text-base font-bold text-white hover:bg-amber-200/15">
                Open Client Portal <DoorOpen className="h-5 w-5" />
              </Link>
              <Link href="/client/register" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-amber-100 hover:text-white">
                Register with your File Number <ArrowRight className="h-4 w-4" />
              </Link>
            </aside>
          </section>

          <PublicReachRequestForm />
          <div className="weave-home-reach-tracking px-5 pb-6 sm:px-7">
            <div className="mx-auto max-w-5xl"><ReachRequestTracker /></div>
          </div>

          <section className="weave-home-agent-application p-5 sm:p-7" data-reach-agent-application>
            <div className="mx-auto max-w-5xl">
              <p className="text-sm font-bold text-amber-200">Participate in this service</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">Become a Weave Reach Agent</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">Agents make the service possible by carrying approved messages, obtaining sender-funded items and completing other lawful assigned tasks. Apply through the existing Agent entry. Applications do not guarantee assignment or earnings; each request is quoted and accepted before movement.</p>
              <Link href="/register?role=agent" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-lg bg-amber-200 px-5 py-3 text-sm font-black text-slate-950 hover:bg-white">
                Apply to participate as an Agent <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section className="weave-home-presence-signature px-5 py-8 text-center sm:px-7" data-weave-presence-signature>
            <p className="text-xs font-bold uppercase tracking-[.22em] text-sky-200">The Company of Time</p>
            <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">The Weave of Presence</h2>
            <p className="mt-2 text-sm text-slate-300">Interaction in Motion.</p>
          </section>

          <section className="weave-home-staff p-5 sm:p-7" data-home-staff-entry>
            <p className="text-sm font-bold text-sky-200">The Company of Time · Department Entrances</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">Find your place in the company.</h2>
            <p className="mt-3 text-base leading-7 text-slate-200">An Agent works in Stability, a Bridger works in Hope, and a Client builds through Dream Lovely. Administrations coordinates verified company operations. Select your own position to sign in, or follow the appropriate registration path to begin.</p>
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
            <h2 className="mt-2 text-xl font-black sm:text-2xl">The company in everyday life.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-200">Discover Weave Family Food, Farm to Family and the public Customer Market. Explore the services available today, check each offer's terms and use the relevant company entrance when you decide to participate.</p>
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
                <p className="mt-2 text-sm leading-6 text-slate-200">AI supports planning, communication and routine work. People remain responsible for their decisions, customer commitments and verified results; the company keeps the work connected through records and authorized support.</p>
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
