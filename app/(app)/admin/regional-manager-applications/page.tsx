'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {Button} from '@/components/ui/button'

type Application={user_id:string;name:string;email:string;source_role:string;region:string;experience:string;motivation:string;training_standard_acknowledged:boolean;status:string;submitted_at:string;review_note?:string|null;reviewer_name?:string|null}
type Page={limit:number;offset:number;total:number;hasMore:boolean}
export default function RegionalManagerApplicationsDesk(){
  const {user,token,isInitialized}=useAuth()
  const [applications,setApplications]=useState<Application[]>([])
  const [page,setPage]=useState<Page>({limit:50,offset:0,total:0,hasMore:false})
  const [filter,setFilter]=useState('pending')
  const [notes,setNotes]=useState<Record<string,string>>({})
  const [loading,setLoading]=useState(true)
  const [working,setWorking]=useState<string|null>(null)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const load=useCallback(async(offset=0,nextFilter=filter)=>{
    if(!token)return
    const response=await fetch(`/api/admin/regional-manager-applications?status=${encodeURIComponent(nextFilter)}&limit=50&offset=${offset}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
    const data=await response.json()
    if(!response.ok)throw new Error(data.error||'Unable to load applications')
    setApplications(data.applications||[]);setPage(data.pagination||{limit:50,offset,total:0,hasMore:false})
  },[token,filter])
  useEffect(()=>{if(!isInitialized)return;if(user?.role!=='admin'){setError('Administration access required.');setLoading(false);return}load(0).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[isInitialized,user?.id,user?.role,load])
  const changeFilter=(value:string)=>{setFilter(value);setLoading(true);setError('');load(0,value).catch(e=>setError(e.message)).finally(()=>setLoading(false))}
  const review=async(id:string,decision:'approve'|'reject')=>{
    if(!token)return
    const reviewNote=(notes[id]||'').trim()
    if(reviewNote.length<10){setError('Enter at least 10 characters explaining the decision.');return}
    setWorking(id);setError('');setMessage('')
    try{
      const response=await fetch('/api/admin/regional-manager-applications',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({userId:id,decision,reviewNote})})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Review decision failed')
      setMessage(decision==='approve'?'Regional Manager appointment approved.':'Application rejected.')
      await load(page.offset)
    }catch(e){setError(e instanceof Error?e.message:'Review decision failed')}
    finally{setWorking(null)}
  }
  if(loading)return <main className="p-6 text-sm text-slate-200">Opening Regional Manager review desk…</main>
  return <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 text-white" data-admin-regional-manager-applications="true">
    <Link href="/admin/control-center" className="text-xs text-cyan-200">← Administration Control Center</Link>
    <p className="mt-7 text-[10px] font-black uppercase tracking-[.2em] text-amber-200">A Time · Administration Department</p>
    <h1 className="mt-2 text-3xl font-black">Regional Manager Applications</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Review applicants independently of appointment capacity. The list is paginated; more than 1,000 applications can be reviewed without loading the full queue into one page.</p>
    <div className="mt-5 flex flex-wrap items-center gap-3"><label htmlFor="regional-manager-status" className="text-xs font-bold text-slate-300">Application status</label><select id="regional-manager-status" value={filter} onChange={e=>changeFilter(e.target.value)} className="rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white">{['pending','approved','rejected','withdrawn','all'].map(s=><option key={s} value={s}>{s==='all'?'All applications':s[0].toUpperCase()+s.slice(1)}</option>)}</select><span className="text-xs text-slate-400">{page.total.toLocaleString()} records · showing {applications.length? page.offset+1:0}–{page.offset+applications.length}</span></div>
    {error&&<p role="alert" className="mt-4 border border-rose-400/30 p-3 text-sm text-rose-200">{error}</p>}
    {message&&<p role="status" className="mt-4 border border-emerald-300/20 p-3 text-sm text-emerald-200">{message}</p>}
    <div className="mt-6 space-y-4">{applications.map(a=><article key={a.user_id} className="border border-white/10 bg-white/[.025] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-cyan-200">{a.source_role} · {a.status}</p><h2 className="mt-1 text-lg font-black">{a.name}</h2><p className="text-xs text-slate-400">{a.email} · {a.region}</p></div><p className="text-[10px] text-slate-500">{new Date(a.submitted_at).toLocaleString('en-NG')}</p></div>
      <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-slate-300">Experience</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{a.experience}</p>
      <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-slate-300">Regional operating and university-student employment plan</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{a.motivation}</p><p className="mt-3 text-xs font-bold text-amber-100">Training standard acknowledgement: {a.training_standard_acknowledged ? "Recorded" : "Missing — appointment approval is blocked"}</p>
      {a.review_note&&<p className="mt-3 text-xs text-amber-100">Review note: {a.review_note}</p>}
      {a.status==='pending'&&<div className="mt-4 border-t border-white/10 pt-4"><label className="block text-xs font-bold text-slate-300" htmlFor={`review-${a.user_id}`}>Administration decision note</label><textarea id={`review-${a.user_id}`} value={notes[a.user_id]||''} onChange={e=>setNotes(v=>({...v,[a.user_id]:e.target.value}))} maxLength={2000} rows={3} placeholder="Record eligibility evidence and the reason for your decision." className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white"/><div className="mt-3 flex gap-2"><Button disabled={working!==null||(notes[a.user_id]||'').trim().length<10||!a.training_standard_acknowledged} onClick={()=>void review(a.user_id,'approve')}>Approve appointment</Button><Button variant="outline" disabled={working!==null||(notes[a.user_id]||'').trim().length<10} onClick={()=>void review(a.user_id,'reject')}>Reject application</Button></div></div>}
    </article>)}</div>
    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4"><Button variant="outline" disabled={loading||page.offset<=0} onClick={()=>{setLoading(true);load(Math.max(0,page.offset-page.limit)).catch(e=>setError(e.message)).finally(()=>setLoading(false))}}>Previous</Button><span className="text-xs text-slate-400">Page {Math.floor(page.offset/page.limit)+1} of {Math.max(1,Math.ceil(page.total/page.limit))}</span><Button variant="outline" disabled={loading||!page.hasMore} onClick={()=>{setLoading(true);load(page.offset+page.limit).catch(e=>setError(e.message)).finally(()=>setLoading(false))}}>Next</Button></div>
  </main>
}
