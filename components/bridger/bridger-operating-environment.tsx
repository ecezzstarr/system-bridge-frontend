'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Bot, CircleDollarSign, Phone, ShoppingBag, Sparkles, Users } from 'lucide-react'
import { getRolePlaces } from '@/lib/weave-role-districts'
import { getAuthHeaders } from '@/lib/auth-client'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import { WeaveRouteNetwork, type WeaveRouteTone } from '@/components/world/weave-route-network'
import { visiblePoll } from '@/lib/visible-poll'

const ICONS:Record<string,typeof Bot>={
  '/bridger/bridge-ai':Bot,
  '/weave/market/prospects':ShoppingBag,
  '/bridger/numbers':Phone,
  '/echo':Sparkles,
  '/profiles':Users,
  '/wallet/deposit-withdraw':CircleDollarSign,
}

const commands=getRolePlaces('bridger').map(item=>({
  ...item,
  icon:ICONS[item.href]||Bot,
}))

type Pulse={
  dailyClaimed:boolean
  ownedNumbers:number
  activeNumberOrders:number
  bridgeAiContinuance:string
  bridgeAiExpiry:string|null
}

const EMPTY:Pulse={
  dailyClaimed:false,
  ownedNumbers:0,
  activeNumberOrders:0,
  bridgeAiContinuance:'inactive',
  bridgeAiExpiry:null,
}

async function readJson(url:string,signal?:AbortSignal){
  const response=await fetch(url,{headers:getAuthHeaders(),cache:'no-store',signal})
  if(!response.ok)return null
  return response.json().catch(()=>null)
}

export function BridgerOperatingEnvironment(){
  const [pulse,setPulse]=useState<Pulse>(EMPTY)
  const {isVisible,orderFor}=useEnvironmentOrganizer()
  const stations=commands
    .filter(item=>isVisible(item.href))
    .sort((a,b)=>orderFor(a.href)-orderFor(b.href))
    .map(item=>({
      ...item,
      tone:(item.district==='Value'?'emerald':'sky') as WeaveRouteTone,
    }))

  useEffect(()=>{
    const load=async(signal?:AbortSignal)=>{
      const [daily,numbers,bridgeAi]=await Promise.allSettled([
        readJson('/api/bridger/daily-prospect',signal),
        readJson('/api/bridger/numbers',signal),
        readJson('/api/bridger/bridge-ai/subscribe',signal),
      ])
      const dailyData=daily.status==='fulfilled'?daily.value:null
      const numbersData=numbers.status==='fulfilled'?numbers.value:null
      const bridgeAiData=bridgeAi.status==='fulfilled'?bridgeAi.value:null
      const activeOrders=Array.isArray(numbersData?.orders)
        ? numbersData.orders.filter((order:any)=>['requested','fulfilling','pending'].includes(String(order.status)))
        : []
      const standing=bridgeAiData?.subscription
      const active=Boolean(standing?.status==='active'&&standing?.expiry&&new Date(standing.expiry)>new Date())
      if(signal?.aborted)return
      setPulse(previous=>({
        dailyClaimed:dailyData?Boolean(dailyData.claimed):previous.dailyClaimed,
        ownedNumbers:numbersData&&Array.isArray(numbersData.mine)?numbersData.mine.length:previous.ownedNumbers,
        activeNumberOrders:numbersData?activeOrders.length:previous.activeNumberOrders,
        bridgeAiContinuance:bridgeAiData?(active?'active':standing?.status==='active'?'expired':String(standing?.status||'inactive')):previous.bridgeAiContinuance,
        bridgeAiExpiry:standing?.expiry?String(standing.expiry):previous.bridgeAiExpiry,
      }))
    }
    return visiblePoll(load,20000)
  },[])

  const liveMoves=[
    {
      label:'Prospect Market',
      value:pulse.dailyClaimed?'DAILY CLAIMED':'DAILY READY',
      detail:pulse.dailyClaimed?'Today’s free Prospect has already moved.':'Your daily Prospect is ready to claim.',
      href:'/weave/market/prospects',
      tone:pulse.dailyClaimed?'text-emerald-200':'text-amber-200',
    },
    {
      label:'Number Bay',
      value:pulse.activeNumberOrders?String(pulse.activeNumberOrders)+' WAITING':String(pulse.ownedNumbers)+' OWNED',
      detail:pulse.activeNumberOrders?'Number delivery or verification movement is open.':'Worldwide number ownership is ready.',
      href:'/bridger/numbers',
      tone:pulse.activeNumberOrders?'text-amber-200':'text-cyan-200',
    },
    {
      label:'Bridge AI',
      value:pulse.bridgeAiContinuance.toUpperCase(),
      detail:pulse.bridgeAiContinuance==='active'
        ? 'Bridge AI active'+(pulse.bridgeAiExpiry?' until '+new Date(pulse.bridgeAiExpiry).toLocaleDateString():'')+'.'
        : 'Bridge AI subscription is required before opening crossing paths.',
      href:'/bridger/bridge-ai',
      tone:pulse.bridgeAiContinuance==='active'?'text-emerald-200':'text-amber-200',
    },
  ]

  return <main className="mx-auto w-full max-w-[1500px] p-0 sm:p-3 md:p-6" data-operating-room="bridger">
    <section className="weave-system-depth weave-operating-environment overflow-hidden border-y border-emerald-300/15 bg-[#03100f]/82 backdrop-blur-xl sm:rounded-[2rem] sm:border">
      <header className="border-b border-white/10 px-4 py-5 md:px-6">
        <p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">Bridger Presence</p>
        <h1 className="mt-2 text-2xl font-black text-white">Connection stays simple.</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Bridge AI, Prospect Market, Number Bay, Echo, Presences and Deposit/Withdrawal are the Bridger account. Continuance renewal runs in the background from the primary Flame Coin wallet.</p>
      </header>

      <div className="border-b border-white/10 bg-black/15 px-4 py-3 md:px-6" data-bridger-live-operations="focused">
        <div className="flex gap-5 overflow-x-auto pb-1">
          {liveMoves.map(move=><Link key={move.label} href={move.href} className="min-w-[180px] border-l border-white/10 pl-3 transition hover:border-cyan-300/30">
            <p className="text-[8px] font-black uppercase tracking-[.16em] text-slate-500">{move.label}</p>
            <p className={'mt-1 text-xs font-black '+move.tone}>{move.value}</p>
            <p className="mt-1 text-[9px] leading-4 text-slate-500">{move.detail}</p>
          </Link>)}
        </div>
      </div>

      <div className="min-h-[620px] p-4 md:p-6">
        <WeaveRouteNetwork
          stations={stations}
          title="Bridger movement"
          detail="Choose one function and move. Prospect acquisition, AI crossing, authenticated number supply, Echo, Presences and value movement stay inside one focused account."
        />
        <Link href="/bridger/dashboard" className="mt-6 flex items-center justify-between border-y border-white/10 py-3 text-xs font-black text-white transition hover:border-emerald-300/20">
          Return to Bridger World <ArrowRight className="h-4 w-4 text-emerald-300"/>
        </Link>
      </div>
    </section>
  </main>
}
