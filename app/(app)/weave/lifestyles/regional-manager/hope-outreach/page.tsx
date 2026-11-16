'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'

const channels=['tiktok','facebook','instagram','x','youtube','linkedin'] as const
type Channel=typeof channels[number]
type Targets=Record<Channel,number>
type Evidence={id:string;channel_key:Channel;post_url:string;status:'pending'|'approved'|'rejected';review_note:string|null;created_at:string;reviewed_at:string|null}
type Report={
  member:{user_id:string;name:string;role:string;position:string;level:string}
  plan:{workingHours:number;contactTarget:number;postTargets:Targets;updatedAt:string}|null
  contacts:{sendConfirmations:number;responsesOrConversions:number}
  posts:Record<Channel,{target:number;providerConfirmed:number;managerReviewed:number;pending:number;total:number}>
  evidence:Evidence[]
}
type Data={
  success:boolean;mode:'manager'|'member';managerId:string;day:string;reports:Report[]
  sources:{prospects:boolean;publishing:boolean};note:string
}
const blank=():Targets=>({tiktok:1,facebook:1,instagram:1,x:1,youtube:0,linkedin:0})
const label=(key:string)=>({tiktok:'TikTok',facebook:'Facebook',instagram:'Instagram',x:'X',youtube:'YouTube',linkedin:'LinkedIn'} as Record<string,string>)[key]||key
const number=(value:number)=>Number(value||0).toLocaleString('en-NG')
const input='w-full min-h-11 rounded-lg border border-white/20 bg-[#0d1723] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300'
const panel='rounded-2xl border border-white/15 bg-[#111d2b] p-4 sm:p-5'

export default function RegionalHopeOutreachPage(){
  const {token,isInitialized}=useAuth()
  const [data,setData]=useState<Data|null>(null)
  const [selected,setSelected]=useState('')
  const [workingHours,setWorkingHours]=useState('6')
  const [targets,setTargets]=useState<Targets>(blank)
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
      workingHours:Number(workingHours),postTargets:targets})
  }
  const submit=async()=>{
    if(await send({action:'submit_post',channel:postChannel,url:postUrl}))setPostUrl('')
  }
  const review=async(evidence:Evidence,status:'approved'|'rejected')=>{
    if(await send({action:'review_post',evidenceId:evidence.id,status,note:notes[evidence.id]||''}))
      setNotes(previous=>({...previous,[evidence.id]:''}))
  }
  if(!isInitialized||loading)return <main className="mx-auto max-w-6xl p-6 text-slate-100">Opening regional Hope outreach records…</main>
  if(!data)return <main className="mx-auto max-w-3xl space-y-4 p-6 text-slate-100">
    <Link href="/weave/lifestyles/regional-manager/workspace" className="text-cyan-200">Regional Manager Workspace</Link>
    <p role="alert" className="text-rose-200">{error||'No authorized Hope regional assignment found'}</p>
    <button onClick={()=>void load()} className="rounded-lg border border-cyan-300/30 px-4 py-2">Retry</button>
  </main>
  const isManager=data.mode==='manager'
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 text-slate-100 sm:px-6">
    <header className="space-y-3 border-b border-white/15 pb-6">
      <Link href="/weave/lifestyles/regional-manager/workspace" className="text-sm font-semibold text-cyan-200">← Regional Daily Workspace</Link>
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-200">Company of Time · Hope · Regional supervision</p>
      <h1 className="text-3xl font-black sm:text-4xl">{isManager?'Regional Hope · Daily Outreach Control':'My Hope · Daily Outreach'}</h1>
      <p className="max-w-3xl text-sm leading-7 text-slate-300">
        {isManager?'Manage each assigned Bridger’s daily working hours, WhatsApp contact target and social publications. Review real evidence, respond to obstacles and keep one traceable record.':
          'Follow your assigned prospect target, publish through authorized channels and submit public post links for your Regional Manager to review.'}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full border border-amber-200/25 px-3 py-1 text-amber-100">Nigeria work date: {data.day}</span>
        <button onClick={()=>void load()} className="rounded-lg border border-white/20 px-4 py-2" disabled={busy}>Refresh records</button>
      </div>
    </header>
    {error&&<p role="alert" className="rounded-lg border border-rose-300/25 p-3 text-sm text-rose-200">Previous records are shown. Refresh failed: {error}</p>}
    {message&&<p role="status" className="rounded-lg border border-cyan-300/25 p-3 text-sm text-cyan-100">{message}</p>}
    {(!data.sources.prospects||!data.sources.publishing)&&<p role="alert" className="rounded-lg border border-amber-300/25 p-3 text-sm text-amber-100">
      Some source records are unavailable. Missing data must not be treated as zero employee activity.
    </p>}
    <p className="text-sm leading-6 text-slate-400">Two contacts per working hour is the company standard. WhatsApp contacts in this board are Bridger-confirmed sends, not independent WhatsApp delivery receipts. A social post is counted only with a recorded provider receipt or a manager-reviewed public link; manager review is not provider verification.</p>

    {isManager&&<section className={panel}>
      <h2 className="text-xl font-bold">Your assigned Hope workforce · {data.reports.length}</h2>
      <p className="mt-2 text-sm text-slate-400">Select a Bridger to set daily targets and inspect activity. Today’s targets repeat on later days while the same manager remains appointed, unless changed.</p>
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

    {current&&<div className="space-y-5">
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{current.member.name} · Today's work</h2>
          <span className="text-xs text-slate-300">{current.plan?'Targets active':'Awaiting manager targets'}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-xs text-slate-300">Confirmed send actions</p>
            <p className="mt-2 text-2xl font-black">{data.sources.prospects?number(current.contacts.sendConfirmations):'Unavailable'} <span className="text-sm font-normal text-slate-400">/ {current.plan?.contactTarget??'unassigned'}</span></p>
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-xs text-slate-300">Response or conversion movement today</p>
            <p className="mt-2 text-2xl font-black">{data.sources.prospects?number(current.contacts.responsesOrConversions):'Unavailable'}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-xs text-slate-300">Assigned working hours</p>
            <p className="mt-2 text-2xl font-black">{current.plan?.workingHours??'—'}</p>
          </div>
        </div>
        <h3 className="mt-5 text-base font-bold">Social publication progress</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map(channel=>{
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
          <Link href="/distribution-studio" className="rounded-lg border border-cyan-200/30 px-4 py-2 text-sm text-cyan-100">Open Social Distribution</Link>
          <Link href="/weave/lifestyles/support" className="rounded-lg border border-cyan-200/30 px-4 py-2 text-sm text-cyan-100">Request or provide work support</Link>
        </div>
      </section>

      {isManager&&<section className={panel}>
        <h2 className="text-xl font-bold">Assign daily outreach targets</h2>
        <p className="mt-2 text-sm text-slate-300">The prospect target is automatically two per working hour. Set social targets only for channels the employee can realistically publish to. Zero disables a platform target; it does not prevent optional posts.</p>
        <div className="mt-4 max-w-xs">
          <label className="block text-sm font-semibold" htmlFor="hope-hours">Working hours today</label>
          <select id="hope-hours" className={input+' mt-2'} value={workingHours} onChange={e=>setWorkingHours(e.target.value)}>
            {Array.from({length:12},(_,i)=>i+1).map(value=><option key={value} value={value}>{value} hours · {value*2} contacts</option>)}
          </select>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {channels.map(channel=><label key={channel} className="block text-sm">
            <span className="font-semibold">{label(channel)} posts</span>
            <select className={input+' mt-2'} value={targets[channel]}
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

      {!isManager&&<section className={panel}>
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
        <p className="mt-2 text-sm text-slate-400">The Regional Manager reviews external links; provider-confirmed deliveries appear separately in the counts above.</p>
        {!current.evidence.length?<p className="mt-4 text-sm text-slate-300">No external post links submitted today.</p>:
          <div className="mt-4 space-y-3">{current.evidence.map(evidence=><article key={evidence.id} className="rounded-xl border border-white/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm">{label(evidence.channel_key)}</strong>
              <span className="text-xs text-amber-100">{evidence.status==='approved'?'Manager reviewed':evidence.status==='rejected'?'Returned for correction':'Awaiting review'}</span>
            </div>
            <a href={evidence.post_url} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-sm text-cyan-200 underline">
              Open public post for inspection
            </a>
            {evidence.review_note&&<p className="mt-2 text-xs text-slate-300">Manager note: {evidence.review_note}</p>}
            {isManager&&evidence.status==='pending'&&<div className="mt-3 space-y-2">
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
