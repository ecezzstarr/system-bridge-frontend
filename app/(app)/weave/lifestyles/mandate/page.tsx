'use client'
import Link from 'next/link'
import { useCallback,useEffect,useState } from 'react'
import { ArrowLeft, ArrowRight, Landmark, Loader2, Scale, Search, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

type Department = {key:'mandate'|'forensic'|'lawyer';label:string;function:string}
type Application={id:string;department:string;status:string;application_note:string;review_note?:string|null;created_at:string}
type State={eligible:boolean;accessStatus:string;role:string;departments:Department[];applications:Application[];activeDepartments:string[]}

export default function MandateLifestylePage(){
  const {user,token,isInitialized}=useAuth()
  const [data,setData]=useState<State|null>(null)
  const [notes,setNotes]=useState<Record<string,string>>({})
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const load=useCallback(async()=>{
    if(!token)return
    try{
      const res=await fetch('/api/weave/lifestyles/mandate',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Unable to load Weave Mandate')
      setData(body);setError('')
    }catch(cause){setError(cause instanceof Error?cause.message:'Unable to load Weave Mandate')}
  },[token])
  useEffect(()=>{void load()},[load])
  async function apply(department:string){
    if(!token)return
    setBusy(department);setError('');setMessage('')
    try{
      const res=await fetch('/api/weave/lifestyles/mandate',{
        method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({department,note:notes[department]||''}),
      })
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Application not accepted')
      setMessage('Application recorded for Administration review. You cannot answer support chats until approved.')
      await load()
    }catch(cause){setError(cause instanceof Error?cause.message:'Application not accepted')}
    finally{setBusy('')}
  }
  const icons={mandate:Landmark,forensic:Search,lawyer:Scale}
  if(!isInitialized)return <main className="p-6 text-white">Opening WEAVE Mandate…</main>
  if(!user||!['agent','bridger'].includes(user.role||''))return <main className="p-6 text-white">This Lifestyle is available to active Agents and Bridgers.</main>
  return <main className="mx-auto max-w-6xl px-4 pb-16 pt-5 text-white" data-weave-mandate-lifestyle="departmental-applications">
    <Link href="/weave/lifestyles" className="flex items-center gap-2 text-xs text-sky-200"><ArrowLeft className="h-4 w-4"/>Lifestyle</Link>
    <header className="mt-6 border-b border-white/10 pb-6">
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-200">WEAVE Mandate · Company Support Lifestyle</p>
      <h1 className="mt-2 text-3xl font-black md:text-4xl">Serve inside Company Guidance.</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">Your existing {user.role} position can apply to join Mandate, Forensics or Attorney support. Approved departmental personnel read and reply to the corresponding Company Guidance conversations. Administration owns authorization, review and revocation.</p>
      <p className="mt-3 text-xs text-stone-500">This is a company department assignment, not a separate account, purchased ticket, automatic wage, or authority to practice regulated law.</p>
    </header>
    {error&&<p role="alert" className="mt-5 border border-rose-300/20 p-3 text-xs text-rose-200">{error}</p>}
    {message&&<p role="status" className="mt-5 border border-emerald-300/20 p-3 text-xs text-emerald-200">{message}</p>}
    {!data?<div className="mt-6 flex gap-2 text-xs text-stone-400"><Loader2 className="h-4 w-4 animate-spin"/>Loading departments…</div>:<>
      <div className="mt-5 border-l-2 border-amber-300/40 bg-amber-300/[.035] p-4 text-xs leading-6 text-stone-300">
        <strong className="text-white">Position eligibility:</strong> {data.eligible?'Your position can apply.':'Your current Lifestyle access is inactive. An Agent must have an active position and a Bridger must have permanent Agentic-Bridger Lifestyle access.'}
        {' '}Current status: {data.accessStatus}.
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {data.departments.map(department=>{
          const ItemIcon=icons[department.key]||ShieldCheck
          const existing=data.applications.find(application=>application.department===department.key)
          const appointed=data.activeDepartments.includes(department.key)
          const canApply=data.eligible&&(!existing||['rejected','revoked'].includes(existing.status))
          return <article key={department.key} className="flex flex-col border border-white/10 bg-white/[.025] p-5" data-mandate-department={department.key}>
            <ItemIcon className="h-6 w-6 text-amber-200"/>
            <h2 className="mt-4 text-xl font-black">{department.label}</h2>
            <p className="mt-2 min-h-16 text-xs leading-5 text-stone-400">{department.function}</p>
            {department.key==='lawyer'&&<p className="mt-2 text-xs leading-5 text-amber-100">Attorney support is internal guidance. Legal representation or legal advice requiring a license must go to a qualified professional.</p>}
            {existing&&<div className="mt-4 border-t border-white/10 pt-3">
              <p className="text-xs font-black uppercase tracking-wide text-amber-200">Application: {existing.status}</p>
              {existing.review_note&&<p className="mt-2 text-xs leading-5 text-stone-400">Administration: {existing.review_note}</p>}
            </div>}
            {appointed?<Link href={`/weave/lifestyles/mandate/inbox?department=${department.key}`} className="mt-auto inline-flex items-center gap-2 border border-emerald-300/25 px-4 py-3 text-xs font-black text-emerald-200">Open Guidance Inbox <ArrowRight className="h-4 w-4"/></Link>:
              canApply?<div className="mt-auto pt-4">
                <label className="block text-xs text-stone-300">How will you serve this department?
                  <textarea rows={4} minLength={25} maxLength={1500} value={notes[department.key]||''}
                    onChange={e=>setNotes(current=>({...current,[department.key]:e.target.value}))}
                    placeholder="Describe your work, skills, availability, and how you will handle confidential enquiries."
                    className="mt-2 w-full border border-white/10 bg-black/20 p-3 text-sm text-white"/>
                </label>
                <button disabled={busy===department.key||(notes[department.key]||'').trim().length<25}
                  onClick={()=>void apply(department.key)}
                  className="mt-3 w-full bg-amber-300 px-4 py-3 text-xs font-black text-black disabled:opacity-35">Apply to {department.label}</button>
              </div>:<p className="mt-auto border-t border-white/10 pt-4 text-xs text-stone-500">
                {existing?.status==='pending'?'Administration is reviewing this application.':'Department application currently unavailable.'}
              </p>}
          </article>
        })}
      </div>
      {data.activeDepartments.some(d=>['forensic','mandate','lawyer'].includes(d))&&<Link href="/weave/child-support" className="mt-6 inline-flex items-center gap-2 border border-emerald-300/35 px-4 py-3 text-xs font-bold text-emerald-200">Child & Parent Support Orders <ArrowRight className="h-4 w-4"/></Link>}
    </>}
    <section className="mt-8 border-t border-white/10 pt-5">
      <p className="text-[10px] font-black uppercase tracking-wider text-amber-200">Company support chain</p>
      <p className="mt-2 text-xs leading-6 text-stone-400">Mandate organizes authorized action. Forensics examines records and claims. Attorney clarifies obligations and escalates legal questions. Administration retains final control. No applicant can see private Company Guidance conversations before approval.</p>
    </section>
  </main>
}
