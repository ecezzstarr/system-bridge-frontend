'use client'
import Link from 'next/link'
import { useCallback,useEffect,useState } from 'react'
import { getClientToken } from '@/lib/client-auth'

type Item = {id:string;prospect_name:string;organization:string|null;stage:string;next_action:string|null;created_at:string}
type Position = {position_title:string;monthly_salary_usdt:number;ticket_amount_usdt:number;applicant_contribution_usdt:number;proposed_personal_loan_usdt:number;personal_loan_terms:string|null;folder_tier:string;file_number:string;receipt_number:string;verified_at:string}
type SiblingsEvent={reportedAmountUSDT:number;verifiedAmountUSDT:number;status:string;notice:string;proActivated:boolean;workspaceAccess:boolean}
type ClientRegional={positionType:'pro_regional_manager';department:'Dream Lovely';scope:'client_business_expansion';country:string|null;
 region:string|null;city:string|null;locationStatus:string}
const stages=['introduced','conversation','follow_up','proposal','completed'] as const

export default function CompanyClientStaffWorkspace(){
  const [position,setPosition]=useState<Position|null>(null)
  const [items,setItems]=useState<Item[]>([])
  const [siblingsEvent,setSiblingsEvent]=useState<SiblingsEvent|null>(null)
  const [clientRegional,setClientRegional]=useState<ClientRegional|null>(null)
  const [name,setName]=useState('')
  const [org,setOrg]=useState('')
  const [next,setNext]=useState('')
  const [stage,setStage]=useState<string>('introduced')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notEmployed,setNotEmployed]=useState(false)
  const load=useCallback(async()=>{
    const token=getClientToken()
    if(!token){setError('Client sign-in required');setLoading(false);return}
    try{
      const r=await fetch('/api/client/staff-workspace',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
      const data=await r.json()
      if(!r.ok)throw new Error(data.error||'Unable to read workspace')
      if(!data.employed){setNotEmployed(true);setPosition(null);return}
      setNotEmployed(false);setPosition(data.position);setItems(data.activity||[]);setSiblingsEvent(data.siblingsEvent||null);setClientRegional(data.clientRegional||null);setError('')
    }catch(e:any){setError(e?.message||'Workspace unavailable')}
    finally{setLoading(false)}
  },[])
  useEffect(()=>{void load()},[load])

  async function send(body:Record<string,unknown>,method:'POST'|'PATCH'){
    const token=getClientToken()
    if(!token)return
    setBusy(true);setError('')
    try{
      const r=await fetch('/api/client/staff-workspace',{method,
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify(body)})
      const data=await r.json()
      if(!r.ok)throw new Error(data.error||'Unable to save work')
      if(method==='POST'){setName('');setOrg('');setNext('');setStage('introduced')}
      await load()
    }catch(e:any){setError(e?.message||'Unable to save work')}
    finally{setBusy(false)}
  }

  return <main className="min-h-dvh bg-[#06101b] px-4 py-7 text-white">
    <div className="mx-auto max-w-6xl space-y-7">
      <Link href="/client/dashboard" className="text-sm text-cyan-200">← Client dashboard</Link>
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-cyan-200">WEAVE · Private Client staff workspace</p>
        <h1 className="text-3xl font-black">My Company Position</h1>
      </header>
      {error&&<p role="alert" className="rounded-xl border border-rose-300/30 p-4 text-sm text-rose-200">{error}</p>}
      {loading&&<p className="text-sm text-slate-300">Reading your company position…</p>}
      {notEmployed&&<p className="rounded-xl border border-white/20 p-5 text-sm">This workspace is reserved for Clients with an Administration-approved employee offer. <Link href="/file-folder" className="text-cyan-200 underline">Return to File Folder</Link></p>}
      {position&&<>
        <section className="space-y-3 rounded-2xl border border-cyan-200/20 bg-cyan-300/[.06] p-5">
          <h2 className="text-2xl font-bold">{clientRegional?'Pro Regional Manager · Dream Lovely':position.position_title}</h2>
          <p className="text-sm text-slate-200">Company-granted {position.folder_tier.toUpperCase()} File Folder · {position.file_number}</p>
          <p className="text-sm text-slate-200">Agreed monthly company staff salary: {Number(position.monthly_salary_usdt)>0
           ?Number(position.monthly_salary_usdt).toLocaleString()+' USDT under the approved employment agreement'
           :position.file_number==='WEAVE-2026-0907-0001'
             ?'Salary record discrepancy — CJ has an agreed salary that Administration must reconcile.'
             :'To be confirmed with Administration'} Payments are made through the company payroll, independently of the Pro activation fee.</p>
          <p className="text-xs text-slate-400">Entry ticket: {Number(position.ticket_amount_usdt).toLocaleString()} USDT · Your verified contribution: {Number(position.applicant_contribution_usdt||position.ticket_amount_usdt).toLocaleString()} USDT · receipt {position.receipt_number}</p>
        </section>
        {siblingsEvent&&<section className="rounded-2xl border border-violet-300/25 bg-violet-300/[.06] p-5" data-cj-siblings-event="true">
          <p className="text-xs uppercase tracking-widest text-violet-200">Siblings Event · Mandate business earnings</p>
          <h2 className="mt-2 text-3xl font-bold">{siblingsEvent.reportedAmountUSDT.toLocaleString()} USDT</h2>
          <p className="mt-1 text-sm text-amber-200">Reported earnings · Pending source verification</p>
          <p className="mt-2 text-xs leading-6 text-slate-300">{siblingsEvent.notice}</p>
          <p className="mt-2 text-xs text-slate-400">Verified amount: {siblingsEvent.verifiedAmountUSDT.toLocaleString()} USDT · Other kinds of funds: Pending verification</p>
          <Link href="/client/pro-activation" className="mt-3 inline-block text-sm text-cyan-200 underline">View Pro activation and signing</Link>
        </section>}
        {clientRegional&&<section className="space-y-4 rounded-2xl border border-sky-300/30 p-5"
         data-pro-regional-manager="dream-lovely" data-company-operating-department="client"
         style={{background:'linear-gradient(130deg,color-mix(in srgb,var(--kingdom-ground,#243d57) 55%,#071524),#071422)'}}>
          <div className="flex flex-wrap items-center justify-between gap-3">
           <div><p className="text-xs uppercase tracking-widest text-sky-200">Dream Lovely · Client Department</p>
            <h2 className="mt-2 text-2xl font-bold">Pro Regional Manager · Dream Lovely Business Expansion</h2>
           </div>
           <span className="rounded-full border border-sky-300/30 px-3 py-1 text-xs text-sky-100">Pro File Folder · Radiant Blue</span>
          </div>
          <p className="text-sm leading-6 text-slate-200">Lead the expansion of Client businesses in the assigned territory. Work with operating business owners, grow Client File Folder businesses, form verified enterprise partnerships and connect opportunities to real Client systems. This is a Dream Lovely position, separate from Bridger outreach and Agent distribution.</p>
          <div className="grid gap-3 sm:grid-cols-2">
           <div className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <p className="text-xs text-sky-200">Company territory</p>
            <p className="mt-2 font-semibold">{[clientRegional.city,clientRegional.region,clientRegional.country].filter(Boolean).join(', ')||'Pending Administration assignment'}</p>
            <p className="mt-2 text-xs text-slate-400">{clientRegional.locationStatus==='identity_verified_territory_pending_company_confirmation'
             ?'Location submitted and identity reviewed; company territory confirmation remains separate.'
             :'Specific address and operating district are recorded during Pro activation and require Administration verification.'}</p>
           </div>
           <div className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <p className="text-xs text-sky-200">Operating department</p>
            <p className="mt-2 font-semibold">Dream Lovely · Client Business Expansion</p>
            <p className="mt-2 text-sm text-sky-100">Agreed monthly salary: {Number(position.monthly_salary_usdt)>0
              ?Number(position.monthly_salary_usdt).toLocaleString()+' USDT'
              :'Company record requires reconciliation'}</p>
            <p className="mt-2 text-xs text-slate-400">Her fixed monthly employment salary is recorded in the approved Client staff agreement. Verified Client business revenue and commissions are independent, and neither depends on a Bridger or Agent Lifestyle.</p>
           </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
           {[
            ['Business formation and expansion','Operate and grow your File Folder business, products, services and Client systems.','/client/system-switch'],
            ['Enterprise and Client partnerships','Build lasting Client business relationships and enterprise opportunities through existing systems.','/client/system-switch'],
            ['Customer Door and Store','Organize a business entrance and serve customers using your own approved systems.','/client/system-store'],
            ['Business Legions','Recruit and coordinate authorized staff for your own business where eligible.','/client/enterprise/legions'],
            ['Operating and construction systems','Develop modules, workshops and Client business capacity in your Pro kingdom.','/client/system-switch'],
            ['Administration and position records','Review official company instructions, monthly pay terms, and verified performance.','/communications'],
           ].map(([title,detail,href])=><Link key={title} href={href} className="rounded-xl border border-sky-300/20 bg-slate-950/35 p-4">
            <h3 className="text-sm font-semibold text-sky-100">{title}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-300">{detail}</p>
           </Link>)}
          </div>
          <p className="text-xs text-slate-400">Agent food distribution, gift-card escrow, distribution management and Bridger Prospect Market do not form part of this Pro Regional Manager appointment.</p>
        </section>}
        {!clientRegional&&<section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[
            ['Business introductions','Discuss Client business use and enterprise growth opportunities.','/file-folder-preview'],
            ['File Folder systems','Inspect the services and authorized systems attached to a Client business.','/file-folder'],
            ['My File Folder','Open your own File Folder systems and operating workspaces.','/client/system-switch'],
            ['Position notices','Read approved company guidance and employment records.','/notifications'],
          ].map(([title,detail,href])=><Link key={title} href={href} className="rounded-xl border border-white/15 bg-white/[.04] p-5">
            <h3 className="font-bold text-cyan-200">{title}</h3><p className="mt-3 text-xs leading-5 text-slate-300">{detail}</p>
          </Link>)}
        </section>}
        <section className="space-y-4 rounded-2xl border border-white/10 p-5">
          <div><h2 className="text-xl font-bold">{clientRegional?'Client business expansion register':'Record business conversations'}</h2><p className="text-sm text-slate-400">Record actual Client business relationships, partnerships and expansion milestones. This register is not a Bridger Prospect Market, and it never invents a sale or credits commissions.</p></div>
          <form onSubmit={e=>{e.preventDefault();void send({prospectName:name,organization:org,stage,nextAction:next},'POST')}} className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">{clientRegional?'Client business / partner':'Business contact'}<input required value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
            <label className="text-sm">Organization<input value={org} onChange={e=>setOrg(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
            <label className="text-sm">{clientRegional?'Expansion relationship stage':'Conversation stage'}<select value={stage} onChange={e=>setStage(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3">{stages.map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select></label>
            <label className="text-sm">Next action<input value={next} onChange={e=>setNext(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
            <button disabled={busy} className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-40 md:col-span-2">{busy?'Recording…':clientRegional?'Record expansion activity':'Record conversation'}</button>
          </form>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">{clientRegional?'Client expansion relationships':'My active relationships'} · {items.length}</h2>
          {items.map(item=><article key={item.id} className="rounded-xl border border-white/10 bg-white/[.025] p-4">
            <div className="flex flex-wrap justify-between gap-2"><strong>{item.prospect_name} {item.organization?'· '+item.organization:''}</strong><span className="text-xs text-cyan-200">{item.stage.replaceAll('_',' ')}</span></div>
            <p className="mt-2 text-sm text-slate-300">Next: {item.next_action||'Awaiting next movement'}</p>
            {item.stage!=='completed'&&<button type="button" disabled={busy} onClick={()=>void send({id:item.id,stage:'follow_up',nextAction:item.next_action||''},'PATCH')} className="mt-3 text-xs text-cyan-200 underline disabled:opacity-40">Mark follow-up</button>}
          </article>)}
          {!items.length&&<p className="text-sm text-slate-400">No verified Client business expansion activities recorded yet.</p>}
        </section>
      </>}
    </div>
  </main>
}
