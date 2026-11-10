'use client'
import Link from 'next/link'
import {useAuth} from '@/lib/auth-provider'
import {useCallback,useEffect,useState} from 'react'

type Person={user_id:string;name:string}
type Manager={manager_id:string;name:string;source_role:string;region:string;current_direction:string|null;direction_at:string|null;staff:number;direct:number;assistants:number;
  tasks_completed:number;tasks_open:number;checkins:number;needs_help:number;
  support_cases_pending:number|null;support_due_system_switch:number|null;support_due_ngn:number|null}
type Member={manager_id:string;user_id:string;name:string;role:string;position:string;level:string}
type FoodAssignment={food_manager_user_id:string;regional_manager_user_id:string}
type Report={managers:Manager[];team:Member[];foodAssignments:FoodAssignment[];
  candidates:{bridgers:Person[];agents:Person[];distributionManagers:Person[];foodDistributionManagers:Person[]};
  generatedAt:string;supportAvailable:boolean}
const options=[
  {value:'bridger',title:'Bridger · Hope'},
  {value:'agent',title:'Agent · Stability'},
  {value:'distribution',title:'Distribution Manager · Lead'},
  {value:'food',title:'Food Distribution Manager · Lead'},
]

export default function AdminRegionalOperations(){
  const {user,token,isInitialized}=useAuth()
  const [report,setReport]=useState<Report|null>(null)
  const [loading,setLoading]=useState(true)
  const [working,setWorking]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [regionId,setRegionId]=useState('')
  const [position,setPosition]=useState('bridger')
  const [staffId,setStaffId]=useState('')
  const load=useCallback(async()=>{
    if(!token)return
    try{
      const r=await fetch('/api/admin/regional-operations',
        {headers:{Authorization:'Bearer '+token},cache:'no-store'})
      const d=await r.json()
      if(!r.ok)throw new Error(d.error||'Regional report unavailable')
      setReport(d);setError('')
    }catch(e){setError(e instanceof Error?e.message:'Unable to load regional operations')}
    finally{setLoading(false)}
  },[token])
  useEffect(()=>{
    if(!isInitialized||!token||user?.role!=='admin')return
    void load()
    const id=setInterval(()=>void load(),20000)
    return ()=>clearInterval(id)
  },[isInitialized,user?.role,token,load])
  const mutate=async(action:string,memberId:string,kind:string,managerId:string)=>{
    if(!token)return
    setWorking(true);setError('');setMessage('')
    try{
      const food=kind==='food'||kind==='agent'
      const path=food?'/api/admin/regional-operations':'/api/admin/regional-managers'
      const postAction=food?(kind==='agent'?(action==='assign'?'assign_agent':'unassign_agent'):(action==='assign'?'assign_food_lead':'unassign_food_lead')):
        kind==='bridger'?(action==='assign'?'assign_bridger':'unassign_bridger'):
          (action==='assign'?'assign_distribution_manager':'unassign_distribution_manager')
      const body=food?{action:postAction,foodManagerId:memberId,regionalManagerId:managerId}:
        {action:postAction,userId:memberId,regionalManagerId:managerId}
      const r=await fetch(path,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify(body)})
      const res=await r.json()
      if(!r.ok)throw new Error(res.error||'Assignment not saved')
      setMessage('Regional team authorization updated.')
      await load()
    }catch(e){setError(e instanceof Error?e.message:'Assignment failed')}
    finally{setWorking(false)}
  }
  if(!isInitialized||loading)return <main className="p-6 text-slate-200">Reading Administrations regional operations…</main>
  if(user?.role!=='admin')return <main className="p-6 text-slate-200">Administrations access only.</main>
  if(!report)return <main className="p-6 text-rose-200">{error||'Regional records unavailable'}</main>
  const candidates=position==='bridger'?report.candidates.bridgers:
    position==='agent'?report.candidates.agents:
    position==='distribution'?report.candidates.distributionManagers:
    report.candidates.foodDistributionManagers
  const counts={
    regions:report.managers.length,
    staff:report.team.length,
    completed:report.managers.reduce((s,m)=>s+m.tasks_completed,0),
    outstanding:report.managers.reduce((s,m)=>s+m.tasks_open,0),
    needingHelp:report.managers.reduce((s,m)=>s+m.needs_help,0)
  }
  return <main className="weave-operating-environment mx-auto min-h-screen max-w-7xl space-y-6 px-4 py-6 text-white" data-admin-regional-operations>
    <header>
      <Link href="/admin/control-center" className="text-sm text-cyan-200">← Administrations Control Center</Link>
      <p className="mt-5 text-xs font-bold uppercase tracking-widest text-amber-200">Administrations · A Time · Staff Continuity</p>
      <h1 className="mt-2 text-3xl font-black">Regional Workforce Control</h1>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">Appoint and assign staff through verified job records. See daily work, unfinished tasks and support needs without interfering with authorized lead managers. Updates refresh every 20 seconds.</p>
      <div className="mt-3 flex flex-wrap gap-3 text-sm text-cyan-200">
        <Link href="/admin/regional-manager-applications">Regional Manager applications</Link>
        <Link href="/admin/company-movement">Company sales and payment movement</Link>
        <Link href="/admin/food-distribution-employment">Food Distribution appointments</Link>
        <Link href="/weave/lifestyles/support" className="font-bold text-amber-100">Manager Support · restricted advances, repayment and private cases</Link>
      </div>
    </header>
    {!report.supportAvailable&&<p role="alert" className="rounded-xl border border-amber-300/25 p-4 text-sm text-amber-100">Regional Work Support balances cannot be verified right now. Existing cases and repayments have not been assumed to be zero. Open Manager Support and retry.</p>}
    {error&&<p role="alert" className="border border-rose-300/35 p-3 text-sm text-rose-200">{error}</p>}
    {message&&<p role="status" className="border border-cyan-300/25 p-3 text-sm text-cyan-100">{message}</p>}
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      {Object.entries(counts).map(([key,v])=><div key={key} className="rounded-lg border border-white/15 bg-slate-950/70 p-3">
        <p className="text-xs capitalize text-slate-400">{key==='needingHelp'?'Needs support':key.replaceAll('_',' ')}</p>
        <p className="mt-2 text-2xl font-bold">{v.toLocaleString()}</p>
      </div>)}
    </div>
    <section className="space-y-3 rounded-xl border border-white/15 bg-slate-950/70 p-4">
      <h2 className="text-xl font-black">Authorize regional team assignments</h2>
      <p className="text-sm text-slate-300">Select an active ordinary Regional Manager, then an eligible direct Bridger/Agent or approved lead. Assistants inherit their own verified supervisor and are not independently reassigned here.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs text-slate-300">Regional Manager
          <select value={regionId} onChange={e=>setRegionId(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white">
            <option value="">Choose appointed manager</option>
            {report.managers.map(m=><option key={m.manager_id} value={m.manager_id}>{m.name} · {m.source_role}</option>)}
          </select>
        </label>
        <label className="block text-xs text-slate-300">Company position
          <select value={position} onChange={e=>{setPosition(e.target.value);setStaffId('')}} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white">
            {options.map(o=><option key={o.value} value={o.value}>{o.title}</option>)}
          </select>
        </label>
        <label className="block text-xs text-slate-300">Eligible person
          <select value={staffId} onChange={e=>setStaffId(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white">
            <option value="">Choose verified user</option>
            {candidates.map(c=><option key={c.user_id} value={c.user_id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <button disabled={working||!regionId||!staffId}
        onClick={()=>void mutate('assign',staffId,position,regionId)}
        className="min-h-11 rounded-lg border border-cyan-300/35 px-4 py-2 text-sm font-semibold disabled:opacity-50">
        Assign to region
      </button>
      <p className="text-xs text-slate-400">Moving an approved lead between regions changes their oversight assignment, not their employment contract, salary, or existing assistant appointments.</p>
    </section>
    <section className="space-y-3">
      <h2 className="text-xl font-black">Regional Manager daily reports</h2>
      {!report.managers.length?<p className="border border-amber-300/20 p-4 text-amber-100">No active ordinary Regional Manager appointment. Approve an application and make an appointment before assigning staff.</p>:
      <div className="grid gap-3 lg:grid-cols-2">
        {report.managers.map(m=>{
          const people=report.team.filter(t=>t.manager_id===m.manager_id)
          return <article key={m.manager_id} className="space-y-3 rounded-xl border border-white/15 bg-slate-950/70 p-4">
            <h3 className="text-lg font-bold">{m.name} · {m.source_role}</h3>
            <p className="text-xs text-amber-100">Regional System Switch Gate · {m.region||'Assigned Region'}</p>
            <p className="text-xs leading-5 text-slate-300">
              {m.current_direction?'Current manager direction: '+m.current_direction:'No regional direction published yet'}
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="border-t border-white/10 pt-2"><p className="text-slate-400">Assigned staff</p><p className="mt-1 text-xl font-bold">{m.staff}</p></div>
              <div className="border-t border-white/10 pt-2"><p className="text-slate-400">Today's check-ins</p><p className="mt-1 text-xl font-bold">{m.checkins}</p></div>
              <div className="border-t border-white/10 pt-2"><p className="text-slate-400">Need support</p><p className="mt-1 text-xl font-bold">{m.needs_help}</p></div>
              <div className="border-t border-white/10 pt-2"><p className="text-slate-400">Open tasks</p><p className="mt-1 text-xl font-bold">{m.tasks_open}</p></div>
              <div className="border-t border-white/10 pt-2"><p className="text-slate-400">Completed tasks</p><p className="mt-1 text-xl font-bold">{m.tasks_completed}</p></div>
              <div className="border-t border-white/10 pt-2"><p className="text-slate-400">Assistants</p><p className="mt-1 text-xl font-bold">{m.assistants}</p></div>
            </div>
            <div data-administrations-regional-support-metrics="verified" className="rounded-xl border border-amber-200/20 bg-amber-200/[.035] p-4 text-sm">
              <h4 className="font-bold text-amber-100">One-to-one Work Support</h4>
              {report.supportAvailable?<>
                <p className="mt-2 text-slate-200">Cases awaiting resolution: <strong>{m.support_cases_pending??0}</strong></p>
                <p className="mt-2 text-slate-200">Outstanding used System Switch advances: <strong>{Number(m.support_due_system_switch||0).toLocaleString('en-NG')}</strong></p>
                <p className="mt-1 text-slate-200">Outstanding independently verified NGN stock repayments: <strong>₦{Number(m.support_due_ngn||0).toLocaleString('en-NG')}</strong></p>
              </>:<p role="alert" className="mt-2 text-amber-200">Financial support records are unavailable; do not infer zero outstanding.</p>}
              <Link href="/weave/lifestyles/support" className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-amber-200/30 px-4 py-2 text-sm font-semibold text-amber-100">Open Administrations Support and verification records</Link>
            </div>
            {!people.length?<p className="text-xs text-slate-400">No assigned staff yet.</p>:
            <div className="space-y-2">
              {people.map((p,i)=>{
                const kind=p.position==='Bridger'?'bridger':p.position==='Agent'?'agent':
                  p.position==='Distribution Manager'?'distribution':
                    p.position==='Food Distribution Manager'?'food':null
                return <div key={p.user_id+'-'+i} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-xs">
                  <div><p className="font-semibold text-white">{p.name}</p><p className="text-slate-400">{p.position} · {p.level}</p></div>
                  {kind&&<button disabled={working}
                    onClick={()=>void mutate('unassign',p.user_id,kind,m.manager_id)}
                    className="rounded-lg border border-rose-300/25 px-2 py-2 text-rose-200 disabled:opacity-50">End regional assignment</button>}
                </div>
              })}
            </div>}
          </article>
        })}
      </div>}
    </section>
    <footer className="text-xs leading-6 text-slate-400">Staff assignment and supervision never authorize financial settlement, ownership changes or salary payments. Reports represent authorized staff activity, not proof of revenue.</footer>
  </main>
}
