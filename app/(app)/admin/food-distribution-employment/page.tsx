'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {Button} from '@/components/ui/button'
type Application={user_id:string;position:'manager'|'assistant';status:string;application_note:string;manager_user_id:string|null;manager_name:string|null;administration_note:string|null;created_at:string;name:string;email:string}
export default function FoodDistributionAdministrationDesk(){
 const {user,token,isInitialized}=useAuth()
 const [applications,setApplications]=useState<Application[]>([])
 const [notes,setNotes]=useState<Record<string,string>>({})
 const [loading,setLoading]=useState(true);const [working,setWorking]=useState<string|null>(null);const [error,setError]=useState('');const [message,setMessage]=useState('')
 const load=useCallback(async()=>{if(!token)return;const r=await fetch('/api/admin/food-distribution-employment',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to load Administration desk');setApplications(d.applications||[])},[token])
 useEffect(()=>{if(!isInitialized)return;if(user?.role!=='admin'){setError('Administration access required.');setLoading(false);return}load().catch(e=>setError(e.message)).finally(()=>setLoading(false))},[isInitialized,user?.id,user?.role,load])
 const review=async(id:string,action:'approve'|'reject')=>{const note=(notes[id]||'').trim();if(note.length<10){setError('Enter at least 10 characters explaining the decision.');return}if(!token)return;setWorking(id);setError('');setMessage('');try{const r=await fetch('/api/admin/food-distribution-employment',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({applicantId:id,action,note})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Review failed');setMessage(action==='approve'?'Food Distribution appointment approved.':'Application declined.');await load()}catch(e){setError(e instanceof Error?e.message:'Review failed')}finally{setWorking(null)}}
 if(loading)return <main className="p-6 text-sm text-slate-200">Opening Administration review…</main>
 return <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 text-white" data-admin-food-distribution-review="true">
  <Link href="/admin/control-center" className="text-xs text-cyan-200">← Administration Control Center</Link>
  <p className="mt-7 text-[10px] font-black uppercase tracking-[.2em] text-amber-200">A Time · Administration Department</p>
  <h1 className="mt-2 text-3xl font-black">Food Distribution Employment</h1>
  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Review Agent applications separately from Bridger Distribution Manager appointments and Food Preparation employment. Approval activates the appointment; it does not certify unverified distribution counts or trigger automatic salary payment.</p>
  {error&&<p role="alert" className="mt-4 border border-rose-400/30 p-3 text-sm text-rose-200">{error}</p>}{message&&<p role="status" className="mt-4 border border-emerald-300/20 p-3 text-sm text-emerald-200">{message}</p>}
  <div className="mt-6 space-y-4">{applications.map(a=><article key={a.user_id} className="border border-white/10 bg-white/[.025] p-5">
   <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-cyan-200">{a.position==='manager'?'Food Distribution Manager':'Assistant Food Distribution Manager'}</p><h2 className="mt-1 text-lg font-black">{a.name}</h2><p className="text-xs text-slate-400">{a.email} · {a.status.replaceAll('_',' ')}</p>{a.manager_name&&<p className="mt-1 text-xs text-slate-400">Lead: {a.manager_name}</p>}</div><p className="text-[10px] text-slate-500">{new Date(a.created_at).toLocaleString('en-NG')}</p></div>
   <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-200">{a.application_note}</p>
   {a.administration_note&&<p className="mt-3 text-xs text-amber-100">Recorded decision: {a.administration_note}</p>}
   {a.status==='pending'&&<div className="mt-4 border-t border-white/10 pt-4"><label className="block text-xs font-bold text-slate-300" htmlFor={`review-${a.user_id}`}>Administration verification note</label><textarea id={`review-${a.user_id}`} rows={3} maxLength={1200} value={notes[a.user_id]||''} onChange={e=>setNotes(v=>({...v,[a.user_id]:e.target.value}))} placeholder="Record evidence of suitability, eligibility and decision." className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white"/><div className="mt-3 flex gap-2"><Button disabled={working!==null||(notes[a.user_id]||'').trim().length<10} onClick={()=>void review(a.user_id,'approve')}>Approve appointment</Button><Button variant="outline" disabled={working!==null||(notes[a.user_id]||'').trim().length<10} onClick={()=>void review(a.user_id,'reject')}>Decline</Button></div></div>}
  </article>)}{!applications.length&&<p className="border border-white/10 p-5 text-sm text-slate-400">No Food Distribution applications recorded.</p>}</div>
 </main>
}
