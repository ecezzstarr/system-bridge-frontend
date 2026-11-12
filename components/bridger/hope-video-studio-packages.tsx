'use client'

import {useCallback,useEffect,useState} from 'react'
import {Check,Gift,Layers3,Wallet} from 'lucide-react'
import {getAuthHeaders} from '@/lib/auth-client'
import {HOPE_VIDEO_FILTERS} from '@/lib/hope-video-filter-catalog'
import {prepareHopeVideoEffect} from '@/lib/hope-video-premium-effects'

type Package={
  id:string;name:string;description:string;featured:boolean;priceSystemSwitch:number;filterIds:readonly string[];
  alreadyPurchased:boolean;
  quote:{total:number;remaining:number;chargedSystemSwitch:number;
    savedSystemSwitch:number;listValue:number;remainingListValue:number;missingIds:string[]}
}
type Catalog={packages:Package[];ownedFilterIds:string[];balanceSystemSwitch:number}

export default function HopeVideoStudioPackages({onPurchase}:{
  onPurchase?:()=>void|Promise<void>
}){
  const [catalog,setCatalog]=useState<Catalog|null>(null)
  const [busy,setBusy]=useState<string|null>(null)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [loading,setLoading]=useState(true)

  const refresh=useCallback(async()=>{
    const response=await fetch('/api/hope/video-bundles',{headers:getAuthHeaders(),cache:'no-store'})
    const result=await response.json().catch(()=>({}))
    if(!response.ok||!result.success)throw new Error(result.error||'Studio packages are unavailable')
    setCatalog(result)
  },[])

  useEffect(()=>{
    let mounted=true
    void refresh().catch(error=>{if(mounted)setError(error?.message||'Could not load packages')})
      .finally(()=>{if(mounted)setLoading(false)})
    return ()=>{mounted=false}
  },[refresh])

  const purchase=async(bundle:Package)=>{
    if(busy||bundle.quote.remaining===0)return
    setBusy(bundle.id);setError('');setNotice('')
    try{
      const needed=bundle.quote.missingIds.map(id=>HOPE_VIDEO_FILTERS.find(f=>f.id===id))
      if(needed.some(f=>!f))throw new Error('A studio package contains an unavailable effect')
      // Before payment, verify that this device can load the different categories.
      // Source media is never uploaded to the service.
      const representative=['scene','remove','face'].map(kind=>needed.find(f=>f?.effectKind===kind))
        .filter((effect):effect is NonNullable<typeof effect>=>Boolean(effect))
      for(const effect of representative)await prepareHopeVideoEffect(effect)
      if(!window.confirm(
        'Purchase '+bundle.name+' for '+bundle.quote.chargedSystemSwitch+
        ' System Switch? This grants '+bundle.quote.remaining+' new permanent effects. Existing purchases are excluded.'
      )){
        setBusy(null)
        return
      }
      const response=await fetch('/api/hope/video-bundles',{
        method:'POST',headers:{...getAuthHeaders(),'Content-Type':'application/json'},
        body:JSON.stringify({bundleId:bundle.id}),
      })
      const result=await response.json().catch(()=>({}))
      if(!response.ok||!result.success){
        if(result.reason==='insufficient_balance')throw new Error(
          'Insufficient System Switch. Required '+result.requiredSystemSwitch+
          '; available '+result.availableSystemSwitch+'.')
        throw new Error(result.error||result.reason||'Package checkout failed')
      }
      await refresh()
      await onPurchase?.()
      setNotice(result.alreadyOwned?'Effects already owned; no additional charge.':
        bundle.name+' purchased. '+result.licensedFilterIds.length+' permanent effects added for '+
        result.chargedSystemSwitch+' System Switch.')
    }catch(error:any){
      setError(error?.message||'Purchase unavailable. Check the wallet record before retrying.')
    }finally{setBusy(null)}
  }

  return <section data-hope-studio-packages="permanent" className="rounded-[1.5rem] border border-[#dac89f] bg-gradient-to-br from-[#fffefb] via-[#f9f3e7] to-[#ebeee9] p-4 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#987236]">Hope Studio · Collections</p>
        <h3 className="mt-1 text-xl font-semibold text-[#233d48] sm:text-2xl">Make every call a professional presence.</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#586b70]">
          Buy a permanent collection for less than purchasing every effect separately. Already-owned looks are discounted automatically. Basic calling remains free.
        </p>
      </div>
      {catalog&&<div className="flex items-center gap-2 rounded-xl border border-[#dccaa5] bg-white px-3 py-2 text-xs font-semibold text-[#294653]"><Wallet size={16}/>{catalog.balanceSystemSwitch.toLocaleString()} System Switch</div>}
    </div>
    {loading&&<p role="status" className="mt-4 text-sm">Loading the Studio collections…</p>}
    {catalog&&<div className="mt-5 grid gap-3 md:grid-cols-3">
      {catalog.packages.map(bundle=>{
        const q=bundle.quote
        const owned=q.remaining===0
        return <article key={bundle.id} className={'relative flex flex-col rounded-2xl border p-4 '+(bundle.featured?'border-[#ae874b] bg-[#fffaf0] shadow-lg':'border-[#e2d7c4] bg-white')}>
          {bundle.featured&&<div className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-[#2b4d58] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white"><Gift size={12}/> Popular value</div>}
          <div className="flex items-center gap-2 text-[#9f793c]"><Layers3 size={18}/><span className="text-xs font-bold uppercase tracking-wider">{bundle.filterIds.length} total effects</span></div>
          <h4 className="mt-2 text-lg font-bold text-[#253d47]">{bundle.name}</h4>
          <p className="mt-2 min-h-12 flex-1 text-sm leading-5 text-[#5b6d72]">{bundle.description}</p>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-3xl font-bold tabular-nums text-[#233f4d]">{q.chargedSystemSwitch}</span>
            <span className="pb-1.5 text-xs font-semibold text-[#667980]">System Switch</span>
          </div>
          <p className="mt-1 text-xs text-[#677579]">{owned?'All effects are yours':q.remaining+' new effects · save '+q.savedSystemSwitch+' against individual prices'}</p>
          {bundle.alreadyPurchased&&<p className="mt-2 flex items-center gap-1 text-xs text-emerald-700"><Check size={15}/> Previously purchased</p>}
          <button type="button" disabled={Boolean(busy)||owned} onClick={()=>void purchase(bundle)}
            className={'mt-4 min-h-12 rounded-xl px-3 text-sm font-bold transition disabled:opacity-60 '+(owned?'bg-[#e0ebdf] text-[#1d594b]':bundle.featured?'bg-[#254d5b] text-white':'border border-[#b89a69] bg-[#f9f3e6] text-[#6b4b21]')}>
            {owned?'All included effects owned':busy===bundle.id?'Verifying package…':'Purchase permanent package'}
          </button>
        </article>
      })}
    </div>}
    {error&&<p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice&&<p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <p className="mt-4 text-xs leading-5 text-[#607077]">Each package grants the listed effects permanently, not future releases. Purchases are server-verified and recorded. On-device support is checked before a charge; network and device conditions still affect live video quality.</p>
  </section>
}
