'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {hopeSearchTerms,hopeNextAction,hopeWorkDirection,type ProspectSituation} from '@/lib/hope-social-work-guide'
import {HOPE_OUTREACH_CHANNELS,HOPE_POST_CHANNELS,type HopePostChannel} from '@/lib/hope-outreach-channels'

type Evidence={id:string;channel_key:HopePostChannel;post_url:string;status:'pending'|'approved'|'rejected';review_note:string|null}
type Report={plan:{direction:string;contactTarget:number}|null;contacts:{sendConfirmations:number};posts:Partial<Record<HopePostChannel,{target:number;managerReviewed:number;providerConfirmed:number;pending:number;total:number}>>;evidence:Evidence[];socialProspects:{id:string;prospect_name:string;next_step:string;follow_up_on:string;completed_at:string|null}[]}
type Outreach={mode:string;day:string;reports:Report[];sources:{prospects:boolean;publishing:boolean;sales:boolean}}
type Legacy={id:string;title:string;status:string}
const input='w-full min-h-11 rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-sm text-white'
const panel='space-y-4 rounded-2xl border border-white/15 bg-slate-900/70 p-4 sm:p-6'
const button='inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-200 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50'
const link='inline-flex min-h-11 items-center rounded-lg border border-cyan-200/35 px-4 py-2 text-sm text-cyan-100'
const situations:[ProspectSituation,string][]=[['observing','I found an account or publication'],['no_reply','They have not replied'],['conversation','A conversation has started'],['need','A business need has emerged'],['agreed','They agreed to a next step'],['declined','They are not interested']]
export default function HopeSocialStudio({history=[]}:{history?:Legacy[]}){
 const {token}=useAuth()
 const [data,setData]=useState<Outreach|null>(null)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState(false)
 const [channel,setChannel]=useState<HopePostChannel>('tiktok')
 const [industry,setIndustry]=useState('')
 const [place,setPlace]=useState('')
 const [terms,setTerms]=useState<string[]>([])
 const [situation,setSituation]=useState<ProspectSituation>('observing')
 const [url,setUrl]=useState('')
 const [name,setName]=useState('')
 const [need,setNeed]=useState('')
 const [nextStep,setNextStep]=useState('')
 const [followUp,setFollowUp]=useState('')
 const [agreed,setAgreed]=useState(false)
 const [caption,setCaption]=useState('')
 const [copyMessage,setCopyMessage]=useState('')
 const load=useCallback(async()=>{
  if(!token)return
  try{
   const response=await fetch('/api/regional-manager/hope-outreach',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
   const result=await response.json()
   if(!response.ok||!result.success||result.mode!=='member')throw new Error(result.error||'Your active Hope regional assignment is required.')
   setData(result);setError('')
  }catch(e){setData(null);setError(e instanceof Error?e.message:'Work records unavailable')}
 },[token])
 useEffect(()=>{void load();if(!token)return;const timer=setInterval(()=>void load(),20000);return()=>clearInterval(timer)},[load,token])
 const report=data?.reports[0]
 const post=report?.posts[channel]
 const due=report?.socialProspects.filter(item=>!item.completed_at&&item.follow_up_on<=(data?.day||'')).length||0
 const ready=Boolean(report&&data?.mode==='member')
 const direction=hopeWorkDirection(report?{assigned:true,target:report.plan?post?.target||0:0,reviewed:post?.total||0,pending:post?.pending||0,due}:null)
 const send=async(payload:Record<string,unknown>)=>{
  if(!token||!ready||busy)return false
  setBusy(true);setMessage('')
  try{
   const response=await fetch('/api/regional-manager/hope-outreach',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload)})
   const result=await response.json()
   if(!response.ok||!result.success)throw new Error(result.error||'Unable to record work')
   await load();setMessage(payload.action==='submit_post'?'Publication submitted for Regional Manager review.':'Agreed prospect follow-up recorded.')
   return true
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to record work');return false}
  finally{setBusy(false)}
 }
 const entry=HOPE_OUTREACH_CHANNELS[channel]
 return <main className="mx-auto max-w-4xl space-y-5 px-3 pb-16 text-white sm:px-6" data-hope-social-studio="manual-publication">
  <header className={panel}>
   <p className="text-xs font-bold uppercase tracking-widest text-amber-200">Hope · Faith in participation</p>
   <h1 className="text-3xl font-black">Social Studio</h1>
   <p className="text-sm leading-6 text-slate-200">Your social platforms are your fields of work. Publish and participate on your own account; no social account connection to Weave is required. Work and play as one, with real company direction and records.</p>
   <div className="flex flex-wrap gap-2"><Link className={link} href="/notifications">Administrations announcements</Link><Link className={link} href="/event">Current company event</Link><Link className={link} href="/video-ad-studio">Video Studio</Link></div>
   <label className="block text-sm">Field of work<select className={input+' mt-1'} value={channel} onChange={e=>{setChannel(e.target.value as HopePostChannel);setTerms([]);setUrl('');setSituation('observing');setAgreed(false)}}>
    {HOPE_POST_CHANNELS.map(key=><option key={key} value={key}>{HOPE_OUTREACH_CHANNELS[key].name}</option>)}
   </select></label>
   {report?.plan?.direction&&<p className="whitespace-pre-wrap text-sm leading-6 text-amber-100"><strong>Regional Manager direction</strong><br/>{report.plan.direction}</p>}
  </header>
  <section className={panel} data-hope-work-bot>
   <h2 className="text-xl font-bold">Weave work guide</h2>
   <p className="text-sm text-slate-400">A rule-based company bot, not an AI service. It uses your recorded targets, submitted posts and due follow-ups. It does not see your private social activity.</p>
   <p role="status" className="text-base leading-7 text-cyan-100">{direction}</p>
   {error&&<p role="alert" className="text-sm text-amber-200">{error} You can still use the guidance below.</p>}
   {report&&<p className="text-sm text-slate-200">Publication: {data?.sources.publishing?post?.total??0:'Unavailable'} reviewed/provider-confirmed · {post?.pending??0} pending · target {report.plan?post?.target??0:'Not assigned'} · {due} agreed follow-ups due.</p>}
   <button type="button" className={link} onClick={()=>void load()}>Refresh work record</button>
  </section>
  <section className={panel} id="publication">
   <h2 className="text-xl font-bold">1. Publish on {entry.name}</h2>
   {channel==='tiktok'?<ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-200">
    <li>Read the current A Time event or announcement. Choose an approved image, video or File Folder preview you have permission to use.</li>
    <li>Prepare a useful original caption in your own voice. Describe actual features, not guaranteed income or invented results.</li>
    <li>Open TikTok on your phone. Tap +, then record or upload the selected video or photos.</li>
    <li>Preview, add your caption and relevant tags, check audience settings and required promotional disclosure, then tap Post.</li>
    <li>Open the published post, use Share → Copy link, and return here to submit it for review.</li>
   </ol>:<ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-200"><li>Choose approved company materials and write an accurate original caption.</li><li>Open your own {entry.name} account and publish using the platform's supported tools and rules.</li><li>Copy the public publication link and submit it below.</li></ol>}
   <label className="block text-sm">Prepare your caption<textarea className={input+' mt-1'} rows={4} maxLength={2000} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Express the current event in your own words"/></label>
   <div className="flex flex-wrap gap-2"><button type="button" className={link} disabled={!caption.trim()} onClick={async()=>{try{await navigator.clipboard.writeText(caption);setCopyMessage('Caption copied.')}catch{setCopyMessage('Copy the caption manually.')}}}>Copy caption</button><a className={button} href={'https://'+entry.hosts[0]} target="_blank" rel="noopener noreferrer">Open {entry.name}</a></div>
   {copyMessage&&<p role="status" className="text-sm">{copyMessage}</p>}
   <form className="space-y-3" onSubmit={async e=>{e.preventDefault();if(await send({action:'submit_post',channel,url}))setUrl('')}}>
    <label className="block text-sm">Published post link<input className={input+' mt-1'} type="url" required value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..."/></label>
    <button className={button} disabled={!ready||busy||!url.trim()}>Submit actual publication</button>
   </form>
   <p className="text-xs text-slate-400">A draft, caption or link submission is not a verified publication or earnings. A manager reviews the evidence.</p>
  </section>
  <section className={panel} id="prospect-search" data-hope-prospect-search>
   <h2 className="text-xl font-bold">2. Prospect Search Workshop</h2>
   <p className="text-sm leading-6">Choose an industry or interest and optional location. The guide prepares search phrases. You discover real accounts in the platform; Weave does not invent or scrape prospects.</p>
   <form className="space-y-3" onSubmit={e=>{e.preventDefault();setTerms(hopeSearchTerms(industry,place))}}>
    <label className="block text-sm">Industry or interest<input className={input+' mt-1'} required maxLength={80} value={industry} onChange={e=>setIndustry(e.target.value)} placeholder="Fashion designer, bakery, furniture"/></label>
    <label className="block text-sm">Location (optional)<input className={input+' mt-1'} maxLength={80} value={place} onChange={e=>setPlace(e.target.value)} placeholder="Lagos, London, Madrid"/></label>
    <button className={button}>Prepare search</button>
   </form>
   {terms.length>0&&<div className="space-y-2"><p className="text-sm text-cyan-100">Search these terms in {entry.name} and look at relevant recent posts, profiles and conversations.</p>{terms.map(term=><div key={term} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 p-3"><span className="break-words text-sm">{term}</span>{channel==='tiktok'?<a className={link} target="_blank" rel="noopener noreferrer" href={'https://www.tiktok.com/search?q='+encodeURIComponent(term)}>Search TikTok</a>:<button className={link} onClick={async()=>{try{await navigator.clipboard.writeText(term);setCopyMessage('Search phrase copied.')}catch{setCopyMessage('Copy the search phrase manually.')}}}>Copy search</button>}</div>)}</div>}
   <p className="text-sm leading-6 text-slate-300">{entry.guide} Appreciate genuinely, comment in context, ask useful questions and share your own work. No repeated unsolicited messages, fake engagement or compulsory sales pitch.</p>
   <label className="block text-sm">What happened?<select className={input+' mt-1'} value={situation} onChange={e=>{setSituation(e.target.value as ProspectSituation);setAgreed(false)}}>{situations.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <p className="rounded-lg border border-cyan-200/25 p-3 text-sm leading-6 text-cyan-100" role="status">{hopeNextAction(situation)}</p>
   {situation==='agreed'&&<form className="space-y-3" onSubmit={async e=>{e.preventDefault();if(await send({action:'record_social_prospect',channel,name,need,nextStep,followUp,agreed})){setName('');setNeed('');setNextStep('');setFollowUp('');setAgreed(false);setSituation('observing')}}}>
    <label className="block text-sm">Public handle or business name<input className={input+' mt-1'} required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
    <label className="block text-sm">Actual business need<textarea className={input+' mt-1'} required maxLength={500} value={need} onChange={e=>setNeed(e.target.value)}/></label>
    <label className="block text-sm">Agreed next step<input className={input+' mt-1'} required maxLength={300} value={nextStep} onChange={e=>setNextStep(e.target.value)}/></label>
    <label className="block text-sm">Follow-up date<input className={input+' mt-1'} type="date" min={data?.day} required value={followUp} onChange={e=>setFollowUp(e.target.value)}/></label>
    <label className="flex gap-2 text-sm"><input type="checkbox" required checked={agreed} onChange={e=>setAgreed(e.target.checked)}/>They agreed to this next step.</label>
    <button className={button} disabled={!ready||busy||!agreed}>Record prospect</button>
   </form>}
  </section>
  {message&&<p role="status" className="rounded-lg border border-cyan-200/25 p-3 text-sm text-cyan-100">{message}</p>}
  <section className={panel}>
   <h2 className="text-xl font-bold">3. Return to your work</h2>
   {report?.evidence.filter(item=>item.channel_key===channel).map(item=><article key={item.id} className="space-y-1 border-b border-white/10 pb-3 text-sm"><p>{item.status}</p><a href={item.post_url} target="_blank" rel="noopener noreferrer" className="break-all text-cyan-200 underline">{item.post_url}</a>{item.review_note&&<p>{item.review_note}</p>}</article>)}
   {report?.socialProspects.filter(item=>!item.completed_at).map(item=><article key={item.id} className="border-b border-white/10 pb-3 text-sm"><strong>{item.prospect_name}</strong><p>{item.next_step} · {item.follow_up_on}</p></article>)}
   <div className="flex flex-wrap gap-2"><Link className={link} href="/weave/lifestyles/regional-manager/hope-outreach">Full work record and follow-ups</Link><Link className={link} href="/bridger/bridge-ai">Bridge AI</Link><Link className={link} href="/weave/market/prospects">Prospect Market</Link></div>
   {history.length>0&&<details><summary className="cursor-pointer text-sm text-slate-300">Previous Social Studio queue ({history.length})</summary>{history.map(item=><p key={item.id} className="mt-2 text-sm">{item.title} · {item.status}</p>)}</details>}
  </section>
 </main>
}
