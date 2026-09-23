'use client'

import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  PackageOpen,
  ShoppingBag,
  Sparkles,
  Store,
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
import {
  AGILITY_AGENT_BOX_PRICE_NGN,
  AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_RETAIL_BOX_VALUE_NGN,
  AGILITY_RETAIL_UNIT_PRICE_NGN,
} from '@/lib/agility-catalog'

const naira = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value)

export const AGILITY_AGENT_LOGIN_AD_KEY = 'weave:show-agility-agent-ad'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBuy: () => void
}

export function AgilityAgentLoginAd({ open, onOpenChange, onBuy }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] w-[calc(100%-1rem)] max-w-5xl overflow-y-auto border-orange-300/25 bg-[#100b07] p-0 text-white shadow-2xl shadow-orange-950/60"
      >
        <DialogTitle className="sr-only">Agility Agent Opportunity</DialogTitle>
        <DialogDescription className="sr-only">
          Buy Agility from Weave as a wholesaler or retailer and earn from each completed box.
        </DialogDescription>

        <div className="relative overflow-hidden rounded-lg">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="absolute -right-24 top-40 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />

          <button
            type="button"
            aria-label="Close Agility advertisement"
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur transition hover:bg-black/70"
          >
            <X className="h-5 w-5" />
          </button>

          <section className="relative border-b border-orange-300/15 bg-gradient-to-br from-orange-500/20 via-amber-300/5 to-transparent px-5 pb-6 pt-8 sm:px-8 sm:pb-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/25 bg-orange-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-orange-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  WEAVE · Agent Opportunity
                </div>
                <h2 className="mt-4 text-5xl font-black tracking-[-0.04em] text-orange-300 sm:text-7xl">
                  AGILITY
                </h2>
                <p className="mt-1 text-lg font-black uppercase tracking-[0.16em] text-amber-100 sm:text-2xl">
                  Intelligence in Action
                </p>
                <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-white sm:text-xl">
                  Buy from Weave. Sell fast. Earn from every completed box.
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Morning food already organized into a product people can buy every day. Choose how you want to move it:
                  complete boxes as a wholesaler, or individual packages as a retailer.
                </p>
              </div>

              <div className="grid min-w-[280px] grid-cols-2 gap-2">
                {[
                  ['Agent buys', naira(AGILITY_AGENT_BOX_PRICE_NGN)],
                  ['Sell-out value', naira(AGILITY_RETAIL_BOX_VALUE_NGN)],
                  ['Packages / box', String(AGILITY_PACKAGES_PER_BOX)],
                  ['Gross / box', naira(AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-black/30 p-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
                    <p className="mt-1 text-lg font-black text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="relative grid gap-4 p-5 sm:p-8 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-orange-400/25 bg-gradient-to-br from-orange-400/10 to-transparent p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-300/10 text-orange-300">
                  <Boxes className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">For Wholesalers</p>
                  <h3 className="text-xl font-black text-white">Move volume faster.</h3>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                {[
                  `Buy 1 box from WEAVE: ${naira(AGILITY_AGENT_BOX_PRICE_NGN)}`,
                  `Sell 1 complete box: ${naira(AGILITY_RETAIL_BOX_VALUE_NGN)}`,
                  `Gross profit: ${naira(AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN)} per box`,
                  'Sell complete boxes instead of breaking them into units',
                ].map((line) => (
                  <div key={line} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                    <span className="text-slate-200">{line}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-orange-300/15 bg-black/25 p-4">
                <p className="text-xs text-slate-500">Wholesaler movement</p>
                <p className="mt-1 font-bold text-white">More boxes moved → more ₦2,000 box profits.</p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-emerald-400/25 bg-gradient-to-br from-emerald-400/10 to-transparent p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">For Retailers</p>
                  <h3 className="text-xl font-black text-white">Own the customer relationship.</h3>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                {[
                  `Buy 1 box from WEAVE: ${naira(AGILITY_AGENT_BOX_PRICE_NGN)}`,
                  `${AGILITY_PACKAGES_PER_BOX} complete Agility packages per box`,
                  `Sell each package: ${naira(AGILITY_RETAIL_UNIT_PRICE_NGN)}`,
                  `Gross profit after all 10 sell: ${naira(AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN)}`,
                ].map((line) => (
                  <div key={line} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <span className="text-slate-200">{line}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-emerald-300/15 bg-black/25 p-4">
                <p className="text-xs text-slate-500">Retailer advantage</p>
                <p className="mt-1 font-bold text-white">
                  Daily customers can return to your store again and again. Build patronage while the product moves.
                </p>
              </div>
            </div>
          </section>

          <section className="relative mx-5 mb-5 overflow-hidden rounded-[1.5rem] border border-amber-300/20 bg-amber-300/[0.07] p-5 sm:mx-8 sm:mb-8 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-300">
                  <TrendingUp className="h-5 w-5" />
                  <p className="text-xs font-black uppercase tracking-[0.2em]">Scale your earnings</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-7 gap-y-2">
                  <p className="text-xl font-black text-white">
                    5 boxes = <span className="text-amber-300">₦10,000</span> gross
                  </p>
                  <p className="text-xl font-black text-white">
                    10 boxes = <span className="text-amber-300">₦20,000</span> gross
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.14em]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-3 py-2 text-slate-300">
                  <Users className="h-3.5 w-3.5 text-orange-300" /> Affordable to consumers
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-3 py-2 text-slate-300">
                  <PackageOpen className="h-3.5 w-3.5 text-orange-300" /> Morning food ready to move
                </span>
              </div>
            </div>
          </section>

          <section className="relative border-t border-orange-300/15 bg-gradient-to-r from-orange-500/15 via-transparent to-emerald-500/10 p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xl font-black text-white sm:text-2xl">
                  Agents, buy Agility from Weave and sell.
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Order through WEAVE using OPay. Choose wholesaler or retailer and move Agility your way.
                </p>
              </div>
              <Button
                type="button"
                onClick={onBuy}
                className="h-12 shrink-0 bg-orange-500 px-6 font-black text-black hover:bg-orange-400"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Buy Agility
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
