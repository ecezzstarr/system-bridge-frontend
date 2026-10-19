'use client'

import Link from 'next/link'
import { ArrowRight, DoorOpen, Flame, Radio, ShoppingBag, Waves } from 'lucide-react'

export type FlameWorldCustomerDoor = {
  public_slug: string
  name: string
  description?: string | null
  platform_name?: string | null
  market_section?: string | null
  level: 'door' | 'storefront' | 'market_hall'
  offer_count: number
}

/**
 * The Burning River is the shared visual ground, not a gallery of fake doors.
 * Each lit portal is backed by an opened public Client enterprise from
 * /api/public/client-market; the destination stays the existing public market.
 * Private File Folder data is never exposed here.
 */
export function FlameEventOpenWorld({
  enterprises,
  role,
}: {
  enterprises: FlameWorldCustomerDoor[]
  role: 'admin' | 'agent' | 'bridger' | 'client'
}) {
  return (
    <section
      className="flame-world relative isolate overflow-hidden border-b border-amber-200/20 bg-[#061c35] text-white"
      aria-label="Flame Event Burning River open world"
      data-flame-event-open-world="burning-river"
      data-flame-event-location="system-switch"
    >
      <div className="flame-world-scenery pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="flame-world-radiance pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 flex min-h-[690px] flex-col px-4 pb-5 pt-5 sm:min-h-[740px] sm:px-7 sm:pt-8 lg:min-h-[790px] lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-[29rem] rounded-2xl border border-white/15 bg-[#071b35]/55 px-4 py-3 shadow-[0_20px_65px_rgba(4,15,36,.25)] backdrop-blur-md sm:p-5">
            <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.2em] text-amber-100">
              <Flame className="h-3.5 w-3.5 text-amber-300" /> Flame Event · Open World
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-.035em] text-white sm:text-4xl">
              Burning River
            </h2>
            <p className="mt-1 text-xs font-semibold tracking-[.12em] text-amber-100/85">The River that Burns</p>
            <p className="mt-3 max-w-sm text-xs leading-5 text-white/80">
              Water and fire move together. Cross System Switch and enter an opened Client Customer Door.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-amber-200/35 bg-[#071b35]/65 px-3 py-2 text-[9px] font-bold uppercase tracking-[.12em] text-amber-100 backdrop-blur-md">
            <Radio className="h-3 w-3 text-amber-200" />
            {enterprises.length} opened {enterprises.length === 1 ? 'door' : 'doors'}
          </div>
        </div>

        <div className="relative mt-auto flex flex-1 flex-col items-center justify-end pb-10 pt-20 sm:pb-12" data-flame-event-crossing="system-switch-customer-doors">
          <div className="pointer-events-none absolute left-1/2 top-[8%] w-[min(88%,38rem)] -translate-x-1/2 text-center sm:top-[9%]">
            <p className="text-[10px] font-black uppercase tracking-[.32em] text-[#fff7d0] [text-shadow:0_2px_9px_rgba(20,37,57,.9),0_0_20px_rgba(253,195,100,.5)] sm:text-base">
              SYSTEM SWITCH
            </p>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-[.28em] text-[#fff6df] [text-shadow:0_2px_8px_rgba(0,0,0,.8)] sm:text-[10px]">
              Bridge of Radiance
            </p>
          </div>

          <div className="flame-world-crossing relative w-full max-w-[1150px]">
            <p className="mb-3 text-center text-[10px] font-black uppercase tracking-[.22em] text-white [text-shadow:0_2px_8px_rgba(7,22,48,.9)] sm:mb-6">
              Customer Doors · Client-built worlds
            </p>
            {enterprises.length ? (
              <div
                className="flame-world-doors flex snap-x snap-mandatory items-end gap-3 overflow-x-auto px-3 pb-4 pt-3 sm:gap-4 sm:px-5"
                aria-label="Opened Client Customer Doors at System Switch"
                data-flame-event-customer-door-hub
              >
                {enterprises.map((enterprise, index) => {
                  const name = enterprise.platform_name || enterprise.name
                  return (
                    <Link
                      key={enterprise.public_slug}
                      href={`/market/${encodeURIComponent(enterprise.public_slug)}`}
                      className="flame-world-door group relative flex h-48 w-[148px] shrink-0 snap-center flex-col items-center justify-end overflow-hidden rounded-t-[4.2rem] rounded-b-xl border-[3px] border-[#ffdfa0] px-3 pb-3 text-center shadow-[0_0_0_1px_rgba(253,194,83,.5),0_0_20px_rgba(245,152,49,.55),0_12px_24px_rgba(11,27,48,.68)] outline-offset-4 transition duration-300 hover:-translate-y-2 hover:shadow-[0_0_0_2px_rgba(255,238,190,.75),0_0_38px_rgba(252,184,64,.8)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100 sm:h-56 sm:w-[170px]"
                      data-flame-event-customer-door={enterprise.public_slug}
                      aria-label={`Enter Customer Door: ${name}`}
                    >
                      <span className="flame-world-door-interior pointer-events-none absolute inset-[3px] rounded-t-[3.8rem] rounded-b-[.55rem]" aria-hidden="true" />
                      <span className="pointer-events-none absolute inset-x-2 top-2 rounded-t-full border-t-2 border-amber-100/70" aria-hidden="true" />
                      <span className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 text-[8px] font-black uppercase tracking-[.15em] text-amber-50 [text-shadow:0_2px_5px_rgba(0,0,0,.8)]">
                        Door {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="relative z-10 mb-auto mt-12 flex h-11 w-11 items-center justify-center rounded-full border border-amber-100/55 bg-[#092946]/65 text-amber-100 shadow-[0_0_26px_rgba(255,207,113,.48)]">
                        <ShoppingBag className="h-5 w-5" />
                      </span>
                      <span className="relative z-10 block w-full break-words rounded-xl border border-[#ffebbc]/40 bg-[#092039]/85 px-2 py-2 backdrop-blur-sm">
                        <span className="block text-xs font-black leading-4 text-white">{name}</span>
                        <span className="mt-1 block text-[9px] text-sky-100/90">
                          {enterprise.market_section || (enterprise.level === 'market_hall' ? 'Market Hall' : 'Customer Market')}
                        </span>
                        <span className="mt-1 inline-flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wide text-amber-200">
                          Enter Door <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
                        </span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="mx-auto flex min-h-48 w-full max-w-sm flex-col items-center justify-center rounded-t-[5rem] rounded-b-2xl border-2 border-amber-200/40 bg-[#0b2b47]/80 px-5 text-center shadow-[0_0_35px_rgba(245,169,75,.2)] backdrop-blur-md" data-flame-event-no-open-doors>
                <DoorOpen className="h-9 w-9 text-amber-200" />
                <p className="mt-3 text-sm font-black text-white">System Switch awaits its first public Customer Door</p>
                <p className="mt-2 text-[11px] leading-5 text-sky-100/75">
                  Opened Client enterprises appear here automatically when published.
                </p>
              </div>
            )}
            <p className="mt-2 text-center text-[10px] font-medium text-white/90 [text-shadow:0_2px_5px_rgba(0,0,0,.9)]">
              {enterprises.length
                ? 'Select a radiant portal to enter that Client’s public enterprise.'
                : 'No private Client File Folder is shown to visitors or staff.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#061d37]/70 px-4 py-3 backdrop-blur-md">
          <span className="inline-flex items-center gap-2 text-[10px] font-semibold text-sky-50">
            <Waves className="h-4 w-4 text-sky-200" /> Water and fire · One moving world
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[.13em] text-amber-100/90">
            {role === 'client' ? 'Client crossing' : 'Staff crossing'} · Enter Customer Door
          </span>
        </div>
      </div>
      <style jsx>{`
        .flame-world-scenery {
          background: linear-gradient(180deg, rgba(6, 21, 43, .05), rgba(6, 21, 43, .04) 50%, rgba(6, 21, 43, .2)),
            url('/weave/flame-event/burning-river-world.svg') center center / cover no-repeat;
          transform: scale(1.02);
          animation: flame-world-breathe 18s ease-in-out infinite alternate;
          will-change: transform;
        }
        .flame-world-radiance {
          background: radial-gradient(ellipse at 52% 58%, rgba(255, 229, 161, .12), transparent 34%),
                      repeating-linear-gradient(105deg, transparent 0 28px, rgba(255, 231, 160, .028) 29px, transparent 32px 83px);
          background-size: auto, 190% 100%;
          animation: flame-world-current 24s linear infinite;
          mix-blend-mode: screen;
        }
        .flame-world-doors {
          scrollbar-width: thin;
          scrollbar-color: #e8b75a rgba(5, 27, 49, .6);
          justify-content: safe center;
          -webkit-overflow-scrolling: touch;
        }
        .flame-world-doors::-webkit-scrollbar { height: 5px; }
        .flame-world-doors::-webkit-scrollbar-thumb { background: #e8b75a; border-radius: 10px; }
        .flame-world-door {
          background: linear-gradient(132deg, #fff1bd, #cb903d 20%, #9d6322 65%, #ffd58b);
        }
        .flame-world-door-interior {
          background: radial-gradient(circle at 50% 15%, rgba(252, 214, 132, .9), transparent 45%),
                      linear-gradient(180deg, rgba(39, 110, 143, .7), rgba(4, 35, 67, .86) 57%, rgba(2, 15, 33, .96)),
                      url('/weave/flame-event/burning-river-world.svg') center / cover;
        }
        @keyframes flame-world-breathe {
          from { transform: scale(1.02) translateX(-.3%); }
          to { transform: scale(1.055) translateX(.3%); }
        }
        @keyframes flame-world-current {
          to { background-position: center, -190% center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .flame-world-scenery, .flame-world-radiance { animation: none; will-change: auto; }
        }
      `}</style>
    </section>
  )
}
