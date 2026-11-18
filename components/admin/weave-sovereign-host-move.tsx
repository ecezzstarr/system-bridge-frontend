'use client'
import {useCallback,useEffect,useState} from 'react'
import {ArrowRight,CheckCircle2,ClipboardCheck,ShieldCheck,Server,Undo2} from 'lucide-react'
import {useAuth} from '@/lib/auth-provider'

type NodeReport={nodeId:string;ready:boolean;fresh:boolean;releaseSha:string|null;
 sharedCurrentDatabase:boolean;continuityMode:string}
type Plan={
 id:string;node_id:string;target_ipv4:string;release_sha:string;
 stage:'prepared'|'authorized'|'dns_observed'|'confirmed'|'cancelled'
 created_at:string;authorized_at:string|null;dns_observed_at:string|null;confirmed_at:string|null
 company_attestations:Record<string,boolean>
}
const before=[
 {key:'separateMediaVerified',label:'Full existing media and Customer Door assets were transferred and compared to the source.'},
 {key:'backupsAndRestoreVerified',label:'An encrypted offsite backup and a real, isolated restore drill have been verified.'},
 {key:'paymentAndCallbackPlanVerified',label:'Payment provider callbacks, settlement, idempotency and payment freeze/failover are planned and verified.'},
 {key:'operatorFailbackPlanVerified',label:'There is a documented reversible host switch plan; Oracle remains accessible for recovery.'},
 {key:'workforceAccessVerified',label:'Agents, Bridgers, Clients and Administrations access has been tested without fresh registration.'},
] as const
const after=[
 {key:'liveUserSessionsChecked',label:'Existing user sessions and login continuity checked on the new host.'},
 {key:'fileFoldersChecked',label:'Client File Numbers and File Folder ownership checked end to end.'},
 {key:'balancesAndLedgerChecked',label:'Wallet balances, transaction ledgers, commission and settlement records reconciled.'},
 {key:'mediaAndCustomerDoorsChecked',label:'Media files, Client Customer Doors and purchased systems checked.'},
 {key:'paymentCallbacksChecked',label:'Payment callbacks, live orders and company notifications checked.'},
] as const
const field='mt-2 w-full rounded-xl border border-white/20 bg-[#071c2d] p-3 text-sm text-white outline-none focus:border-cyan-200/60'
const button='inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-200/35 px-4 py-3 text-sm font-semibold text-cyan-100 disabled:opacity-40'
export function WeaveSovereignHostMove({nodes}:{nodes:NodeReport[]}){
 const {token}=useAuth()
 const [plans,setPlans]=useState<Plan[]>([])
 const [loaded,setLoaded]=useState(false)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [nodeId,setNodeId]=useState('')
 const [targetIpv4,setTargetIpv4]=useState('')
 const [phrase,setPhrase]=useState('')
 const [checked,setChecked]=useState<Record<string,boolean>>({})
 const load=useCallback(async()=>{
  if(!token)return
  const res=await fetch('/api/admin/sovereign-host-transition',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
  const data=await res.json().catch(()=>({}))
  if(!res.ok||!data.success)throw Error(data.error||'Manual transition register not available')
  setPlans(data.plans||[])
  setLoaded(true)
 },[token])
 useEffect(()=>{if(token)void load().catch(e=>setError(e.message))},[token,load])
 const current=plans.find(p=>!['confirmed','cancelled'].includes(p.stage))||null
 const choice=nodes.find(n=>n.nodeId===nodeId)||null
 const choices=nodes.filter(n=>n.ready&&n.sharedCurrentDatabase)
 const submit=async(action:string,data:Record<string,unknown>)=>{
  if(!token)return
  setBusy(true);setError('');setNotice('')
  try{
   const res=await fetch('/api/admin/sovereign-host-transition',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({action,...data}),
   })
   const result=await res.json().catch(()=>({}))
   if(!res.ok||!result.success)throw Error(result.error||'Company transition action refused')
   setNotice(result.note||'Step recorded in the company transition register.')
   setPhrase('');setChecked({})
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Step not accepted')}
  finally{setBusy(false)}
 }
 const checks=(items:readonly {key:string;label:string}[])=>
  <div className="mt-4 space-y-3">
   {items.map(item=><label key={item.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[.035] p-4">
    <input type="checkbox" checked={Boolean(checked[item.key])}
     onChange={e=>setChecked(previous=>({...previous,[item.key]:e.target.checked}))}
     className="mt-1 h-5 w-5 shrink-0 accent-cyan-200"/>
    <span className="text-sm leading-6 text-slate-200">{item.label}</span>
   </label>)}
  </div>
 const ready=(items:readonly {key:string;label:string}[])=>items.every(item=>checked[item.key]===true)
 const entry=(expected:string,label:string)=><label className="mt-5 block text-xs font-semibold text-amber-100">
  Type {expected} to confirm this recorded step
  <input className={field} autoComplete="off" value={phrase} onChange={e=>setPhrase(e.target.value)} placeholder={expected}/>
 </label>
 return <section className="space-y-5 rounded-3xl border border-[#e8c997]/25 bg-[#0c2335] p-5 text-white sm:p-8"
  data-weave-sovereign-manual-move="company-authorized">
  <header>
   <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#ecd4a7]"><ShieldCheck size={17}/> Administrations · Manual company host transition</p>
   <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Carry every user into the same Weave</h2>
   <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-200">
    The first host move must keep the existing production PostgreSQL database. The new host is not allowed to replace user accounts, File Numbers, transaction records or wallets with a fresh database. Each step requires a deliberate Administrations decision.
   </p>
   <p className="mt-2 text-xs leading-6 text-amber-100">
    No action here changes Oracle, the DNS provider, financial credentials or the existing Release Workshop. Actual routing must be changed separately by an authorized infrastructure operator, then verified here.
   </p>
  </header>
  {error&&<p role="alert" className="rounded-xl border border-rose-300/30 p-4 text-sm text-rose-100">{error}</p>}
  {notice&&<p role="status" className="rounded-xl border border-cyan-200/30 p-4 text-sm text-cyan-100">{notice}</p>}
  {!loaded&&<p className="text-sm text-slate-400">Reading protected migration history…</p>}
  {loaded&&!current&&<div className="space-y-4 rounded-2xl border border-white/10 p-5">
   <h3 className="flex items-center gap-2 text-lg font-bold"><Server size={19}/> Prepare one company host transition</h3>
   <p className="text-sm leading-6 text-slate-300">Only candidates with recent passing readiness evidence AND the same existing production database endpoint may be selected. This comparison verifies configuration, not ownership or full record reconciliation.</p>
   {choices.length===0?<p className="text-sm text-amber-100">No ready candidate using the same production database has reported. Oracle stays active.</p>:
    <label className="block text-xs font-semibold text-slate-200">Verified candidate
     <select className={field} value={nodeId} onChange={e=>setNodeId(e.target.value)}>
      <option value="">Choose a separate host</option>
      {choices.map(node=><option key={node.nodeId} value={node.nodeId}>{node.nodeId} · {node.releaseSha?.slice(0,12)}</option>)}
     </select>
    </label>}
   <label className="block text-xs font-semibold text-slate-200">Candidate's public IPv4 address
    <input className={field} value={targetIpv4} onChange={e=>setTargetIpv4(e.target.value)} placeholder="Server's real public IPv4 address"/>
   </label>
   <button type="button" className={button} disabled={busy||!choice?.ready||!choice?.sharedCurrentDatabase||!targetIpv4.trim()}
    onClick={()=>void submit('prepare',{nodeId,targetIpv4:targetIpv4.trim()})}>
    <ClipboardCheck size={17}/> Record migration preparation
   </button>
  </div>}
  {current&&<div className="space-y-5 rounded-2xl border border-white/10 bg-black/15 p-5">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><p className="text-xs uppercase tracking-wide text-slate-400">Current manual movement</p>
     <h3 className="mt-2 text-lg font-bold">{current.node_id} · {current.stage.replaceAll('_',' ')}</h3>
     <p className="mt-1 break-all text-xs text-slate-300">Candidate IP: {current.target_ipv4} · Exact release: {current.release_sha}</p></div>
    <span className="rounded-full border border-amber-200/30 px-3 py-2 text-xs text-amber-100">Oracle preserved</span>
   </div>
   {current.stage==='prepared'&&<>
    <p className="text-sm leading-7 text-slate-300">Verify and acknowledge every requirement before the company authorizes a routing change. No command will be sent to the host or DNS provider.</p>
    {checks(before)}
    {entry('AUTHORIZE WEAVE HOST MOVE','Authorization')}
    <button type="button" className={button} disabled={busy||!ready(before)||phrase!=='AUTHORIZE WEAVE HOST MOVE'}
     onClick={()=>void submit('authorize',{planId:current.id,confirmation:phrase,attestations:checked})}>
     <ShieldCheck size={16}/> Record explicit company authorization
    </button>
   </>}
   {current.stage==='authorized'&&<>
    <p className="text-sm leading-7 text-slate-200">The company authorized a move. An appointed infrastructure operator must now adjust the DNS A record for <strong>weavingsystem.online</strong> to <strong>{current.target_ipv4}</strong> using the real DNS provider's access, while keeping Oracle available. The workshop itself does not make that change.</p>
    {entry('VERIFY MANUAL DNS SWITCH','DNS verification')}
    <button type="button" className={button} disabled={busy||phrase!=='VERIFY MANUAL DNS SWITCH'}
     onClick={()=>void submit('verify_dns',{planId:current.id,confirmation:phrase})}>
     <ArrowRight size={16}/> Verify independently changed public routing
    </button>
   </>}
   {current.stage==='dns_observed'&&<>
    <p className="text-sm leading-7 text-slate-200">Public DNS and basic application readiness have been observed. Administrations must still verify existing accounts and financial records before recording a completed business transition. Oracle must remain available for controlled recovery.</p>
    {checks(after)}
    {entry('CONFIRM WEAVE OWNED HOST','Final acceptance')}
    <button type="button" className={button} disabled={busy||!ready(after)||phrase!=='CONFIRM WEAVE OWNED HOST'}
     onClick={()=>void submit('confirm',{planId:current.id,confirmation:phrase,attestations:checked})}>
     <CheckCircle2 size={16}/> Confirm user and record continuity
    </button>
   </>}
   {(current.stage==='prepared'||current.stage==='authorized')&&
    <div className="border-t border-white/10 pt-5">
     {entry('CANCEL WEAVE HOST MOVE','Cancellation')}
     <button type="button" className={button} disabled={busy||phrase!=='CANCEL WEAVE HOST MOVE'}
      onClick={()=>void submit('cancel',{planId:current.id,confirmation:phrase})}>
      <Undo2 size={15}/> Cancel a pre-DNS plan
     </button>
    </div>}
  </div>}
  {loaded&&plans.length>0&&<div className="space-y-3 border-t border-white/10 pt-5">
   <h3 className="text-lg font-bold">Transition record history</h3>
   {plans.map(plan=><div key={plan.id} className="rounded-xl border border-white/10 p-4">
    <p className="text-sm font-semibold">{plan.node_id} · {plan.stage.replaceAll('_',' ')}</p>
    <p className="mt-1 text-xs text-slate-400">{new Date(plan.created_at).toLocaleString()} · {plan.target_ipv4}</p>
   </div>)}
   <button type="button" className={button} disabled={busy} onClick={()=>void load().catch(e=>setError(e.message))}>
    <ArrowRight size={14}/> Refresh recorded movement
   </button>
  </div>}
 </section>
}
