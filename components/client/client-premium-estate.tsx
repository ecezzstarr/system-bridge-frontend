'use client'

import Link from 'next/link'
import {useEffect,useState} from 'react'
import {ArrowUpRight,Boxes,Building2,Crown,DoorOpen,ShieldCheck,Waypoints} from 'lucide-react'
import {useKingdomIdentity} from '@/components/world/kingdom-theme-frame'
import {getClientToken} from '@/lib/client-auth'

type EstateRecord={
  blueprints:number|null;inventory:number|null;building:number|null;completed:number|null;
  systems:number|null;doorPublished:boolean|null;fileNumber:string;businessName:string
}
const base='inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#b79250]/40 px-4 py-3 text-sm font-semibold text-[#f6e4c2] transition hover:border-[#f3d28a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9bd6d]'
function verified(record:any):EstateRecord{
  const world=record.file_folder_world||{}
  const arr=(name:string)=>Array.isArray(world[name])?world[name]:null
  const builds=arr('builds'),systems=arr('systems'),inventory=arr('inventory'),blueprints=arr('blueprints')
  const door=world.customerDoor
  return {
    blueprints:blueprints?.length??null,
    inventory:inventory?.filter((x:any)=>Number(x.quantity||0)>0).length??null,
    building:builds?.filter((x:any)=>x.status==='building').length??null,
    completed:builds?.filter((x:any)=>x.status==='complete').length??null,
    systems:systems?.filter((x:any)=>x.status==='active'||x.status==='complete').length??null,
    doorPublished:door?Boolean(door.public_slug&&['selling','ready_for_offer'].includes(String(door.formation_status||''))):null,
    fileNumber:String(record.client?.file_number||''),
    businessName:String(world.businessFormation?.business_name||record.client?.business_name||record.workshop?.title||'Your Premium Estate'),
  }
}
export default function ClientPremiumEstate(){
  const {identity,loading:identityLoading}=useKingdomIdentity()
  const [record,setRecord]=useState<EstateRecord|null>(null)
  const [state,setState]=useState<'loading'|'ready'|'unavailable'>('loading')
  useEffect(()=>{
    if(identity?.tier!=='premium'){setRecord(null);setState('loading');return}
    const controller=new AbortController()
    const token=getClientToken()
    if(!token){setState('unavailable');return}
    setState('loading')
    fetch('/api/client/system-switch',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:controller.signal})
      .then(async response=>{if(!response.ok)throw Error('Owner records unavailable');return response.json()})
      .then(data=>{if(controller.signal.aborted)return
        // The dashboard decoration never grants a tier or overrides the ownership resolver.
        if(!data.verified||data.file_folder_tier!=='premium'){setRecord(null);setState('unavailable');return}
        setRecord(verified(data));setState('ready')
      })
      .catch(()=>{if(!controller.signal.aborted){setRecord(null);setState('unavailable')}})
    return ()=>controller.abort()
  },[identity?.tier])
  if(!identity||identity.tier!=='premium')return null
  const stat=(v:number|null|undefined)=>v===null||v===undefined?'—':String(v)
  return <section className="premium-client-estate relative isolate overflow-hidden border-b border-[#9d7944]/50 bg-[#0a0a0e] px-4 pb-8 pt-7 text-[#f7edde] sm:px-8 sm:pt-10"
    data-premium-client-dashboard="verified-kingdom">
    <div className="pointer-events-none absolute -top-28 right-[-9rem] h-96 w-96 rounded-full bg-[#b08336]/15 blur-[110px]"/>
    <div className="pointer-events-none absolute -bottom-40 left-[-10rem] h-80 w-80 rounded-full bg-[#563f29]/20 blur-[100px]"/>
    <div className="relative mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ab8649]/25 pb-5">
        <p className="inline-flex items-center gap-2 text-sm font-bold tracking-[.14em] text-[#f0d6a0]"><Crown size={19}/> WEAVE · PREMIUM FILE FOLDER</p>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#c1a068]/40 bg-[#d7af6d]/10 px-3 py-2 text-xs font-semibold text-[#f3dbad]"><ShieldCheck size={15}/> Verified ownership · Private Client estate</span>
      </div>
      <div className="grid items-center gap-7 py-7 lg:grid-cols-[1.08fr_.92fr]">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[.22em] text-[#cbac72]">An enterprise environment · Built around your business</p>
          <h1 className="max-w-2xl font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-[#fff6e5] sm:text-5xl">Your business deserves its own citadel.</h1>
          <p className="max-w-2xl text-base leading-7 text-[#e1d5c4]">This is your Premium File Folder. Enter its private black-and-gold world to review materials, form systems, manage customer access and coordinate the work you have authorized.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/client/system-switch" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(115deg,#e9c683,#b38b4f)] px-5 py-3 text-base font-bold text-[#19130c] shadow-[0_12px_36px_rgba(174,123,55,.24)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9c683]"><DoorOpen size={20}/>Enter private Premium world <ArrowUpRight size={18}/></Link>
            <Link href="/client/system-store" className={base}><Building2 size={18}/>Explore business systems</Link>
          </div>
          <p className="text-sm leading-6 text-[#d0c0a9]">Business: <strong className="text-[#ffe6b7]">{record?.businessName||identity.businessName||'Your Client business'}</strong>{record?.fileNumber?' · File '+record.fileNumber:''}</p>
        </div>
        <div className="relative overflow-hidden rounded-[1.7rem] border border-[#c29a59]/45 bg-[radial-gradient(circle_at_50%_8%,#4b3a2a,#171419_70%)] p-5 shadow-[0_30px_80px_rgba(0,0,0,.5),inset_0_1px_0_rgba(241,207,148,.12)]">
          <div className="absolute inset-4 rounded-2xl border border-[#b59057]/20"/>
          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-[.14em] text-[#f4d6a2]">Estate operating record</p>
            <p className="mt-2 text-base leading-6 text-[#cfc0a9]">Counts come from your verified File Folder, not simulated company activity.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[['Blueprints',stat(record?.blueprints)],['Material kits',stat(record?.inventory)],['In construction',stat(record?.building)],['Commissioned systems',stat(record?.systems)]].map(([name,value])=>
                <div key={name} className="rounded-xl border border-[#b28a52]/25 bg-black/25 p-4">
                  <strong className="block text-3xl font-semibold tabular-nums text-[#ffdf9f]">{value}</strong>
                  <span className="mt-1 block text-sm text-[#e1d1b9]">{name}</span>
                </div>)}
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#c7a166]/25 bg-[#2d251b]/35 p-4 text-sm leading-6 text-[#e8d8bf]"><Waypoints className="mt-1 shrink-0 text-[#e7bd77]" size={20}/>
              <p>Customer Door: <strong className="text-[#ffdf9f]">{state==='ready'?(record?.doorPublished?'Public access commissioned':'Not publicly commissioned'):'Awaiting verified records'}</strong>. Private systems remain owner-only.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-3 border-t border-[#b38f59]/30 pt-6 sm:grid-cols-3" aria-label="Premium operating routes">
        <Link href="/client/system-switch" className={base}><Boxes size={18}/>Blueprints, materials and construction</Link>
        <Link href="/client/system-switch" className={base}><Waypoints size={18}/>Live operations and participation</Link>
        <Link href="/client/system-switch" className={base}><DoorOpen size={18}/>Customer Door and enterprise</Link>
      </div>
      {state==='unavailable'&&!identityLoading&&<p role="status" className="mt-4 text-sm text-[#e2cb9d]">Live operating figures are unavailable. Your private entrance remains available; no balance or completion status has been invented.</p>}
    </div>
  </section>
}
