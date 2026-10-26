'use client'
import Link from 'next/link'
import { useCallback,useEffect,useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft,ShieldCheck,Send,RefreshCcw } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { visiblePoll } from '@/lib/visible-poll'

type Order={
 id:string;requester_id:string;requester_role:string;requester_name:string;requester_username:string;
 period_month:string;amount_ngn:string;source_reference:string;
 recipient_account_name:string;recipient_bank:string;recipient_account_number:string;
 status:string;support_kind?:string;purpose?:string;note:string;
 verification_reference?:string|null;transfer_reference?:string|null;review_note?:string|null;created_at:string;
}
type Guidance={id:string;department:string;guidance_note:string;created_at:string;author_name:string}
type Beneficiary={id:string;kind:string;display_name:string;bank_name:string;account_number:string;monthly_amount_ngn:string;recurring:boolean;active:boolean}
type Board={canReview:boolean;canGuide:string[];orders:Order[];monthlyRule:string;error?:string}
const cash=(v:number|string)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(v)||0)
const field='mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-emerald-300'
const monthToday=()=>new Date().toISOString().slice(0,7)

export default function FamilySupportBoard(){
 const {user,token,isInitialized}=useAuth()
 const [board,setBoard]=useState<Board|null>(null)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [busy,setBusy]=useState('')
 const [amountNgn,setAmount]=useState('')
 const [periodMonth,setMonth]=useState(monthToday)
 const [sourceReference,setReference]=useState('')
 const [recipientAccountName,setName]=useState('')
 const [recipientBank,setBank]=useState('')
 const [recipientAccountNumber,setNumber]=useState('')
 const [supportKind,setKind]=useState('child')
 const [purpose,setPurpose]=useState('education_food_activities')
 const [recurring,setRecurring]=useState(true)
 const [relationshipConfirmed,setConfirmed]=useState(false)
 const [note,setNote]=useState('')
 const [evidence,setEvidence]=useState<Record<string,string>>({})
 const [fundingRefs,setFundingRefs]=useState<Record<string,string>>({})
 const [reviewNotes,setReviewNotes]=useState<Record<string,string>>({})
 const [guideNotes,setGuideNotes]=useState<Record<string,string>>({})
 const [selectedGuidance,setSelectedGuidance]=useState('')
 const [guidance,setGuidance]=useState<Guidance[]>([])
 const [beneficiaries,setBeneficiaries]=useState<Beneficiary[]>([])
 const [department,setDepartment]=useState('mandate')
 const headers=useCallback(()=>({Authorization:'Bearer '+(token||'')}),[token])
 const load=useCallback(async()=>{
  if(!token)return
  try{
   const r=await fetch('/api/child-support/orders',{headers:headers(),cache:'no-store'})
   const data=await r.json()
   if(!r.ok)throw new Error(data.error||'Board unavailable')
   setBoard(data);setError('')
  }catch(e){setError(e instanceof Error?e.message:'Board unavailable')}
 },[token,headers])
 const loadBeneficiaries=useCallback(async()=>{
  if(!token)return
  try{
   const response=await fetch('/api/child-support/beneficiaries',{headers:headers(),cache:'no-store'})
   const data=await response.json()
   if(response.ok)setBeneficiaries(data.beneficiaries||[])
  }catch{} // The orders board reports authorization errors independently.
 },[token,headers])
 useEffect(()=>{void load();void loadBeneficiaries();return visiblePoll(()=>load(),20000,false)},[load,loadBeneficiaries])
 useEffect(()=>{if(board?.canGuide.length&&!board.canGuide.includes(department))setDepartment(board.canGuide[0])},[board?.canGuide?.join(','),department])

 async function submit(event:FormEvent){
  event.preventDefault();if(!token||busy)return
  setBusy('submit');setError('');setNotice('')
  try{
   const r=await fetch('/api/child-support/orders',{method:'POST',headers:{...headers(),'Content-Type':'application/json'},
    body:JSON.stringify({amountNgn:Number(amountNgn),periodMonth,sourceReference,
      recipientAccountName,recipientBank,recipientAccountNumber,supportKind,purpose,recurring,relationshipConfirmed,note})})
   const data=await r.json()
   if(!r.ok)throw new Error(data.error||'Submission failed')
   setNotice('Beneficiary registered. Forensics received the instruction; payment is not yet verified.')
   setAmount('');setReference('');setName('');setBank('');setNumber('');setNote('');setConfirmed(false)
   await load();await loadBeneficiaries()
  }catch(e){setError(e instanceof Error?e.message:'Submission failed')}
  finally{setBusy('')}
 }
 async function setMonthly(id:string,recurring:boolean){
  if(!token||busy)return
  setBusy('monthly:'+id);setError('')
  try{
   const response=await fetch('/api/child-support/beneficiaries',{method:'PATCH',
    headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify({beneficiaryId:id,recurring})})
   const data=await response.json()
   if(!response.ok)throw new Error(data.error||'Unable to change monthly plan')
   setNotice(recurring?'Monthly instruction preparation resumed.':'Future monthly instruction preparation paused.')
   await loadBeneficiaries()
  }catch(error){setError(error instanceof Error?error.message:'Update failed')}
  finally{setBusy('')}
 }
 async function fundMonthly(id:string){
  if(!token||busy)return
  setBusy('fund:'+id);setError('');setNotice('')
  try{
   const response=await fetch('/api/child-support/orders/'+encodeURIComponent(id)+'/funding',{
    method:'POST',headers:{...headers(),'Content-Type':'application/json'},
    body:JSON.stringify({sourceReference:fundingRefs[id]||''})})
   const data=await response.json()
   if(!response.ok)throw new Error(data.error||'Funding submission failed')
   setNotice('Monthly funding evidence submitted for Forensics verification.')
   setFundingRefs(v=>({...v,[id]:''}));await load()
  }catch(error){setError(error instanceof Error?error.message:'Funding submission failed')}
  finally{setBusy('')}
 }
 async function review(id:string,action:'verify_funds'|'record_transfer'|'reject'){
  if(!token||busy)return
  setBusy(id);setError('');setNotice('')
  try{
   const r=await fetch('/api/child-support/orders/'+encodeURIComponent(id),{method:'PATCH',
    headers:{...headers(),'Content-Type':'application/json'},
    body:JSON.stringify({action,reference:evidence[id]||'',note:reviewNotes[id]||''})})
   const data=await r.json()
   if(!r.ok)throw new Error(data.error||'Review failed')
   setNotice('Order updated. No bank transfer was initiated by WEAVE.')
   setEvidence(v=>({...v,[id]:''}));setReviewNotes(v=>({...v,[id]:''}))
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Review failed')}
  finally{setBusy('')}
 }
 async function openGuidance(id:string){
  if(selectedGuidance===id){setSelectedGuidance('');return}
  setSelectedGuidance(id);setGuidance([])
  try{
   const r=await fetch('/api/child-support/orders/'+encodeURIComponent(id)+'/guidance',{headers:headers(),cache:'no-store'})
   const data=await r.json()
   if(!r.ok)throw new Error(data.error||'Guidance unavailable')
   setGuidance(data.guidance||[])
  }catch(e){setError(e instanceof Error?e.message:'Guidance unavailable')}
 }
 async function addGuidance(id:string){
  if(!token||busy)return
  setBusy('guide:'+id);setError('')
  try{
   const r=await fetch('/api/child-support/orders/'+encodeURIComponent(id)+'/guidance',{
    method:'POST',headers:{...headers(),'Content-Type':'application/json'},
    body:JSON.stringify({department,note:guideNotes[id]||''})})
   const data=await r.json()
   if(!r.ok)throw new Error(data.error||'Guidance not saved')
   setGuideNotes(v=>({...v,[id]:''}))
   setNotice('Support-plan guidance recorded for the sender.')
   const rr=await fetch('/api/child-support/orders/'+encodeURIComponent(id)+'/guidance',{headers:headers(),cache:'no-store'})
   const dd=await rr.json()
   if(rr.ok)setGuidance(dd.guidance||[])
  }catch(e){setError(e instanceof Error?e.message:'Guidance not saved')}
  finally{setBusy('')}
 }
 if(!isInitialized)return <main className="p-6 text-white">Opening Family Support…</main>
 if(!user||!['admin','client','agent','bridger'].includes(user.role||''))return <main className="p-6 text-white">Active WEAVE account required.</main>
 const reviewer=Boolean(board?.canReview)
 const guides=board?.canGuide||[]
 return <main className="mx-auto max-w-6xl space-y-6 px-4 pb-20 pt-5 text-white" data-family-support="forensics-approved">
  <Link href="/weave/lifestyles" className="inline-flex items-center gap-2 text-xs text-emerald-200"><ArrowLeft size={15}/>Lifestyle</Link>
  <header className="border-b border-white/10 pb-5">
   <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-200"><ShieldCheck size={16}/>Weave · Family Support</p>
   <h1 className="mt-3 text-3xl font-black">Child & Parent Support</h1>
   <p className="mt-2 text-sm leading-6 text-stone-300">Register a loved one's payment account once and send monthly support instructions from your WEAVE activities. Only registered beneficiary accounts are eligible for your family support.</p>
   <p className="mt-2 text-xs text-stone-400">Stability Administration reserves ₦200 from every ₦1,000 received for child support in total, regardless of family size. Mandate and Attorney offer guidance toward education, nourishing food, care and constructive activities—not control of a family's personal decisions.</p>
  </header>
  {error&&<p role="alert" className="border border-rose-300/30 bg-rose-400/5 p-3 text-sm text-rose-200">{error}</p>}
  {notice&&<p role="status" className="border border-emerald-300/20 bg-emerald-400/5 p-3 text-sm text-emerald-200">{notice}</p>}
  <section className="border border-white/10 bg-white/[.025] p-4 sm:p-6">
   <h2 className="text-lg font-bold">Register loved one & submit support</h2>
   <p className="mt-2 text-xs leading-5 text-stone-400">A repeating instruction prepares future monthly requests. It does not deduct earnings or transfer funds automatically. Forensics must independently verify each funded month.</p>
   <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
    <label className="text-xs text-stone-300">Support for
     <select className={field} value={supportKind} onChange={e=>setKind(e.target.value)}>
      <option value="child">Child</option><option value="parent">Parent</option>
     </select>
    </label>
    <label className="text-xs text-stone-300">Monthly purpose
     <select className={field} value={purpose} onChange={e=>setPurpose(e.target.value)}>
      <option value="education_food_activities">Education · Food · Good activities</option>
      <option value="food_care">Food and care</option>
      <option value="education">Education</option>
      <option value="family_wellbeing">Family wellbeing</option>
     </select>
    </label>
    <label className="text-xs text-stone-300">Amount (₦)
     <input className={field} type="number" min="1" max="1000000000" step="1" required value={amountNgn} onChange={e=>setAmount(e.target.value)}/>
    </label>
    <label className="text-xs text-stone-300">Month
     <input className={field} type="month" required value={periodMonth} onChange={e=>setMonth(e.target.value)}/>
    </label>
    <label className="text-xs text-stone-300">Beneficiary account name
     <input className={field} maxLength={160} required value={recipientAccountName} onChange={e=>setName(e.target.value)}/>
    </label>
    <label className="text-xs text-stone-300">Beneficiary bank
     <input className={field} maxLength={120} required value={recipientBank} onChange={e=>setBank(e.target.value)}/>
    </label>
    <label className="text-xs text-stone-300">Beneficiary account number
     <input className={field} type="text" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required value={recipientAccountNumber} onChange={e=>setNumber(e.target.value)}/>
    </label>
    <label className="text-xs text-stone-300">WEAVE activity / funding reference
     <input className={field} minLength={5} maxLength={160} required value={sourceReference} onChange={e=>setReference(e.target.value)}/>
    </label>
    <label className="text-xs text-stone-300 sm:col-span-2">Optional family support note
     <textarea className={field} maxLength={800} rows={2} value={note} onChange={e=>setNote(e.target.value)}/>
    </label>
    <label className="flex items-center gap-3 text-xs text-stone-300 sm:col-span-2">
     <input type="checkbox" checked={recurring} onChange={e=>setRecurring(e.target.checked)}/>
     Prepare a support instruction each month for this account
    </label>
    <label className="flex items-start gap-3 text-xs leading-5 text-stone-300 sm:col-span-2">
     <input type="checkbox" className="mt-1" checked={relationshipConfirmed} onChange={e=>setConfirmed(e.target.checked)} required/>
     I am authorized to register this loved one's payment account and instruct family support. I understand that payment is subject to independent verification.
    </label>
    <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-300 px-4 py-3 text-xs font-black text-black disabled:opacity-40 sm:col-span-2"
      type="submit" disabled={busy!==''||!relationshipConfirmed||!amountNgn||sourceReference.length<5}><Send size={15}/>Register & send to Forensics</button>
   </form>
  </section>

  <section className="border border-white/10 p-4 sm:p-6">
   <h2 className="text-lg font-bold">My registered loved ones</h2>
   <p className="mt-2 text-xs leading-5 text-stone-400">These are payment beneficiaries registered by this account, not new WEAVE logins. You can stop future monthly instructions at any time; an order already funded still follows Forensics review.</p>
   {!beneficiaries.length&&<p className="mt-4 text-xs text-stone-400">No loved-one accounts have been registered.</p>}
   <div className="mt-4 space-y-3">
    {beneficiaries.map(person=><div key={person.id} className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-black/15 p-3">
     <div><p className="text-sm font-semibold">{person.kind==='parent'?'Parent':'Child'} · {person.display_name}</p>
      <p className="mt-1 text-xs text-stone-400">{person.bank_name} · account ending {person.account_number.slice(-4)} · {cash(person.monthly_amount_ngn)}/month</p></div>
     <button className="rounded-md border border-emerald-300/30 px-3 py-2 text-xs text-emerald-200 disabled:opacity-40"
      type="button" disabled={busy!==''} onClick={()=>void setMonthly(person.id,!person.recurring)}>
      {person.recurring?'Pause monthly instructions':'Resume monthly instructions'}
     </button>
    </div>)}
   </div>
  </section>
  <section className="border border-white/10 p-4 sm:p-6">
   <div className="flex items-center justify-between gap-3">
    <div><h2 className="text-lg font-bold">{reviewer?'Forensics transfer orders':guides.length?'Family support guidance queue':'My family support orders'}</h2>
     <p className="mt-1 text-xs text-stone-400">{board?.orders.length||0} orders · pending funding is not verified income</p></div>
    <button onClick={()=>void load()} type="button" aria-label="Refresh orders" className="border border-white/15 p-2 text-stone-300"><RefreshCcw size={16}/></button>
   </div>
   {!board&&<p className="mt-6 text-sm text-stone-400">Checking your appointment and orders…</p>}
   {board?.orders.length===0&&<p className="mt-6 text-sm text-stone-400">No support orders recorded yet.</p>}
   <div className="mt-5 space-y-4">
    {board?.orders.map(order=>{
     const own=order.requester_id===user.id
     const mayGuide=guides.length>0&&!own
     return <article key={order.id} className="rounded-xl border border-white/10 bg-black/15 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
       <div>
        <p className="text-sm font-bold">{order.support_kind==='parent'?'Parent':'Child'} · {order.requester_name||order.requester_username||order.requester_role}</p>
        <p className="mt-1 text-xs text-stone-400">{order.period_month} · {order.purpose?.replaceAll('_',' ')||'Family wellbeing'}</p>
        <p className="mt-2 text-xs text-stone-400">Status: <span className="font-bold text-emerald-200">{order.status.replaceAll('_',' ')}</span></p>
       </div>
       <p className="text-lg font-bold">{cash(order.amount_ngn)}</p>
      </div>
      {(reviewer||own)&&<p className="mt-3 break-words text-xs text-stone-400">Beneficiary: {order.recipient_account_name} · {order.recipient_bank} · {order.recipient_account_number}</p>}
      {order.review_note&&<p className="mt-3 text-xs text-amber-200">Forensics note: {order.review_note}</p>}
      {own&&<p className="mt-2 text-xs text-stone-400">Funding: {order.source_reference||'Not supplied'} · Transfer: {order.transfer_reference||'Not yet recorded'}</p>}
      {own&&order.status==='awaiting_funding'&&<div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row">
       <input className={field} placeholder="New month's WEAVE funding reference" minLength={5} maxLength={160}
        value={fundingRefs[order.id]||''} onChange={e=>setFundingRefs(v=>({...v,[order.id]:e.target.value}))}/>
       <button type="button" disabled={busy!==''||(fundingRefs[order.id]||'').trim().length<5}
        className="border border-emerald-300/35 px-4 py-2 text-xs font-bold text-emerald-200 disabled:opacity-40"
        onClick={()=>void fundMonthly(order.id)}>Send funding to Forensics</button>
      </div>}
      {reviewer&&!own&&['submitted','funds_verified'].includes(order.status)&&<div className="mt-4 grid gap-3 border-t border-white/10 pt-4">
       <input className={field} placeholder="Independent bank verification / transfer receipt reference" value={evidence[order.id]||''} onChange={e=>setEvidence(v=>({...v,[order.id]:e.target.value}))}/>
       <textarea className={field} placeholder="Review note / evidence of independently checked funds" maxLength={800} rows={2} value={reviewNotes[order.id]||''} onChange={e=>setReviewNotes(v=>({...v,[order.id]:e.target.value}))}/>
       <div className="flex flex-wrap gap-2">
        {order.status==='submitted'?<button disabled={busy!==''||(evidence[order.id]||'').length<8} onClick={()=>void review(order.id,'verify_funds')}
          className="rounded-lg border border-emerald-300/40 px-3 py-2 text-xs text-emerald-200 disabled:opacity-40">Verify funds received</button>:
         <button disabled={busy!==''||(evidence[order.id]||'').length<8} onClick={()=>void review(order.id,'record_transfer')}
          className="rounded-lg border border-emerald-300/40 px-3 py-2 text-xs text-emerald-200 disabled:opacity-40">Record bank transfer receipt</button>}
        <button disabled={busy!==''||(reviewNotes[order.id]||'').length<10} onClick={()=>void review(order.id,'reject')}
          className="rounded-lg border border-rose-300/30 px-3 py-2 text-xs text-rose-200 disabled:opacity-40">Reject with reason</button>
       </div>
      </div>}
      <button className="mt-4 text-xs text-sky-200 underline" type="button" onClick={()=>void openGuidance(order.id)}>
       {selectedGuidance===order.id?'Close guidance':'Open family support guidance'}
      </button>
      {selectedGuidance===order.id&&<div className="mt-4 space-y-3 border-t border-white/10 pt-4">
       {guidance.length===0&&<p className="text-xs text-stone-400">No guidance notes yet.</p>}
       {guidance.map(g=><div key={g.id} className="border-l border-amber-300/30 pl-3 text-xs leading-5 text-stone-300">
        <p className="font-bold text-amber-200">{g.department==='lawyer'?'Attorney':'Mandate'} · {g.author_name}</p>
        <p className="mt-1">{g.guidance_note}</p>
       </div>)}
       {mayGuide&&<div className="space-y-2">
        <select className={field} value={department} onChange={e=>setDepartment(e.target.value)}>
         {guides.map(g=><option value={g} key={g}>{g==='lawyer'?'Attorney':'Mandate'}</option>)}
        </select>
        <textarea className={field} rows={3} maxLength={1000} placeholder="Practical suggestions for education, nutrition, family care or constructive activities; respect family independence." value={guideNotes[order.id]||''} onChange={e=>setGuideNotes(v=>({...v,[order.id]:e.target.value}))}/>
        <button disabled={busy!==''||(guideNotes[order.id]||'').trim().length<15} className="border border-sky-300/30 px-3 py-2 text-xs text-sky-200 disabled:opacity-40" onClick={()=>void addGuidance(order.id)}>Record guidance</button>
       </div>}
      </div>}
     </article>
    })}
   </div>
  </section>
  <p className="text-xs leading-5 text-stone-500">Only the authorized recipient account can be used for the transfer. Forensics records external bank settlement; this board does not move money, verify family relationships, or monitor private purchases. Mandate and Attorney offer advisory support, not control over beneficiaries.</p>
 </main>
}
