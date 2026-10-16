'use client'

import { ArrowRight, Boxes, CheckCircle2, HandCoins, MapPin, ShoppingBag, Sparkles, Truck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  AGILITY_AGENT_BOX_PRICE_NGN,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_RETAIL_BOX_VALUE_NGN,
} from '@/lib/agility-catalog'

const naira=(value:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(value)

export const AGILITY_AGENT_LOGIN_AD_KEY='weave:show-agility-agent-ad'

type Props={open:boolean;onOpenChange:(open:boolean)=>void;onBuy:()=>void}

export function AgilityAgentLoginAd({open,onOpenChange,onBuy}:Props){
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent showCloseButton={false} className="max-h-[92vh] w-[calc(100%-1rem)] max-w-5xl overflow-y-auto border-cyan-300/20 bg-[#081014] p-0 text-white shadow-2xl">
      <DialogTitle className="sr-only">WEAVE Agent Distribution</DialogTitle>
      <DialogDescription className="sr-only">Agents buy WEAVE food cartons and distribute them through existing neighborhood outlets.</DialogDescription>
      <div className="relative overflow-hidden rounded-lg">
        <button type="button" aria-label="Close" onClick={()=>onOpenChange(false)} className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white"><X className="h-5 w-5"/></button>

        <section className="border-b border-cyan-300/15 bg-gradient-to-br from-cyan-500/15 via-transparent to-emerald-500/10 px-5 pb-7 pt-9 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.24em] text-cyan-200"><Sparkles className="h-3.5 w-3.5"/>WEAVE · Agent Position</div>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-6xl">BUY. CARRY. SUPPLY.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">The Agent does not run a shop. The Agent buys Agility, Electrolyte and other WEAVE products, carries the cartons into existing shops around them, and keeps the product moving through daily distribution.</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4"><p className="text-[9px] uppercase tracking-[.16em] text-slate-500">Agent carton cost</p><p className="mt-1 text-xl font-black text-white">{naira(AGILITY_AGENT_BOX_PRICE_NGN)}</p></div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4"><p className="text-[9px] uppercase tracking-[.16em] text-slate-500">Packs / carton</p><p className="mt-1 text-xl font-black text-white">{AGILITY_PACKAGES_PER_BOX}</p></div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4"><p className="text-[9px] uppercase tracking-[.16em] text-slate-500">Retail reference / carton</p><p className="mt-1 text-xl font-black text-white">{naira(AGILITY_RETAIL_BOX_VALUE_NGN)}</p></div>
          </div>
        </section>

        <section className="grid gap-4 p-5 sm:p-8 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/[.05] p-5">
            <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300"><Truck className="h-6 w-6"/></div><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">Paid now</p><h3 className="text-xl font-black">Supply and collect.</h3></div></div>
            <div className="mt-5 space-y-3 text-sm text-slate-300">{['Buy cartons from WEAVE','Take them to a nearby fruit shop, kiosk or mini-mart','The outlet pays the agreed amount when you supply','Return to WEAVE for more stock'].map(line=><div key={line} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"/><span>{line}</span></div>)}</div>
          </div>

          <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/[.05] p-5">
            <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-300/10 text-amber-300"><HandCoins className="h-6 w-6"/></div><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Pay after sale</p><h3 className="text-xl font-black">Place stock. Collect later.</h3></div></div>
            <div className="mt-5 space-y-3 text-sm text-slate-300">{['Outlet has customers but cannot fund cartons upfront','Agent places WEAVE cartons at the outlet','Outlet sells the packs','Agent returns and collects the agreed money after sales'].map(line=><div key={line} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"/><span>{line}</span></div>)}</div>
          </div>
        </section>

        <section className="mx-5 mb-5 rounded-[1.5rem] border border-cyan-300/15 bg-cyan-300/[.04] p-5 sm:mx-8 sm:mb-8">
          <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300"/><div><p className="font-black text-white">Your route is the market around you.</p><p className="mt-1 text-sm leading-6 text-slate-400">One Agent can supply several existing outlets. WEAVE tracks the cartons placed, packs sold, money collected and money still outstanding so the Agent can keep moving without becoming the retailer.</p></div></div>
        </section>

        <section className="border-t border-white/10 p-5 sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xl font-black">Agility + Electrolyte are distribution stock.</p><p className="mt-1 text-sm text-slate-400">Buy from WEAVE, supply the outlets around you, collect and restock.</p></div><Button type="button" onClick={onBuy} className="h-12 shrink-0 bg-cyan-400 px-6 font-black text-black hover:bg-cyan-300"><ShoppingBag className="mr-2 h-4 w-4"/>Open Distribution Route<ArrowRight className="ml-2 h-4 w-4"/></Button></div></section>
      </div>
    </DialogContent>
  </Dialog>
}
