'use client'

import { useEffect,useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  CircleDollarSign,
  MessageCircle,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Users,
} from 'lucide-react'
import { DailyProspectClaim } from '@/components/bridger/daily-prospect-claim'
import { getAuthHeaders } from '@/lib/auth-client'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import { WeaveRouteNetwork, type WeaveRouteTone } from '@/components/world/weave-route-network'
import { visiblePoll } from '@/lib/visible-poll'

const commands=[
  {label:'Bridge Radiance',detail:'',href:'/bridger/bridge-radiance',icon:MessageCircle,district:'Prospects',tone:'sky' as WeaveRouteTone},
  {label:'Prospect Market',detail:'',href:'/weave/market/prospects',icon:ShoppingBag,district:'Prospects',tone:'amber' as WeaveRouteTone},
  {label:'Number Bay',detail:'',href:'/bridger/numbers',icon:Phone,district:'Supply',tone:'cyan' as WeaveRouteTone},
  {label:'My Clients',detail:'',href:'/bridger/clients',icon:Users,district:'Continuity',tone:'emerald' as WeaveRouteTone},
  {label:'Bridge AI',detail:'',href:'/bridger/bridge-ai',icon:Bot,district:'Crossing',tone:'violet' as WeaveRouteTone},
  {label:'Continuance',detail:'',href:'/bridger/subscription',icon:ShieldCheck,district:'Position',tone:'emerald' as WeaveRouteTone},
]

type OperationalPulse={
  dailyClaimed:boolean
  radianceThreads:number
  unreadRadiance:number
  clients:number
  ownedNumbers:number
  activeNumberOrders:number
  continuance:string
  bridgeAiContinuance:string
  updatedAt:number|null
}

const EMPTY_PULSE:OperationalPulse={
  dailyClaimed:false,
  radianceThreads:0,
  unreadRadiance:0,
  clients:0,
  ownedNumbers:0,
  activeNumberOrders:0,
  continuance:'unknown',
  bridgeAiContinuance:'inactive',
  updatedAt:null,
}

async function readJson(url:string,signal?:AbortSignal){
  const response=await fetch(url,{headers:getAuthHeaders(),cache:'no-store',signal})
  if(!response.ok)return null
  return response.json().catch(()=>null)
}

export function BridgerOperatingEnvironment(){
  const [referral,setReferral]=useState<any>(null)
  const [pulse,setPulse]=useState<OperationalPulse>(EMPTY_PULSE)
  const {isVisible,orderFor}=useEnvironmentOrganizer()
  const stations=commands.filter(item=>isVisible(item.href)).sort((a,b)=>orderFor(a.href)-orderFor(b.href))

  const loadPulse=async(signal?:AbortSignal)=>{
    const [daily,radiance,clients,numbers,continuance,bridgeAi]=await Promise.allSettled([
      readJson('/api/bridger/daily-prospect',signal),
      readJson('/api/bridger/support-inbox',signal),
      readJson('/api/bridger/clients',signal),
      readJson('/api/bridger/numbers',signal),
      readJson('/api/bridger/subscription',signal),
      readJson('/api/bridger/bridge-ai/subscribe',signal),
    ])

    const dailyData=daily.status==='fulfilled'?daily.value:null
    const radianceData=radiance.status==='fulfilled'?radiance.value:null
    const clientsData=clients.status==='fulfilled'?clients.value:null
    const numbersData=numbers.status==='fulfilled'?numbers.value:null
    const continuanceData=continuance.status==='fulfilled'?continuance.value:null
    const bridgeAiData=bridgeAi.status==='fulfilled'?bridgeAi.value:null
    const bridgerThreads=Array.isArray(radianceData?.threads)?radianceData.threads.filter((thread:any)=>thread.position==='bridger'):[]
    const activeOrders=Array.isArray(numbersData?.orders)?numbersData.orders.filter((order:any)=>['requested','fulfilling'].includes(String(order.status))):[]
    const standing=continuanceData?.continuance||continuanceData?.subscription
    const bridgeAiStanding=bridgeAiData?.subscription
    const bridgeAiActive=Boolean(bridgeAiStanding?.status==='active'&&bridgeAiStanding?.expiry&&new Date(bridgeAiStanding.expiry)>new Date())
    if(signal?.aborted)return

    setPulse(prev=>({
      dailyClaimed:dailyData?Boolean(dailyData.claimed):prev.dailyClaimed,
      radianceThreads:radianceData?bridgerThreads.length:prev.radianceThreads,
      unreadRadiance:radianceData?bridgerThreads.reduce((sum:number,thread:any)=>sum+(Number(thread.unreadCount)||0),0):prev.unreadRadiance,
      clients:clientsData&&Array.isArray(clientsData.clients)?clientsData.clients.length:prev.clients,
      ownedNumbers:numbersData&&Array.isArray(numbersData.mine)?numbersData.mine.length:prev.ownedNumbers,
      activeNumberOrders:numbersData?activeOrders.length:prev.activeNumberOrders,
      continuance:standing?.subscription_status?String(standing.subscription_status):prev.continuance,
      bridgeAiContinuance:bridgeAiData?(bridgeAiActive?'active':bridgeAiStanding?.status==='active'?'expired':String(bridgeAiStanding?.status||'inactive')):prev.bridgeAiContinuance,
      updatedAt:Date.now(),
    }))
  }

  useEffect(()=>{
    const stop=visiblePoll(signal=>loadPulse(signal),20000)
    fetch('/api/bridger/referral-commissions',{headers:getAuthHeaders(),cache:'no-store'})
      .then(async response=>response.ok?response.json():null)
      .then(data=>data&&setReferral(data))
      .catch(()=>{})
    return stop
  },[])

  const referralLink=referral?.referralLink
    ?(typeof window!=='undefined'?window.location.origin:'')+referral.referralLink
    :''

  const liveMoves=[
    {label:'Prospect',value:pulse.dailyClaimed?'CLAIMED':'READY',href:'/weave/market/prospects'},
    {label:'Radiance',value:pulse.unreadRadiance>0?`${pulse.unreadRadiance} UNREAD`:`${pulse.radianceThreads} ACTIVE`,href:'/bridger/bridge-radiance'},
    {label:'Numbers',value:pulse.activeNumberOrders>0?`${pulse.activeNumberOrders} WAITING`:`${pulse.ownedNumbers} OWNED`,href:'/bridger/numbers'},
    {label:'Clients',value:String(pulse.clients),href:'/bridger/clients'},
    {label:'Continuance',value:pulse.continuance.toUpperCase(),href:'/bridger/subscription'},
    {label:'Bridge AI',value:pulse.bridgeAiContinuance.toUpperCase(),href:'/bridger/bridge-ai'},
  ]

  return <main className="mx-auto w-full max-w-[1280px] p-0 sm:p-3 md:p-5">
    <section className="relative min-h-[calc(100dvh-5rem)] overflow-hidden border-y border-emerald-300/15 bg-[#020b0c]/76 sm:rounded-[2rem] sm:border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(16,185,129,.11),transparent_27%),linear-gradient(180deg,rgba(2,11,12,.45),rgba(2,7,13,.94))]"/>
      <header className="relative flex items-end justify-between gap-4 border-b border-white/[0.07] px-5 py-5 md:px-7">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[.22em] text-emerald-300">Hope · Bridger</p>
          <h1 className="mt-1 text-xl font-black text-white md:text-2xl">Operating Room</h1>
        </div>
        <span className="text-[8px] font-black uppercase tracking-[.14em] text-emerald-300">{pulse.updatedAt?'SYNCED':'CONNECTING'}</span>
      </header>

      <div className="relative border-b border-white/[0.07] px-4 py-3 md:px-6" data-bridger-live-operations="true">
        <div className="flex gap-5 overflow-x-auto">
          {liveMoves.map(move=><Link key={move.label} href={move.href} className="min-w-[112px] border-l border-white/10 pl-3">
            <p className="text-[7px] font-black uppercase tracking-[.14em] text-slate-500">{move.label}</p>
            <p className="mt-1 text-[10px] font-black text-white">{move.value}</p>
          </Link>)}
        </div>
      </div>

      <div className="relative grid gap-0 xl:grid-cols-[minmax(0,1fr)_220px]">
        <section className="min-w-0 p-4 md:p-6 xl:border-r xl:border-white/[0.07]">
          <div className="border-b border-white/[0.07] pb-5" data-weave-station="prospect-intake">
            <DailyProspectClaim />
          </div>
          <div className="mt-5">
            <WeaveRouteNetwork stations={stations} title="Bridger districts" compact />
          </div>
        </section>

        <aside className="border-t border-white/[0.07] p-4 xl:border-t-0">
          <div className="space-y-6">
            {referralLink&&<section className="border-l border-sky-300/20 pl-3">
              <div className="flex items-center gap-2 text-sky-300"><CircleDollarSign className="h-3.5 w-3.5"/><p className="text-[8px] font-black uppercase tracking-[.14em]">Referral</p></div>
              <input readOnly value={referralLink} className="mt-3 w-full border-b border-white/10 bg-transparent py-2 text-[9px] text-white outline-none"/>
              <p className="mt-3 text-[10px] font-black text-emerald-200">{referral?.referralEarnings??0} Flame Coin</p>
            </section>}
            <Link href="/bridger/dashboard" className="flex items-center justify-between border-y border-white/10 py-3 text-[9px] font-black uppercase tracking-[.12em] text-white">
              World <ArrowRight className="h-3.5 w-3.5 text-emerald-300"/>
            </Link>
          </div>
        </aside>
      </div>
    </section>
  </main>
}
