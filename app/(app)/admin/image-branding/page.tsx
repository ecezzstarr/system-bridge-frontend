'use client'

import Link from 'next/link'
import {useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {CheckCircle2,Image as ImageIcon,RefreshCw,ShieldCheck,Store} from 'lucide-react'
import {BRANDING_KITS,BRANDING_LAUNCH_STEPS} from '@/lib/weave-branding-business'
import {WEAVE_IMAGE_SAMPLES,defaultSampleEdits,renderWeaveSampleSvg} from '@/lib/weave-image-sample-art'
type Data={success:boolean;featured:string[];totals?:{roles:{role:string;launch_count:number}[];campaigns:{prepared:number;reported_shared:number;last_seven_days:number};licenses:{licenses:number;company_earned_system_switch:string};topKits:{kit_id:string;starters:number}[]};error?:string}
const button='inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[.05] px-4 py-3 text-sm font-bold text-white disabled:opacity-40'
const headers=(json=false):Record<string,string>=>{
  const token=typeof window==='undefined'?'':localStorage.getItem('ssb_auth_token')||''
  return {...(json?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})}
}
export default function AdministrationsBrandingWorkshop(){
  const {user,isInitialized}=useAuth()
  const [data,setData]=useState<Data|null>(null)
  const [busy,setBusy]=useState('')
  const [notice,setNotice]=useState('')
  const [loading,setLoading]=useState(true)
  const [category,setCategory]=useState('All')
  const categories=['All',...Array.from(new Set(WEAVE_IMAGE_SAMPLES.map(s=>s.category)))]
  const load=async()=>{
    setLoading(true)
    try{
      const r=await fetch('/api/image-workshop/business',{headers:headers(),cache:'no-store'})
      const j:Data=await r.json()
      if(!r.ok||!j.success)throw Error(j.error||'Cannot load company records.')
      setData(j)
    }catch(e){setNotice(e instanceof Error?e.message:'Company records unavailable.')}
    finally{setLoading(false)}
  }
  useEffect(()=>{if(user?.role==='admin')void load()},[user?.role,user?.id])
  const feature=async(id:string,featured:boolean)=>{
    setBusy(id);setNotice('')
    try{
      const r=await fetch('/api/image-workshop/business',{method:'POST',headers:headers(true),body:JSON.stringify({action:'feature_template',sampleId:id,featured})})
      const j=await r.json()
      if(!r.ok||!j.success)throw Error(j.error||'Could not update catalogue.')
      setNotice('The company template selection has been updated.')
      await load()
    }catch(e){setNotice(e instanceof Error?e.message:'Could not publish selection.')}
    finally{setBusy('')}
  }
  if(!isInitialized)return <main className="p-8 text-white">Opening Administrations workshop…</main>
  if(!user)return <main className="p-8"><Link href="/login" className="text-cyan-200 underline">Sign in to Administrations</Link></main>
  if(user.role!=='admin')return <main className="p-8 text-white">Only Administrations may curate company template releases.</main>
  const totals=data?.totals
  return <main className="weave-operating-environment min-h-screen bg-[#081725] px-3 py-6 text-white sm:px-6" data-admin-branding-business="true">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-3xl border border-amber-200/25 bg-[radial-gradient(ellipse_at_top_right,#364a56,#081725_76%)] p-5 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-200"><ShieldCheck size={16}/>Administrations · A Time</p>
        <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Branding production & business formation</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-200">Curate Weave's original offline artwork catalogue. Equip Agents, Bridgers and Clients to create apparel and artist concepts, open customer services, prepare lawful advertising and continue through verified commercial records. No paid image-generation API is required.</p>
        <div className="mt-5 flex flex-wrap gap-2"><Link href="/image-workshop" className={button}><ImageIcon size={17}/>Original Image House · fees and receipts</Link><Link href="/image-workshop/branding" className={button}>Material mockup editor</Link><button type="button" className={button} disabled={loading} onClick={()=>void load()}><RefreshCw size={16}/>Refresh records</button></div>
      </header>
      {notice&&<p role="status" className="rounded-xl border border-white/20 p-4 text-sm">{notice}</p>}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Company movement · recorded only</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            {n:String((totals?.roles||[]).reduce((a,v)=>a+Number(v.launch_count),0)),l:'Saved business plans'},
            {n:String(totals?.campaigns?.prepared||0),l:'Prepared advertisements'},
            {n:String(totals?.campaigns?.reported_shared||0),l:'Shares self-reported'},
            {n:String(totals?.licenses?.company_earned_system_switch||0),l:'Verified sample-license System Switch'},
          ].map(x=><div key={x.l} className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><strong className="block text-2xl text-cyan-100">{x.n}</strong><span className="mt-2 block text-xs leading-5 text-slate-300">{x.l}</span></div>)}
        </div>
        <p className="text-xs leading-6 text-slate-400">Actual company earnings come from completed paid production licenses. Advertisements, prospect expectations, off-platform customer payments, and reported sharing are not verified sales.</p>
        <div className="grid gap-3 md:grid-cols-3">
          {(totals?.roles||[]).map(r=><div key={r.role} className="rounded-xl border border-white/10 p-4 text-sm"><strong className="capitalize">{r.role}</strong><span className="ml-2 text-cyan-200">{r.launch_count} saved launches</span></div>)}
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Business systems issued to participants</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {BRANDING_KITS.map(kit=><div key={kit.id} className="rounded-2xl border border-white/10 bg-[#0e2131] p-4">
            <h3 className="text-lg font-bold">{kit.name}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{kit.offer}</p><p className="mt-3 text-xs text-amber-200">Includes {kit.sampleIds.length} relevant templates</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">Participant activity: prepare artwork → open service door → promote to actual customers → deliver → record → repeat</p>
          </div>)}
        </div>
      </section>
      <section className="rounded-3xl border border-white/10 bg-[#0e2131] p-5">
        <h2 className="text-2xl font-bold">Six-step guided advertising system</h2>
        <p className="mt-2 text-sm text-slate-300">The participants see these steps beside their own business offers and sample image ads.</p>
        <ol className="mt-4 grid gap-3 md:grid-cols-2">
          {BRANDING_LAUNCH_STEPS.map((step,i)=><li key={step.id} className="rounded-xl border border-white/10 p-4"><strong className="text-base">{i+1}. {step.title}</strong><p className="mt-2 text-sm leading-6 text-slate-300">{step.help}</p></li>)}
        </ol>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Company original template library</h2>
        <p className="text-sm leading-6 text-slate-300">Select which templates Administrations highlights for participants. This changes featured placement, not ownership, copyright, fee settings or existing licenses. All shipped originals remain available unless code is updated through the authorized release process.</p>
        <div className="flex flex-wrap gap-2">{categories.map(x=><button type="button" key={x} onClick={()=>setCategory(x)} aria-pressed={category===x} className={'min-h-11 rounded-lg border px-3 text-sm '+(x===category?'border-cyan-200 bg-cyan-200/10':'border-white/10')}>{x}</button>)}</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {WEAVE_IMAGE_SAMPLES.filter(s=>category==='All'||s.category===category).map(s=><article key={s.id} className="overflow-hidden rounded-xl border border-white/10 bg-[#0e2131]">
            <img alt={'WEAVE template: '+s.name} loading="lazy" src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(renderWeaveSampleSvg(s,defaultSampleEdits(s),true))} className="aspect-[4/5] w-full object-cover"/>
            <div className="space-y-2 p-3"><strong className="block text-sm">{s.name}</strong><p className="text-xs text-slate-300">{s.category}</p><button type="button" className={button+' w-full text-xs'} disabled={Boolean(busy)} onClick={()=>void feature(s.id,!data?.featured.includes(s.id))}>{data?.featured.includes(s.id)?<><CheckCircle2 size={15}/>Featured · Remove</>:'Feature template'}</button></div>
          </article>)}
        </div>
      </section>
      <footer className="rounded-2xl border border-white/10 p-5"><p className="flex items-start gap-2 text-sm leading-6 text-slate-300"><Store size={18} className="mt-1 shrink-0"/>Weave supplies digital design concepts and authorized customer service systems. A material mockup is not a manufacturing order. Physical fulfillment, print materials, supplier payments and external advertising require separately verified service arrangements.</p></footer>
    </div>
  </main>
}
