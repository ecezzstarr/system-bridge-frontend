'use client'

import {useEffect,useMemo,useState} from 'react'
import {quoteFileFolderBlueprint,type BlueprintCostFields} from '@/lib/file-folder-build-quote'
import {isBuildPartCompatible} from '@/lib/file-folder-build-compatibility'
import {buildFormationProgress} from '@/lib/file-folder-world-runtime'

export type ProWorkshopView='plans'|'parts'|'speed'
export type ProBlueprint=BlueprintCostFields&{
 blueprint_key:string;name:string;description?:string|null;system_type?:string|null;build_hours?:number|string|null
}
export type ProCatalogItem={
 item_key:string;name:string;category?:string|null;description?:string|null
 price_flame_coin?:number|string|null;build_effect?:string|null;effect_value?:number|string|null
}
export type ProInventoryItem={item_key:string;quantity?:number|string|null}
export type ProBuild={
 id:string;title:string;system_type:string;status:string;blueprint_key?:string
 started_at?:string|null;completes_at?:string|null;speed_multiplier?:number|string|null
 applied_parts?:Array<{id?:string;name?:string;item_key?:string}>|null
}
type Props={
 view:ProWorkshopView;onViewChange:(view:ProWorkshopView)=>void
 businessName:string
 blueprints:ProBlueprint[];items:ProCatalogItem[];inventory:ProInventoryItem[];builds:ProBuild[]
 buildFunding?:{publicDoorUnlocked?:boolean;buildSpeedMultiplier?:number|string|null}|null
 doorStatus?:string|null;now:number;busy:boolean
 onAction:(payload:Record<string,unknown>,key:string)=>Promise<boolean>
 onEnterDistrict:(district:string)=>void
}
const money=(amount:number)=>Number.isFinite(amount)?amount.toLocaleString():'—'
const remaining=(timestamp:string|null|undefined,now:number)=>{
 const seconds=Math.max(0,Math.ceil((new Date(timestamp||0).getTime()-now)/1000))
 if(!Number.isFinite(seconds))return 'Unavailable'
 if(!seconds)return 'Completing'
 if(seconds>=86400)return Math.ceil(seconds/86400)+'d'
 if(seconds>=3600)return Math.ceil(seconds/3600)+'h'
 return Math.ceil(seconds/60)+'min'
}
const isCapabilityPart=(item:ProCatalogItem)=>{
 const category=String(item.category||'')
 const effect=String(item.build_effect||'component')
 return category==='accessible_part'||category==='build_part'||category==='institution_part'||
  category==='health_part'||category==='civic_part'||category.endsWith('_upgrade')||
  ['route_capacity','legion_capacity','stream_capacity','audience_capacity','ai_node','automation',
   'verification','clinical_safety_review','civic_oversight','supply_planning','mapping'].includes(effect)
}
const tabs:Record<ProWorkshopView,{title:string;subtitle:string}>={
 plans:{title:'Building Plan',subtitle:'Blueprint · materials · construction'},
 parts:{title:'Parts Workshop',subtitle:'Compatibility · inventory · installation'},
 speed:{title:'Speed Bay',subtitle:'Buy · install · recorded acceleration'},
}

/** One live Pro workstation. No local purchases, imaginary progress or client-side credits.
 * Every mutation delegates to the authorized shared File Folder build API. */
export default function FileFolderProBuildConsole({
 view,onViewChange,businessName,blueprints,items,inventory,builds,buildFunding,doorStatus,
 now,busy,onAction,onEnterDistrict,
}:Props){
 const [selectedBlueprintKey,setSelectedBlueprintKey]=useState('')
 const [selectedBuildId,setSelectedBuildId]=useState('')
 const [title,setTitle]=useState('')
 const [purpose,setPurpose]=useState('')
 const [notice,setNotice]=useState('')
 const owned=useMemo(()=>new Map(inventory.map(item=>[item.item_key,Number(item.quantity||0)])),[inventory])
 const selectedPlan=blueprints.find(b=>b.blueprint_key===selectedBlueprintKey)||blueprints[0]||null
 const planQuote=selectedPlan?quoteFileFolderBlueprint(selectedPlan,owned.get(String(selectedPlan.required_item_key||''))||0):null
 const activeBuilds=builds.filter(b=>b.status==='building')
 const selectedBuild=activeBuilds.find(b=>b.id===selectedBuildId)||activeBuilds[0]||null
 const speedItems=items.filter(item=>item.build_effect==='speed_boost')
 const partItems=items.filter(item=>item.build_effect!=='speed_boost'&&isCapabilityPart(item))
 const compatible=partItems.filter(item=>selectedBuild?
  isBuildPartCompatible(String(item.build_effect||'component'),selectedBuild.system_type):true)
 const speedFactor=Math.max(1,Number(selectedBuild?.speed_multiplier||1))
 const gate=Boolean(buildFunding&&!buildFunding.publicDoorUnlocked&&doorStatus==='funding_gate')
 const estimatedMinutes=selectedPlan
  ?Math.max(15,Math.ceil(Number(selectedPlan.build_hours||1)*60/Math.max(1,Number(buildFunding?.buildSpeedMultiplier||1))))
  :0

 useEffect(()=>{
  if(!blueprints.some(b=>b.blueprint_key===selectedBlueprintKey))setSelectedBlueprintKey(blueprints[0]?.blueprint_key||'')
 },[blueprints,selectedBlueprintKey])
 useEffect(()=>{
  if(!activeBuilds.some(b=>b.id===selectedBuildId))setSelectedBuildId(activeBuilds[0]?.id||'')
 },[activeBuilds,selectedBuildId])
 const submit=async(payload:Record<string,unknown>,key:string,success:string)=>{
  setNotice('')
  const done=await onAction(payload,key)
  if(done)setNotice(success)
 }
 const selectBlueprint=(key:string)=>{
  setSelectedBlueprintKey(key)
  setTitle('')
  setPurpose('')
  setNotice('')
 }
 const sectionButton=(next:ProWorkshopView)=><button type="button" key={next}
  onClick={()=>{onViewChange(next);setNotice('')}}
  aria-pressed={view===next}
  className={'min-h-11 min-w-0 flex-1 rounded-lg border px-2 py-2 text-xs font-semibold '+
   (view===next?'border-sky-200 bg-sky-300/15 text-white':'border-sky-200/20 bg-black/20 text-slate-300')}>
  {tabs[next].title}</button>
 return <section data-pro-working-build-console={view}
  className="border-t border-sky-300/20 bg-[linear-gradient(160deg,#081f39,#091324)] px-3 py-4 text-slate-100 sm:px-5">
  <header className="flex items-start justify-between gap-3">
   <div className="min-w-0">
    <p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Live construction control · Pro</p>
    <h3 className="mt-1 text-lg font-bold">{businessName}</h3>
    <p className="mt-1 text-xs text-slate-300">Every plan, kit, part and acceleration is checked against your File Folder records.</p>
   </div>
   <span className="shrink-0 rounded-md border border-sky-300/20 px-2 py-1 text-[10px] font-bold text-sky-200">Owner workspace</span>
  </header>
  <div className="mt-4 flex gap-2" role="group" aria-label="Pro construction workspaces">
   {(['plans','parts','speed'] as const).map(sectionButton)}
  </div>
  <p className="mt-3 text-xs font-medium text-sky-200">{tabs[view].subtitle}</p>
  {notice&&<p role="status" className="mt-3 border-l-2 border-emerald-300 bg-emerald-300/[.07] px-3 py-2 text-xs text-emerald-100">{notice}</p>}

  {view==='plans'&&<div data-pro-building-plan="recorded-blueprint" className="mt-4 space-y-3">
   {blueprints.length===0?<p className="border border-sky-200/20 p-4 text-sm">No published building plans are available. Administrations must publish a blueprint before construction can begin.</p>:<>
    <label className="block text-xs font-semibold text-sky-100">Choose the system your business needs
     <select value={selectedPlan?.blueprint_key||''} onChange={e=>selectBlueprint(e.target.value)}
      className="mt-2 min-h-12 w-full rounded-lg border border-sky-300/30 bg-[#142d46] px-3 text-base text-white">
      {blueprints.map(b=><option key={b.blueprint_key} value={b.blueprint_key}>{b.name}</option>)}
     </select>
    </label>
    {selectedPlan&&planQuote&&<>
     <div className="grid gap-3 border-y border-white/10 py-3 text-sm sm:grid-cols-2">
      <div>
       <p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">System blueprint</p>
       <p className="mt-1 font-semibold">{selectedPlan.name}</p>
       <p className="mt-1 text-xs leading-5 text-slate-300">{selectedPlan.description||'A real operating system formed from its published blueprint.'}</p>
       <p className="mt-2 text-xs text-slate-200">Estimated initial build: {money(estimatedMinutes)} minutes, before optional installed boosters</p>
      </div>
      <div data-pro-plan-materials={selectedPlan.blueprint_key}>
       <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200">Bill of materials</p>
       <p className="mt-1 font-semibold">{planQuote.materialName}</p>
       <p className="mt-1 text-xs">Required: {planQuote.materialRequired} · Owned: {planQuote.materialOwned} · Missing: {planQuote.materialMissing}</p>
       <p className="mt-2 text-xs">{planQuote.priceAvailable?'To acquire: '+money(planQuote.acquireCost)+' System Switch':'Price not published; purchase unavailable'}</p>
       {!planQuote.purchaseAvailable&&planQuote.materialMissing>0&&<p role="alert" className="mt-1 text-xs text-amber-200">Required material is not published for purchase.</p>}
      </div>
     </div>
     <label className="block text-xs font-semibold">Name this business system
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder={selectedPlan.name}
       maxLength={220} className="mt-1 min-h-11 w-full rounded-lg border border-sky-300/25 bg-[#13273a] p-3 text-base text-white"/>
     </label>
     <label className="block text-xs font-semibold">How will this system serve your business?
      <textarea value={purpose} onChange={e=>setPurpose(e.target.value)}
       maxLength={2000} rows={2} placeholder="Its purpose, products, customers and daily work"
       className="mt-1 w-full rounded-lg border border-sky-300/25 bg-[#13273a] p-3 text-sm text-white"/>
     </label>
     {gate&&<p role="alert" className="text-xs text-amber-200">A recorded funding gate is active. Complete the required verification before further construction.</p>}
     <div className="grid gap-2 sm:grid-cols-2">
      {planQuote.materialMissing>0?<button type="button"
       disabled={busy||!selectedPlan.required_item_key||!planQuote.priceAvailable||!planQuote.purchaseAvailable}
       onClick={()=>void submit({action:'purchase_item',item_key:selectedPlan.required_item_key,
        quantity:Math.min(25,planQuote.materialMissing)},
        'pro-plan-material-'+selectedPlan.blueprint_key,'Material purchase recorded. Check the refreshed quantity before building.')}
       className="min-h-12 rounded-lg border border-amber-300/30 bg-amber-200/10 px-3 py-2 text-sm font-bold text-amber-100 disabled:opacity-40">
       Acquire {Math.min(25,planQuote.materialMissing)} kit(s) · {money(Math.min(25,planQuote.materialMissing)*planQuote.unitPrice)} System Switch
      </button>:<div className="flex min-h-12 items-center rounded-lg border border-emerald-300/30 px-3 text-sm text-emerald-200">Required kits ready</div>}
      <button type="button" disabled={busy||gate||planQuote.materialMissing>0}
       onClick={()=>void submit({action:'start_build',blueprint_key:selectedPlan.blueprint_key,
        title:title.trim(),purpose:purpose.trim()},'pro-build-'+selectedPlan.blueprint_key,
        'Construction started and recorded. Open Parts or Speed Bay to continue this real build.')}
       className="min-h-12 rounded-lg bg-sky-200 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-40">
       Begin construction
      </button>
     </div>
     <p className="text-[11px] leading-5 text-slate-400">Starting construction consumes required kits, not a second build fee. Server checks dependencies, company approval and unique structures. No system is shown as commissioned until its real build completes.</p>
    </>}
   </>}
  </div>}

  {(view==='parts'||view==='speed')&&<div className="mt-4 space-y-3">
   {activeBuilds.length===0?<div className="border border-sky-300/20 px-4 py-4">
    <p className="text-sm">No active construction. Choose a published building plan, supply its materials, and start a build first.</p>
    <button type="button" onClick={()=>onViewChange('plans')} className="mt-3 min-h-11 rounded-lg border border-sky-200/35 px-4 text-xs font-bold">Open Building Plan</button>
   </div>:<>
    <label className="block text-xs font-semibold">Active construction
     <select value={selectedBuild?.id||''} onChange={e=>setSelectedBuildId(e.target.value)}
      className="mt-2 min-h-12 w-full rounded-lg border border-sky-300/30 bg-[#142d46] px-3 text-base text-white">
      {activeBuilds.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}
     </select>
    </label>
    {selectedBuild&&<div data-pro-real-build={selectedBuild.id} className="border-y border-white/10 py-3">
     <div className="flex flex-wrap items-end justify-between gap-2">
      <div><p className="text-xs font-semibold">{selectedBuild.title}</p><p className="mt-1 text-[11px] text-slate-300">{selectedBuild.system_type.replaceAll('_',' ')}</p></div>
      <p className="text-xs text-sky-100">{Math.round(buildFormationProgress(selectedBuild,now))}% · {remaining(selectedBuild.completes_at,now)} remaining</p>
     </div>
     <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-sky-300" style={{width:buildFormationProgress(selectedBuild,now)+'%'}}/>
     </div>
     <p className="mt-2 text-xs text-slate-300">Recorded speed ×{speedFactor.toFixed(2)} · Installed parts: {(selectedBuild.applied_parts||[]).length}</p>
    </div>}
   </>}
   {view==='parts'&&<div data-pro-compatible-parts="verified">
    <p className="mb-3 text-sm font-semibold text-sky-100">Compatible capability parts</p>
    {selectedBuild&&compatible.length===0&&<p className="text-xs text-slate-300">No published compatible parts for this build.</p>}
    <div className="grid gap-2 sm:grid-cols-2">
     {selectedBuild&&compatible.map(item=><div key={item.item_key} className="border border-sky-200/20 bg-[#10263b] p-3">
      <div className="flex items-start justify-between gap-3">
       <p className="text-sm font-semibold">{item.name}</p>
       <p className="shrink-0 text-xs text-sky-200">{Number(item.price_flame_coin||0).toLocaleString()} System Switch</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-300">{item.description}</p>
      <p className="mt-2 text-xs text-sky-100">Owned: {owned.get(item.item_key)||0}</p>
      <div className="mt-3 flex flex-wrap gap-2">
       <button type="button" disabled={busy} onClick={()=>void submit({action:'purchase_item',item_key:item.item_key,quantity:1},
        'pro-part-purchase-'+item.item_key,'Part acquired and added to this File Folder inventory.')}
        className="min-h-11 rounded-lg border border-sky-200/35 px-3 py-2 text-xs font-semibold disabled:opacity-40">Buy part</button>
       <button type="button" disabled={busy||!selectedBuild||(owned.get(item.item_key)||0)<1}
        onClick={()=>void submit({action:'apply_build_item',build_id:selectedBuild.id,item_key:item.item_key},
         'pro-part-install-'+item.item_key,'Part installed on this construction record.')}
        className="min-h-11 rounded-lg bg-sky-200 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-40">Install on build</button>
      </div>
     </div>)}
    </div>
   </div>}
   {view==='speed'&&<div data-pro-speed-bay="server-accelerated" className="space-y-3">
    <p className="text-xs leading-5 text-slate-300">Speed Bay is optional. Buying a booster alone does not change construction time; installation on an active build updates the authoritative finish time.</p>
    {selectedBuild&&speedItems.length===0&&<p className="text-xs text-amber-200">No published boosters are currently available.</p>}
    <div className="grid gap-2 sm:grid-cols-3">
     {selectedBuild&&speedItems.map(item=><div key={item.item_key} className="border border-amber-200/25 bg-[#222236] p-3">
      <p className="text-sm font-semibold text-amber-100">{item.name}</p>
      <p className="mt-2 text-xs text-slate-300">Speed factor ×{Number(item.effect_value||1).toFixed(2)}</p>
      <p className="mt-2 text-xs text-amber-100">{money(Number(item.price_flame_coin||0))} System Switch · {owned.get(item.item_key)||0} owned</p>
      <div className="mt-3 flex flex-col gap-2">
       <button type="button" disabled={busy} onClick={()=>void submit({action:'purchase_item',item_key:item.item_key,quantity:1},
        'pro-boost-purchase-'+item.item_key,'Booster purchased. Install it on a real active build to accelerate construction.')}
        className="min-h-11 rounded-lg border border-amber-300/35 px-3 py-2 text-xs font-bold text-amber-100 disabled:opacity-40">Buy booster</button>
       <button type="button" disabled={busy||(owned.get(item.item_key)||0)<1}
        onClick={()=>void submit({action:'apply_build_item',build_id:selectedBuild.id,item_key:item.item_key},
         'pro-boost-install-'+item.item_key,'Booster applied. The server has recalculated this build’s finish time.')}
        className="min-h-11 rounded-lg bg-amber-200 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40">Install on build</button>
      </div>
     </div>)}
    </div>
   </div>}
  </div>}

  <button type="button" onClick={()=>onEnterDistrict(view==='plans'?'blueprint_foundry':view==='parts'?'formation_yard':'boost_bay')}
   className="mt-5 min-h-11 border-b border-sky-300/40 px-1 text-xs font-semibold text-sky-200">
   Open the full {tabs[view].title} workshop
  </button>
 </section>
}
