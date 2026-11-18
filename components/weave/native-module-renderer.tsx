'use client'
import Link from 'next/link'
import {useState} from 'react'
import {CheckCircle2,ChevronRight,Layers,ShieldCheck} from 'lucide-react'
import {NativeWorldScene} from '@/components/weave/native-world-scene'
import {NativeIntakeForm} from '@/components/weave/native-intake-form'
import {
 WEAVE_NATIVE_DEPARTMENTS,type WeaveNativeBlueprint,type NativeBlock,
} from '@/lib/weave-native-blueprint'
import {useAuth} from '@/lib/auth-provider'

type Progress={step_id:string;completed:boolean}
export function NativeModuleRenderer({blueprint,releaseId,progress=[],preview=false}:{
 blueprint:WeaveNativeBlueprint;releaseId?:string;progress?:Progress[];preview?:boolean
}){
 const {token,user}=useAuth()
 const mayWork=user?.role===WEAVE_NATIVE_DEPARTMENTS[blueprint.department].role
 const [stepStates,setStepStates]=useState<Record<string,boolean>>(
  Object.fromEntries(progress.map(x=>[x.step_id,x.completed])))
 const [saving,setSaving]=useState('')
 const [error,setError]=useState('')
 const label=WEAVE_NATIVE_DEPARTMENTS[blueprint.department].label
 const surface=blueprint.quality==='plus'
  ?'border-[#ead3a4]/35 bg-[linear-gradient(125deg,#17283e_0%,#102d44_55%,#403b42_100%)]'
  :blueprint.quality==='premium'
   ?'border-amber-200/25 bg-gradient-to-br from-[#071d30] via-[#20364b] to-[#14212c]'
   :'border-cyan-200/25 bg-gradient-to-br from-[#061928] via-[#143951] to-[#071826]'
 async function updateStep(stepId:string,completed:boolean){
  if(!releaseId||preview||!token)return
  setSaving(stepId);setError('')
  try{
   const res=await fetch('/api/weave-native-modules',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({action:'set_step',releaseId,stepId,completed}),
   })
   const result=await res.json()
   if(!res.ok||!result.success)throw Error(result.error||'Work step not saved')
   setStepStates(previous=>({...previous,[stepId]:completed}))
  }catch(e){setError(e instanceof Error?e.message:'Unable to save work')}
  finally{setSaving('')}
 }
 function blockView(block:NativeBlock,index:number){
  if(block.type==='hero')return <header key={index} className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/[.06] p-6 shadow-2xl backdrop-blur-xl sm:p-12">
   <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-cyan-200/10 blur-3xl"/>
   <p className="relative text-xs font-black uppercase tracking-[.2em] text-[#f3d7a0]">{block.eyebrow}</p>
   <h1 className="relative mt-5 max-w-4xl text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">{block.heading}</h1>
   <p className="relative mt-6 max-w-3xl whitespace-pre-wrap text-sm leading-8 text-slate-200">{block.description}</p>
  </header>
  if(block.type==='prose')return <section key={index} className="rounded-3xl border border-white/15 bg-white/[.045] p-6 backdrop-blur-md sm:p-9">
   <h2 className="text-2xl font-bold">{block.heading}</h2>
   <p className="mt-4 max-w-4xl whitespace-pre-wrap text-sm leading-8 text-slate-200">{block.body}</p>
  </section>
  if(block.type==='scene')return <section key={index} className="space-y-4">
   <h2 className="text-2xl font-bold">{block.heading}</h2>
   <NativeWorldScene scene={block.scene} quality={blueprint.quality}/>
  </section>
  if(block.type==='glass-grid')return <section key={index}>
   <h2 className="mb-4 text-2xl font-bold">{block.heading}</h2>
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {block.items.map((item,i)=><article key={i} className="min-h-36 rounded-2xl border border-white/20 bg-white/[.065] p-6 backdrop-blur-xl">
     <Layers size={18} className="text-cyan-200"/><h3 className="mt-4 text-lg font-bold">{item.title}</h3>
     <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.description}</p>
    </article>)}
   </div>
  </section>
  if(block.type==='intake')return <NativeIntakeForm key={index} block={block} releaseId={releaseId} department={blueprint.department} preview={preview}/>
  if(block.type==='action')return <section key={index} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-amber-200/25 bg-[#e8cba0]/[.08] p-6 sm:p-8">
   <div><h2 className="text-xl font-bold">{block.heading}</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{block.description}</p></div>
   <Link href={block.href} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#ecd6b2] px-5 py-3 text-sm font-bold text-[#1c2b36]">
    {block.label}<ChevronRight size={16}/>
   </Link>
  </section>
  return <section key={index} className="rounded-3xl border border-white/15 bg-white/[.05] p-6 sm:p-8">
   <h2 className="text-2xl font-bold">{block.heading}</h2>
   <p className="mt-2 text-xs text-slate-400">Personal work record. Completing a step does not approve a payment, sale or company verification.</p>
   <div className="mt-5 grid gap-3">
    {block.steps.map((step,i)=><label key={step.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/15 p-4">
     <input type="checkbox" checked={Boolean(stepStates[step.id])}
      disabled={preview||saving!==''||!releaseId||!mayWork}
      onChange={e=>void updateStep(step.id,e.target.checked)}
      className="mt-1 h-5 w-5 shrink-0 accent-cyan-300"/>
     <span><strong className="flex items-center gap-2 text-sm">{i+1}. {step.label}
       {stepStates[step.id]&&<CheckCircle2 size={16} className="text-emerald-200"/>}</strong>
      <span className="mt-2 block whitespace-pre-wrap text-xs leading-6 text-slate-300">{step.description}</span>
     </span>
    </label>)}
   </div>
   {error&&<p role="alert" className="mt-4 text-xs text-rose-200">{error}</p>}
  </section>
 }
 return <article className={'min-h-full rounded-[2rem] border p-4 text-white shadow-2xl sm:p-7 '+surface} data-weave-native-module={blueprint.kind}>
  <div className="mx-auto max-w-6xl space-y-7">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
    <div>
     <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">WEAVE · {label}</p>
     <p className="mt-1 text-xs text-slate-300">{blueprint.kind} · {blueprint.quality} · {preview?'Editable preview':'Published company module'}</p>
    </div>
    <span className="inline-flex items-center gap-2 text-xs text-slate-300"><ShieldCheck size={16}/> Role-bound · Versioned</span>
   </div>
   {blueprint.blocks.map(blockView)}
  </div>
 </article>
}
