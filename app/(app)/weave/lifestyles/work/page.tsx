'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {ArrowRight,Bell,BriefcaseBusiness,CheckCircle2,ClipboardList,MessageSquareText,RefreshCw,ShieldCheck,Users} from 'lucide-react'
import {DistributionTeamWorkspace} from '@/components/distribution/team-workspace'
import {FoodTeamCommunications} from '@/components/food-preparation/food-team-communications'

type WorkLink={label:string;href:string;purpose:string}
type WorkPosition={id:string;title:string;department:string;standing:string;description:string;tools:WorkLink[]}
type JobGuidance={steps:string[];start:string;talk:string;group:string}
const guidance:Record<string,JobGuidance>={
  distribution_manager:{
    group:'Distribution Team · Lead',start:'/manager/dashboard',talk:'#team-communication',
    steps:['Set the team distribution plan and assign an accountable owner for each activity.',
      'Coordinate your two approved Assistant Distribution Managers and the verified referral movement.',
      'Review submitted work, ask for corrections when needed and verify recorded outcomes.']},
  distribution_assistant:{
    group:'Distribution Team · Assistant',start:'/weave/lifestyles/distribution-assistant',talk:'#team-communication',
    steps:['Read the assignments issued by your verified lead Manager.',
      'Carry out distribution and referral activities using the authorized company instruments.',
      'Report progress with evidence, submit completed work and respond to the lead’s review.']},
  food_preparation:{
    group:'Stability · Food Preparation',start:'/weave/lifestyles/food-preparation',talk:'#food-team-communication',
    steps:['Open verified food orders and your own assigned preparation work.',
      'Prepare, package, and record the actual stage and handoff for each authorized order.',
      'Follow the approved Stability Lead’s allocation; Administration handles verification and financial authorization.']},
}
const guidanceFor=(position:WorkPosition):JobGuidance=>guidance[position.id]||
  {group:'Company Guidance',start:position.tools[0]?.href||'/weave/lifestyles',talk:position.tools[0]?.href||'/communications',
    steps:['Read your authorized department inbox and identify the requests assigned to you.',
      'Reply with factual progress through the department’s approved work system.',
      'Escalate decisions outside your delegated duties to Administration.']}
export default function CompanyWorkspaces(){
  const {user,token,isInitialized}=useAuth()
  const [positions,setPositions]=useState<WorkPosition[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const load=useCallback(async()=>{
    if(!token||!user){setLoading(false);return}
    setLoading(true)
    try{
      const res=await fetch('/api/employment/workspace',
        {headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Employment workspace unavailable')
      setPositions(body.positions||[]);setMessage(body.message||'');setError('')
    }catch(cause){setError(cause instanceof Error?cause.message:'Unable to load jobs')}
    finally{setLoading(false)}
  },[token,user?.id])
  useEffect(()=>{void load()},[load])
  if(!isInitialized)return <main className="p-6 text-slate-300">Opening company workspace…</main>
  if(!['agent','bridger'].includes(user?.role||''))return <main className="p-6 text-slate-200">Active Agent or Bridger identity required.</main>
  const distribution=positions.some(position=>['distribution_manager','distribution_assistant'].includes(position.id))
  const foodTeam=positions.some(position=>position.id==='food_preparation')
  return <main className="weave-operating-environment mx-auto min-h-[72vh] max-w-7xl space-y-6 px-3 py-6 text-white sm:px-6 sm:py-9" data-verified-employment-workspace="true">
    <header className="relative overflow-hidden rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-[#08273a] via-[#091521] to-[#0b111b] p-5 sm:p-8">
      <div className="pointer-events-none absolute -right-14 -top-24 h-72 w-72 rounded-full border-[25px] border-cyan-300/[.055]"/>
      <Link href="/weave/lifestyles" className="relative text-xs font-semibold text-cyan-200">← Lifestyle</Link>
      <div className="relative mt-5 flex items-center gap-3 text-amber-200"><BriefcaseBusiness className="h-5 w-5"/><p className="text-[10px] font-black uppercase tracking-widest">Company employment · Staff operation</p></div>
      <h1 className="relative mt-3 text-3xl font-black sm:text-4xl">My Staff Workspace</h1>
      <p className="relative mt-3 max-w-3xl text-sm leading-6 text-slate-200">Your verified jobs, today’s responsibilities, working systems and team communications in one place. Use the role-specific instructions to begin work, report what was done and follow up with your colleagues.</p>
      <div className="relative mt-6 flex flex-wrap gap-2">
        <a href="#my-jobs" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-black text-slate-950"><ClipboardList className="h-4 w-4"/> My duties</a>
        {foodTeam&&<a href="#food-team-communication" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-xs font-bold text-white"><Users className="h-4 w-4"/> Food team messages</a>}
        {distribution&&<a href="#team-communication" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-xs font-bold text-white"><Users className="h-4 w-4"/> Team & assignments</a>}
        <Link href="/notifications" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-xs font-bold text-white"><Bell className="h-4 w-4"/> Messages & alerts</Link>
      </div>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-200"><ShieldCheck className="h-4 w-4"/> {positions.length} authorized position{positions.length===1?'':'s'}</div>
      <button onClick={()=>void load()} type="button" disabled={loading}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"><RefreshCw className="h-4 w-4"/>{loading?'Checking positions…':'Refresh employment'}</button>
    </div>
    {error&&<p role="alert" className="rounded-xl border border-rose-300/25 p-3 text-sm text-rose-200">{error}</p>}
    {message&&<p role="status" className="text-xs leading-6 text-slate-400">{message}</p>}
    <section id="my-jobs" className="scroll-mt-20">
      <div className="mb-4 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-cyan-200"/><h2 className="text-xl font-black">Your approved positions & responsibilities</h2></div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {positions.map(position=>{
          const guide=guidanceFor(position)
          return <article key={position.id} className="min-w-0 overflow-hidden rounded-2xl border border-cyan-200/15 bg-[#0a1621]/85" data-approved-job={position.id}>
            <div className="border-b border-white/10 bg-cyan-300/[.045] p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-wider text-cyan-200">{position.department}</p>
              <h3 className="mt-2 text-xl font-black">{position.title}</h3>
              <p className="mt-2 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[11px] font-bold text-emerald-100">{position.standing}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{position.description}</p>
            </div>
            <div className="p-5 sm:p-6">
              <h4 className="flex items-center gap-2 text-sm font-black"><ClipboardList className="h-4 w-4 text-amber-200"/> What to do at work</h4>
              <ol className="mt-4 space-y-3">
                {guide.steps.map((step,index)=><li key={index} className="flex items-start gap-3 text-xs leading-6 text-slate-200">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-200/30 bg-cyan-200/10 text-[11px] font-bold text-cyan-100">{index+1}</span><span>{step}</span>
                </li>)}
              </ol>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={guide.start} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-black text-slate-950">Start job work <ArrowRight className="h-4 w-4"/></Link>
                <Link href={guide.talk} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-xs font-bold text-slate-100"><MessageSquareText className="h-4 w-4"/> {guide.talk.startsWith('#')?'Talk to my team':'Open work messages'}</Link>
              </div>
              <details className="mt-5 rounded-xl border border-white/10 p-4">
                <summary className="cursor-pointer text-xs font-black text-white">All working instruments ({position.tools.length})</summary>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {position.tools.map(tool=><Link key={tool.href} href={tool.href} className="group min-w-0 rounded-xl border border-white/10 bg-white/[.025] p-3 transition hover:border-cyan-200/40">
                    <div className="flex items-center justify-between gap-2 text-xs font-black text-white"><span>{tool.label}</span><ArrowRight className="h-4 w-4 shrink-0 text-cyan-200"/></div>
                    <p className="mt-2 text-[11px] leading-5 text-slate-400">{tool.purpose}</p>
                  </Link>)}
                </div>
              </details>
            </div>
          </article>
        })}
      </div>
    </section>
    {distribution&&<section id="team-communication" className="scroll-mt-20 rounded-2xl border border-cyan-300/20 bg-[#07131e]/70 p-4 sm:p-6" aria-label="Your verified distribution team">
      <div className="mb-2 flex items-center gap-2 text-cyan-100"><Users className="h-5 w-5"/><h2 className="text-lg font-black">Team communication & assignments</h2></div>
      <p className="text-xs leading-6 text-slate-300">Speak directly with your verified team, check instructions, post real progress, and resolve handoffs without leaving the staff workspace.</p>
      <DistributionTeamWorkspace/>
    </section>}
    {foodTeam&&<FoodTeamCommunications/>}
    {!loading&&!positions.length&&<section className="rounded-2xl border border-white/10 p-6 text-sm text-slate-300">
      <p>No approved employment workspace is available for this account yet. Your normal Agent or Bridger work remains separate.</p>
      <Link href="/weave/lifestyles" className="mt-4 inline-flex min-h-11 items-center text-sm font-black text-amber-200">View company positions and applications →</Link>
    </section>}
    <footer className="border-t border-white/10 pt-5 text-xs leading-6 text-slate-500">Job controls remain role-restricted. Administration retains hiring verification and financial authority; staff lead their assigned operations and record real outcomes.</footer>
  </main>
}
