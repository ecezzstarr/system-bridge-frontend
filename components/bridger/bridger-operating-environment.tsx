'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Bot,
  CircleDollarSign,
  Gamepad2,
  Globe2,
  Headphones,
  Network,
  ShieldCheck,
  ShoppingBag,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import { DailyProspectClaim } from '@/components/bridger/daily-prospect-claim'
import { getAuthHeaders } from '@/lib/auth-client'
import { WEAVE_SYSTEM_MAP } from '@/lib/weave-system-map'

const groups = [
  {
    title:'Crossing',
    detail:'Open the path and carry a Prospect toward Client participation without breaking continuity.',
    items:[
      {label:'Bridge AI Paths',detail:'Crossing → Client AI support',href:'/bridger/bridge-ai',icon:Bot},
      {label:'Prospect Market',detail:'Acquire available Prospect movement',href:'/weave/market/prospects',icon:ShoppingBag},
    ],
  },
  {
    title:'Client continuity',
    detail:'Once the crossing becomes a Client File Folder, accompany the Client without becoming the player.',
    items:[
      {label:'My Clients',detail:'Client support and service channels',href:'/bridger/clients',icon:Users},
      {label:'Bridge Plaza',detail:'Enter shared Client worlds as support',href:'/weave',icon:Globe2},
    ],
  },
  {
    title:'Company continuity',
    detail:'Keep the partnership, records and company support in their proper operating places.',
    items:[
      {label:'Bridger Continuance',detail:'Partnership renewal and standing',href:'/bridger/subscription',icon:ShieldCheck},
      {label:WEAVE_SYSTEM_MAP.language.wallet,detail:'Operational funds',href:'/wallet',icon:Wallet},
      {label:WEAVE_SYSTEM_MAP.language.ledger,detail:'Preserved movement and value record',href:'/ledger',icon:BookOpen},
      {label:'Company Guidance',detail:'Ask the company support channel',href:'/company-chat',icon:Headphones},
    ],
  },
  {
    title:'Shared participation',
    detail:'Participation spaces remain separate from the Bridger responsibility itself.',
    items:[
      {label:'Arena',detail:'Participant contest',href:'/arena',icon:Gamepad2},
      {label:'Casino',detail:'System pattern play',href:'/casino',icon:Trophy},
    ],
  },
]

export function BridgerOperatingEnvironment() {
  const [referral,setReferral]=useState<any>(null)

  useEffect(()=>{
    fetch('/api/bridger/referral-commissions',{headers:getAuthHeaders()})
      .then(async response=>response.ok?response.json():null)
      .then(data=>data&&setReferral(data))
      .catch(()=>{})
  },[])

  const referralLink=referral?.referralLink
    ? (typeof window!=='undefined' ? window.location.origin : '') + referral.referralLink
    : ''

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-emerald-300/15 bg-[#03100f]">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_10%_0%,rgba(52,211,153,.13),transparent_36%),radial-gradient(circle_at_90%_0%,rgba(56,189,248,.08),transparent_30%)] p-5 md:p-7">
          <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">Bridger Operating Room</p>
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Connection carried in the right order.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            The Bridger is a WEAVE partner who opens and maintains the human connection. The Client remains the player. Bridge AI begins at the crossing and continues as the Client's AI support inside the File Folder.
          </p>
        </header>

        <div className="p-4 md:p-6">
          <div className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.035] p-4 md:p-5">
            <div className="flex items-start gap-3">
              <Network className="mt-0.5 h-5 w-5 text-amber-300"/>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Prospect intake · one place</p>
                <p className="mt-1 text-sm font-black text-white">Daily Prospect movement</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">The free daily Prospect claim lives here in the Bridger Operating Room and is not repeated around the app.</p>
              </div>
            </div>
            <div className="mt-4"><DailyProspectClaim/></div>
          </div>

          <div className="mt-5 space-y-5">
            {groups.map(group=>(
              <section key={group.title}>
                <div className="mb-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{group.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{group.detail}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {group.items.map(item=>{
                    const Icon=item.icon
                    return <Link key={item.href} href={item.href} className="group rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-emerald-300/20 hover:bg-emerald-400/[0.035]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]"><Icon className="h-4 w-4 text-emerald-200"/></div>
                      <p className="mt-3 text-sm font-black text-white">{item.label}</p>
                      <p className="mt-1 min-h-10 text-xs leading-5 text-slate-400">{item.detail}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-300">Open function <ArrowRight className="h-3 w-3"/></span>
                    </Link>
                  })}
                </div>
              </section>
            ))}
          </div>

          <section className="mt-5 rounded-3xl border border-sky-300/10 bg-sky-400/[0.025] p-5">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-sky-300"/>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Bridger referral continuity</p>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
              <div>
                <p className="text-xs text-slate-400">Invite another Bridger through the recorded referral path.</p>
                {referralLink&&<input readOnly value={referralLink} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-white"/>}
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center"><p className="text-[8px] uppercase tracking-wider text-slate-500">Referred</p><p className="mt-1 text-lg font-black text-white">{referral?.referralCount??0}</p></div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center"><p className="text-[8px] uppercase tracking-wider text-slate-500">Earnings</p><p className="mt-1 text-lg font-black text-emerald-200">{referral?.referralEarnings??0} TRX</p></div>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
