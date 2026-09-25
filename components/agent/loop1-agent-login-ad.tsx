'use client'

import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Network,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'

export const LOOP1_AGENT_LOGIN_AD_KEY = 'weave:show-loop1-agent-ad'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenContinuance: () => void
}

export function Loop1AgentLoginAd({ open, onOpenChange, onOpenContinuance }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] w-[calc(100%-1rem)] max-w-5xl overflow-y-auto border-emerald-300/25 bg-[#06110d] p-0 text-white shadow-2xl shadow-emerald-950/60"
      >
        <DialogTitle className="sr-only">Loop 1 Agent Commission</DialogTitle>
        <DialogDescription className="sr-only">
          Learn how Agents earn from Bridger Prospect purchases in Loop 1.
        </DialogDescription>

        <div className="relative overflow-hidden rounded-lg">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -right-24 top-40 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />

          <button
            type="button"
            aria-label="Close Loop 1 commission advertisement"
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur transition hover:bg-black/70"
          >
            <X className="h-5 w-5" />
          </button>

          <section className="relative border-b border-emerald-300/15 bg-gradient-to-br from-emerald-500/20 via-cyan-300/5 to-transparent px-5 pb-6 pt-8 sm:px-8 sm:pb-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  WEAVE · Agent Continuance
                </div>
                <h2 className="mt-4 text-5xl font-black tracking-[-0.04em] text-emerald-300 sm:text-7xl">
                  LOOP 1
                </h2>
                <p className="mt-1 text-lg font-black uppercase tracking-[0.16em] text-cyan-100 sm:text-2xl">
                  Bridgers move Prospects. Agents share the return.
                </p>
                <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white sm:text-xl">
                  Each time a Bridger attached to your Agent position buys a Prospect package, your Agent position earns 30% of that purchase value.
                </p>
              </div>

              <div className="min-w-[280px] rounded-[1.5rem] border border-emerald-300/20 bg-black/30 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Prospect Purchase Return</p>
                <p className="mt-2 text-6xl font-black text-emerald-300">30%</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Credited as Flame Coin when the eligible Prospect-package purchase is completed.
                </p>
              </div>
            </div>
          </section>

          <section className="relative grid gap-4 p-5 sm:p-8 lg:grid-cols-3">
            <div className="rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/[0.06] p-5">
              <Users className="h-7 w-7 text-cyan-300" />
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">1 · Your Bridger</p>
              <h3 className="mt-1 text-xl font-black text-white">A Bridger is connected to your Agent position.</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Your Loop 1 movement grows through the Bridgers you develop and support.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-violet-400/20 bg-violet-400/[0.06] p-5">
              <Network className="h-7 w-7 text-violet-300" />
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">2 · Prospect Purchase</p>
              <h3 className="mt-1 text-xl font-black text-white">The Bridger buys a Prospect package.</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                The Prospect Engine records the purchase and routes the eligible Agent commission.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
              <CircleDollarSign className="h-7 w-7 text-emerald-300" />
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">3 · Your Return</p>
              <h3 className="mt-1 text-xl font-black text-white">30% returns to your Agent balance.</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Example: a 100 Flame Coin Prospect purchase produces a 30 Flame Coin Agent commission.
              </p>
            </div>
          </section>

          <section className="relative mx-5 mb-5 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 sm:mx-8 sm:mb-8 sm:p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <div>
                <p className="text-sm font-black text-white">Continuance shows the movement behind the number.</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  See each of your Bridgers, their Prospect-package purchase count, the Flame Coin value they moved, and your credited commission history.
                </p>
              </div>
            </div>
          </section>

          <section className="relative border-t border-emerald-300/15 bg-gradient-to-r from-emerald-500/15 via-transparent to-cyan-500/10 p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-300">
                  <TrendingUp className="h-5 w-5" />
                  <p className="text-xs font-black uppercase tracking-[0.2em]">Know your Loop 1 return</p>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  Open Continuance to see the Bridgers and Prospect purchases connected to your Agent earnings.
                </p>
              </div>
              <Button
                type="button"
                onClick={onOpenContinuance}
                className="h-12 shrink-0 bg-emerald-500 px-6 font-black text-black hover:bg-emerald-400"
              >
                Open Continuance
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
