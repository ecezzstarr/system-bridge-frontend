'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'

type FormationCase={
  id:string;source_kind:string;source_id:string;client_id:string|null;file_number:string|null;
  purchase_value_system_switch:number|string;stage:string;business_brief:string|null;
  first_customer:string|null;first_offer:string|null;next_action:string|null;
  created_at:string;verified_at:string|null;activated_at:string|null
}
type Action={id:string;department:string;action_type:string;month_no:number|null;note:string;visibility:string;created_at:string}
type Event={id:string;kind:string;source_kind:string;source_id:string;formation_case_id:string|null;created_at:string}
type Income={
  available:boolean;targetSystemSwitch:number;verifiedReceiptsSystemSwitch:number|null;
  reportedOperatingCostsSystemSwitch:number|null;provisionalNetSystemSwitch:number|null;
  remainingSystemSwitch:number|null;recoveryPercent:number|null;targetAt:string|null;
  daysRemaining:number|null;passedFourMonths:boolean;status:string;note:string
}
type NextWork={available:boolean;offerCount:number|null;orderCount:number|null;paidSettlements:number|null;pendingOrders:number|null;nextAction:string;actor:string;href:string}
type State={
  success:boolean;mode:'client'|'guidance'|'administrations';departments:string[];
  cases:(FormationCase&{has_brief:boolean;action_count:number})[];
  selected:FormationCase|null;actions:Action[];events:Event[];income:Income|null;work:NextWork|null;
  milestones:{month:number;label:string;purpose:string}[];note:string
}
const names:Record<string,string>={mandate:'Mandate',forensic:'Forensics',lawyer:'Attorney',admin:'Administrations',client:'Client'}
const states:Record<string,string>={
  awaiting_verification:'Awaiting independent payment verification',awaiting_client:'Awaiting Client activation',
  planning:'Business planning',building:'Building operating systems',selling:'Serving customers',
  review:'Business performance review',closed:'Case closed',
}
const eventNames:Record<string,string>={
  prospect_purchased:'Bridger acquired Prospect material',
  file_folder_payment_submitted:'File Folder payment submitted',
  file_folder_verified:'File Folder purchase verified',
  bridge_payment_submitted:'Bridge payment submitted',
  bridge_deposit_verified:'Bridge File Folder verified'
}
const money=(value:number|null|undefined)=>value==null?'Not available':Number(value).toLocaleString('en-NG',{maximumFractionDigits:2})+' System Switch'
const date=(value:string|null|undefined)=>value?new Date(value).toLocaleDateString('en-NG',{year:'numeric',month:'short',day:'numeric'}):'Not yet'
const panel='rounded-2xl border border-[#c9b789]/25 bg-[#122330] p-4 sm:p-6'
const field='mt-2 w-full min-h-11 rounded-xl border border-white/20 bg-[#081722] px-4 py-3 text-sm text-white placeholder:text-slate-400'
const btn='min-h-11 rounded-xl bg-[#e6cb87] px-5 py-2.5 text-sm font-bold text-[#102333] disabled:opacity-40'

export default function CompanyFormationPage(){
  const {token,isInitialized}=useAuth()
  const [state,setState]=useState<State|null>(null)
  const [chosen,setChosen]=useState('')
  const [brief,setBrief]=useState({businessBrief:'',firstCustomer:'',firstOffer:'',nextAction:''})
  const [note,setNote]=useState('')
  const [monthNo,setMonthNo]=useState('1')
  const [department,setDepartment]=useState('admin')
  const [internal,setInternal]=useState(false)
  const [stage,setStage]=useState('planning')
  const [error,setError]=useState('')
  const [feedback,setFeedback]=useState('')
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(true)
  const headers=useCallback(()=>({Authorization:'Bearer '+(token||''),'Content-Type':'application/json'}),[token])
  const load=useCallback(async(caseId?:string)=>{
    if(!token)return
    try{
      const params=new URLSearchParams()
      if(caseId)params.set('caseId',caseId)
      const res=await fetch('/api/company/formation'+(params.toString()?'?'+params.toString():''),
        {headers:headers(),cache:'no-store'})
      const body=await res.json().catch(()=>({}))
      if(!res.ok||!body.success)throw new Error(body.error||'Formation records are unavailable')
      setState(body as State)
      setChosen(body.selected?.id||'')
      setDepartment(current=>current==='admin'&&body.mode==='guidance'?
        (body.departments[0]||'mandate'):current)
      setError('')
    }catch(e){setError(e instanceof Error?e.message:'Unable to load formation')}
    finally{setLoading(false)}
  },[token,headers])
  useEffect(()=>{
    if(!isInitialized||!token)return
    const requested=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('caseId'):null
    void load(requested||undefined)
  },[isInitialized,token,load])
  useEffect(()=>{
    if(!token||!chosen)return
    const timer=setInterval(()=>void load(chosen),20000)
    return()=>clearInterval(timer)
  },[token,chosen,load])
  const selected=state?.selected
  useEffect(()=>{
    setBrief({businessBrief:selected?.business_brief||'',firstCustomer:selected?.first_customer||'',
      firstOffer:selected?.first_offer||'',nextAction:selected?.next_action||''})
    setStage(selected?.stage||'planning')
  },[selected?.id])
  const post=async(payload:Record<string,unknown>)=>{
    if(!token||!selected||busy)return
    setBusy(true);setFeedback('')
    try{
      const res=await fetch('/api/company/formation',{method:'POST',headers:headers(),body:JSON.stringify({caseId:selected.id,...payload})})
      const body=await res.json().catch(()=>({}))
      if(!res.ok||!body.success)throw new Error(body.error||'Formation record was not accepted')
      setFeedback('Company formation action recorded.')
      setNote('')
      await load(selected.id)
    }catch(e){setFeedback(e instanceof Error?e.message:'Unable to save formation action')}
    finally{setBusy(false)}
  }
  if(!isInitialized||loading)return <main className="mx-auto max-w-6xl p-6 text-slate-200">Reading authorized Company Formation records…</main>
  if(!state)return <main className="mx-auto max-w-4xl space-y-4 p-6 text-white">
    <Link href="/dashboard" className="text-[#e6cb87]">Return to Weave</Link>
    <p role="alert" className="text-rose-200">{error||'No active formation permission'}</p>
    <button className={btn} onClick={()=>void load()}>Retry</button>
  </main>
  const owner=state.mode==='client'
  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 text-white sm:px-6">
    <header className="space-y-3 border-b border-[#c9b789]/25 pb-5">
      <Link className="text-sm font-semibold text-[#e6cb87]" href={owner?'/client/system-switch':state.mode==='administrations'?'/admin/company-guidance':'/weave/lifestyles/mandate/inbox'}>
        ← Company operating environment
      </Link>
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#e6cb87]">Weave · The Company of Time · Business Formation</p>
      <h1 className="text-3xl font-black sm:text-4xl">{owner?'Your File Folder · Business Formation':'Company Formation · Four Departments'}</h1>
      <p className="max-w-4xl text-sm leading-7 text-slate-300">
        A File Folder is a continuing business environment. Clients define real work; Forensics checks records,
        Mandate organizes authorized action, Attorney clarifies agreements and Administrations verifies and coordinates.
        The four-month objective is to work toward recovering the purchase cost through actual income, not a promised financial return.
      </p>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/company/loops" className="rounded-xl border border-white/20 px-3 py-2 text-[#e6cb87]">Company Loop Events</Link>
        <Link href="/event" className="rounded-xl border border-white/20 px-3 py-2 text-[#e6cb87]">Burning River</Link>
        {owner&&<Link href="/client/system-switch#business" className="rounded-xl border border-white/20 px-3 py-2 text-[#e6cb87]">Customer Door & Income Records</Link>}
        <button className="rounded-xl border border-white/20 px-3 py-2" onClick={()=>void load(chosen||undefined)} disabled={busy}>Refresh verified records</button>
      </div>
    </header>
    {error&&<p role="alert" className="text-rose-200">{error}</p>}
    {feedback&&<p role="status" className="rounded-xl border border-[#e6cb87]/25 p-3 text-sm text-[#e6cb87]">{feedback}</p>}
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <section className={panel}>
          <h2 className="text-lg font-bold">{owner?'Your File Folders':'Company File Folder cases'} · {state.cases.length}</h2>
          <div className="mt-4 space-y-2">
            {state.cases.map(c=><button type="button" key={c.id}
              onClick={()=>{setChosen(c.id);void load(c.id)}}
              className={'w-full rounded-xl border p-3 text-left text-sm '+(chosen===c.id?'border-[#e6cb87] bg-[#e6cb87]/10':'border-white/15')}>
              <p className="font-semibold">{c.file_number||'Pending File Number'}</p>
              <p className="mt-1 text-xs text-slate-300">{states[c.stage]||c.stage}</p>
              <p className="mt-1 text-xs text-slate-400">{date(c.created_at)}</p>
            </button>)}
            {!state.cases.length&&<p className="text-sm text-slate-300">
              {owner?'No verified File Folder formation is attached yet. Register or activate your issued File Number to begin.':'No File Folder formation cases have been recorded. They open from committed purchase records.'}
            </p>}
          </div>
        </section>
        {!owner&&<section className={panel}>
          <h2 className="text-lg font-bold">Company commercial alerts · {state.events.length}</h2>
          <p className="mt-2 text-xs leading-6 text-slate-300">These are company records, not verified customer income. Prospect materials are not Clients and submitted payments require verification.</p>
          <div className="mt-4 max-h-96 space-y-2 overflow-auto">
            {state.events.map(e=><button type="button" key={e.id} disabled={!e.formation_case_id}
              onClick={()=>{if(e.formation_case_id)void load(e.formation_case_id)}}
              className="block w-full rounded-lg border border-white/10 p-3 text-left text-xs disabled:opacity-75">
              <p className="font-medium">{eventNames[e.kind]||e.kind}</p>
              <p className="mt-1 text-slate-400">{date(e.created_at)} · {e.source_kind.replaceAll('_',' ')}</p>
            </button>)}
            {!state.events.length&&<p className="text-xs text-slate-400">No commercial alerts recorded yet.</p>}
          </div>
        </section>}
      </aside>
      <div className="space-y-5">
        {selected?<><section className={panel}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#e6cb87]">Client File Folder</p>
              <h2 className="mt-2 text-xl font-bold">{selected.file_number||'Payment verification pending'}</h2>
              <p className="mt-1 text-sm text-slate-300">{states[selected.stage]||selected.stage}</p>
            </div>
            <p className="rounded-xl border border-white/15 px-3 py-2 text-xs text-slate-300">
              Activated {date(selected.activated_at)}
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['File Folder purchase objective',money(state.income?.targetSystemSwitch)],
              ['Verified Customer Door income',money(state.income?.verifiedReceiptsSystemSwitch)],
              ['Reported operating costs',money(state.income?.reportedOperatingCostsSystemSwitch)],
              ['Provisional net movement',money(state.income?.provisionalNetSystemSwitch)],
            ].map(([title,value])=><div key={title} className="rounded-xl border border-white/10 p-3">
              <p className="text-xs text-slate-300">{title}</p>
              <p className="mt-2 text-base font-bold">{value}</p>
            </div>)}
          </div>
          <div className="mt-5 rounded-xl border border-[#e6cb87]/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold">Four-month cost-recovery objective</h3>
              <span className="text-sm text-[#e6cb87]">{state.income?.recoveryPercent==null?'Awaiting income records':state.income.recoveryPercent+'% of target (provisional)'}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[#e6cb87]"
              style={{width:Math.min(100,Math.max(0,state.income?.recoveryPercent||0))+'%'}}/></div>
            <p className="mt-3 text-sm text-slate-300">Target date: {date(state.income?.targetAt)} · Days remaining: {state.income?.daysRemaining??'Not started'}</p>
            <p className="mt-2 text-sm text-slate-300">
              {state.income?.status==='provisional_target_met'?'Verified in-system receipts, after reported operating costs, currently meet the purchase target; independent reconciliation is still required.':
                state.income?.status==='target_unmet'?'The four-month objective is not met in the recorded business ledger. Continue practical business support and review actual obstacles.':
                state.income?.status==='records_unavailable'?'Some accounting records are unavailable. No income has been inferred.':
                state.income?.status==='awaiting_activation'?'The four-month operating window starts at real Client activation.':
                'The Client is working toward the four-month income objective through actual business activity.'}
            </p>
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-400">{state.income?.note}</p>
        </section>

        {state.work&&<section className={panel}>
          <p className="text-xs font-bold uppercase tracking-widest text-[#e6cb87]">Today's business responsibility</p>
          <h2 className="mt-2 text-xl font-bold">Next practical income-generating work</h2>
          <p className="mt-2 text-sm font-semibold text-[#e6cb87]">{state.work.actor}</p>
          <p className="mt-3 text-sm leading-7 text-slate-200">{state.work.nextAction}</p>
          {state.work.available&&<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Live offers',state.work.offerCount],
              ['Customer orders',state.work.orderCount],
              ['Awaiting payment',state.work.pendingOrders],
              ['Funded settlements',state.work.paidSettlements],
            ].map(([label,value])=><div key={String(label)} className="rounded-xl border border-white/15 p-3">
              <p className="text-xs text-slate-300">{label}</p>
              <p className="mt-2 text-xl font-bold">{value??'Unavailable'}</p>
            </div>)}
          </div>}
          <Link href={state.work.href} className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[#e6cb87]/40 px-4 py-2 text-sm font-semibold text-[#e6cb87]">Open the operating workstation</Link>
        </section>}

        <section className={panel}>
          <h2 className="text-xl font-bold">Four months of practical business formation</h2>
          <p className="mt-2 text-sm text-slate-300">Departments follow the Client's real business purpose and the Company's shared Loop Events. Participation alone does not create income.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {state.milestones.map(m=><article key={m.month} className="rounded-xl border border-white/15 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#e6cb87]">Month {m.month}</p>
              <h3 className="mt-2 font-bold">{m.label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{m.purpose}</p>
              <p className="mt-2 text-xs text-slate-400">{state.actions.filter(a=>a.month_no===m.month).length} recorded actions</p>
            </article>)}
          </div>
        </section>

        {owner&&<section className={panel}>
          <h2 className="text-xl font-bold">Your business direction</h2>
          <p className="mt-2 text-sm text-slate-300">Tell the company what you actually intend to sell, who needs it, and how you will begin. Each revision stays recorded.</p>
          <div className="mt-4 grid gap-3">
            <label className="text-sm">Business purpose<textarea rows={3} className={field} maxLength={2000} value={brief.businessBrief}
              onChange={e=>setBrief(b=>({...b,businessBrief:e.target.value}))} placeholder="Describe a real business you want to operate within your File Folder"/></label>
            <label className="text-sm">First customer group<textarea rows={2} className={field} maxLength={700} value={brief.firstCustomer}
              onChange={e=>setBrief(b=>({...b,firstCustomer:e.target.value}))} placeholder="Who needs this product or service?"/></label>
            <label className="text-sm">First offer<textarea rows={2} className={field} maxLength={700} value={brief.firstOffer}
              onChange={e=>setBrief(b=>({...b,firstOffer:e.target.value}))} placeholder="What will you sell or deliver?"/></label>
            <label className="text-sm">Next practical action<textarea rows={2} className={field} maxLength={700} value={brief.nextAction}
              onChange={e=>setBrief(b=>({...b,nextAction:e.target.value}))} placeholder="What can you do next with your File Folder?"/></label>
          </div>
          <button className={btn+' mt-4'} disabled={busy||!selected.activated_at||!selected.verified_at}
            onClick={()=>void post({action:'save_brief',...brief})}>Record business direction</button>
          {!selected.activated_at&&<p className="mt-2 text-xs text-amber-200">Complete verified File Number registration and activation first.</p>}
        </section>}

        <section className={panel}>
          <h2 className="text-xl font-bold">Company participation and recorded guidance</h2>
          <div className="mt-4 space-y-3">
            {state.actions.map(a=><article key={a.id} className="rounded-xl border border-white/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm text-[#e6cb87]">{names[a.department]||a.department} · {a.action_type.replaceAll('_',' ')}</strong>
                <span className="text-xs text-slate-400">{date(a.created_at)}</span>
              </div>
              {a.month_no&&<p className="mt-2 text-xs text-slate-400">Month {a.month_no}</p>}
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{a.note}</p>
              {a.visibility==='internal'&&<p className="mt-2 text-xs text-amber-100">Company guidance staff only</p>}
            </article>)}
            {!state.actions.length&&<p className="text-sm text-slate-300">No business guidance recorded yet. Begin with the Client's practical business brief.</p>}
          </div>
          <div className="mt-5 border-t border-white/15 pt-4">
            <label className="block text-sm font-semibold">{owner?'Record a business update':'Record authorized company guidance'}
              <textarea rows={4} className={field} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}
                placeholder={owner?'Report real progress, customers, challenges or support needed':'Record concrete advice, support actions and evidence for the Client'} />
            </label>
            {!owner&&<div className="mt-3 grid gap-3 sm:grid-cols-3">
              {state.mode==='guidance'&&<label className="text-sm">Your appointed department<select className={field}
                value={department} onChange={e=>setDepartment(e.target.value)}>
                {state.departments.map(d=><option key={d} value={d}>{names[d]||d}</option>)}
              </select></label>}
              <label className="text-sm">Formation month<select className={field}
                value={monthNo} onChange={e=>setMonthNo(e.target.value)}>
                {[1,2,3,4].map(m=><option key={m} value={m}>Month {m}</option>)}
              </select></label>
              <label className="flex items-center gap-3 pt-5 text-sm"><input type="checkbox" checked={internal} onChange={e=>setInternal(e.target.checked)}/>
                Staff-only working note</label>
            </div>}
            <button type="button" className={btn+' mt-4'} disabled={busy||!selected.verified_at||!note.trim()}
              onClick={()=>void post({action:'add_note',note,department,monthNo:owner?null:Number(monthNo),internal})}>
              Record action
            </button>
          </div>
          {!owner&&<div className="mt-5 rounded-xl border border-white/15 p-4">
            <h3 className="font-semibold">Advance authorized business stage</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              <select className={field+' max-w-xs'} value={stage} onChange={e=>setStage(e.target.value)}>
                {['planning','building','selling','review','closed'].map(s=><option key={s} value={s}>{states[s]}</option>)}
              </select>
              <button className={btn} disabled={busy||!selected.verified_at||!selected.activated_at||note.trim().length<15}
                onClick={()=>void post({action:'advance_stage',stage,note,department})}>Advance with recorded evidence</button>
            </div>
            <p className="mt-2 text-xs text-slate-400">Stages organize business work; they do not certify revenue, client profit, or independent legal approval.</p>
          </div>}
        </section></>:<section className={panel}><p className="text-sm text-slate-300">Select a File Folder formation case. A purchase may be pending verification or awaiting the Client's registration before business work begins.</p></section>}
      </div>
    </div>
  </main>
}
