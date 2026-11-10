'use client'

import Link from 'next/link'
import {useEffect,useMemo,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {ArrowLeft,CheckCircle2,Copy,ExternalLink,Image as ImageIcon,Megaphone,RefreshCw,Store,Users} from 'lucide-react'
import {BRANDING_KITS,BRANDING_LAUNCH_STEPS,createBrandingAd,getBrandingKit} from '@/lib/weave-branding-business'
import {findImageSample,defaultSampleEdits,renderWeaveSampleSvg} from '@/lib/weave-image-sample-art'

type Plan={role:string;kit_id:string;business_name:string;offer_text:string;audience:string;customer_quote_ngn:string|null;daily_outreach_goal:number}
type Ad={id:string;kit_id:string;sample_id:string;channel:string;headline:string;message:string;customer_door:string|null;status:string;created_at:string;external_post_url?:string|null}
type Door={active:boolean;url:string;display_name:string}|null
type State={success:boolean;plan:Plan|null;campaigns:Ad[];door:Door;work:{requests:{total:number;completed:number};licensed:number};featured:string[];error?:string}
const field='mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#122335] px-4 py-3 text-base text-white outline-none focus:border-cyan-200'
const btn='inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[.06] px-4 py-3 text-sm font-bold text-slate-100 disabled:opacity-40'
const channels=[['whatsapp_status','WhatsApp Status'],['tiktok','TikTok'],['instagram','Instagram'],['facebook','Facebook'],['x','X'],['company_distribution','WEAVE Distribution Studio'],['in_person','Physical customers'],['email','Permission-based email']] as const
function headers(json=false):Record<string,string>{
  const token=typeof window==='undefined'?'':localStorage.getItem('ssb_auth_token')||''
  return {...(json?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})}
}
const channelName=(v:string)=>channels.find(x=>x[0]===v)?.[1]||v
export default function WeaveBrandingBusinessStarter(){
  const {user,isInitialized}=useAuth()
  const [data,setData]=useState<State|null>(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState('')
  const [notice,setNotice]=useState('')
  const [kitId,setKitId]=useState('apparel')
  const [businessName,setBusinessName]=useState('')
  const [offer,setOffer]=useState('')
  const [audience,setAudience]=useState('')
  const [quoteNgn,setQuoteNgn]=useState('')
  const [dailyGoal,setDailyGoal]=useState(2)
  const [sampleId,setSampleId]=useState('brand-tee-classic')
  const [headline,setHeadline]=useState('Your brand deserves professional artwork')
  const [channel,setChannel]=useState('whatsapp_status')
  const [evidenceId,setEvidenceId]=useState('')
  const [postUrl,setPostUrl]=useState('')
  const kit=getBrandingKit(kitId)||BRANDING_KITS[0]
  const sample=findImageSample(sampleId)||findImageSample(kit.sampleIds[0])
  const preview=useMemo(()=>sample?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(renderWeaveSampleSvg(sample,defaultSampleEdits(sample),true)):'',[sample?.id])
  const load=async()=>{
    setLoading(true)
    try{
      const res=await fetch('/api/image-workshop/business',{headers:headers(),cache:'no-store'})
      const result:State=await res.json()
      if(!res.ok||!result.success)throw Error(result.error||'Could not read business records.')
      setData(result)
      if(result.plan){
        setKitId(result.plan.kit_id)
        setBusinessName(result.plan.business_name)
        setOffer(result.plan.offer_text)
        setAudience(result.plan.audience)
        setQuoteNgn(result.plan.customer_quote_ngn===null?'':String(result.plan.customer_quote_ngn))
        setDailyGoal(result.plan.daily_outreach_goal)
        const next=getBrandingKit(result.plan.kit_id);if(next)setSampleId(next.sampleIds[0])
      }
    }catch(e){setNotice(e instanceof Error?e.message:'Business records are unavailable.')}
    finally{setLoading(false)}
  }
  useEffect(()=>{if(user?.id&&user.role!=='admin')void load()},[user?.id,user?.role])
  const post=async(body:object)=>{
    const r=await fetch('/api/image-workshop/business',{method:'POST',headers:headers(true),body:JSON.stringify(body)})
    const out=await r.json().catch(()=>({}))
    if(!r.ok||!out.success)throw Error(out.error||'The company system could not record this action.')
    return out
  }
  const savePlan=async()=>{
    setBusy('plan');setNotice('')
    try{
      await post({action:'save_plan',kitId,businessName,offer,audience,quoteNgn,dailyGoal})
      setNotice('Your business launch plan is saved. Continue into the Image House and Customer Door.')
      await load()
    }catch(e){setNotice(e instanceof Error?e.message:'Could not save the plan.')}
    finally{setBusy('')}
  }
  const createAd=async()=>{
    setBusy('ad');setNotice('')
    try{
      const out=await post({action:'prepare_ad',sampleId,headline,channel,clientKey:crypto.randomUUID()})
      setNotice(out.existing?'This advertisement was already prepared.':'Advertisement prepared. Use its approved message and share it through the selected channel.')
      await load()
    }catch(e){setNotice(e instanceof Error?e.message:'Could not prepare an advertisement.')}
    finally{setBusy('')}
  }
  const reportShared=async(id:string)=>{
    setBusy(id);setNotice('')
    try{
      await post({action:'report_share',id,externalPostUrl:evidenceId===id?postUrl:''})
      setNotice('Share reported. This is not a verified audience count or customer sale.')
      await load()
    }catch(e){setNotice(e instanceof Error?e.message:'Could not record the share.')}
    finally{setBusy('')}
  }
  const copy=async(value:string)=>{try{await navigator.clipboard.writeText(value);setNotice('Copied for your authorized outreach.')}catch{setNotice('Clipboard unavailable on this device.')}}
  const share=async(ad:Ad)=>{
    try{
      if(navigator.share)await navigator.share({title:ad.headline,text:ad.message,url:ad.customer_door||undefined})
      else await copy(ad.message)
    }catch{setNotice('Share cancelled. The ad remains prepared.')}
  }
  if(!isInitialized)return <main className="p-8 text-white">Opening the company business system…</main>
  if(!user)return <main className="p-8"><Link href="/login" className="text-cyan-200 underline">Sign in to start your branding business</Link></main>
  if(user.role==='admin')return <main className="p-8 text-white"><Link href="/admin/image-branding" className="text-cyan-200 underline">Open Administrations Branding Workshop</Link></main>
  if(!['agent','bridger','client'].includes(user.role))return <main className="p-8 text-white">This workshop is for active Agents, Bridgers and Clients.</main>
  const prepared=data?.campaigns.length||0,reported=data?.campaigns.filter(a=>a.status==='reported_shared').length||0
  const proposedAd=(()=>{try{return createBrandingAd({businessName,offer,kitId,audience,customerDoor:data?.door?.active?data.door.url:'',quoteNgn:quoteNgn===''?null:Number(quoteNgn)})}catch{return ''}})()
  const focus=user.role==='agent'
    ?'Stability: use local outlets, customer delivery and repeat physical business to extend your designs.'
    :user.role==='bridger'
      ?'Hope: introduce branding services through legitimate business conversations and help interested Clients start their own presence.'
      :'Dream Lovely: use the File Folder and your own Customer Door to develop a wider creative enterprise.'
  return <main className="weave-operating-environment min-h-screen bg-[#081521] px-3 py-6 text-white sm:px-6" data-branding-business-starter="true">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-3xl border border-cyan-200/20 bg-[radial-gradient(ellipse_at_top_right,#20445e,#0b1a29_70%)] p-5 sm:p-8">
        <Link href="/image-workshop" className="inline-flex items-center gap-2 text-sm text-cyan-100"><ArrowLeft size={17}/>Image House</Link>
        <p className="mt-5 text-xs font-bold uppercase tracking-wider text-amber-200">Company of Time · {user.role==='agent'?'Stability':user.role==='bridger'?'Hope':'Dream Lovely'}</p>
        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Start and grow a branding business</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-200">Weave supplies the visual templates, product mockups, customer reception, advertising preparation, production licensing and operating records. Your role is to find real customer needs, deliver approved work and build repeat business.</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-amber-100">{focus}</p>
      </header>
      {notice&&<div className="rounded-xl border border-cyan-200/20 p-4 text-sm leading-6 text-white" role="status">{notice}</div>}
      <div className="grid grid-cols-3 gap-2">
        {[[String(prepared),'Ads prepared'],[String(reported),'Shares reported'],[String(data?.work?.requests?.completed||0),'Jobs completed']].map(([value,label])=><div key={label} className="rounded-2xl border border-white/10 bg-white/[.035] p-3 text-center"><strong className="text-xl text-cyan-100">{value}</strong><p className="mt-1 text-xs text-slate-300">{label}</p></div>)}
      </div>
      <section className="space-y-4" aria-label="Six steps to launch">
        <div><h2 className="text-2xl font-bold">Your six starting steps</h2><p className="mt-2 text-sm text-slate-300">Read each step, view a sample advertisement, and open the working system for the next action.</p></div>
        <div className="grid gap-3 md:grid-cols-2">
          {BRANDING_LAUNCH_STEPS.map((step,i)=><article key={step.id} className="rounded-2xl border border-white/10 bg-[#112133] p-4">
            <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-sm font-bold text-cyan-100">{i+1}</span><div><h3 className="text-lg font-bold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{step.help}</p></div></div>
            <div className="mt-4">
              {i===0?<a href="#choose-business" className={btn}>Select your business <ExternalLink size={16}/></a>:
                i===1?<Link href="/image-workshop/branding" className={btn}>Open product branding editor <ExternalLink size={16}/></Link>:
                i===2?<Link href="/image-workshop#image-house-customer-door" className={btn}>Open your customer service door <ExternalLink size={16}/></Link>:
                i===3?<a href="#prepare-ad" className={btn}>Prepare the first advertisement <Megaphone size={16}/></a>:
                i===4?<Link href="/image-workshop#image-house-orders" className={btn}>Open received customer work <ExternalLink size={16}/></Link>:
                <Link href="/distribution-studio" className={btn}>Open Distribution Studio <ExternalLink size={16}/></Link>}
            </div>
          </article>)}
        </div>
      </section>
      <section id="choose-business" className="space-y-4 rounded-3xl border border-amber-200/20 bg-[#0f2030] p-4 sm:p-6">
        <div><h2 className="text-2xl font-bold">1. Choose what you will sell</h2><p className="mt-2 text-sm leading-6 text-slate-300">A starter business is a service offer. Producing a design or mockup does not mean a physical item has already been manufactured.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BRANDING_KITS.map(kit=><button type="button" key={kit.id} onClick={()=>{setKitId(kit.id);setSampleId(kit.sampleIds[0]);setOffer(kit.offer);setAudience(kit.audience);setHeadline(kit.offer.slice(0,105))}} aria-pressed={kitId===kit.id} className={'min-h-32 rounded-2xl border p-4 text-left '+(kitId===kit.id?'border-amber-300 bg-amber-300/10':'border-white/15 bg-white/[.03]')}>
            <strong className="block text-base">{kit.name}</strong><span className="mt-2 block text-sm leading-6 text-slate-300">{kit.short}</span><span className="mt-2 block text-xs text-amber-200">{kit.sampleIds.length} linked working templates</span>
          </button>)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold">Your business name<input className={field} value={businessName} maxLength={100} onChange={e=>setBusinessName(e.target.value)} placeholder="Name your branding service"/></label>
          <label className="text-sm font-bold">Who needs your work?<input className={field} value={audience} maxLength={150} onChange={e=>setAudience(e.target.value)} placeholder={kit.audience}/></label>
          <label className="md:col-span-2 text-sm font-bold">What can you deliver?<textarea rows={3} className={field} value={offer} maxLength={260} onChange={e=>setOffer(e.target.value)} placeholder={kit.offer}/></label>
          <label className="text-sm font-bold">Indicative customer design quote (₦)<input type="number" min={0} max={100000000} className={field} value={quoteNgn} onChange={e=>setQuoteNgn(e.target.value)} placeholder="Set your own price"/></label>
          <label className="text-sm font-bold">Daily legitimate outreach goal<input type="number" min={1} max={30} className={field} value={dailyGoal} onChange={e=>setDailyGoal(Number(e.target.value))}/></label>
        </div>
        <button type="button" onClick={()=>void savePlan()} disabled={Boolean(busy)||loading} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-cyan-200 px-6 py-3 text-base font-black text-[#071724] disabled:opacity-40"><CheckCircle2 size={18}/>Save your business plan</button>
        {data?.plan&&<p className="text-sm text-emerald-200">Saved plan: {data.plan.business_name} · {getBrandingKit(data.plan.kit_id)?.name}</p>}
      </section>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" id="prepare-ad">
        <div className="rounded-3xl border border-white/10 bg-[#102033] p-4 sm:p-6">
          <h2 className="text-2xl font-bold">2. Make an advertisement</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Choose an original WEAVE template, edit your brand and prepare an ad with an actual service link. Exporting a commercial image still uses the normal Image House licensing fee.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {kit.sampleIds.map(id=>{const item=findImageSample(id);return item?<button key={id} type="button" onClick={()=>setSampleId(id)} className={'overflow-hidden rounded-xl border text-left '+(sampleId===id?'border-cyan-300':'border-white/15')}><img src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(renderWeaveSampleSvg(item,defaultSampleEdits(item),true))} alt={item.name+' preview'} className="aspect-[4/5] w-full object-cover"/><span className="block p-2 text-sm font-bold">{item.name}</span></button>:null})}
          </div>
          <label className="mt-4 block text-sm font-bold">Advertisement headline<input className={field} maxLength={110} value={headline} onChange={e=>setHeadline(e.target.value)}/></label>
          <label className="mt-4 block text-sm font-bold">Where will you share it?
            <select className={field} value={channel} onChange={e=>setChannel(e.target.value)}>{channels.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
          </label>
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={btn} disabled={!data?.plan||Boolean(busy)} onClick={()=>void createAd()}><Megaphone size={16}/>Record prepared ad</button><Link className={btn} href="/image-workshop">Customize and license artwork</Link></div>
        </div>
        <div className="space-y-4 rounded-3xl border border-white/10 bg-[#102033] p-4 sm:p-6">
          <h2 className="text-xl font-bold">Example advertising image</h2>
          {preview&&<img src={preview} alt={sample?.name+' licensed-image example'} className="max-h-[60vh] w-full rounded-xl border border-white/15 object-contain"/>}
          <p className="text-xs leading-5 text-slate-300">Watermarked example only. Customize and pay the displayed System Switch license fee before commercial delivery. No provider API.</p>
          <h3 className="text-lg font-bold">Advertising message</h3>
          <pre className="whitespace-pre-wrap rounded-xl bg-[#071622] p-4 text-sm leading-6 text-slate-200">{proposedAd||'Save a real business offer to prepare customer-facing advertising text.'}</pre>
          <button className={btn} type="button" disabled={!proposedAd} onClick={()=>void copy(proposedAd)}><Copy size={16}/>Copy advertising text</button>
        </div>
      </section>
      <section className="rounded-3xl border border-white/10 bg-[#102033] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2"><h2 className="text-2xl font-bold">3. Your advertisement records</h2><button type="button" className={btn} onClick={()=>void load()} disabled={loading}><RefreshCw size={16}/>Refresh</button></div>
        {!data?.campaigns.length?<p className="mt-4 text-sm text-slate-300">No advertisement prepared yet. Save your business plan and create your first ad above.</p>:
          <div className="mt-4 grid gap-3 md:grid-cols-2">{data.campaigns.map(ad=><article key={ad.id} className="space-y-3 rounded-2xl border border-white/10 bg-[#091b29] p-4">
            <strong className="block text-base">{ad.headline}</strong>
            <p className="text-xs text-slate-300">{channelName(ad.channel)} · {ad.status==='reported_shared'?'Shared (self-reported)':'Prepared, not yet shared'} · {new Date(ad.created_at).toLocaleDateString()}</p>
            <pre className="whitespace-pre-wrap text-xs leading-5 text-slate-200">{ad.message}</pre>
            <div className="flex flex-wrap gap-2"><button type="button" className={btn} onClick={()=>void copy(ad.message)}><Copy size={16}/>Copy</button><button type="button" className={btn} onClick={()=>void share(ad)}><Megaphone size={16}/>Share</button></div>
            {ad.status==='prepared'&&<div className="space-y-2 border-t border-white/10 pt-3"><label className="block text-xs text-slate-200">Posted link (optional, evidence only)<input className={field} value={evidenceId===ad.id?postUrl:''} onFocus={()=>{setEvidenceId(ad.id);setPostUrl('')}} onChange={e=>{setEvidenceId(ad.id);setPostUrl(e.target.value)}} placeholder="https://your-authorized-post"/></label><button type="button" className={btn} disabled={Boolean(busy)} onClick={()=>void reportShared(ad.id)}>Record that I shared this ad</button></div>}
            {ad.external_post_url&&<a href={ad.external_post_url} target="_blank" rel="noreferrer" className="block break-words text-sm text-cyan-200 underline">View reported post</a>}
          </article>)}</div>}
        <p className="mt-4 text-xs leading-6 text-slate-400">A prepared ad is not a published social post. Reported shares are not verified reach. Real customer requests and licensed completed jobs are counted separately.</p>
      </section>
      <section className="rounded-3xl border border-white/10 bg-[#102033] p-4 sm:p-6" aria-label="Scale branding operations">
        <h2 className="text-2xl font-bold">4. Operate and scale your service</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link href="/image-workshop/branding" className={btn}><ImageIcon size={18}/>Brand shirts and physical materials</Link>
          <Link href="/image-workshop#image-house-customer-door" className={btn}><Store size={18}/>Open and manage your Customer Door</Link>
          <Link href="/video-ad-studio" className={btn}><Megaphone size={18}/>Add video campaign services</Link>
          <Link href="/distribution-studio" className={btn}><Users size={18}/>Coordinate authorized publicity</Link>
          {user.role==='bridger'&&<Link href="/weave/market/prospects" className={btn}>Find relevant Bridger prospect opportunities</Link>}
          {user.role==='agent'&&<Link href="/agent/dashboard" className={btn}>Connect your Agent distribution activities</Link>}
          {user.role==='client'&&<Link href="/client/dashboard" className={btn}>Connect your Client File Folder</Link>}
          {user.role!=='client'&&<Link href="/weave/lifestyles/support" className={btn}>Request verified manager support</Link>}
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-300">Your published service door: {data?.door?.active?<a href={data.door.url} target="_blank" rel="noreferrer" className="break-all text-cyan-200 underline">{data.door.url}</a>:'Not open yet. Set it inside the Image House to receive requests.'}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">Recorded customer requests: {data?.work?.requests?.total||0} · Completed customer jobs: {data?.work?.requests?.completed||0} · Licensed productions: {data?.work?.licensed||0}. None of these counts is a claim about outside customer cash received.</p>
      </section>
    </div>
  </main>
}
