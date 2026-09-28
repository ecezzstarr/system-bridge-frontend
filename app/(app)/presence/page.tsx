'use client'

import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  CircleUserRound,
  FileText,
  Wallet,
} from 'lucide-react'

const PLACES = [
  {
    label:'Standing',
    detail:'See the position, recognition, File Number and access WEAVE currently records for you.',
    href:'/weave/standing',
    consequence:'Recognized position',
    icon:CircleUserRound,
  },
  {
    label:'Presences',
    detail:'Find the people and recognized presences participating across WEAVE.',
    href:'/profiles',
    consequence:'Human presence',
    icon:CircleUserRound,
  },
  {
    label:'Record',
    detail:'Read the movement record that preserves what has happened across your participation.',
    href:'/ledger',
    consequence:'Recorded movement',
    icon:BookOpen,
  },
  {
    label:'Holding',
    detail:'Open the value-holding place for Flame Coin and the movement attached to it.',
    href:'/wallet',
    consequence:'Value position',
    icon:Wallet,
  },
]

export default function PresenceDistrictPage() {
  return (
    <main
      className="relative min-h-[calc(100dvh-4rem)] overflow-hidden px-3 pb-10 pt-20 md:px-6"
      data-weave-room="presence-district"
      data-presence-district="continuous-presence-axis"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-16 h-[75%] w-px -translate-x-1/2 bg-gradient-to-b from-sky-200/10 via-sky-200/30 to-transparent" />
        <div className="absolute left-1/2 top-28 h-[65%] w-[min(76vw,820px)] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,.06),transparent_68%)] blur-3xl" />
      </div>

      <section className="relative mx-auto w-full max-w-5xl">
        <header className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-sky-200/20 bg-sky-300/[0.05]">
            <FileText className="h-5 w-5 text-sky-200" />
          </div>
          <p className="mt-4 text-[8px] font-black uppercase tracking-[.24em] text-sky-200/70">Bridge Plaza · Presence District</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">Presence has a place before movement becomes work.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Standing, identity, record and value remain connected here. Each place carries one function; the district only organizes their relationship.
          </p>
        </header>

        <div className="relative mx-auto mt-12 max-w-4xl">
          <div className="absolute bottom-0 left-5 top-0 w-px bg-gradient-to-b from-sky-200/35 via-cyan-200/15 to-transparent md:left-1/2 md:-translate-x-1/2" />

          <div className="space-y-5">
            {PLACES.map((place,index)=>{
              const Icon=place.icon
              const right=index%2===1
              return (
                <div
                  key={place.href}
                  className="relative grid min-h-32 grid-cols-[40px_minmax(0,1fr)] gap-3 md:grid-cols-[1fr_56px_1fr] md:gap-5"
                >
                  <div className={`hidden md:block ${right?'md:col-start-3':''}`}>
                    <Link
                      href={place.href}
                      className="group flex h-full min-h-32 flex-col justify-center border-y border-white/[0.07] px-5 py-4 transition hover:border-sky-200/25 hover:bg-white/[0.018]"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[8px] font-black uppercase tracking-[.16em] text-sky-200/60">{place.consequence}</p>
                          <h2 className="mt-1 text-lg font-black text-white">{place.label}</h2>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-sky-200" />
                      </div>
                      <p className="mt-2 max-w-xl text-xs leading-5 text-slate-400">{place.detail}</p>
                    </Link>
                  </div>

                  <div className="relative z-10 flex items-center justify-center md:col-start-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-200/20 bg-[#07101b] shadow-[0_0_28px_rgba(56,189,248,.09)]">
                      <Icon className="h-4 w-4 text-sky-100" />
                    </div>
                  </div>

                  <Link
                    href={place.href}
                    className="group flex min-h-32 flex-col justify-center border-y border-white/[0.07] px-1 py-4 transition hover:border-sky-200/25 md:hidden"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-[.16em] text-sky-200/60">{place.consequence}</p>
                        <h2 className="mt-1 text-base font-black text-white">{place.label}</h2>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-sky-200" />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{place.detail}</p>
                  </Link>

                  {!right && (
                    <div className="hidden md:col-start-3 md:flex md:items-center">
                      <p className="max-w-xs text-[9px] font-semibold uppercase tracking-[.12em] text-slate-600">
                        Place {String(index+1).padStart(2,'0')} · enter to continue
                      </p>
                    </div>
                  )}
                  {right && (
                    <div className="hidden md:col-start-1 md:row-start-1 md:flex md:items-center md:justify-end">
                      <p className="max-w-xs text-right text-[9px] font-semibold uppercase tracking-[.12em] text-slate-600">
                        Place {String(index+1).padStart(2,'0')} · enter to continue
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
