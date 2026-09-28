'use client'

import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Hammer,
  Landmark,
  Plus,
  Save,
  ShoppingBag,
  Store,
  TimerReset,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { getClientToken } from '@/lib/client-auth'

type Props={
  initialStore?:any|null
  buildFunding?:any|null
  world?:any|null
  onOpenConstruction?:(district:string)=>void
}

const PRESETS=[
  {key:'radiant_arcade',label:'Radiant Arcade',detail:'Sky-lit commercial avenue with luminous storefronts.'},
  {key:'glass_citadel',label:'Glass Citadel',detail:'Clean technology market with tall transparent structures.'},
  {key:'night_market',label:'Night Market',detail:'Dense evening commerce with bright signs and warm counters.'},
  {key:'garden_exchange',label:'Garden Exchange',detail:'Open green commercial district with softer public spaces.'},
]

const DEFAULT_ENV={
  preset:'radiant_arcade',
  sign:'OPEN FOR BUSINESS',
  tagline:'Built inside the WEAVE Client Market.',
  marketSection:'Main Arcade',
  featuredMessage:'Enter the store, inspect the offers and purchase directly from this Client.',
}

function normalizeEnvironment(value:any){
  const source=value&&typeof value==='object'?value:{}
  const preset=PRESETS.some(item=>item.key===source.preset)?source.preset:DEFAULT_ENV.preset
  return{
    preset,
    sign:String(source.sign||DEFAULT_ENV.sign).slice(0,80),
    tagline:String(source.tagline||DEFAULT_ENV.tagline).slice(0,180),
    marketSection:String(source.marketSection||DEFAULT_ENV.marketSection).slice(0,80),
    featuredMessage:String(source.featuredMessage||DEFAULT_ENV.featuredMessage).slice(0,320),
  }
}

function remaining(seconds:number){
  if(!Number.isFinite(seconds)||seconds<=0)return 'Completing…'
  const days=Math.floor(seconds/86400)
  const hours=Math.floor((seconds%86400)/3600)
  const minutes=Math.floor((seconds%3600)/60)
  if(days>0)return `${days}d ${hours}h`
  if(hours>0)return `${hours}h ${minutes}m`
  return `${Math.max(1,minutes)}m`
}

function StorePreview({
  store,
  environment,
  level,
}:{
  store:any
  environment:any
  level:'door'|'storefront'|'market_hall'
}){
  const full=level!=='door'
  const hall=level==='market_hall'
  return <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,.14),transparent_34%),radial-gradient(circle_at_82%_16%,rgba(168,85,247,.11),transparent_32%),linear-gradient(180deg,#07111f,#030611)] p-5">
    <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:38px_38px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]"/>
    <div className="relative flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[8px] font-black uppercase tracking-[0.2em] text-sky-300">{environment.marketSection}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/55">{environment.sign}</p></div>
      <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[8px] font-black uppercase text-slate-400">{hall?'Market Hall':full?'Storefront':'Customer Door'}</span>
    </div>
    <div aria-hidden="true" className="relative mx-auto mt-4 h-44 w-full max-w-xl">
      <div className="absolute inset-x-[8%] bottom-2 h-4 rounded-[50%] bg-black/60 blur-lg"/>
      {hall&&<>
        <div className="absolute bottom-5 left-[8%] h-[48%] w-[18%] rounded-t-2xl border border-white/10 bg-black/25"/>
        <div className="absolute bottom-5 right-[8%] h-[48%] w-[18%] rounded-t-2xl border border-white/10 bg-black/25"/>
      </>}
      <div className={`absolute bottom-5 left-1/2 -translate-x-1/2 rounded-t-[2.5rem] border border-white/15 bg-white/[0.075] shadow-[0_30px_70px_rgba(0,0,0,.48)] backdrop-blur-md ${hall?'h-[82%] w-[58%]':full?'h-[68%] w-[54%]':'h-[50%] w-[42%]'}`}>
        <div className="absolute inset-x-[10%] top-[15%] grid grid-cols-4 gap-1.5">
          {Array.from({length:full?8:4}).map((_,index)=><span key={index} className="aspect-[1.45] rounded-sm border border-white/10 bg-sky-200/[0.09]"/>)}
        </div>
        <div className="absolute bottom-0 left-1/2 h-[36%] w-[30%] -translate-x-1/2 rounded-t-xl border-x border-t border-white/12 bg-black/35"/>
      </div>
      <div className="absolute bottom-0 left-1/2 h-12 w-[62%] -translate-x-1/2 [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)] bg-gradient-to-b from-white/12 to-transparent"/>
    </div>
    <div className="relative mt-2">
      <h4 className="text-xl font-black text-white">{store?.name||'Your Client Store'}</h4>
      <p className="mt-1 text-xs leading-5 text-slate-400">{environment.tagline}</p>
    </div>
  </div>
}

export default function ClientCustomerDoorPanel({
  initialStore,
  buildFunding,
  world,
  onOpenConstruction,
}:Props){
  const [data,setData]=useState<any>({
    store:initialStore||null,
    items:initialStore?.items||[],
    orders:initialStore?.orders||[],
  })
  const [form,setForm]=useState({name:'',description:'',price:'',currency:'NGN',offer_type:'product'})
  const [environment,setEnvironment]=useState(()=>normalizeEnvironment(initialStore?.environment_config))
  const [identity,setIdentity]=useState({
    name:initialStore?.name||'',
    description:initialStore?.description||'',
  })
  const [busy,setBusy]=useState('')
  const [message,setMessage]=useState('')

  const systems=world?.systems||[]
  const builds=world?.builds||[]
  const hasSystem=(type:string)=>systems.some((item:any)=>item.system_type===type&&item.status==='active')
  const activeBuild=(type:string)=>builds.find((item:any)=>item.system_type===type&&['building','funding_gate'].includes(item.status))

  const hasDoor=hasSystem('customer_door')
  const hasStorefront=hasSystem('commerce_storefront')
  const hasMarketHall=hasSystem('marketplace_network')
  const level:'door'|'storefront'|'market_hall'=hasMarketHall?'market_hall':hasStorefront?'storefront':'door'

  const publicUrl=data.store?.public_url || (data.store?.public_slug?`/market/${data.store.public_slug}`:null)
  const doorBuild=activeBuild('customer_door')
  const storefrontBuild=activeBuild('commerce_storefront')
  const marketBuild=activeBuild('marketplace_network')
  const blueprintHours=(key:string,fallback:number)=>{
    const blueprint=(world?.blueprints||[]).find((item:any)=>item.blueprint_key===key)
    return Math.max(1,Number(blueprint?.build_hours||fallback))
  }
  const baseDuration=(hours:number)=>{
    if(hours>=24){
      const days=hours/24
      return `${days % 1 === 0 ? days.toFixed(0) : days.toFixed(1)} day${days===1?'':'s'} base`
    }
    return `${hours}h base`
  }

  const dueText=useMemo(()=>{
    if(doorBuild)return remaining(Number(doorBuild.remaining_seconds||0))
    if(!data.store?.formation_due_at)return hasDoor?'Public door constructed':'Construction pending'
    const seconds=Math.ceil((new Date(data.store.formation_due_at).getTime()-Date.now())/1000)
    return seconds<=0?'Formation window reached':remaining(seconds)
  },[data.store?.formation_due_at,doorBuild?.remaining_seconds,hasDoor])

  const refreshStore=async()=>{
    const token=getClientToken()
    const response=await fetch('/api/client/business-store',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
    const body=await response.json()
    if(!response.ok)throw new Error(body.error||'Unable to reload store')
    setData({
      store:{...body.store,public_url:body.store?.public_slug?`/market/${body.store.public_slug}`:null},
      items:body.items||[],
      orders:body.orders||[],
    })
    if(body.store){
      setIdentity({name:body.store.name||'',description:body.store.description||''})
      setEnvironment(normalizeEnvironment(body.store.environment_config))
    }
  }

  const publish=async()=>{
    setBusy('offer');setMessage('')
    try{
      const token=getClientToken()
      const response=await fetch('/api/client/business-store',{
        method:'POST',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({...form,price:Number(form.price)}),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to publish offer')
      const store={...body.store,public_url:body.store?.public_slug?`/market/${body.store.public_slug}`:null}
      setData({store,items:body.items||[],orders:body.orders||[]})
      setForm({name:'',description:'',price:'',currency:'NGN',offer_type:'product'})
      setMessage(body.store?.formation_status==='selling'
        ? 'Offer window opened inside your public store.'
        : 'Offer saved. It becomes public when the Customer Door construction and funding gate are complete.')
    }catch(error:any){
      setMessage(error?.message||'Unable to publish offer')
    }finally{setBusy('')}
  }

  const saveEnvironment=async()=>{
    setBusy('design');setMessage('')
    try{
      const token=getClientToken()
      const response=await fetch('/api/client/business-store',{
        method:'PATCH',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          name:identity.name,
          description:identity.description,
          environment_config:environment,
        }),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to save market environment')
      await refreshStore()
      setMessage('Market architecture and store identity saved.')
    }catch(error:any){
      setMessage(error?.message||'Unable to save market environment')
    }finally{setBusy('')}
  }

  const stages=[
    {
      key:'customer_door',
      title:'Customer Door',
      detail:'Public entrance for customers outside WEAVE.',
      base:baseDuration(blueprintHours('customer_door',24)),
      live:hasDoor,
      build:doorBuild,
    },
    {
      key:'commerce_storefront',
      title:'Commerce Storefront',
      detail:'A constructed store building with branded public shopping space.',
      base:baseDuration(blueprintHours('commerce_storefront',72)),
      live:hasStorefront,
      build:storefrontBuild,
    },
    {
      key:'marketplace_network',
      title:'Marketplace Network',
      detail:'A larger Market Hall for multi-offer commercial movement and expansion.',
      base:baseDuration(blueprintHours('marketplace_network',168)),
      live:hasMarketHall,
      build:marketBuild,
    },
  ]

  return <div className="mt-6 space-y-5">
    <section className="overflow-hidden rounded-[2rem] border border-sky-300/15 bg-[#030914]/70">
      <div className="grid gap-0 xl:grid-cols-[1.2fr_.8fr]">
        <div className="p-5 md:p-6">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Client Market Construction</p>
          <h3 className="mt-2 text-2xl font-black text-white">Your business becomes a place customers can actually enter.</h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">This is not an offer card. The Customer Door is the entrance, Commerce Storefront is the store building, and Marketplace Network expands it into a larger commercial system. Construction persists through time in the File Folder.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {stages.map((stage,index)=>{
              const state=stage.live?'live':stage.build?'building':'not_started'
              return <article key={stage.key} className={`rounded-2xl border p-4 ${state==='live'?'border-emerald-300/15 bg-emerald-400/[0.04]':state==='building'?'border-amber-300/15 bg-amber-400/[0.04]':'border-white/10 bg-white/[0.02]'}`}>
                <div className="flex items-center justify-between gap-2"><span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">Build {index+1}</span>{state==='live'?<CheckCircle2 className="h-4 w-4 text-emerald-300"/>:state==='building'?<TimerReset className="h-4 w-4 text-amber-300"/>:<Hammer className="h-4 w-4 text-slate-600"/>}</div>
                <h4 className="mt-3 text-sm font-black text-white">{stage.title}</h4>
                <p className="mt-1 text-[10px] leading-4 text-slate-400">{stage.detail}</p>
                <p className="mt-3 text-[8px] font-black uppercase tracking-wider text-slate-500">{state==='live'?'Constructed':state==='building'?remaining(Number(stage.build?.remaining_seconds||0)):stage.base}</p>
              </article>
            })}
          </div>
          <button onClick={()=>onOpenConstruction?.('blueprint_foundry')} className="mt-5 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-violet-100"><Hammer className="h-4 w-4"/>Open construction blueprints <ArrowRight className="h-4 w-4"/></button>
        </div>
        <div className="border-t border-white/10 p-4 xl:border-l xl:border-t-0">
          <StorePreview store={data.store} environment={environment} level={level}/>
        </div>
      </div>
    </section>

    {buildFunding&&<section className={`rounded-2xl border p-5 ${buildFunding.publicDoorUnlocked?'border-emerald-400/20 bg-emerald-400/5':'border-amber-400/20 bg-amber-400/5'}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">File Folder Build Power</p>
          <p className="mt-2 text-2xl font-black text-white">{Number(buildFunding.totalParticipationFlameCoin||0).toLocaleString()} Flame Coin</p>
          <p className="mt-1 text-[10px] text-slate-500">Construction speed ×{Number(buildFunding.buildSpeedMultiplier||1).toFixed(2)} · Public Door threshold {Number(buildFunding.publicDoorThresholdFlameCoin||0).toLocaleString()}</p>
        </div>
        <div className="text-right">
          {buildFunding.publicDoorUnlocked?<p className="text-xs font-black uppercase tracking-wider text-emerald-300">Public funding gate cleared</p>:<>
            <p className="text-xs font-black uppercase tracking-wider text-amber-300">Public funding gate</p>
            <p className="mt-1 text-sm text-white">{Number(buildFunding.requiredToOpenPublicDoorFlameCoin||0).toLocaleString()} more Flame Coin</p>
            <Link href="/client/deposit" className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-950"><Zap className="h-3.5 w-3.5"/>Add build power</Link>
          </>}
        </div>
      </div>
    </section>}

    <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <div className="rounded-[2rem] border border-violet-300/15 bg-violet-400/[0.035] p-5 md:p-6">
        <div className="flex items-center gap-2"><Landmark className="h-4 w-4 text-violet-300"/><p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-300">Market architecture studio</p></div>
        <h4 className="mt-2 text-lg font-black text-white">Shape the territory customers recognize.</h4>
        <p className="mt-2 text-xs leading-5 text-slate-400">Set the Client-owned platform identity, then shape its public atmosphere. Construction level is still earned through the Customer Door, storefront and marketplace builds.</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {PRESETS.map(preset=><button key={preset.key} onClick={()=>setEnvironment({...environment,preset:preset.key})} className={`rounded-xl border p-3 text-left transition ${environment.preset===preset.key?'border-violet-300/30 bg-violet-400/10':'border-white/10 bg-black/20'}`}><p className="text-[10px] font-black text-white">{preset.label}</p><p className="mt-1 text-[9px] leading-4 text-slate-500">{preset.detail}</p></button>)}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-[10px] text-slate-500">Platform / territory name<input value={environment.platformName} onChange={e=>setEnvironment({...environment,platformName:e.target.value})} placeholder="The name customers know this territory by" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
          <label className="text-[10px] text-slate-500">Logo URL<input value={environment.logoUrl} onChange={e=>setEnvironment({...environment,logoUrl:e.target.value})} placeholder="https://…/logo.png" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
          <label className="text-[10px] text-slate-500">Store name<input value={identity.name} onChange={e=>setIdentity({...identity,name:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
          <label className="text-[10px] text-slate-500">Market section<input value={environment.marketSection} onChange={e=>setEnvironment({...environment,marketSection:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
          <label className="text-[10px] text-slate-500">Building sign<input value={environment.sign} onChange={e=>setEnvironment({...environment,sign:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
          <label className="text-[10px] text-slate-500">Public tagline<input value={environment.tagline} onChange={e=>setEnvironment({...environment,tagline:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
        </div>
        <label className="mt-3 block text-[10px] text-slate-500">Store description<textarea value={identity.description} onChange={e=>setIdentity({...identity,description:e.target.value})} rows={3} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
        <label className="mt-3 block text-[10px] text-slate-500">Front-window message<textarea value={environment.featuredMessage} onChange={e=>setEnvironment({...environment,featuredMessage:e.target.value})} rows={3} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
        <button onClick={saveEnvironment} disabled={busy==='design'||!identity.name.trim()} className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-40"><Save className="h-3.5 w-3.5"/>{busy==='design'?'Saving…':'Save market environment'}</button>
      </div>

      <div className="rounded-[2rem] border border-sky-300/15 bg-sky-400/[0.035] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-sky-300">Public entrance</p>
            <h4 className="mt-2 text-lg font-black">{data.store?.name||'Your public store'}</h4>
            <p className="mt-2 max-w-xl text-xs leading-5 text-slate-400">Anyone can enter the WEAVE Client Market and visit this store without creating a WEAVE account. The public URL remains tied to this Client File Folder.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-right">
            <p className="text-[9px] uppercase tracking-wider text-slate-500">Entrance</p>
            <p className="mt-1 text-xs font-bold text-white">{data.store?.formation_status||'forming'}</p>
            <p className="mt-1 flex items-center justify-end gap-1 text-[9px] text-amber-300"><TimerReset className="h-3 w-3"/>{dueText}</p>
          </div>
        </div>
        {publicUrl&&<div className="mt-5 flex flex-wrap gap-2">
          <button onClick={()=>navigator.clipboard?.writeText(`${window.location.origin}${publicUrl}`)} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] text-slate-300"><Copy className="h-3.5 w-3.5"/>Copy market link</button>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] text-slate-300"><ExternalLink className="h-3.5 w-3.5"/>Visit public store</a>
          <a href="/market" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] text-slate-300"><Landmark className="h-3.5 w-3.5"/>Open Client Market</a>
        </div>}
      </div>
    </section>

    <section className="rounded-[2rem] border border-emerald-300/15 bg-emerald-400/[0.03] p-5 md:p-6">
      <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300">Build a store window</p></div>
      <h4 className="mt-2 text-lg font-black text-white">Offers become working windows inside the public building.</h4>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-[10px] text-slate-500">Offer name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="What can customers buy?" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
        <label className="text-[10px] text-slate-500">Offer type<select value={form.offer_type} onChange={e=>setForm({...form,offer_type:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"><option value="product">Product</option><option value="service">Service</option><option value="digital">Digital</option><option value="crypto">Crypto / exchange</option></select></label>
        <label className="text-[10px] text-slate-500">Price<input type="number" min="0" step="any" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
        <label className="text-[10px] text-slate-500">Currency<input value={form.currency} onChange={e=>setForm({...form,currency:e.target.value.toUpperCase()})} placeholder="NGN, USD, USDT…" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
      </div>
      <label className="mt-3 block text-[10px] text-slate-500">What the customer receives<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
      <button onClick={publish} disabled={busy==='offer'||!form.name.trim()||form.price===''} className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-950 disabled:opacity-40"><ShoppingBag className="h-3.5 w-3.5"/>{busy==='offer'?'Building window…':'Open offer window'}</button>
      {message&&<p className="mt-3 text-xs text-emerald-200">{message}</p>}
    </section>

    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Public offer windows</p><p className="mt-2 text-2xl font-black">{data.items?.length||0}</p></div><Store className="h-5 w-5 text-sky-300"/></div>
        <div className="mt-4 space-y-2">{data.items?.slice(0,7).map((item:any)=><div key={item.id} className="rounded-xl border border-white/5 bg-white/[0.025] p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-white">{item.name}</p><p className="text-[10px] text-sky-300">{item.price} {item.currency}</p></div><p className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">{item.offer_type||'product'}</p></div>)}</div>
      </div>
      <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Public customer movement</p><p className="mt-2 text-2xl font-black">{data.orders?.length||0}</p></div><Building2 className="h-5 w-5 text-emerald-300"/></div>
        <div className="mt-4 space-y-2">{data.orders?.slice(0,7).map((order:any)=><div key={order.id} className="rounded-xl border border-white/5 bg-white/[0.025] p-3 text-[10px] text-slate-400"><p className="font-semibold text-slate-200">{order.customer_name} · {order.amount} {order.currency}</p><p className="mt-1">Payment: {order.payment_status||'awaiting_payment'} · Order: {order.status}</p></div>)}</div>
      </div>
    </section>
  </div>
}
