'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  BriefcaseBusiness,
  DoorOpen,
  Gamepad2,
  Network,
  Orbit,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-provider'
import { WeaveLogo } from '@/components/weave-logo'
import { WEAVE_SYSTEM_MAP } from '@/lib/weave-system-map'

const WeaveHero3D = dynamic(
  () => import('@/components/weave-hero-3d').then(m => m.WeaveHero3D),
  { ssr: false }
)

const movement = ['Presence', 'Interaction', 'Work', 'Value', 'Participation', 'Livelihood']

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
]

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) router.push('/weave')
  }, [user, router])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#020815] text-white">
      <div className="relative z-10 min-h-screen">
        <nav className="sticky top-0 z-50 border-b border-sky-300/10 bg-[#03101d]/76 px-3 py-2.5 backdrop-blur-2xl sm:px-5">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <WeaveLogo size="sm" />

            <div className="flex items-center gap-1.5">
              <Link href="/client/login">
                <Button
                  variant="outline"
                  className="h-9 border-sky-300/20 bg-sky-400/[0.06] px-3 text-[9px] font-black uppercase tracking-[0.10em] text-sky-100 hover:bg-sky-400/10"
                >
                  Client Portal
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="h-9 px-3 text-[9px] font-black uppercase tracking-[0.10em] text-slate-300 hover:bg-white/[0.04] hover:text-white"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-4 sm:px-5 sm:pt-7">
          <section className="relative overflow-hidden rounded-[1.7rem] border border-sky-300/10 bg-[#030a15]/52 p-4 shadow-[0_30px_100px_rgba(2,8,23,.5)] backdrop-blur-md sm:p-6 md:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,.09),transparent_30%),radial-gradient(circle_at_85%_35%,rgba(245,158,11,.05),transparent_25%)]" />

            <div className="relative grid items-center gap-4 md:grid-cols-[1.12fr_.88fr]">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-[0.20em]">
                  <span className="text-sky-300">The Weave of Presence</span>
                  <span className="text-white/20">•</span>
                  <span className="text-amber-300">System Switch</span>
                  <span className="text-white/20">•</span>
                  <span className="text-emerald-300">Bridge Radiance</span>
                </div>

                <h1 className="mt-4 text-3xl font-black leading-[1.04] tracking-tight text-white sm:text-4xl md:text-6xl">
                  Interaction in Motion.
                  <span className="mt-1 block bg-gradient-to-r from-sky-200 via-white to-amber-200 bg-clip-text text-transparent">
                    A real-life gaming operating system for human presence.
                  </span>
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  {WEAVE_SYSTEM_MAP.identity.publicDescription}
                </p>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Link href="/register" className="w-full sm:w-auto">
                    <Button className="h-11 w-full border-0 bg-white px-5 text-xs font-black text-[#020815] hover:bg-slate-100 sm:w-auto">
                      Enter WEAVE
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>

                  <Link href="/client/login" className="w-full sm:w-auto">
                    <Button
                      variant="outline"
                      className="h-11 w-full border-sky-300/25 bg-sky-400/[0.07] px-5 text-xs font-black text-sky-100 hover:bg-sky-400/12 sm:w-auto"
                    >
                      <DoorOpen className="mr-2 h-4 w-4" />
                      Access Client Portal
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="relative h-[250px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/15 sm:h-[320px] md:h-[390px]">
                <div className="pointer-events-none absolute inset-x-5 top-4 z-10 flex items-center justify-between text-[7px] font-black uppercase tracking-[0.16em] text-white/40">
                  <span>Human Presence</span>
                  <span>Living World</span>
                </div>
                <WeaveHero3D />
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {movement.map((item, index) => (
                <div
                  key={item}
                  className="rounded-xl border border-white/10 bg-black/18 px-2 py-2.5 text-center backdrop-blur-sm"
                >
                  <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-500">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <p className="mt-1 text-[9px] font-bold text-white">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-3 grid gap-3 md:grid-cols-[1.15fr_.85fr]">
            <div className="rounded-[1.6rem] border border-white/10 bg-[#020713]/54 p-4 backdrop-blur-md sm:p-5">
              <p className="text-[8px] font-black uppercase tracking-[0.20em] text-sky-300">What WEAVE Builds</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                Technology and systems formed around movement already present in human life.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Weave of Presence builds systems, services and instruments around human participation. We work with people and their existing movement to create organized functions, work and value.
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {systems.map(({ icon: Icon, title, copy }) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-300/15 bg-sky-400/[0.06]">
                      <Icon className="h-4 w-4 text-sky-300" />
                    </div>
                    <h3 className="mt-2 text-xs font-black uppercase tracking-[0.08em] text-white">{title}</h3>
                    <p className="mt-1.5 text-[10px] leading-4 text-slate-500">{copy}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="relative overflow-hidden rounded-[1.6rem] border border-amber-300/15 bg-amber-400/[0.035] p-4 backdrop-blur-md sm:p-5">
              <div className="pointer-events-none absolute right-[-18%] top-[-22%] h-40 w-40 rounded-full bg-amber-300/[0.06] blur-3xl" />
              <div className="relative">
                <p className="text-[8px] font-black uppercase tracking-[0.20em] text-amber-300">Client Access Point</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Already a WEAVE Client?</h2>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Enter your Client Portal with your issued WEAVE File Number and secure passkey. Your File Folder, System Switch and Client movement continue from there.
                </p>

                <Link href="/client/login" className="mt-4 block">
                  <div className="flex items-center justify-between rounded-2xl border border-amber-200/20 bg-black/22 px-4 py-4 transition active:scale-[.99]">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-amber-300">Authorized Access</p>
                      <p className="mt-1 text-sm font-black text-white">Open Client Portal</p>
                    </div>
                    <DoorOpen className="h-5 w-5 text-amber-200" />
                  </div>
                </Link>

                <Link href="/client/register" className="mt-2 block text-center text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-white">
                  Register with your File Number
                </Link>
              </div>
            </aside>
          </section>

          <section className="mt-3 rounded-[1.6rem] border border-white/10 bg-black/18 p-4 backdrop-blur-md sm:p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-sky-300/12 bg-sky-400/[0.035] p-4">
                <Gamepad2 className="h-5 w-5 text-sky-300" />
                <h3 className="mt-3 text-sm font-black text-white">Real-life gaming</h3>
                <p className="mt-1.5 text-[10px] leading-4 text-slate-500">The player moves through real participation, choices, work and opportunity rather than a fictional level system.</p>
              </div>
              <div className="rounded-2xl border border-emerald-300/12 bg-emerald-400/[0.035] p-4">
                <BriefcaseBusiness className="h-5 w-5 text-emerald-300" />
                <h3 className="mt-3 text-sm font-black text-white">Participation becomes work</h3>
                <p className="mt-1.5 text-[10px] leading-4 text-slate-500">WEAVE organizes what people are already doing into functions that can become useful work and value.</p>
              </div>
              <div className="rounded-2xl border border-violet-300/12 bg-violet-400/[0.035] p-4">
                <Sparkles className="h-5 w-5 text-violet-300" />
                <h3 className="mt-3 text-sm font-black text-white">One operating world</h3>
                <p className="mt-1.5 text-[10px] leading-4 text-slate-500">Services, instruments, systems and user positions remain connected inside the same moving WEAVE environment.</p>
              </div>
            </div>
          </section>
        </main>

        <footer className="relative z-10 border-t border-sky-300/10 bg-[#020815]/72 px-4 py-8 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <WeaveLogo size="sm" />
            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Human presence · interaction · participation · work · value · opportunity
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
