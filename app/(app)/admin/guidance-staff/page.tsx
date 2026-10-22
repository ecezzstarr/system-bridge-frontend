'use client'
import Link from 'next/link'
import { useCallback,useEffect,useState } from 'react'
import { ArrowLeft, RefreshCw,ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
type Item={id:string;user_id:string;source_role:string;department:string;application_note:string;
  status:'pending'|'approved'|'rejected'|'revoked';review_note?:string|null;
  name:string;username:string;email:string;is_active:boolean;created_at:string}
const labels:Record<string,string>={mandate:'Mandate',forensic:'Forensics',lawyer:'Attorney'}
export default function GuidanceStaffAdminPage(){
  const {user,token,isInitialized}=useAuth()
  const [items,setItems]=useState<Item[]>([])
  const [notes,setNotes]=useState<Record<string,string>>({})
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState('')
  const load=useCallback(async()=>{
    if(user?.role!=='admin'||!token)return
    try{
      const response=await fetch('/api/admin/guidance-staff',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Unable to load departmental applications')
      setItems(data.applications||[]);setError('')
    }catch(e){setError(e instanceof Error?e.message:'Could not load applications')}
  },[user?.role,token])
  useEffect(()=>{void load()},[load])
  async function review(applicationId:string,decision:'approved'|'rejected'|'revoked'){
    if(!token)return
    setBusy(applicationId);setError('');setMessage('')
    try{
      const response=await fetch('/api/admin/guidance-staff',{
        method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({applicationId,decision,reviewNote:notes[applicationId]||''}),
      })
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Review failed')
      setMessage('Department application '+decision+'.')
      await load()
    }catch(e){setError(e instanceof Error?e.message:'Review failed')}
    finally{setBusy('')}
  }
  useEffect(()=>{
    if(!items.length)return
    const id=new URLSearchParams(window.location.search).get('applicationId')
    if(!id)return
    window.requestAnimationFrame(()=>document.getElementById('application-'+id)?.scrollIntoView({behavior:'smooth',block:'center'}))
  },[items])
  if(!isInitialized)return <main className="p-6 text-white">Opening Administration department review…</main>
  if(!user||user.role!=='admin')return <main className="p-6 text-white">Administration only.</main>
  const pending=items.filter(item=>item.status==='pending')
  const active=items.filter(item=>item.status==='approved')
  const reviewed=items.filter(item=>item.status==='rejected'||item.status==='revoked')
  function card(item:Item){
    return <article id={`application-${item.id}`} key={item.id} className="scroll-mt-24 border border-white/10 bg-white/[.025] p-5">
      <p className="text-[10px] font-black uppercase tracking-[.14em] text-amber-200">
        {labels[item.department]||item.department} · {item.status}
      </p>
      <h3 className="mt-2 text-lg font-black">{item.name||item.username}</h3>
      <p className="mt-1 text-xs text-stone-400">{item.source_role} · {item.email} · Account {item.is_active?'active':'inactive'}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-300">{item.application_note}</p>
      {item.review_note&&<p className="mt-3 border-l-2 border-white/20 pl-3 text-xs text-stone-400">Prior review: {item.review_note}</p>}
      {(item.status==='pending'||item.status==='approved')&&<>
        <label className="mt-4 block text-xs text-stone-300">Verification / removal reason (15–2000 characters)
          <textarea rows={2} maxLength={2000} minLength={15} value={notes[item.id]||''}
            onChange={e=>setNotes(current=>({...current,[item.id]:e.target.value}))}
            className="mt-2 w-full border border-white/15 bg-[#12141a] p-3 text-sm text-white"/>
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          {item.status==='pending'?<>
            <button disabled={busy===item.id||!item.is_active||(notes[item.id]||'').trim().length<15}
              onClick={()=>void review(item.id,'approved')}
              className="border border-emerald-300/30 px-4 py-2 text-xs font-black text-emerald-200 disabled:opacity-30">Approve support position</button>
            <button disabled={busy===item.id||(notes[item.id]||'').trim().length<15}
              onClick={()=>void review(item.id,'rejected')}
              className="border border-rose-300/30 px-4 py-2 text-xs font-black text-rose-200 disabled:opacity-30">Reject application</button>
          </>:<button disabled={busy===item.id||(notes[item.id]||'').trim().length<15}
              onClick={()=>void review(item.id,'revoked')}
              className="border border-rose-300/30 px-4 py-2 text-xs font-black text-rose-200 disabled:opacity-30">Revoke department access</button>}
        </div>
      </>}
    </article>
  }
  return <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 text-white" data-admin-guidance-assignments="verified">
    <Link href="/admin/company-guidance" className="inline-flex items-center gap-2 text-xs text-sky-200"><ArrowLeft className="h-4 w-4"/>Company Guidance Inbox</Link>
    <header className="mt-5 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
      <div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-amber-200"><ShieldCheck className="h-4 w-4"/>Administration · Weave Mandate</p>
        <h1 className="mt-2 text-3xl font-black">Departmental support appointments</h1>
        <p className="mt-3 max-w-3xl text-xs leading-6 text-stone-400">Approve Agent or Bridger applicants to reply within Mandate, Forensics or Attorney Company Guidance threads. No pending applicant can see a private conversation. Revoke access here at any time.</p>
      </div>
      <button onClick={()=>void load()} className="inline-flex items-center gap-2 border border-white/10 px-4 py-2 text-xs"><RefreshCw className="h-4 w-4"/>Refresh</button>
    </header>
    {error&&<p role="alert" className="mt-4 text-xs text-rose-200">{error}</p>}
    {message&&<p role="status" className="mt-4 text-xs text-emerald-200">{message}</p>}
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      {[['Pending applications',pending.length],['Approved personnel',active.length],['Declined or revoked',reviewed.length]].map(([label,n])=><div key={label} className="border border-white/10 p-4"><p className="text-[10px] text-stone-500">{label}</p><p className="mt-2 text-2xl font-black">{n}</p></div>)}
    </div>
    <section className="mt-8"><h2 className="text-xl font-black">Waiting for Administration · {pending.length}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{pending.map(card)}{!pending.length&&<p className="text-xs text-stone-500">No pending applicants.</p>}</div>
    </section>
    <section className="mt-8 border-t border-white/10 pt-6"><h2 className="text-xl font-black">Active departmental support · {active.length}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{active.map(card)}{!active.length&&<p className="text-xs text-stone-500">No support appointments yet.</p>}</div>
    </section>
    <section className="mt-8 border-t border-white/10 pt-6"><h2 className="text-xl font-black">Application history</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{reviewed.map(card)}</div>
    </section>
    <p className="mt-7 text-xs leading-5 text-amber-100">Attorney is an internal WEAVE support department. Appointment does not establish bar admission, independent legal representation or an attorney-client relationship. Verify professional credentials separately before assigning regulated work.</p>
  </main>
}
