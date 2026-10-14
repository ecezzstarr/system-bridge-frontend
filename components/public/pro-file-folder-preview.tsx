'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Building2,
  DoorOpen,
  FolderOpen,
  PackageOpen,
  ReceiptText,
  Sparkles,
  Store,
  Users,
  WalletCards,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const stations = [
  {
    id: 'customer-door',
    label: 'Customer Door',
    icon: DoorOpen,
    eyebrow: 'Public entrance',
    title: 'Your business opens to customers through one door.',
    copy: 'The Customer Door is the public entrance to the Client business. Customers can see what the Client offers, enter services, place orders and continue into the systems the Client has published.',
  },
  {
    id: 'products',
    label: 'Products + Services',
    icon: PackageOpen,
    eyebrow: 'What you sell',
    title: 'Products, services and systems live inside the same File Folder.',
    copy: 'The Client decides what to build and what to offer. The File Folder keeps the offer, operating system, customer movement and records together instead of splitting the business across disconnected tools.',
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Users,
    eyebrow: 'Participation into daily life',
    title: 'People can carry Client work from the digital environment into real activity.',
    copy: 'The operating side of the File Folder organizes assigned human participation, active work, customer requests and the movement required to carry the Client system into daily life.',
  },
  {
    id: 'orders',
    label: 'Orders + Value',
    icon: ReceiptText,
    eyebrow: 'Recorded movement',
    title: 'Orders, receipts, activity and value remain visible to the Client.',
    copy: 'The Client can see customer movement and the records created by business activity. The preview shows the shape of the environment; live figures only exist after a Client begins operating.',
  },
  {
    id: 'bridge-ai',
    label: 'Bridge AI',
    icon: Bot,
    eyebrow: 'Continuous support',
    title: 'Bridge AI continues with the Client inside the File Folder.',
    copy: 'The same crossing intelligence that helps a prospect enter WEAVE can continue as Client support: understanding the File Folder, recognizing active systems and helping the Client move the next piece of work.',
  },
]

export function ProFileFolderPreview({ standalone = false }: { standalone?: boolean }) {
  const [activeId, setActiveId] = useState(stations[0].id)
  const active = stations.find(station => station.id === activeId) || stations[0]
  const ActiveIcon = active.icon

  return (
    <section
      className={`relative overflow-hidden border border-cyan-300/15 bg-[#020812]/86 text-white ${standalone ? 'min-h-[calc(100dvh-7rem)] rounded-[2rem]' : 'rounded-[1.7rem]'}`}
      data-public-pro-file-folder-preview="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,.10),transparent_34%),radial-gradient(circle_at_90%_78%,rgba(245,158,11,.08),transparent_32%)]" />

      <header className="relative border-b border-white/10 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-[.18em] text-cyan-200">
              <span>Prospect Preview</span>
              <span className="text-white/25">•</span>
              <span>Read-only environment</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[.06]">
                <FolderOpen className="h-5 w-5 text-cyan-200" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Pro File Folder</h2>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400 sm:text-sm">
                  Enter a preview of the Client operating environment before purchasing. Nothing in this preview creates an account, order, payment or live business record.
                </p>
              </div>
            </div>
          </div>

          {!standalone && (
            <Link href="/file-folder-preview">
              <Button variant="outline" className="border-cyan-200/20 bg-cyan-300/[.05] text-cyan-100 hover:bg-cyan-300/10">
                Open full preview <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className="relative grid lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-black/20 p-3 lg:border-b-0 lg:border-r">
          <p className="px-2 pb-2 text-[8px] font-black uppercase tracking-[.18em] text-slate-600">File Folder stations</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
            {stations.map(station => {
              const Icon = station.icon
              const selected = station.id === active.id
              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => setActiveId(station.id)}
                  className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[10px] font-bold transition ${selected ? 'border-cyan-200/25 bg-cyan-300/[.08] text-white' : 'border-white/[.06] bg-white/[.018] text-slate-500 hover:text-slate-200'}`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-cyan-200' : 'text-slate-600'}`} />
                  {station.label}
                </button>
              )
            })}
          </div>
        </aside>

        <div className="min-w-0 p-3 sm:p-5">
          <div className="grid gap-3 xl:grid-cols-[1.2fr_.8fr]">
            <div className="relative min-h-[360px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#06101b]/90 p-4 sm:p-5">
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-cyan-300/[.05] to-transparent" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.2em] text-cyan-300">{active.eyebrow}</p>
                  <h3 className="mt-2 max-w-xl text-xl font-black leading-tight sm:text-2xl">{active.title}</h3>
                  <p className="mt-3 max-w-2xl text-xs leading-5 text-slate-400 sm:text-sm sm:leading-6">{active.copy}</p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[.06]">
                  <ActiveIcon className="h-5 w-5 text-cyan-200" />
                </div>
              </div>

              <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Customer Door', 'Open'],
                  ['Systems', 'Ready'],
                  ['Operations', 'Active'],
                  ['Bridge AI', 'Available'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/[.07] bg-black/25 p-3">
                    <p className="text-[8px] font-black uppercase tracking-[.13em] text-slate-600">{label}</p>
                    <p className="mt-2 text-sm font-black text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="relative mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[.035] p-4">
                  <div className="flex items-center gap-2"><Store className="h-4 w-4 text-emerald-300" /><p className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-200">Customer Door</p></div>
                  <div className="mt-4 rounded-xl border border-white/[.07] bg-black/30 p-3">
                    <p className="text-xs font-black">Your Business</p>
                    <p className="mt-1 text-[9px] text-slate-500">Products · Services · Systems · Customer movement</p>
                    <div className="mt-3 inline-flex rounded-full border border-emerald-300/15 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.12em] text-emerald-200">Enter customer experience</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-300/10 bg-amber-300/[.035] p-4">
                  <div className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-amber-300" /><p className="text-[9px] font-black uppercase tracking-[.14em] text-amber-200">Operating movement</p></div>
                  <div className="mt-4 space-y-2">
                    {['Customer request enters', 'Work is recognized and routed', 'Activity creates a record'].map((item, index) => (
                      <div key={item} className="flex items-center gap-2 text-[9px] text-slate-400">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-200/15 text-[7px] text-amber-200">{index + 1}</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid content-start gap-3">
              <div className="rounded-[1.5rem] border border-violet-300/10 bg-violet-300/[.035] p-4">
                <div className="flex items-center gap-2"><Bot className="h-4 w-4 text-violet-300" /><p className="text-[9px] font-black uppercase tracking-[.16em] text-violet-200">Bridge AI continuity</p></div>
                <p className="mt-3 text-xs leading-5 text-slate-400">Support remains inside the Client environment instead of ending after the prospect crossing.</p>
              </div>

              <div className="rounded-[1.5rem] border border-sky-300/10 bg-sky-300/[.035] p-4">
                <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-sky-300" /><p className="text-[9px] font-black uppercase tracking-[.16em] text-sky-200">Client-owned formation</p></div>
                <p className="mt-3 text-xs leading-5 text-slate-400">The Client owns the business, its products and services, its identity and the systems built inside the File Folder.</p>
              </div>

              <div className="rounded-[1.5rem] border border-emerald-300/10 bg-emerald-300/[.035] p-4">
                <div className="flex items-center gap-2"><WalletCards className="h-4 w-4 text-emerald-300" /><p className="text-[9px] font-black uppercase tracking-[.16em] text-emerald-200">Value through participation</p></div>
                <p className="mt-3 text-xs leading-5 text-slate-400">Income is created through actual products, services, customer activity and useful participation—not by the preview itself.</p>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-white" /><p className="text-[9px] font-black uppercase tracking-[.16em] text-white">Preview boundary</p></div>
                <p className="mt-3 text-[10px] leading-5 text-slate-500">This is a prospect demonstration of the environment structure. A purchased and activated File Folder forms from the Client's own business and contains their live data, systems and movement.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="relative flex flex-col gap-3 border-t border-white/10 bg-black/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-cyan-200">Recognize → Preview → Build → Activate → Operate</p>
          <p className="mt-1 text-[10px] text-slate-500">A real Client File Folder becomes the Client's persistent operating environment inside WEAVE.</p>
        </div>
        <Link href="/file-folder">
          <Button className="bg-white text-[#020812] hover:bg-slate-100">Purchase File Folder <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </Link>
      </footer>
    </section>
  )
}
