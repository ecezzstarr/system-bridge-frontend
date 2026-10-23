'use client'
import Link from 'next/link'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'

type Application={
  key:string;id:string;kind:string;title:string;name:string;role:string;
  statement:string;status:string;submitted:string;reviewUrl:string;detail:string
}
type Status={loaded:number;errors:string[]}
const appUrl=(base:string,id:string)=>base+'?applicationId='+encodeURIComponent(id)
function timestamp(value:unknown){
  if(typeof value!=='string')return 0
  const time=new Date(value).getTime();return Number.isFinite(time)?time:0
}
export default function CompanyEmploymentApplications(){
  const {user,token,isInitialized}=useAuth()
  const [applications,setApplications]=useState<Application[]>([])
  const [loading,setLoading]=useState(true)
  const [state,setState]=useState<Status>({loaded:0,errors:[]})
  const load=useCallback(async()=>{
    if(!token||user?.role!=='admin')return
    setLoading(true)
    const headers={Authorization:`Bearer ${token}`}
    const services=[
      '/api/admin/distribution-employment',
      '/api/admin/food-preparation-manager',
      '/api/admin/guidance-staff',
    ]
    const data=await Promise.allSettled(services.map(async url=>{
      const response=await fetch(url,{headers,cache:'no-store'})
      const json=await response.json()
      if(!response.ok)throw new Error(json.error||'Unable to load '+url)
      return json
    }))
    const errors:string[]=[]
    const all:Application[]=[]
    data.forEach((result,index)=>{
      if(result.status==='rejected'){errors.push(services[index]+' unavailable');return}
      const response=result.value
      if(index===0){
        for(const a of response.appointments||[]){
          all.push({key:'distribution_manager:'+a.user_id,id:a.user_id,
            kind:'distribution_manager',title:'Distribution Manager',
            name:String(a.name||'Applicant'),role:String(a.source_role||''),
            statement:'Signed employment document v'+String(a.document_version||'')+
              ' · Signature: '+String(a.accepted_name||'Not recorded'),
            status:String(a.status),submitted:String(a.document_accepted_at||''),
            reviewUrl:appUrl('/admin/distribution-employment',a.user_id),
            detail:'Administration verifies the appointment; probation begins only after approval.'})
        }
        for(const a of response.overview?.assistants||[]){
          all.push({key:'distribution_assistant:'+a.user_id,id:a.user_id,
            kind:'distribution_assistant',title:'Assistant Distribution Manager',
            name:String(a.name||'Applicant'),role:String(a.role||''),
            statement:String(a.application_note||'No application statement'),
            status:a.status==='pending'&&a.administration_verification==='verified'?
              'verified · awaiting lead appointment':a.status==='pending'?
              'awaiting Administration':String(a.status),
            submitted:String(a.created_at||''),reviewUrl:appUrl('/admin/distribution-employment',a.user_id),
            detail:'Administration verifies eligibility; the lead Distribution Manager selects and appoints assistants.'})
        }
      }else if(index===1){
        for(const a of response.applications||[]){
          all.push({key:'food_preparation:'+a.id,id:a.id,kind:'food_preparation',
            title:a.position==='manager'?'Food Preparation Manager':'Assistant Food Preparation Manager',
            name:String(a.name||a.username||'Applicant'),role:'Agent',
            statement:String(a.application_note||'No application statement'),
            status:String(a.status),submitted:String(a.created_at||''),
            reviewUrl:appUrl('/admin/food-preparation-manager',a.id),
            detail:'Administration approves employment; the approved Stability Lead assigns preparation work.'})
        }
      }else{
        for(const a of response.applications||[]){
          const label=a.department==='forensic'?'Forensics':a.department==='lawyer'?'Attorney':'Mandate'
          all.push({key:'guidance_support:'+a.id,id:a.id,kind:'guidance_support',
            title:label+' · Company Guidance',name:String(a.name||a.username||'Applicant'),
            role:String(a.source_role||''),statement:String(a.application_note||'No application statement'),
            status:String(a.status),submitted:String(a.created_at||''),
            reviewUrl:appUrl('/admin/guidance-staff',a.id),
            detail:'Approval opens only the appointed department inbox, not Administration authority.'})
        }
      }
    })
    all.sort((a,b)=>{
      const rank=(s:string)=>s==='pending_verification'||s==='pending'||s==='awaiting Administration'?0:
        s.startsWith('verified · awaiting')?1:2
      return rank(a.status)-rank(b.status)||timestamp(b.submitted)-timestamp(a.submitted)
    })
    setApplications(all);setState({loaded:data.length-errors.length,errors});setLoading(false)
  },[token,user?.role])
  useEffect(()=>{void load()},[load])
  const waiting=useMemo(()=>applications.filter(a=>
    ['pending','pending_verification','awaiting Administration'].includes(a.status)),[applications])
  if(!isInitialized)return <main className="p-6 text-sm text-slate-300">Loading Administration…</main>
  if(user?.role!=='admin')return <main className="p-6 text-sm text-rose-200">Administration only.</main>
  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 text-white" data-admin-company-employment-inbox="true">
    <header className="border-b border-white/10 pb-5">
      <Link href="/admin/dashboard" className="text-xs text-cyan-200">← Administration</Link>
      <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-amber-200">Company positions · Administration</p>
      <h1 className="mt-2 text-3xl font-black">Employment applications</h1>
      <Link href="/admin/client-staff-offers" className="mt-4 inline-flex border border-cyan-200/30 px-4 py-3 text-sm font-bold text-cyan-200">Company Client staff offers & tickets →</Link>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Read each applicant's statement, then open the correct verification desk to approve or decline. Lead Distribution Managers select their assistants only after Administration verifies eligibility. All decisions preserve their review records.</p>
    </header>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Metric label="Awaiting Administration" value={String(waiting.length)}/>
      <Metric label="Applications and appointments" value={String(applications.length)}/>
      <Metric label="Review services available" value={String(state.loaded)+' / 3'}/>
    </div>
    <button type="button" onClick={()=>void load()} disabled={loading}
      className="border border-amber-300/30 px-4 py-3 text-xs font-bold text-amber-100 disabled:opacity-40">
      {loading?'Reading current applications…':'Refresh applications'}
    </button>
    {state.errors.length>0&&<p role="alert" className="border border-rose-300/20 p-3 text-xs text-rose-200">Some position records are unavailable: {state.errors.join(', ')}. This listing may be incomplete.</p>}
    {loading&&!applications.length&&<p className="text-sm text-slate-400">Opening company application registers…</p>}
    <section className="grid gap-3 lg:grid-cols-2">
      {applications.map(app=><article key={app.key} className="flex flex-col border border-white/10 bg-white/[.025] p-5" data-company-application={app.kind}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="text-[10px] font-black uppercase tracking-widest text-amber-200">{app.title}</p>
            <h2 className="mt-2 text-lg font-black">{app.name}</h2></div>
          <span className="border border-white/15 px-2 py-1 text-[10px] text-slate-300">{app.status.replaceAll('_',' ')}</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">{app.role} · {timestamp(app.submitted)?new Date(app.submitted).toLocaleString('en-NG'):'Date unavailable'}</p>
        <p className="mt-3 text-xs leading-5 text-slate-400">{app.detail}</p>
        <div className="mt-4 flex-1 border-y border-white/10 py-4">
          <p className="text-[10px] font-bold uppercase text-slate-500">Submitted statement / signed terms</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{app.statement}</p>
        </div>
        <Link href={app.reviewUrl} className="mt-4 inline-flex min-h-11 items-center justify-center border border-cyan-300/25 px-4 py-3 text-xs font-black text-cyan-200">
          Open application · Record decision →
        </Link>
      </article>)}
      {!loading&&!applications.length&&<p className="text-sm text-slate-400">No company applications found in the connected employment registers.</p>}
    </section>
  </main>
}
function Metric({label,value}:{label:string;value:string}){
  return <div className="border border-white/10 p-4"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p></div>
}
