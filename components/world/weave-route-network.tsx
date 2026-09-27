'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import { ArrowRight, Route } from 'lucide-react'

export type WeaveRouteTone='sky'|'emerald'|'amber'|'violet'|'cyan'|'rose'

export type WeaveRouteStation={
  label:string
  detail:string
  href:string
  district:string
  icon:ComponentType<{className?:string}>
  tone?:WeaveRouteTone
}

const TONE:Record<WeaveRouteTone,{line:string;dot:string;icon:string;label:string;wash:string}>={
  sky:{line:'bg-sky-300/25',dot:'border-sky-200/50 bg-sky-300',icon:'text-sky-200',label:'text-sky-300',wash:'hover:bg-sky-400/[0.045]'},
  emerald:{line:'bg-emerald-300/25',dot:'border-emerald-200/50 bg-emerald-300',icon:'text-emerald-200',label:'text-emerald-300',wash:'hover:bg-emerald-400/[0.045]'},
  amber:{line:'bg-amber-300/25',dot:'border-amber-200/50 bg-amber-300',icon:'text-amber-200',label:'text-amber-300',wash:'hover:bg-amber-400/[0.045]'},
  violet:{line:'bg-violet-300/25',dot:'border-violet-200/50 bg-violet-300',icon:'text-violet-200',label:'text-violet-300',wash:'hover:bg-violet-400/[0.045]'},
  cyan:{line:'bg-cyan-300/25',dot:'border-cyan-200/50 bg-cyan-300',icon:'text-cyan-200',label:'text-cyan-300',wash:'hover:bg-cyan-400/[0.045]'},
  rose:{line:'bg-rose-300/25',dot:'border-rose-200/50 bg-rose-300',icon:'text-rose-200',label:'text-rose-300',wash:'hover:bg-rose-400/[0.045]'},
}

export function WeaveRouteNetwork({
  stations,
  title='Movement routes',
  detail='Functions are stations inside one operating environment. Enter one, act, and return with changed state.',
  compact=false,
}:{
  stations:WeaveRouteStation[]
  title?:string
  detail?:string
  compact?:boolean
}){
  const districts:string[]=[]
  const grouped=new Map<string,WeaveRouteStation[]>()
  for(const station of stations){
    if(!grouped.has(station.district)){
      grouped.set(station.district,[])
      districts.push(station.district)
    }
    grouped.get(station.district)!.push(station)
  }

  return <section className="weave-route-network" data-weave-route-network>
    <header className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-amber-300"/>
          <p data-weave-live-word="station" className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">{title}</p>
        </div>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">{detail}</p>
      </div>
      <div className="shrink-0 text-left sm:text-right">
        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600">Live stations</p>
        <p className="mt-1 text-xl font-black text-white">{stations.length}</p>
      </div>
    </header>

    <div className="mt-2 divide-y divide-white/[0.07]">
      {districts.map((district,districtIndex)=>{
        const lane=grouped.get(district) || []
        const tone=TONE[lane[0]?.tone||'sky']
        return <section key={district} className="relative grid gap-0 py-2 md:grid-cols-[150px_minmax(0,1fr)]" data-weave-route-lane={district}>
          <div className="relative flex items-start gap-3 px-2 py-3 md:block md:border-r md:border-white/[0.07] md:px-3">
            <span className={'mt-1.5 block h-2.5 w-2.5 shrink-0 rounded-full border shadow-[0_0_18px_currentColor] '+tone.dot}/>
            <div className="md:mt-2">
              <p data-weave-live-word="station" className={'text-[8px] font-black uppercase tracking-[0.16em] '+tone.label}>{district}</p>
              <p className="mt-1 text-[9px] text-slate-600">Route {String(districtIndex+1).padStart(2,'0')}</p>
            </div>
            <span className={'absolute bottom-0 left-[16px] top-9 hidden w-px md:block '+tone.line}/>
          </div>

          <div className="min-w-0">
            {lane.map((station,index)=>{
              const Icon=station.icon
              const stationTone=TONE[station.tone||lane[0]?.tone||'sky']
              return <Link
                key={station.label+station.href}
                href={station.href}
                data-weave-route-station={station.label}
                className={'group grid min-h-16 grid-cols-[34px_minmax(0,1fr)_22px] items-center gap-3 border-b border-white/[0.055] px-3 py-3 transition last:border-b-0 '+stationTone.wash+(compact?' sm:min-h-14':' sm:min-h-[72px]')}
              >
                <span className="relative flex h-8 w-8 items-center justify-center">
                  <span className={'absolute h-2.5 w-2.5 rounded-full border '+stationTone.dot}/>
                  <Icon className={'relative h-4 w-4 translate-x-5 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 '+stationTone.icon}/>
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span data-weave-live-word="station" className="text-sm font-black text-white">{station.label}</span>
                    <span className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-600">Station {String(index+1).padStart(2,'0')}</span>
                  </span>
                  <span className="mt-1 block text-[10px] leading-4 text-slate-400">{station.detail}</span>
                </span>
                <ArrowRight className={'h-4 w-4 text-slate-700 transition group-hover:translate-x-1 '+stationTone.icon}/>
              </Link>
            })}
          </div>
        </section>
      })}
    </div>
  </section>
}
