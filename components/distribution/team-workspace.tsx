'use client'
import Link from 'next/link'
import { useCallback,useEffect,useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { visiblePoll } from '@/lib/visible-poll'

type UpdateKind='message'|'plan'|'progress'|'handoff'
type Team={
  managerId:string
  memberPosition:'manager'|'assistant'
  members:{id:string;name:string;role:string;position:string}[]
  updates:{id:string;kind:UpdateKind;content:string;created_at:string;author_name:string;author_position:string}[]
}
const TOOLS=[
  {href:'/distribution-studio',label:'Distribution Studio',note:'Prepare, publish and monitor real company campaigns'},
  {href:'/referrals',label:'Referral Movement',note:'Use attributed links and inspect verified Agent or Bridger registrations'},
  {href:'/video-ad-studio',label:'Video Ad Studio',note:'Form shareable campaign video for the distribution channels'},
  {href:'/weave/carrier',label:'Carrier',note:'Distribute WEAVE movement through authorized public links'},
  {href:'/communications',label:'Direct Communication',note:'Reach permitted company contacts through WEAVE communication'},
  {href:'/event',label:'Burning River',note:'Join the Company Loop 1 event ground'},
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
    const stop=visiblePoll(signal=>load(signal),15000)
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
  return <section className="mt-6 space-y-5 border-t border-cyan-300/15 pt-6" data-distribution-team-workspace="verified-team">
    <header>
      <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Distribution Team · Working Instruments</p>
      <h2 className="mt-2 text-xl font-black text-white">Operate and communicate in one team</h2>
      <p className="mt-2 text-xs leading-6 text-slate-300">Use WEAVE's existing instruments for actual distribution. Team plans, handoffs and progress reports are shared with your verified Manager and appointed assistants. Administration can inspect the reports but does not write or direct this private operational conversation.</p>
    </header>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {TOOLS.map(tool=><Link key={tool.href} href={tool.href} className="border border-white/10 bg-white/[.025] p-4 hover:border-cyan-300/30">
        <p className="text-xs font-black text-cyan-200">{tool.label} →</p>
        <p className="mt-2 text-[11px] leading-5 text-slate-400">{tool.note}</p>
      </Link>)}
    </div>
    {loading&&!team&&<p className="text-xs text-slate-400">Opening verified team communication…</p>}
    {error&&<p role="alert" className="border border-rose-300/20 p-3 text-xs text-rose-200">{error}</p>}
    {team&&<div className="border border-cyan-200/15 p-4 sm:p-5" data-team-communication="active">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-base font-black text-white">Team conversation and work log</h3>
        <p className="mt-1 text-xs text-slate-400">{team.members.length} verified team members · {team.memberPosition==='manager'?'Lead Manager':'Assistant Manager'} access</p></div>
        <Button type="button" variant="outline" size="sm" onClick={()=>void load()}>Refresh updates</Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-emerald-100">{team.members.map(member=><span key={member.id} className="border border-emerald-300/15 px-3 py-2">{member.name} · {member.position}</span>)}</div>
      <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto border-y border-white/10 py-3" aria-label="Team messages and activity">
        {team.updates.map(update=><article key={update.id} className="bg-white/[.035] p-3">
          <div className="flex flex-wrap justify-between gap-2 text-[10px] text-sky-200">
            <strong>{update.author_name} · {update.author_position} · {update.kind.toUpperCase()}</strong>
            <time dateTime={update.created_at}>{new Date(update.created_at).toLocaleString('en-NG')}</time>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-slate-100">{update.content}</p>
        </article>)}
        {!team.updates.length&&<p className="text-xs text-slate-400">No reports yet. Post the first plan, field update or handoff to begin team coordination.</p>}
      </div>
      <label className="mt-4 block text-xs font-semibold text-white" htmlFor="distribution-update-kind">Update category</label>
      <select id="distribution-update-kind" value={kind} onChange={e=>setKind(e.target.value as UpdateKind)} className="mt-2 min-h-11 w-full border border-white/20 bg-slate-950 p-2 text-sm text-white">
        <option value="message">Team message</option><option value="plan">Work plan</option><option value="progress">Progress report</option><option value="handoff">Handoff / next action</option>
      </select>
      <label htmlFor="distribution-update-text" className="mt-4 block text-xs font-semibold text-white">Message to your team</label>
      <textarea id="distribution-update-text" value={content} maxLength={2000} rows={3}
        onChange={e=>setContent(e.target.value)} placeholder="State what was done, what is verified and what needs a team response."
        className="mt-2 w-full border border-white/20 bg-slate-950 p-3 text-sm text-white"/>
      <Button type="button" onClick={post} disabled={sending||content.trim().length<2} className="mt-3 bg-cyan-700 text-white hover:bg-cyan-600">{sending?'Sending…':'Post to team'}</Button>
      <p className="mt-3 text-[11px] text-slate-500">Messages are stored with their actual author and timestamp. Posting a report does not manufacture a sale, verified referral, or payroll entitlement.</p>
    </div>}
  </section>
}
