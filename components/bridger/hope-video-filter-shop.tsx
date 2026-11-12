'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, LockKeyhole, Palette, Sparkles, Wallet } from 'lucide-react'
import { getAuthHeaders } from '@/lib/auth-client'
import type { HopeVideoFilter } from '@/lib/hope-video-filter-catalog'
import { prepareHopeVideoEffect } from '@/lib/hope-video-premium-effects'

type FilterInfo=HopeVideoFilter
type CatalogState={
  filters:FilterInfo[]
  owned:string[]
  balanceSystemSwitch:number
}
type Props={activeFilter:FilterInfo|null;activeFace:FilterInfo|null;onFilterSelect:(filter:FilterInfo|null,layer?:'scene'|'face')=>Promise<void>}

export default function HopeVideoFilterShop({activeFilter,activeFace,onFilterSelect}:Props){
  const [catalog,setCatalog]=useState<CatalogState|null>(null)
  const [loading,setLoading]=useState(true)
  const [supported,setSupported]=useState<boolean|null>(null)
  const [category,setCategory]=useState<'color'|'background'|'face'>('background')
  const [buying,setBuying]=useState<string|null>(null)
  const [applying,setApplying]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')

  const refresh=useCallback(async()=>{
    const res=await fetch('/api/hope/video-filters',{headers:getAuthHeaders(),cache:'no-store'})
    const data=await res.json().catch(()=>({}))
    if(!res.ok||!data.success)throw new Error(data.error||'Filter catalog unavailable')
    setCatalog({
      filters:Array.isArray(data.filters)?data.filters:[],
      owned:Array.isArray(data.owned)?data.owned:[],
      balanceSystemSwitch:Number(data.balanceSystemSwitch)||0,
    })
  },[])

  useEffect(()=>{
    const canvas=document.createElement('canvas')
    const context=canvas.getContext('2d')
    setSupported(Boolean(typeof window.RTCPeerConnection!=='undefined' && typeof canvas.captureStream==='function' && context && 'filter' in context))
  },[])

  useEffect(()=>{
    let live=true
    void refresh().catch(e=>{if(live)setError(e?.message||'Unable to open the filter shop')})
      .finally(()=>{if(live)setLoading(false)})
    return ()=>{live=false}
  },[refresh])

  const select=async(filter:FilterInfo|null,layer:'scene'|'face'='scene')=>{
    setError('');setNotice('');setApplying(true)
    try{await onFilterSelect(filter,layer)}
    catch(e:any){setError(e?.message||'Could not apply that effect to your video')}
    finally{setApplying(false)}
  }

  const buy=async(filter:FilterInfo)=>{
    if(buying||applying||!catalog||supported!==true)return
    // No browser-provided prices or discounts are accepted by the server.
    if(filter.effectKind!=='color'){
      setBuying(filter.id);setNotice('Checking live vision and background assets before payment…')
      try{
        await prepareHopeVideoEffect(filter)
      }catch(e:any){
        setNotice('')
        setError(e?.message||'This live effect is unavailable on this device. Nothing was charged.')
        setBuying(null)
        return
      }
      setBuying(null);setNotice('')
    }
    if(!window.confirm('Purchase '+filter.name+' permanently for '+filter.priceSystemSwitch+' System Switch?')){
      return
    }
    setBuying(filter.id);setError('');setNotice('')
    try{
      const res=await fetch('/api/hope/video-filters',{
        method:'POST',headers:getAuthHeaders(),body:JSON.stringify({filterId:filter.id}),
      })
      const data=await res.json().catch(()=>({}))
      if(!res.ok||!data.success){
        if(data.reason==='insufficient_balance'){
          throw new Error('Insufficient System Switch. Required: '+data.requiredSystemSwitch+'; available: '+data.availableSystemSwitch+'.')
        }
        throw new Error(data.error||data.reason||'The purchase could not be completed. No license granted.')
      }
      // Refresh the authenticated entitlement before enabling the filter.
      await refresh()
      setNotice(data.alreadyOwned?'Already purchased; no additional charge.':'Purchased '+filter.name+' for '+data.chargedSystemSwitch+' System Switch. This filter is yours permanently.')
    }catch(e:any){setError(e?.message||'Could not complete purchase. Check your records before retrying.')}
    finally{setBuying(null)}
  }

  return <section data-hope-video-paid-filters="permanent-licenses" className="rounded-2xl border border-[#dccba8] bg-[#fffaf0] p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8e692f]"><Palette size={16}/> Hope · Live Filter Shop</p>
        <h3 className="mt-1 text-lg font-semibold">Style your video, not just your preview</h3>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-[#667275]">
          Choose from 18 original company and scenic backgrounds, real-time background removal, color looks and synthetic face masks. Each purchase is permanent, and the selected effect reaches your guest through WebRTC. Original video remains free. Backgrounds and owned face masks can now be combined, without changing speech.
        </p>
      </div>
      <div className="inline-flex items-center gap-2 rounded-xl border border-[#ddc9a2] bg-white px-3 py-2 text-xs font-semibold">
        <Wallet size={15}/> {catalog?catalog.balanceSystemSwitch.toLocaleString():'—'} System Switch
      </div>
    </div>

    {supported===false&&<p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">This device cannot transmit live canvas filters. Purchases are disabled here; try a supported browser before spending System Switch.</p>}
    {loading&&<p role="status" className="mt-3 text-sm">Loading prices and your saved licenses…</p>}
    {!loading&&!catalog&&<button className="mt-3 rounded-lg border px-4 py-2 text-sm" onClick={()=>void refresh().catch(e=>setError(e?.message))}>Retry filter shop</button>}
    {catalog&&<div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Live effect categories">
      {([
        ['background','Backgrounds · '+catalog.filters.filter(f=>f.effectKind==='scene'||f.effectKind==='remove').length],
        ['color','Color looks · '+catalog.filters.filter(f=>f.effectKind==='color').length],
        ['face','Face masks · '+catalog.filters.filter(f=>f.effectKind==='face').length],
      ] as const).map(([kind,label])=><button key={kind} type="button" onClick={()=>setCategory(kind)} aria-pressed={category===kind}
        className={'min-h-10 rounded-full border px-4 text-xs font-semibold '+(category===kind?'border-[#9e7738] bg-[#ebdcc0]':'border-[#d8c6a8] bg-white')}>{label}</button>)}
    </div>}
    {catalog&&<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
      <button type="button" disabled={applying||Boolean(buying)} onClick={()=>void select(null,'scene')}
        className={'min-h-[112px] rounded-xl border p-3 text-left transition '+(!activeFilter?'border-[#a6803e] bg-[#f4e5c7]':'border-[#e2d6c2] bg-white')+(applying?' opacity-60':'')}>
        <span className="text-sm font-bold">Original</span>
        <span className="mt-1 block text-xs leading-5">Original camera scene; an active face mask remains in place</span>
        <span className="mt-2 block text-xs font-bold text-emerald-700">Included · No filter</span>
      </button>
      {category==='face'&&<button type="button" disabled={applying||Boolean(buying)} onClick={()=>void select(null,'face')}
        className={'min-h-[112px] rounded-xl border p-3 text-left '+(!activeFace?'border-[#a6803e] bg-[#f4e5c7]':'border-[#e2d6c2] bg-white')}>
        <span className="text-sm font-bold">Natural Face</span>
        <span className="mt-1 block text-xs leading-5">Remove your face mask without changing your background</span>
        <span className="mt-2 block text-xs font-bold text-emerald-700">No face mask</span>
      </button>}
      {catalog.filters.filter(filter=>category==='background'?filter.effectKind==='scene'||filter.effectKind==='remove':filter.effectKind===category).map(filter=>{
        const owned=catalog.owned.includes(filter.id)
        const selected=(filter.effectKind==='face'?activeFace:activeFilter)?.id===filter.id
        return <div key={filter.id} className={'flex min-h-[112px] flex-col rounded-xl border p-3 '+(selected?'border-[#a6803e] bg-[#f4e5c7]':'border-[#e2d6c2] bg-white')}>
          <div className="flex items-start justify-between gap-1">
            <span className="text-sm font-bold">{filter.name}</span>
            {owned?<CheckCircle2 size={16} className="shrink-0 text-emerald-700"/>:<LockKeyhole size={16} className="shrink-0 text-[#987133]"/>}
          </div>
          {filter.effectKind==='scene'&&filter.sceneSrc
            ?<div className="my-2 h-20 overflow-hidden rounded-lg bg-[#d0d5da]" aria-hidden="true"><img src={filter.sceneSrc} alt="" loading="lazy" className="h-full w-full object-cover"/></div>
            :<div className="my-2 flex h-16 items-center justify-center rounded-lg bg-gradient-to-r from-[#9d7040] via-[#b3bac1] to-[#75548a]" style={{filter:filter.css}} aria-hidden="true"><span className="text-[10px] font-bold tracking-widest text-white/90">{filter.effectKind==='face'?'FACE MASK':filter.effectKind==='remove'?'BACKGROUND HIDE':'COLOR LOOK'}</span></div>}
          <span className="flex-1 text-xs leading-4 text-[#5b6b70]">{filter.detail}</span>
          {owned?<button type="button" disabled={applying||Boolean(buying)} onClick={()=>void select(filter,filter.effectKind==='face'?'face':'scene')}
            className="mt-3 min-h-10 rounded-lg bg-[#275464] px-2 text-xs font-semibold text-white disabled:opacity-50">{selected?'Applied to video':'Apply owned filter'}</button>
          :<button type="button" disabled={applying||Boolean(buying)||supported!==true} onClick={()=>void buy(filter)}
            className="mt-3 min-h-10 rounded-lg border border-[#bc985a] px-2 text-xs font-bold text-[#76531b] disabled:opacity-50">
              {buying===filter.id?'Purchasing…':'Buy · '+filter.priceSystemSwitch+' System Switch'}
            </button>}
        </div>
      })}
    </div>}
    {notice&&<p role="status" className="mt-3 flex items-start gap-2 text-xs leading-5 text-emerald-800"><Sparkles size={16} className="shrink-0"/>{notice}</p>}
    {error&&<p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
    <p className="mt-3 text-[11px] leading-5 text-[#6f7776]">Purchases use your primary System Switch wallet, one permanent license per look or background. Live backgrounds use on-device person segmentation. Face masks are clearly synthetic, not a real person's identity. Device compatibility and model download are checked before higher-priced purchases. No per-call AI generation charge.</p>
  </section>
}
