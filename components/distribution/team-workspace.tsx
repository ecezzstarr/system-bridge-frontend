'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {MessageSquareText,RefreshCw,Send,Users} from 'lucide-react'
import {useAuth} from '@/lib/auth-provider'
import {visiblePoll} from '@/lib/visible-poll'
import {DistributionTeamTaskBoard} from '@/components/distribution/team-task-board'

type UpdateKind='message'|'plan'|'progress'|'handoff'
type Team={
  managerId:string
  memberPosition:'manager'|'assistant'
  members:{id:string;name:string;role:string;position:string}[]
  updates:{id:string;kind:UpdateKind;content:string;created_at:string;author_name:string;author_position:string}[]
}
const TOOLS=[
  {href:'/manager/dashboard',label:'Food Distribution Desk',note:'Record completed food handoffs and monitor the 200 verified monthly target'},
  {href:'/agility',label:'Agility Food Products',note:'Coordinate Agility stock, Agent orders and customer sales'},
  {href:'/weave/lifestyles/food',label:'Farm to Family',note:'Coordinate produce distribution to households and businesses'},
  {href:'/weave/carrier',label:'Carrier Food Door',note:'Share the approved public food-order entrance'},
  {href:'/weave/lifestyles/food-preparation',label:'Food Preparation & Dispatch',note:'Coordinate paid food orders, packaging and dispatch'},
]
export function DistributionTeamWorkspace(){
  const {user,token,isInitialized}=useAuth()
  const [team,setTeam]=useState<Team|null>(null)
  const [error,setError]=useState('')
  const [kind,setKind]=useState<UpdateKind>('message')
  const [content,setContent]=useState('')
  const [sending,setSending]=useState(false)
  const [loading,setLoading]=useState(true)
  const load=useCallback(async(signal?:AbortSignal)=>{
    if(!token)return
    try{
      const response=await fetch('/api/manager/team',{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Team unavailable')
      if(!signal?.aborted){setTeam(data.team);setError('')}
    }catch(err){if(!signal?.aborted)setError(err instanceof Error?err.message:'Team unavailable')}
    finally{if(!signal?.aborted)setLoading(false)}
  },[token])
  useEffect(()=>{
    if(!isInitialized||!user||!['agent','bridger'].includes(user.role||''))return
    const stop=visiblePoll(signal=>load(signal),8000)
    return ()=>stop()
  },[isInitialized,user?.id,user?.role,load])
  const post=async()=>{
    if(!token||!content.trim()||sending)return
    setSending(true);setError('')
    try{
      const response=await fetch('/api/manager/team',{method:'POST',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({kind,content:content.trim()})})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Unable to send')
      setContent('')
      await load()
    }catch(err){setError(err instanceof Error?err.message:'Unable to send')}
    finally{setSending(false)}
  }
  return <section className="mt-5 space-y-5 border-t border-cyan-300/15 pt-5" data-food-distribution-team-workspace="verified-team">
    {loading&&!team&&<p className="text-xs text-slate-400">Opening verified team communication…</p>}
    {error&&<p role="alert" className="rounded-xl border border-rose-300/20 p-3 text-xs text-rose-200">{error}</p>}
    {team&&<div className="space-y-5" data-team-communication="active">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-bold text-emerald-200"><Users className="h-4 w-4"/>{team.members.length} approved team members · {team.memberPosition==='manager'?'Lead Manager':'Assistant Manager'}</p>
        <button type="button" onClick={()=>void load()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs font-bold text-cyan-100"><RefreshCw className="h-4 w-4"/> Refresh team</button>
      </div>
      <div className="flex flex-wrap gap-2">{team.members.map(member=><span key={member.id} className="rounded-full border border-emerald-300/20 bg-emerald-200/[.045] px-3 py-2 text-[11px] text-emerald-100">{member.name} · {member.position==='manager'?'Lead':'Assistant'}</span>)}</div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(15rem,.6fr)]">
        <section className="min-w-0 rounded-2xl border border-cyan-200/15 bg-slate-950/45 p-4 sm:p-5" aria-label="Food distribution team conversation">
          <h3 className="flex items-center gap-2 text-base font-black"><MessageSquareText className="h-5 w-5 text-cyan-200"/> Team conversation</h3>
          <p className="mt-2 text-xs leading-6 text-slate-300">Coordinate food-product availability, consumer and business orders, delivery handoffs and shortages with the verified lead and assistants. All team members can respond through this same workspace.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[9rem_1fr]">
            <label className="text-xs font-semibold text-white" htmlFor="distribution-update-kind">Message category
              <select id="distribution-update-kind" value={kind} onChange={event=>setKind(event.target.value as UpdateKind)} className="mt-2 min-h-11 w-full rounded-lg border border-white/20 bg-slate-950 p-2 text-xs text-white">
                <option value="message">Team message</option><option value="plan">Work plan</option><option value="progress">Progress report</option><option value="handoff">Handoff / next action</option>
              </select>
            </label>
            <label htmlFor="distribution-update-text" className="text-xs font-semibold text-white">Message to your team
              <textarea id="distribution-update-text" value={content} maxLength={2000} rows={3}
                onChange={event=>setContent(event.target.value)} placeholder="Which food products are available, which consumer/business handoff needs coordination, or which delivery needs a follow-up?"
                className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-sm font-normal text-white"/>
            </label>
          </div>
          <button type="button" onClick={()=>void post()} disabled={sending||content.trim().length<2} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-5 text-xs font-black text-slate-950 disabled:opacity-40"><Send className="h-4 w-4"/>{sending?'Sending…':'Send to team'}</button>
          <div className="mt-5 max-h-[24rem] space-y-2 overflow-y-auto border-t border-white/10 pt-4" aria-label="Team messages and activity">
            {team.updates.map(update=><article key={update.id} className="rounded-xl border border-white/10 bg-white/[.035] p-3">
              <div className="flex flex-wrap justify-between gap-2 text-[11px] text-cyan-200">
                <strong>{update.author_name} · {update.author_position} · {update.kind.toUpperCase()}</strong>
                <time dateTime={update.created_at}>{new Date(update.created_at).toLocaleString('en-NG')}</time>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-slate-100">{update.content}</p>
            </article>)}
            {!team.updates.length&&<p className="text-xs text-slate-400">No reports yet. Send the first team message or daily work plan.</p>}
          </div>
        </section>
        <aside className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 sm:p-5">
          <h3 className="text-sm font-black">Your distribution instruments</h3>
          <p className="mt-2 text-xs leading-5 text-slate-400">Tools for carrying out the plans and assignments discussed by your team.</p>
          <nav className="mt-4 space-y-2" aria-label="Distribution work tools">
            {TOOLS.map(tool=><Link key={tool.href} href={tool.href} className="block rounded-xl border border-white/10 p-3 hover:border-cyan-200/40">
              <p className="text-xs font-black text-cyan-100">{tool.label} →</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-400">{tool.note}</p>
            </Link>)}
          </nav>
        </aside>
      </div>
      <div className="rounded-2xl border border-amber-200/15 bg-slate-950/45 p-4 sm:p-5">
        <DistributionTeamTaskBoard members={team.members}/>
      </div>
      <p className="text-[11px] leading-5 text-slate-400">Team messages are author-attributed and notify other verified members. Messages do not count as completed food distributions or automatic payroll entries.</p>
    </div>}
  </section>
}
