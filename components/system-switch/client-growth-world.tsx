
'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Crown,
  Network,
  Plus,
  Radio,
  Route,
  Save,
  Sparkles,
  TowerControl,
  Users,
  Zap,
} from 'lucide-react'
import { getClientToken } from '@/lib/client-auth'

type Props={
  initialGrowth:any
  systems:any[]
  enterprise:any
  onOpenConstruction?:(district:string)=>void
}

function systemName(type:string){
  return String(type||'system').replaceAll('_',' ')
}

export default function ClientGrowthWorld({
  initialGrowth,
  systems,
  enterprise,
  onOpenConstruction,
}:Props){
  const [growth,setGrowth]=useState(initialGrowth)
  const [busy,setBusy]=useState('')
  const [message,setMessage]=useState('')
  const channel=growth?.streaming?.channel||{}
  const [channelForm,setChannelForm]=useState({
    name:channel.name||'',
    tagline:channel.tagline||'',
    description:channel.description||'',
  })
  const [program,setProgram]=useState({
    title:'',
    description:'',
    program_type:'program',
    media_url:'',
    scheduled_at:'',
    duration_minutes:'60',
  })
  const [live,setLive]=useState({
    live_title:channel.live_title||'',
    live_source_url:channel.live_source_url||'',
  })
  const [route,setRoute]=useState({
    name:'',
    source_system_id:'',
    target_system_id:'',
    route_type:'commerce',
  })
  const [movement,setMovement]=useState<Record<string,{title:string;value:string;unit:string;note:string}>>({})

  useEffect(()=>{
    setGrowth(initialGrowth)
  },[initialGrowth])

  useEffect(()=>{
    if(!growth?.streaming?.channel)return
    const next=growth.streaming.channel
    setChannelForm({name:next.name||'',tagline:next.tagline||'',description:next.description||''})
    setLive({live_title:next.live_title||'',live_source_url:next.live_source_url||''})
  },[growth?.streaming?.channel?.updated_at])

  const act=async(payload:any,key:string)=>{
    setBusy(key);setMessage('')
    try{
      const token=getClientToken()
      const response=await fetch('/api/client/growth-world',{
        method:'POST',
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify(payload),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Expansion movement failed')
      setGrowth(body.growth)
      setMessage('Growth movement recorded in the Client File Folder.')
      return true
    }catch(error:any){
      setMessage(error?.message||'Expansion movement failed')
      return false
    }finally{setBusy('')}
  }

  const liveSystems=useMemo(()=>systems.filter(system=>system.status==='active'),[systems])
  const systemTypes=new Set(liveSystems.map(system=>system.system_type))
  const routeStationOpen=systemTypes.has('route_station')
  const approved=Boolean(growth?.enterprise?.approved)
  const vitality=growth?.vitality||{}
  const capabilities=growth?.capabilities||{}

  const stages=[
    {branch:'Streaming',icon:Radio,steps:[
      ['Creator Booth',systemTypes.has('creator_booth')],
      ['Broadcast Studio',systemTypes.has('broadcast_studio')],
      ['Streaming Open Gate',Boolean(growth?.streaming?.gateOpen)],
      ['Media Network',Boolean(growth?.streaming?.mediaNetworkOpen)],
    ]},
    {branch:'Enterprise',icon:Crown,steps:[
      ['Approval',approved],
      ['Enterprise Door',Boolean(growth?.enterprise?.doorOpen)],
      ['Enterprise Hall',Boolean(growth?.enterprise?.hallOpen)],
      ['Operations Command',Boolean(growth?.enterprise?.operationsOpen)],
      ['Distribution Network',Boolean(growth?.enterprise?.distributionOpen)],
    ]},
    {branch:'Network',icon:Network,steps:[
      ['Route Station',routeStationOpen],
      ['Business Routes',(growth?.routes?.length||0)>0],
      ['Route Capacity '+(capabilities.routeCapacity||0),Boolean(capabilities.routeCapacity)],
      ['Recorded Movement',Number(vitality.routeMovements30d||0)>0],
    ]},
  ]

  const saveChannel=()=>act({action:'save_stream_profile',...channelForm},'channel')
  const addProgram=async()=>{
    const ok=await act({action:'add_stream_program',...program,duration_minutes:Number(program.duration_minutes)},'program')
    if(ok)setProgram({title:'',description:'',program_type:'program',media_url:'',scheduled_at:'',duration_minutes:'60'})
  }
  const setLiveState=async(isLive:boolean)=>{
    await act({action:'set_stream_live',is_live:isLive,...live},'live')
  }
  const createRoute=async()=>{
    const ok=await act({action:'create_business_route',...route},'route')
    if(ok)setRoute({name:'',source_system_id:'',target_system_id:'',route_type:'commerce'})
  }
  const recordMovement=async(routeId:string)=>{
    const draft=movement[routeId]||{title:'',value:'',unit:'',note:''}
    const ok=await act({
      action:'record_route_movement',
      route_id:routeId,
      title:draft.title,
      movement_value:draft.value===''?null:Number(draft.value),
      movement_unit:draft.unit,
      note:draft.note,
    },'movement:'+routeId)
    if(ok)setMovement({...movement,[routeId]:{title:'',value:'',unit:'',note:''}})
  }

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,.10),transparent_34%),radial-gradient(circle_at_84%_0%,rgba(245,158,11,.08),transparent_28%),#030813]">
      <div className="grid gap-0 xl:grid-cols-[1.1fr_.9fr]">
        <div className="p-5 md:p-6">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">Expansion Command</p>
          <h2 className="mt-2 text-2xl font-black text-white">Build capability, then earn activity through real use.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Flame Coin purchases create infrastructure and capacity. Business Vitality is separate: it rises from customer orders, completed operating movements, Business Route movement, streaming programs and active Legion participation.</p>
          <button onClick={()=>onOpenConstruction?.('blueprint_foundry')} className="mt-5 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-violet-100"><Zap className="h-4 w-4"/>Open expansion blueprints <ArrowRight className="h-4 w-4"/></button>
        </div>
        <div className="border-t border-white/10 p-5 xl:border-l xl:border-t-0">
          <div className="flex items-center justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Business Vitality</p><p className="mt-2 text-5xl font-black text-white">{Number(vitality.score||0)}</p></div><Activity className="h-10 w-10 text-amber-300"/></div>
          <p className="mt-3 text-[10px] leading-5 text-slate-500">{vitality.explanation}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[8px] uppercase tracking-wider text-slate-600">Orders · 30d</p><p className="mt-1 text-lg font-black">{vitality.orders30d||0}</p></div>
            <div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[8px] uppercase tracking-wider text-slate-600">Operations · 30d</p><p className="mt-1 text-lg font-black">{vitality.completedOperations30d||0}</p></div>
            <div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[8px] uppercase tracking-wider text-slate-600">Route movement</p><p className="mt-1 text-lg font-black">{vitality.routeMovements30d||0}</p></div>
            <div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[8px] uppercase tracking-wider text-slate-600">Programs · 30d</p><p className="mt-1 text-lg font-black">{vitality.streamPrograms30d||0}</p></div>
          </div>
        </div>
      </div>
    </section>

    <section className="grid gap-4 lg:grid-cols-3">
      {stages.map(stage=>{
        const Icon=stage.icon
        return <article key={stage.branch} className="rounded-[1.7rem] border border-white/10 bg-white/[0.025] p-5">
          <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-sky-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">{stage.branch} branch</p></div>
          <div className="mt-4 space-y-2">{stage.steps.map((entry,index)=>{
            const label=String(entry[0]);const open=Boolean(entry[1])
            return <div key={label} className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 p-3"><span className={'flex h-6 w-6 items-center justify-center rounded-full border text-[8px] font-black '+(open?'border-emerald-300/25 bg-emerald-400/10 text-emerald-300':'border-white/10 text-slate-600')}>{open?<CheckCircle2 className="h-3.5 w-3.5"/>:index+1}</span><span className={open?'text-xs font-black text-white':'text-xs font-black text-slate-500'}>{label}</span></div>
          })}</div>
        </article>
      })}
    </section>

    <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      {[
        ['Routes',capabilities.routeCapacity||0],
        ['Legions',capabilities.legionCapacity||0],
        ['Programs',capabilities.streamProgramCapacity||0],
        ['Audience',capabilities.audienceCapacity||0],
        ['AI Nodes',capabilities.aiFlameNodes||0],
        ['Automation',capabilities.automationNodes||0],
      ].map(entry=><div key={String(entry[0])} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center"><p className="text-[8px] font-black uppercase tracking-wider text-slate-600">{String(entry[0])}</p><p className="mt-2 text-2xl font-black text-white">{Number(entry[1]).toLocaleString()}</p></div>)}
    </section>

    <section className="rounded-[2rem] border border-rose-300/15 bg-rose-400/[0.025] p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="flex items-center gap-2"><TowerControl className="h-4 w-4 text-rose-300"/><p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-300">Streaming operation</p></div><h3 className="mt-2 text-xl font-black">Client-owned broadcast environment</h3><p className="mt-2 text-xs leading-5 text-slate-400">The Client can prepare identity before the gate opens. Program formation requires Broadcast Studio. Public live broadcasting requires Streaming Open Gate.</p></div>
        {growth?.streaming?.publicUrl&&<a href={growth.streaming.publicUrl} target="_blank" rel="noreferrer" className="rounded-full border border-rose-300/20 bg-rose-400/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-rose-100">Open public channel</a>}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">Channel identity</p>
          <div className="mt-3 grid gap-2">
            <input value={channelForm.name} onChange={e=>setChannelForm({...channelForm,name:e.target.value})} placeholder="Channel name" className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/>
            <input value={channelForm.tagline} onChange={e=>setChannelForm({...channelForm,tagline:e.target.value})} placeholder="Public tagline" className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/>
            <textarea value={channelForm.description} onChange={e=>setChannelForm({...channelForm,description:e.target.value})} rows={3} placeholder="What this channel broadcasts" className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/>
            <button onClick={saveChannel} disabled={busy==='channel'||!channelForm.name.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 text-[10px] font-black uppercase text-white disabled:opacity-40"><Save className="h-4 w-4"/>Save channel</button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">Live source</p>
          <div className="mt-3 grid gap-2">
            <input value={live.live_title} onChange={e=>setLive({...live,live_title:e.target.value})} placeholder="Live title" className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/>
            <input value={live.live_source_url} onChange={e=>setLive({...live,live_source_url:e.target.value})} placeholder="Secure HTTPS broadcast source / player URL" className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={()=>setLiveState(true)} disabled={busy==='live'||!growth?.streaming?.gateOpen} className="rounded-xl bg-rose-500 px-4 py-3 text-[10px] font-black uppercase text-white disabled:opacity-35">Go live</button>
              <button onClick={()=>setLiveState(false)} disabled={busy==='live'||!channel.is_live} className="rounded-xl border border-white/10 px-4 py-3 text-[10px] font-black uppercase text-slate-300 disabled:opacity-35">Close live</button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">Program formation</p><p className="mt-1 text-xs text-slate-400">{(growth?.streaming?.programs||[]).filter((x:any)=>['scheduled','live'].includes(x.status)).length} / {capabilities.streamProgramCapacity||0} active program slots</p></div><Sparkles className="h-4 w-4 text-violet-300"/></div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input value={program.title} onChange={e=>setProgram({...program,title:e.target.value})} placeholder="Program title" className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/>
          <select value={program.program_type} onChange={e=>setProgram({...program,program_type:e.target.value})} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"><option value="program">Program</option><option value="launch">Launch</option><option value="workshop">Workshop</option><option value="interview">Interview</option><option value="music">Music</option><option value="product_demo">Product demonstration</option></select>
          <input type="datetime-local" value={program.scheduled_at} onChange={e=>setProgram({...program,scheduled_at:e.target.value})} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/>
          <input type="number" min="5" value={program.duration_minutes} onChange={e=>setProgram({...program,duration_minutes:e.target.value})} placeholder="Minutes" className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/>
          <input value={program.media_url} onChange={e=>setProgram({...program,media_url:e.target.value})} placeholder="Replay/source URL (optional)" className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white md:col-span-2"/>
          <textarea value={program.description} onChange={e=>setProgram({...program,description:e.target.value})} rows={2} placeholder="Program purpose" className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white md:col-span-2"/>
        </div>
        <button onClick={addProgram} disabled={busy==='program'||!program.title.trim()||!growth?.streaming?.studioOpen} className="mt-3 inline-flex items-center gap-2 rounded-full bg-violet-500 px-4 py-2.5 text-[10px] font-black uppercase text-white disabled:opacity-35"><Plus className="h-4 w-4"/>Form program</button>
      </div>
    </section>

    <section className="rounded-[2rem] border border-cyan-300/15 bg-cyan-400/[0.025] p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="flex items-center gap-2"><Route className="h-4 w-4 text-cyan-300"/><p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">Business Routes</p></div><h3 className="mt-2 text-xl font-black">Connect completed systems and record movement between them.</h3><p className="mt-2 text-xs leading-5 text-slate-400">Routes become available after Route Station construction. Installed Route Capacity Modules determine how many active routes the Client can maintain.</p></div>
        <span className="rounded-full border border-cyan-300/15 bg-cyan-400/5 px-3 py-2 text-[9px] font-black uppercase text-cyan-200">{growth?.routes?.length||0} / {capabilities.routeCapacity||0} routes</span>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <input value={route.name} onChange={e=>setRoute({...route,name:e.target.value})} placeholder="Route name" className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/>
          <select value={route.source_system_id} onChange={e=>setRoute({...route,source_system_id:e.target.value})} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"><option value="">Source system</option>{liveSystems.map(system=><option key={system.id} value={system.id}>{system.title} · {systemName(system.system_type)}</option>)}</select>
          <select value={route.target_system_id} onChange={e=>setRoute({...route,target_system_id:e.target.value})} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"><option value="">Target system</option>{liveSystems.map(system=><option key={system.id} value={system.id}>{system.title} · {systemName(system.system_type)}</option>)}</select>
          <select value={route.route_type} onChange={e=>setRoute({...route,route_type:e.target.value})} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"><option value="commerce">Commerce</option><option value="distribution">Distribution</option><option value="campaign">Campaign</option><option value="media">Media</option><option value="operations">Operations</option><option value="service">Service</option></select>
        </div>
        <button onClick={createRoute} disabled={busy==='route'||!routeStationOpen||!route.name.trim()||!route.source_system_id||!route.target_system_id} className="mt-3 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2.5 text-[10px] font-black uppercase text-slate-950 disabled:opacity-35"><Network className="h-4 w-4"/>Open route</button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {(growth?.routes||[]).map((item:any)=>{
          const draft=movement[item.id]||{title:'',value:'',unit:'',note:''}
          return <article key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-white">{item.name}</p><p className="mt-1 text-[9px] text-slate-500">{item.source_title} → {item.target_title}</p></div><span className="text-[9px] font-black uppercase text-cyan-300">{item.movement_count} movements</span></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input value={draft.title} onChange={e=>setMovement({...movement,[item.id]:{...draft,title:e.target.value}})} placeholder="What moved?" className="rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs text-white sm:col-span-2"/>
              <input type="number" min="0" value={draft.value} onChange={e=>setMovement({...movement,[item.id]:{...draft,value:e.target.value}})} placeholder="Value / quantity" className="rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs text-white"/>
              <input value={draft.unit} onChange={e=>setMovement({...movement,[item.id]:{...draft,unit:e.target.value}})} placeholder="Unit e.g. orders, NGN" className="rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs text-white"/>
              <input value={draft.note} onChange={e=>setMovement({...movement,[item.id]:{...draft,note:e.target.value}})} placeholder="Movement note" className="rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs text-white sm:col-span-2"/>
            </div>
            <button onClick={()=>recordMovement(item.id)} disabled={busy==='movement:'+item.id||!draft.title.trim()} className="mt-3 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-[9px] font-black uppercase text-cyan-100 disabled:opacity-35">Record movement</button>
          </article>
        })}
      </div>
    </section>

    <section className="rounded-[2rem] border border-amber-300/15 bg-amber-400/[0.025] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-amber-300"/><p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">Enterprise territory</p></div><h3 className="mt-2 text-xl font-black">{approved?'Approved enterprise expansion':'Enterprise Door waits behind Administration approval'}</h3><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">{approved?'Construct Enterprise Door after Marketplace Network, then expand into Hall, Legion Quarters, Operations Command, Treasury and Distribution Network.':'The Client first submits the sustainable-profit business plan in Enterprise Dream. Construction cannot bypass Administration approval.'}</p></div>{growth?.enterprise?.publicUrl&&<a href={growth.enterprise.publicUrl} target="_blank" rel="noreferrer" className="rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2.5 text-[10px] font-black uppercase text-amber-100">Open Enterprise Door</a>}</div>
      <div className="mt-5 grid gap-2 md:grid-cols-3">
        <div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[8px] uppercase tracking-wider text-slate-600">Position</p><p className="mt-1 text-sm font-black capitalize">{enterprise?.position||'client'}</p></div>
        <div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[8px] uppercase tracking-wider text-slate-600">Legion capacity</p><p className="mt-1 text-sm font-black">{capabilities.legionCapacity||0}</p></div>
        <div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[8px] uppercase tracking-wider text-slate-600">Verification labs</p><p className="mt-1 text-sm font-black">{capabilities.verificationLabs||0}</p></div>
      </div>
    </section>

    {message&&<div className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs text-slate-300">{message}</div>}
  </div>
}
