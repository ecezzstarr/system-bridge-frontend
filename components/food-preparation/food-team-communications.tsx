'use client'
import {useCallback,useEffect,useState} from 'react'
import {MessageSquareText,RefreshCw,Send,Users} from 'lucide-react'
import {useAuth} from '@/lib/auth-provider'
import {visiblePoll} from '@/lib/visible-poll'

type Kind='message'|'plan'|'progress'|'handoff'
type Message={id:string;kind:Kind;content:string;created_at:string;author_id:string;author_name:string;author_position:string}
type Staff={id:string;name:string;position:string}
export function FoodTeamCommunications(){
  const {token,user}=useAuth()
  const [messages,setMessages]=useState<Message[]>([])
  const [staff,setStaff]=useState<Staff[]>([])
  const [content,setContent]=useState('')
  const [kind,setKind]=useState<Kind>('message')
  const [sending,setSending]=useState(false)
  const [error,setError]=useState('')
  const [loaded,setLoaded]=useState(false)
  const load=useCallback(async(signal?:AbortSignal)=>{
    if(!token)return
    try{
      const res=await fetch('/api/weave/lifestyles/food-preparation/team',
        {headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal})
      const data=await res.json()
      if(!res.ok)throw new Error(data.error||'Food team communications unavailable')
      if(!signal?.aborted){setMessages(data.messages||[]);setStaff(data.staff||[]);setLoaded(true);setError('')}
    }catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'Unable to load team')}
  },[token])
  useEffect(()=>visiblePoll(signal=>load(signal),10000),[load])
  const send=async()=>{
    if(!token||sending||content.trim().length<2)return
    setSending(true);setError('')
    try{
      const res=await fetch('/api/weave/lifestyles/food-preparation/team',{method:'POST',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({kind,content:content.trim()})})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Message was not sent')
      setContent('')
      await load()
    }catch(e){setError(e instanceof Error?e.message:'Message was not sent')}
    finally{setSending(false)}
  }
  return <section id="food-team-communication" className="scroll-mt-20 rounded-2xl border border-cyan-200/20 bg-[#07131e] p-4 text-white sm:p-6" data-weave-food-team-chat="approved">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-200"><Users className="h-4 w-4"/> Stability · Private food team</p>
      <h2 className="mt-2 text-xl font-black">Preparation team conversation</h2>
      <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-300">The verified Food Preparation Manager and two approved Assistants share real work plans, shortages, progress and order handoffs here. Preparation stages still belong in the actual order desk.</p></div>
      <button type="button" onClick={()=>void load()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs font-bold"><RefreshCw className="h-4 w-4"/> Refresh</button>
    </header>
    <div className="mt-4 flex flex-wrap gap-2">{staff.map(member=><span key={member.id} className="rounded-full border border-cyan-200/20 bg-cyan-200/[.065] px-3 py-2 text-[11px] text-cyan-100">{member.name} · {member.position==='manager'?'Lead Manager':'Assistant'}</span>)}</div>
    {error&&<p role="alert" className="mt-4 rounded-lg border border-rose-300/20 p-3 text-xs text-rose-200">{error}</p>}
    <div className="mt-5 max-h-80 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/60 p-3" aria-label="Food team messages">
      {messages.map(message=><article key={message.id} className={`rounded-xl border p-3 ${message.author_id===user?.id?'border-cyan-300/20 bg-cyan-300/[.075]':'border-white/10 bg-white/[.025]'}`}>
        <div className="flex flex-wrap justify-between gap-2 text-[11px] text-cyan-100"><strong>{message.author_name} · {message.author_position} · {message.kind}</strong><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString('en-NG')}</time></div>
        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-slate-100">{message.content}</p>
      </article>)}
      {loaded&&!messages.length&&<p className="p-4 text-xs text-slate-400">No team conversation yet. Post a plan or ask for an update.</p>}
      {!loaded&&<p className="p-4 text-xs text-slate-400">Opening approved team conversation…</p>}
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-[9rem_1fr]">
      <label className="text-xs font-bold text-white">Message type<select value={kind} onChange={e=>setKind(e.target.value as Kind)} className="mt-2 min-h-11 w-full rounded-lg border border-white/20 bg-slate-950 p-2 text-sm text-white">
        <option value="message">Team message</option><option value="plan">Work plan</option><option value="progress">Progress</option><option value="handoff">Handoff / issue</option></select></label>
      <label className="text-xs font-bold text-white">Your team message<textarea value={content} onChange={e=>setContent(e.target.value)} rows={3} maxLength={2000}
        placeholder="What was done, what is needed, and which order or team action it concerns."
        className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-sm font-normal text-white"/></label>
    </div>
    <button type="button" onClick={()=>void send()} disabled={sending||content.trim().length<2} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-5 text-xs font-black text-slate-950 disabled:opacity-40"><Send className="h-4 w-4"/>{sending?'Sending…':'Send to food team'}</button>
    <p className="mt-3 flex items-center gap-2 text-[11px] text-slate-400"><MessageSquareText className="h-4 w-4"/> Team messages notify other approved staff; no financial or fulfilment status changes from chat alone.</p>
  </section>
}
