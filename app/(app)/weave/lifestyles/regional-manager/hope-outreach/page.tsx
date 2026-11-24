'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'

import {HOPE_OUTREACH_CHANNELS, HOPE_POST_CHANNELS, HOPE_PROSPECT_CHANNELS, hopeChannelName, type HopePostChannel, type HopeProspectChannel} from '@/lib/hope-outreach-channels'

const channels=HOPE_POST_CHANNELS
type Channel=HopePostChannel
type Targets=Partial<Record<Channel,number>>
type Evidence={id:string;channel_key:Channel;post_url:string;status:'pending'|'approved'|'rejected';review_note:string|null;work_date:string}
type SocialProspect={
  id:string
  channel_key:HopeProspectChannel
  prospect_name:string
  business_need:string
  next_step:string
  follow_up_on:string
  completed_at:string|null
}
type Report={
  member:{user_id:string;name:string;role:string;position:string;level:string}
  plan:{workingHours:number;contactTarget:number;postTargets:Targets;direction:string;updatedAt:string}|null
  contacts:{sendConfirmations:number;responsesOrConversions:number}
  confirmedFileFolders:number
  posts:Record<Channel,{target:number;providerConfirmed:number;managerReviewed:number;pending:number;total:number}>
  evidence:Evidence[]
  socialProspects:SocialProspect[]
}
type Data={
  success:boolean;mode:'manager'|'reviewer'|'member';managerId:string;day:string;reports:Report[]
  reviewers:{user_id:string;name:string;position:string;authorized:boolean}[]
  sources:{prospects:boolean;publishing:boolean;sales:boolean};note:string
}
const blank=():Targets=>({tiktok:1,facebook:1,instagram:1,x:1})
const label=hopeChannelName
const emptyProspect={channel:'tiktok' as HopeProspectChannel,name:'',need:'',nextStep:'',followUp:'',agreed:false}
const number=(value:number)=>Number(value||0).toLocaleString('en-NG')
const input='w-full min-h-11 rounded-lg border border-white/20 bg-[#0d1723] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300'
const panel='rounded-2xl border border-white/15 bg-[#111d2b] p-4 sm:p-5'

export default function RegionalHopeOutreachPage(){
  const {token,isInitialized}=useAuth()
  const [data,setData]=useState<Data|null>(null)
  const [selected,setSelected]=useState('')
  const [workingHours,setWorkingHours]=useState('6')
  const [targets,setTargets]=useState<Targets>(blank)
  const [direction,setDirection]=useState('')
  const [prospect,setProspect]=useState(emptyProspect)
  const [followUpEdit,setFollowUpEdit]=useState<{id:string;nextStep:string;followUp:string}|null>(null)
  const [postChannel,setPostChannel]=useState<Channel>('tiktok')
  const [postUrl,setPostUrl]=useState('')
  const [notes,setNotes]=useState<Record<string,string>>({})
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')

  const auth=useCallback(()=>({Authorization:'Bearer '+token,'Content-Type':'application/json'}),[token])
  const load=useCallback(async()=>{
    if(!token)return
    try{
      const response=await fetch('/api/regional-manager/hope-outreach',{headers:auth(),cache:'no-store'})
      const json=await response.json().catch(()=>({}))
      if(!response.ok||!json.success)throw new Error(json.error||'Could not read Hope outreach records')
      setData(json as Data);setError('')
    }catch(e){setError(e instanceof Error?e.message:'Hope outreach unavailable')}
    finally{setLoading(false)}
  },[token,auth])
  useEffect(()=>{void load();if(!token)return;const timer=setInterval(()=>void load(),20000);return()=>clearInterval(timer)},[load,token])

  const choose=(report:Report)=>{
    setSelected(report.member.user_id)
    setWorkingHours(String(report.plan?.workingHours??6))
    setTargets(report.plan?.postTargets??blank())
    setDirection(report.plan?.direction??'')
    setMessage('')
  }
  const current=data?.reports.find(r=>r.member.user_id===selected)||
    (data?.mode==='member'?data?.reports[0]:null)
  const send=async(body:Record<string,unknown>)=>{
    if(!token)return
    setBusy(true);setMessage('')
    try{
      const response=await fetch('/api/regional-manager/hope-outreach',
        {method:'POST',headers:auth(),body:JSON.stringify(body)})
      const json=await response.json().catch(()=>({}))
      if(!response.ok||!json.success)throw new Error(json.error||'The action could not be recorded')
      setMessage('Recorded. The Hope outreach board has been refreshed.')
      await load()
      return true
    }catch(e){setMessage(e instanceof Error?e.message:'Could not complete this action');return false}
    finally{setBusy(false)}
  }
  const save=async()=>{
    if(!current)return
    await send({action:'save_plan',bridgerId:current.member.user_id,
      workingHours:Number(workingHours),postTargets:targets,direction})
  }
  const submit=async()=>{
    if(await send({action:'submit_post',channel:postChannel,url:postUrl}))setPostUrl('')
  }
  const review=async(evidence:Evidence,status:'approved'|'rejected')=>{
    if(await send({action:'review_post',evidenceId:evidence.id,status,note:notes[evidence.id]||''}))
      setNotes(previous=>({...previous,[evidence.id]:''}))
  }
  if(!isInitialized||(token&&loading))return <main className="mx-auto max-w-6xl p-6 text-slate-100">Opening regional Hope outreach records…</main>
  if(!data)return <main className="mx-auto max-w-3xl space-y-4 p-6 text-slate-100">
    <Link href="/weave/lifestyles/regional-manager/workspace" className="text-cyan-200">Regional Manager Workspace</Link>
    <p role="alert" className="text-rose-200">{error||'No authorized Hope regional assignment found'}</p>
    <button onClick={()=>void load()} className="rounded-lg border border-cyan-300/30 px-4 py-2">Retry</button>
  </main>
  const isManager=data.mode==='manager'
  const isReviewer=data.mode==='reviewer'
  const isBridger=data.mode==='member'
  const visibleChannels=current?channels.filter(channel=>current.posts[channel]?.target||current.posts[channel]?.total||current.posts[channel]?.pending):[]
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 text-slate-100 sm:px-6">
    <header className="space-y-3 border-b border-white/15 pb-6">
      <Link href={!isBridger?"/weave/lifestyles/regional-manager/workspace":"/bridger/dashboard"} className="text-sm font-semibold text-cyan-200">← {!isBridger?"Regional Daily Workspace":"Hope"}</Link>
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-200">Company of Time · Hope · Regional supervision</p>
      <h1 className="text-3xl font-black sm:text-4xl">{isManager?'Regional Hope · Daily Outreach Control':isReviewer?'Hope · Publication Review':'My Hope · Daily Outreach'}</h1>
      <p className="max-w-3xl text-sm leading-7 text-slate-300">
        {isManager?'Manage each assigned Bridger’s daily working hours, WhatsApp contact target and social publications. Review real evidence, respond to obstacles and keep one traceable record.':
          isReviewer?'Review public outreach evidence assigned by your Regional Manager.':
          'Follow your assigned prospect target, publish through authorized channels and submit public post links for your Regional Manager to review.'}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full border border-amber-200/25 px-3 py-1 text-amber-100">Nigeria work date: {data.day}</span>
        <button onClick={()=>void load()} className="rounded-lg border border-white/20 px-4 py-2" disabled={busy}>Refresh records</button>
      </div>
    </header>
    {error&&<p role="alert" className="rounded-lg border border-rose-300/25 p-3 text-sm text-rose-200">Previous records are shown. Refresh failed: {error}</p>}
    {message&&<p role="status" className="rounded-lg border border-cyan-300/25 p-3 text-sm text-cyan-100">{message}</p>}
    {(!data.sources.prospects||!data.sources.publishing||!data.sources.sales)&&<p role="alert" className="rounded-lg border border-amber-300/25 p-3 text-sm text-amber-100">
      Some source records are unavailable. Missing data must not be treated as zero employee activity.
    </p>}
    <p className="text-sm leading-6 text-slate-400">Two contacts per working hour is the company standard. WhatsApp contacts in this board are Bridger-confirmed sends, not independent WhatsApp delivery receipts. A social post is counted only with a recorded provider receipt or a manager-reviewed public link; manager review is not provider verification.</p>

    {!isBridger&&<section className={panel}>
      <h2 className="text-xl font-bold">Your assigned Hope workforce · {data.reports.length}</h2>
      <p className="mt-2 text-sm text-slate-400">{isManager?'Select a Bridger to set daily targets and inspect activity. Today’s targets repeat while the same manager remains appointed.':'Select a Bridger to review their publication evidence.'}</p>
      {!data.reports.length?<p className="mt-4 text-sm text-amber-100">No active direct Bridgers are assigned to this Regional Manager. Administrations must assign the workforce first.</p>:
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.reports.map(report=>{
            const pending=report.evidence.filter(e=>e.status==='pending').length
            const progress=report.plan?report.contacts.sendConfirmations+'/'+report.plan.contactTarget:'Not assigned'
            return <button type="button" key={report.member.user_id} onClick={()=>choose(report)}
              aria-pressed={selected===report.member.user_id}
              className={'rounded-xl border p-4 text-left '+(current?.member.user_id===report.member.user_id?'border-cyan-300 bg-cyan-300/10':'border-white/15 bg-black/15')}>
              <p className="font-semibold">{report.member.name}</p>
              <p className="mt-2 text-xs text-slate-300">WhatsApp confirmations: {data.sources.prospects?progress:'Unavailable'}</p>
              <p className="mt-1 text-xs text-slate-300">Posts awaiting review: {pending}</p>
              <p className="mt-1 text-xs text-slate-300">{report.plan?'Daily targets assigned':'Needs manager work plan'}</p>
            </button>
          })}
        </div>}
    </section>}

    {isManager&&data.reviewers.length>0&&<details className={panel}>
      <summary className="cursor-pointer font-bold">Supporting managers</summary>
      <p className="mt-2 text-sm text-slate-300">Authorize an active manager or assistant to review public outreach links for your region.</p>
      <ul className="mt-3 space-y-3">
        {data.reviewers.map(reviewer=><li key={reviewer.user_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>{reviewer.name} · {reviewer.position}</span>
          <button type="button" disabled={busy} className="rounded-lg border border-cyan-200/30 px-3 py-2 text-cyan-100"
            onClick={()=>void send({action:'set_reviewer',reviewerId:reviewer.user_id,authorized:!reviewer.authorized})}>
            {reviewer.authorized?'Revoke review access':'Authorize review'}
          </button>
        </li>)}
      </ul>
    </details>}

    {current&&<div className="space-y-5">
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{current.member.name} · Today's work</h2>
          <span className="text-xs text-slate-300">{current.plan?'Targets active':'Awaiting manager targets'}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-xs text-slate-300">Confirmed send actions</p>
            <p className="mt-2 text-2xl font-black">{data.sources.prospects?number(current.contacts.sendConfirmations):'Unavailable'} <span className="text-sm font-normal text-slate-400">/ {current.plan?.contactTarget??'unassigned'}</span></p>
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-xs text-slate-300">Response or conversion movement today</p>
            <p className="mt-2 text-2xl font-black">{data.sources.prospects?number(current.contacts.responsesOrConversions):'Unavailable'}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-xs text-slate-300">Confirmed File Folder sales</p>
            <p className="mt-2 text-2xl font-black">{data.sources.sales?number(current.confirmedFileFolders):"Unavailable"}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-xs text-slate-300">Assigned working hours</p>
            <p className="mt-2 text-2xl font-black">{current.plan?.workingHours??'—'}</p>
          </div>
        </div>
        {current.plan?.direction&&<p className="mt-4 whitespace-pre-wrap rounded-xl border border-cyan-200/25 p-3 text-sm"><strong className="block">Outreach direction</strong>{current.plan.direction}</p>}
        <h3 className="mt-5 text-base font-bold">Social publication progress</h3>
        {!visibleChannels.length&&<p className="mt-2 text-sm text-slate-400">Publication targets and recorded activity will appear here.</p>}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleChannels.map(channel=>{
            const item=current.posts[channel]
            return <div key={channel} className="rounded-xl border border-white/10 p-3">
              <div className="flex justify-between gap-2 text-sm"><strong>{label(channel)}</strong><span>{item.total} / {current.plan?item.target:'—'}</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-cyan-300" style={{width:(current.plan&&item.target>0?Math.min(100,item.total/item.target*100):0)+'%'}}/>
              </div>
              <p className="mt-2 text-xs text-slate-400">Provider: {data.sources.publishing?item.providerConfirmed:'Unavailable'} · Manager-reviewed: {item.managerReviewed} · Pending: {item.pending}</p>
            </div>
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/weave/market/prospects" className="rounded-lg border border-cyan-200/30 px-4 py-2 text-sm text-cyan-100">Open Prospect Market</Link>
          {isBridger&&<Link href="/bridger/bridge-ai" className="rounded-lg border border-cyan-200/30 px-4 py-2 text-sm text-cyan-100">Open Bridge AI</Link>}
          <Link href="/distribution-studio" className="rounded-lg border border-cyan-200/30 px-4 py-2 text-sm text-cyan-100">Open Social Distribution</Link>
          <Link href="/weave/lifestyles/support" className="rounded-lg border border-cyan-200/30 px-4 py-2 text-sm text-cyan-100">Request or provide work support</Link>
        </div>
      </section>

      {isManager&&<section className={panel}>
        <h2 className="text-xl font-bold">Assign daily outreach targets</h2>
        <p className="mt-2 text-sm text-slate-300">The prospect target is automatically two per working hour. Set social targets only for channels the employee can realistically publish to. Zero disables a platform target; it does not prevent optional posts.</p>
        <label className="mt-4 block text-sm font-semibold">Audience and outreach direction
          <textarea className={input+' mt-2'} maxLength={500} value={direction} onChange={e=>setDirection(e.target.value)}
            placeholder="Example: Meet local bakery owners on TikTok and Facebook. Ask how they handle online orders."/>
        </label>
        <div className="mt-4 max-w-xs">
          <label className="block text-sm font-semibold" htmlFor="hope-hours">Working hours today</label>
          <select id="hope-hours" className={input+' mt-2'} value={workingHours} onChange={e=>setWorkingHours(e.target.value)}>
            {Array.from({length:12},(_,i)=>i+1).map(value=><option key={value} value={value}>{value} hours · {value*2} contacts</option>)}
          </select>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {channels.map(channel=><label key={channel} className="block text-sm">
            <span className="font-semibold">{label(channel)} posts</span>
            <select className={input+' mt-2'} value={targets[channel]??0}
              onChange={e=>setTargets(prev=>({...prev,[channel]:Number(e.target.value)}))}>
              {[0,1,2,3,4,5].map(value=><option value={value} key={value}>{value}</option>)}
            </select>
          </label>)}
        </div>
        <button type="button" disabled={busy} onClick={()=>void save()}
          className="mt-5 min-h-11 rounded-lg bg-cyan-200 px-5 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">
          Save {current.member.name}'s daily targets
        </button>
      </section>}

      {!isReviewer&&<section className={panel}>
        <h2 className="text-xl font-bold">Social prospects and follow-ups</h2>
        <p className="mt-2 text-sm text-slate-300">
          {current.socialProspects.filter(item=>!item.completed_at&&item.follow_up_on<=data.day).length} due · {current.socialProspects.filter(item=>item.completed_at).length} completed today
        </p>
        {current.socialProspects.length===0&&<p className="mt-3 text-sm text-slate-400">No open social follow-ups.</p>}
        <div className="mt-3 space-y-3">
          {current.socialProspects.map(item=><article key={item.id} className="rounded-xl border border-white/10 p-3 text-sm">
            <h3 className="font-semibold">{item.prospect_name} · {label(item.channel_key)}</h3>
            <p className="mt-1 break-words">{item.business_need}</p>
            <p className="mt-1 break-words text-slate-300">{item.next_step} · {item.completed_at?'Completed':item.follow_up_on<data.day?'Overdue '+item.follow_up_on:item.follow_up_on}</p>
            {isBridger&&!item.completed_at&&<div className="mt-2 flex flex-wrap gap-3">
              <button type="button" className="text-cyan-200 underline" onClick={()=>setFollowUpEdit({id:item.id,nextStep:item.next_step,followUp:item.follow_up_on<data.day?data.day:item.follow_up_on})}>Update next step</button>
              <button type="button" className="text-cyan-200 underline disabled:opacity-40" disabled={busy}
                onClick={async()=>{if(await send({action:'update_social_followup',prospectId:item.id,complete:true}))setFollowUpEdit(null)}}>Mark complete</button>
            </div>}
            {followUpEdit?.id===item.id&&!item.completed_at&&<form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={async event=>{
              event.preventDefault()
              if(await send({action:'update_social_followup',prospectId:item.id,nextStep:followUpEdit.nextStep,followUp:followUpEdit.followUp}))setFollowUpEdit(null)
            }}>
              <label>Next agreed action<input className={input+' mt-1'} required maxLength={300} value={followUpEdit.nextStep}
                onChange={e=>setFollowUpEdit({...followUpEdit,nextStep:e.target.value})}/></label>
              <label>Follow-up date<input className={input+' mt-1'} required type="date" min={data.day} value={followUpEdit.followUp}
                onChange={e=>setFollowUpEdit({...followUpEdit,followUp:e.target.value})}/></label>
              <button className="justify-self-start text-cyan-200 underline disabled:opacity-40" disabled={busy}>Save follow-up</button>
            </form>}
          </article>)}
        </div>
        {isBridger&&<form className="mt-5 space-y-3 border-t border-white/15 pt-4" onSubmit={async event=>{
          event.preventDefault()
          if(await send({action:'record_social_prospect',...prospect}))setProspect(emptyProspect)
        }}>
          <h3 className="font-semibold">Record a qualified prospect</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Source platform<select className={input+' mt-1'} value={prospect.channel}
              onChange={e=>setProspect({...prospect,channel:e.target.value as HopeProspectChannel})}>
              {HOPE_PROSPECT_CHANNELS.map(channel=><option key={channel} value={channel}>{label(channel)}</option>)}
            </select></label>
            <label className="text-sm">Name or public handle<input className={input+' mt-1'} required maxLength={120} value={prospect.name}
              onChange={e=>setProspect({...prospect,name:e.target.value})}/></label>
            <label className="text-sm sm:col-span-2">Business need<textarea className={input+' mt-1'} required maxLength={500} value={prospect.need}
              onChange={e=>setProspect({...prospect,need:e.target.value})}/></label>
            <label className="text-sm">Agreed next step<input className={input+' mt-1'} required maxLength={300} value={prospect.nextStep}
              onChange={e=>setProspect({...prospect,nextStep:e.target.value})}/></label>
            <label className="text-sm">Follow-up date<input className={input+' mt-1'} required type="date" min={data.day} value={prospect.followUp}
              onChange={e=>setProspect({...prospect,followUp:e.target.value})}/></label>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input className="mt-1" type="checkbox" required checked={prospect.agreed} onChange={e=>setProspect({...prospect,agreed:e.target.checked})}/>
            The prospect agreed to this next step.
          </label>
          <button disabled={busy} className="min-h-11 rounded-lg bg-cyan-200 px-5 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">Save prospect</button>
        </form>}
      </section>}

      <details className={panel}>
        <summary className="cursor-pointer font-bold">Outreach platform directory</summary>
        <p className="mt-3 text-sm text-slate-300">Use WhatsApp Status for visibility and continue conversations when the person agrees to follow-up.</p>
        <ul className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          {channels.map(channel=>{
            const entry=HOPE_OUTREACH_CHANNELS[channel]
            return <li key={channel}><a href={'https://'+entry.hosts[0]} target="_blank" rel="noopener noreferrer" className="font-semibold text-cyan-200 underline">{entry.name}</a>
              <p className="text-slate-300">{entry.guide}</p></li>
          })}
        </ul>
      </details>

      {isBridger&&<section className={panel}>
        <h2 className="text-xl font-bold">Submit an external social publication</h2>
        <p className="mt-2 text-sm text-slate-300">Publish from your own authorized account first. Submit the public post URL for your manager to inspect; adding a link does not prove that the platform accepted a publication.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[170px_1fr]">
          <label className="text-sm">Channel
            <select className={input+' mt-2'} value={postChannel} onChange={e=>setPostChannel(e.target.value as Channel)}>
              {channels.map(channel=><option value={channel} key={channel}>{label(channel)}</option>)}
            </select>
          </label>
          <label className="text-sm">Public post URL
            <input className={input+' mt-2'} type="url" value={postUrl} onChange={e=>setPostUrl(e.target.value)}
              placeholder="https://..." maxLength={1500}/>
          </label>
        </div>
        <button type="button" disabled={busy||!postUrl.trim()} onClick={()=>void submit()}
          className="mt-4 min-h-11 rounded-lg bg-cyan-200 px-5 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">Submit link for review</button>
      </section>}

      <section className={panel}>
        <h2 className="text-xl font-bold">Social evidence · {current.evidence.length}</h2>
        <p className="mt-2 text-sm text-slate-400">Pending links stay here for review after the work date. Provider-confirmed deliveries appear in the publication totals.</p>
        {!current.evidence.length?<p className="mt-4 text-sm text-slate-300">No current publication evidence.</p>:
          <div className="mt-4 space-y-3">{current.evidence.map(evidence=><article key={evidence.id} className="rounded-xl border border-white/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm">{label(evidence.channel_key)} · {evidence.work_date}</strong>
              <span className="text-xs text-amber-100">{evidence.status==='approved'?'Manager reviewed':evidence.status==='rejected'?'Returned for correction':'Awaiting review'}</span>
            </div>
            <a href={evidence.post_url} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-sm text-cyan-200 underline">
              Open public post for inspection
            </a>
            {evidence.review_note&&<p className="mt-2 text-xs text-slate-300">Manager note: {evidence.review_note}</p>}
            {!isBridger&&evidence.status==='pending'&&<div className="mt-3 space-y-2">
              <label className="block text-xs text-slate-200">Review note
                <input className={input+' mt-1'} maxLength={500} value={notes[evidence.id]||''}
                  onChange={e=>setNotes(previous=>({...previous,[evidence.id]:e.target.value}))}
                  placeholder="State what was checked or why the link was returned"/>
              </label>
              <div className="flex flex-wrap gap-2">
                <button disabled={busy||(notes[evidence.id]||'').trim().length<8} type="button"
                  onClick={()=>void review(evidence,'approved')}
                  className="rounded-lg border border-emerald-300/40 px-4 py-2 text-sm text-emerald-100 disabled:opacity-40">Approve reviewed link</button>
                <button disabled={busy||(notes[evidence.id]||'').trim().length<8} type="button"
                  onClick={()=>void review(evidence,'rejected')}
                  className="rounded-lg border border-amber-300/40 px-4 py-2 text-sm text-amber-100 disabled:opacity-40">Return for correction</button>
              </div>
            </div>}
          </article>)}</div>}
      </section>
    </div>}
    <footer className="border-t border-white/10 pt-4 text-xs leading-6 text-slate-400">
      Daily results reflect current server records; not every social channel has completed provider integration. Publication evidence, contact confirmations, responses and verified sales must remain distinct. Regional Managers supervise work but do not verify Client payments or override Administrations appointment authority.
    </footer>
  </main>
}
