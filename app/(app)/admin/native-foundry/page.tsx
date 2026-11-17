'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {ArrowLeft,ArrowUp,ArrowDown,Eye,Plus,Save,Send,Undo2,Trash2} from 'lucide-react'
import {useAuth} from '@/lib/auth-provider'
import {NativeModuleRenderer} from '@/components/weave/native-module-renderer'
import {
 WEAVE_NATIVE_DEPARTMENTS,defaultWeaveNativeBlueprint,validateNativeBlueprint,
 type NativeBlock,type NativeDepartment,type NativeKind,type WeaveNativeBlueprint,
} from '@/lib/weave-native-blueprint'

type Release={id:string;version:number;state:'draft'|'published'|'archived';department:NativeDepartment;
 slug:string;blueprint:WeaveNativeBlueprint;created_at:string;published_at:string|null}
const field='mt-2 w-full rounded-xl border border-white/20 bg-[#061826] p-3 text-sm text-white outline-none focus:border-cyan-200/60'
const label='block text-xs font-semibold text-slate-200'
const classes='rounded-xl border border-cyan-200/25 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-white/[.07] disabled:opacity-40'
function newBlock(type:NativeBlock['type']):NativeBlock{
 if(type==='hero')return {type,eyebrow:'Weave of Presence',heading:'An emerging possibility',description:'Give this presence a clear purpose.'}
 if(type==='prose')return {type,heading:'The work',body:'Describe the movement and the person it serves.'}
 if(type==='scene')return {type,heading:'A living three-dimensional world',scene:'glass-kingdom'}
 if(type==='glass-grid')return {type,heading:'Systems in motion',items:[{title:'First system',description:'What this system does.'}]}
 if(type==='action')return {type,heading:'A real destination',description:'Open an existing authorized workspace.',label:'Open workspace',href:'/dashboard'}
 return {type,heading:'Working sequence',steps:[{id:'first',label:'First step',description:'Carry out the intended work.'}]}
}
function NativeBlockEditor({block,onChange}:{block:NativeBlock;onChange:(next:NativeBlock)=>void}){
 const stringField=(title:string,value:string,onInput:(s:string)=>void,max=120,rows=0)=>
  <label className={label}>{title}{rows
   ?<textarea value={value} maxLength={max} rows={rows} onChange={e=>onInput(e.target.value)} className={field}/>
   :<input value={value} maxLength={max} onChange={e=>onInput(e.target.value)} className={field}/>}</label>
 if(block.type==='hero')return <div className="grid gap-3">
  {stringField('Small heading',block.eyebrow,v=>onChange({...block,eyebrow:v}),90)}
  {stringField('Main heading',block.heading,v=>onChange({...block,heading:v}))}
  {stringField('Purpose',block.description,v=>onChange({...block,description:v}),1500,3)}
 </div>
 if(block.type==='prose')return <div className="grid gap-3">
  {stringField('Section heading',block.heading,v=>onChange({...block,heading:v}))}
  {stringField('Writing',block.body,v=>onChange({...block,body:v}),3000,5)}
 </div>
 if(block.type==='scene')return <div className="grid gap-3">
  {stringField('3D scene heading',block.heading,v=>onChange({...block,heading:v}))}
  <label className={label}>Installed mechanized environment
   <select value={block.scene} onChange={e=>onChange({...block,scene:e.target.value as typeof block.scene})} className={field}>
    <option value="glass-kingdom">Glass kingdom · buildings, water and physical materials</option>
    <option value="mechanized">Mechanized · animated energy and production structures</option>
    <option value="water">Still Water · canal and architecture</option>
   </select>
  </label>
 </div>
 if(block.type==='action')return <div className="grid gap-3">
  {stringField('Heading',block.heading,v=>onChange({...block,heading:v}))}
  {stringField('Description',block.description,v=>onChange({...block,description:v}),500,3)}
  {stringField('Link label',block.label,v=>onChange({...block,label:v}),70)}
  {stringField('Existing WEAVE route',block.href,v=>onChange({...block,href:v}),180)}
 </div>
 if(block.type==='glass-grid')return <div className="space-y-3">
  {stringField('Grid heading',block.heading,v=>onChange({...block,heading:v}))}
  {block.items.map((item,index)=><div key={index} className="grid gap-2 rounded-xl border border-white/10 p-3">
   {stringField('Item title',item.title,v=>onChange({...block,items:block.items.map((x,i)=>i===index?{...x,title:v}:x)}),100)}
   {stringField('Explanation',item.description,v=>onChange({...block,items:block.items.map((x,i)=>i===index?{...x,description:v}:x)}),420,2)}
   <button type="button" className={classes} disabled={block.items.length===1} onClick={()=>onChange({...block,items:block.items.filter((_,i)=>i!==index)})}>Remove item</button>
  </div>)}
  <button type="button" className={classes} disabled={block.items.length>=8} onClick={()=>onChange({...block,items:[...block.items,{title:'New system',description:'Describe what it supports.'}]})}>Add grid item</button>
 </div>
 return <div className="space-y-3">
  {stringField('Operating system heading',block.heading,v=>onChange({...block,heading:v}))}
  <p className="text-xs text-slate-400">Each step is individually recorded for the current user. Keys must stay stable between edits.</p>
  {block.steps.map((step,index)=><div key={index} className="space-y-2 rounded-xl border border-white/10 p-3">
   {stringField('Stable step key',step.id,v=>onChange({...block,steps:block.steps.map((x,i)=>i===index?{...x,id:v}:x)}),50)}
   {stringField('Step label',step.label,v=>onChange({...block,steps:block.steps.map((x,i)=>i===index?{...x,label:v}:x)}),110)}
   {stringField('What to do',step.description,v=>onChange({...block,steps:block.steps.map((x,i)=>i===index?{...x,description:v}:x)}),500,2)}
   <button type="button" className={classes} disabled={block.steps.length===1} onClick={()=>onChange({...block,steps:block.steps.filter((_,i)=>i!==index)})}>Remove step</button>
  </div>)}
  <button type="button" className={classes} disabled={block.steps.length>=12} onClick={()=>onChange({...block,steps:[...block.steps,{id:'step-'+(block.steps.length+1),label:'New work step',description:'What happens here?'}]})}>Add work step</button>
 </div>
}
export default function NativeFoundryPage(){
 const {token,user,isInitialized}=useAuth()
 const [blueprint,setBlueprint]=useState<WeaveNativeBlueprint>(defaultWeaveNativeBlueprint())
 const [releases,setReleases]=useState<Release[]>([])
 const [selectedId,setSelectedId]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [confirm,setConfirm]=useState('')
 const [tab,setTab]=useState<'design'|'preview'>('design')
 const department=blueprint.department
 function setField<K extends keyof WeaveNativeBlueprint>(key:K,value:WeaveNativeBlueprint[K]){setBlueprint(b=>({...b,[key]:value}))}
 const updateBlock=(index:number,block:NativeBlock)=>setField('blocks',blueprint.blocks.map((x,i)=>i===index?block:x))
 const load=useCallback(async(dep:NativeDepartment,slug:string)=>{
  if(!token)return
  const params=new URLSearchParams({department:dep,slug})
  const response=await fetch('/api/admin/native-foundry?'+params,{headers:{Authorization:'Bearer '+token},cache:'no-store'})
  const body=await response.json()
  if(!response.ok||!body.success)throw Error(body.error||'Cannot open module history')
  setReleases(body.releases||[])
 },[token])
 useEffect(()=>{if(token&&user?.role==='admin')void load(department,blueprint.slug).catch(e=>setError(e.message))},
  [token,user?.role,department,blueprint.slug,load])
 const send=async(action:string,data:Record<string,unknown>)=>{
  if(!token)throw Error('Administrator login required')
  const response=await fetch('/api/admin/native-foundry',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({action,...data}),
  })
  const body=await response.json().catch(()=>({}))
  if(!response.ok||!body.success)throw Error(body.error||'Native module operation refused')
  return body
 }
 const current=releases.find(x=>x.state==='published')||null
 const selectedDraft=releases.find(x=>x.id===selectedId&&x.state==='draft')||null
 const draftMatches=Boolean(selectedDraft&&JSON.stringify(blueprint)===JSON.stringify(selectedDraft.blueprint))
 async function saveDraft(){
  setBusy(true);setError('');setNotice('')
  try{
   const validated=validateNativeBlueprint(blueprint)
   const data=await send('draft',{blueprint:validated})
   setSelectedId(data.release.id);setConfirm('')
   setNotice('Draft version '+data.release.version+' saved in Weave database. No server deployment required.')
   await load(department,blueprint.slug)
  }catch(e){setError(e instanceof Error?e.message:'Draft failed')}
  finally{setBusy(false)}
 }
 async function publish(){
  if(confirm!=='PUBLISH WEAVE MODULE'||!selectedId||!draftMatches)return
  setBusy(true);setError('');setNotice('')
  try{
   await send('publish',{releaseId:selectedId,expectedPublishedId:current?.id||null,confirmation:confirm})
   setSelectedId('');setConfirm('')
   setNotice('Verified version is now live for '+WEAVE_NATIVE_DEPARTMENTS[department].label+'. No Oracle build was started.')
   await load(department,blueprint.slug)
  }catch(e){setError(e instanceof Error?e.message:'Publication failed')}
  finally{setBusy(false)}
 }
 async function unpublish(){
  if(confirm!=='UNPUBLISH WEAVE MODULE'||!current)return
  setBusy(true);setError('');setNotice('')
  try{
   await send('unpublish',{department,slug:blueprint.slug,
    expectedPublishedId:current.id,confirmation:confirm})
   setSelectedId('');setConfirm('')
   setNotice('Module withdrawn from the department. Its archived version remains restorable.')
   await load(department,blueprint.slug)
  }catch(e){setError(e instanceof Error?e.message:'Unable to withdraw module')}
  finally{setBusy(false)}
 }
 async function rollback(version:number){
  setBusy(true);setError('');setNotice('')
  try{
   const data=await send('prepare_rollback',{version})
   setBlueprint(data.release.blueprint)
   setSelectedId(data.release.id)
   setConfirm('')
   setNotice('Archived version copied into a new draft. Review it and publish explicitly to restore.')
   await load(department,blueprint.slug)
  }catch(e){setError(e instanceof Error?e.message:'Rollback preparation failed')}
  finally{setBusy(false)}
 }
 if(!isInitialized)return <main className="p-6 text-white">Opening company formation workshop…</main>
 if(user?.role!=='admin')return <main className="p-6 text-white">Administrations access required.</main>
 return <main className="min-h-dvh bg-[#061420] px-3 py-7 text-white sm:px-6" data-admin-native-foundry="no-code-deployment">
  <div className="mx-auto max-w-7xl space-y-6">
   <Link href="/admin/code-workshop" className="inline-flex items-center gap-2 text-sm text-cyan-200"><ArrowLeft size={16}/>Company Code Workshop</Link>
   <header className="rounded-[2rem] border border-[#ead3a4]/30 bg-[linear-gradient(115deg,#102e47,#0a2031_65%,#262f3a)] p-6 sm:p-10">
    <p className="text-xs font-black uppercase tracking-[.2em] text-[#f4deb4]">Weave · Administrations · A Time</p>
    <h1 className="mt-4 text-3xl font-bold sm:text-5xl">Native Formation Workshop</h1>
    <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-200">Create company pages, interactive features and personal operating systems without writing source or deploying a new server image. Choose an installed capability, build its visual and working movement, review, publish and restore versions inside WEAVE.</p>
    <p className="mt-3 max-w-4xl text-xs leading-6 text-amber-100">This publishes bounded, preinstalled capabilities—not new executable backend code, payments or unrestricted integrations. New software primitives still require reviewed source releases.</p>
   </header>
   {error&&<p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</p>}
   {notice&&<p role="status" className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-4 text-sm text-cyan-100">{notice}</p>}
   <div className="grid gap-5 xl:grid-cols-[minmax(300px,.9fr)_minmax(0,1.1fr)]">
    <section className="min-w-0 rounded-2xl border border-white/15 bg-white/[.035] p-4 sm:p-6">
     <div className="grid grid-cols-2 gap-2">
      <button className={classes} onClick={()=>setTab('design')} aria-pressed={tab==='design'}>Design</button>
      <button className={classes} onClick={()=>setTab('preview')} aria-pressed={tab==='preview'}><Eye size={14} className="mr-1 inline"/> Preview</button>
     </div>
     {tab==='design'?<div className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
       <label className={label}>Department<select value={department}
        onChange={e=>setBlueprint(defaultWeaveNativeBlueprint(e.target.value as NativeDepartment,blueprint.kind))}
        className={field}>{Object.entries(WEAVE_NATIVE_DEPARTMENTS).map(([value,x])=><option key={value} value={value}>{x.label}</option>)}</select></label>
       <label className={label}>Creation type<select value={blueprint.kind} className={field}
        onChange={e=>setBlueprint(defaultWeaveNativeBlueprint(department,e.target.value as NativeKind))}>
        <option value="page">Page · published content</option><option value="feature">Feature · content with live navigation</option>
        <option value="system">System · recordable working steps</option></select></label>
      </div>
      <label className={label}>Visual quality<select value={blueprint.quality} className={field}
       onChange={e=>setField('quality',e.target.value as WeaveNativeBlueprint['quality'])}>
       <option value="crystal">Crystal · lightweight glass</option>
       <option value="premium">Premium · detailed physical surfaces</option>
       <option value="plus">Plus · elevated glass, gold and machinery</option>
      </select></label>
      <label className={label}>Title<input maxLength={95} value={blueprint.title} className={field} onChange={e=>setField('title',e.target.value)}/></label>
      <label className={label}>Permanent page address<input maxLength={50} value={blueprint.slug} className={field} onChange={e=>setField('slug',e.target.value)}/>
       <span className="mt-1 block break-all text-[11px] text-cyan-200">/weave-modules/{department}/{blueprint.slug}</span></label>
      <label className={label}>Cadence and purpose<textarea maxLength={1200} rows={3} className={field}
       value={blueprint.description} onChange={e=>setField('description',e.target.value)}/></label>
      <h2 className="border-t border-white/15 pt-5 text-xl font-bold">Page and system elements</h2>
      {blueprint.blocks.map((block,index)=><div key={index} className="rounded-2xl border border-cyan-200/20 bg-black/15 p-4">
       <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold capitalize text-cyan-200">{index+1}. {block.type.replaceAll('-',' ')}</h3>
        <div className="flex gap-1">
         <button type="button" aria-label="Move up" disabled={!index} onClick={()=>setField('blocks',blueprint.blocks.map((x,i)=>i===index-1?block:i===index?blueprint.blocks[index-1]:x))} className={classes}><ArrowUp size={14}/></button>
         <button type="button" aria-label="Move down" disabled={index===blueprint.blocks.length-1} onClick={()=>setField('blocks',blueprint.blocks.map((x,i)=>i===index+1?block:i===index?blueprint.blocks[index+1]:x))} className={classes}><ArrowDown size={14}/></button>
         <button type="button" aria-label="Remove element" disabled={blueprint.blocks.length===1||(block.type==='steps'&&blueprint.kind==='system'&&blueprint.blocks.filter(x=>x.type==='steps').length===1)} onClick={()=>setField('blocks',blueprint.blocks.filter((_,i)=>i!==index))} className={classes}><Trash2 size={14}/></button>
        </div>
       </div>
       <NativeBlockEditor block={block} onChange={next=>updateBlock(index,next)}/>
      </div>)}
      <div className="flex flex-wrap gap-2">
       {(['hero','prose','glass-grid','scene','action',...(blueprint.kind==='system'?['steps']:[])] as NativeBlock['type'][]).map(type=>
        <button key={type} type="button" disabled={blueprint.blocks.length>=12} className={classes}
         onClick={()=>setField('blocks',[...blueprint.blocks,newBlock(type)])}><Plus size={14} className="mr-1 inline"/>{type.replaceAll('-',' ')}</button>)}
      </div>
      <button type="button" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-100 px-4 text-sm font-bold text-[#092238] disabled:opacity-40" disabled={busy} onClick={()=>void saveDraft()}>
       <Save size={16}/>{busy?'Saving…':'Save version in WEAVE'}
      </button>
     </div>:<div className="mt-5 rounded-xl border border-white/10 bg-[#081b2a] p-5 text-sm leading-7 text-slate-200">
      The live preview is shown on the right. Return to Design to edit and save. One WebGL scene is rendered at a time on mobile devices.
     </div>}
    </section>
    <div className="min-w-0 space-y-5">
     <section className="rounded-2xl border border-white/15 p-4 sm:p-6">
      <h2 className="text-xl font-bold">Live module preview</h2>
      <p className="mt-2 text-xs text-slate-400">Physical 3D material atlas and responsive layouts; records and payments are not simulated.</p>
      <div className="mt-4"><NativeModuleRenderer blueprint={blueprint} preview/></div>
     </section>
     <section className="rounded-2xl border border-[#ead3a4]/30 bg-white/[.035] p-5">
      <h2 className="text-lg font-bold">Publish into the department</h2>
      <p className="mt-2 text-xs leading-6 text-slate-300">A saved draft is immutable. Publishing replaces only the same department and address, with conflict checks. Other departments and existing features are unaffected.</p>
      <p className="mt-3 text-sm">Currently published: <strong>{current?'Version '+current.version:'None'}</strong></p>
      {selectedId&&<p className="mt-2 break-all text-xs text-cyan-200">Selected draft: {selectedId}</p>}
      {selectedId&&!draftMatches&&<p className="mt-2 text-xs text-amber-200">This design differs from the saved draft. Save a new version to publish your current changes.</p>}
      <label className={label+' mt-4'}>Type PUBLISH WEAVE MODULE or UNPUBLISH WEAVE MODULE<input value={confirm} className={field}
       onChange={e=>setConfirm(e.target.value)} placeholder="PUBLISH WEAVE MODULE"/></label>
      <button type="button" disabled={busy||!selectedId||!draftMatches||confirm!=='PUBLISH WEAVE MODULE'}
       onClick={()=>void publish()} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#efd7ae] px-5 font-bold text-[#1f3140] disabled:opacity-35">
       <Send size={16}/>Publish without server rebuild
      </button>
      {current&&<button type="button" disabled={busy||confirm!=='UNPUBLISH WEAVE MODULE'}
       onClick={()=>void unpublish()}
       className="mt-3 ml-2 inline-flex min-h-12 items-center gap-2 rounded-xl border border-rose-300/35 px-4 text-sm font-semibold text-rose-100 disabled:opacity-35">
       <Trash2 size={15}/>Withdraw current publication
      </button>}
      {current&&<Link href={'/weave-modules/'+department+'/'+blueprint.slug}
       className="mt-4 block break-all text-sm text-cyan-200 underline">Open live department page</Link>}
     </section>
     <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
      <h2 className="text-xl font-bold">Version history</h2>
      <p className="mt-2 text-xs text-slate-400">The database preserves the previous published version. Restoring it creates a new draft to review.</p>
      <div className="mt-4 space-y-3">{releases.length===0
       ?<p className="text-sm text-slate-400">No versions at this address.</p>
       :releases.map(item=><div key={item.id} className="rounded-xl border border-white/10 bg-black/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
         <p className="text-sm font-bold">Version {item.version} · {item.state}</p>
         <p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p>
        </div>
        <p className="mt-2 text-xs text-slate-300">{item.blueprint.title} · {item.blueprint.kind}</p>
        <div className="mt-3 flex flex-wrap gap-2">
         {item.state==='published'&&<button type="button" className={classes} onClick={()=>{
          setBlueprint(item.blueprint);setSelectedId('');setConfirm('')
          setNotice('Published version loaded for editing. Save a new draft to update it.')
         }}>Edit from live version</button>}
         {item.state==='draft'&&<button type="button" className={classes} onClick={()=>{
          setBlueprint(item.blueprint);setSelectedId(item.id);setConfirm('')
          setNotice('Draft selected. It is immutable; changes must be saved as a new draft.')
         }}>Select draft</button>}
         {item.state==='archived'&&<button type="button" className={classes} disabled={busy}
          onClick={()=>void rollback(Number(item.version))}><Undo2 size={14} className="mr-1 inline"/>Prepare restoration</button>}
        </div>
       </div>)}</div>
      <button type="button" className={classes+' mt-4'} onClick={()=>void load(department,blueprint.slug).catch(e=>setError(e.message))}>Refresh history</button>
     </section>
    </div>
   </div>
  </div>
 </main>
}
