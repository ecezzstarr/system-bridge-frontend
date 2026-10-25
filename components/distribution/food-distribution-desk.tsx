'use client'

import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'

type DistributionRecord={
  id:string;distributorUserId?:string;distributorName?:string;productType:string;customerType:'consumer'|'business';
  recipientName:string;quantity:number;evidenceReference:string;distributionDate:string;status:'pending'|'verified'|'rejected';
  verificationNote?:string|null;createdAt?:string
}
type TeamState={
  target:number;verified:number;pending:number;rejected:number;remaining:number;progressPercent:number;
  productTypesVerified:number;monthStart:string;monthEnd:string;
  members:{userId:string;name:string;position:string}[];recent:DistributionRecord[]
}
export function FoodDistributionDesk(){
  const {token,user,isInitialized}=useAuth()
  const [team,setTeam]=useState<TeamState|null>(null)
  const [products,setProducts]=useState<string[]>([])
  const [productType,setProductType]=useState('Agility')
  const [customerType,setCustomerType]=useState<'consumer'|'business'>('consumer')
  const [recipientName,setRecipientName]=useState('')
  const [quantity,setQuantity]=useState('1')
  const [evidenceReference,setEvidenceReference]=useState('')
  const [distributionDate,setDistributionDate]=useState(new Date(Date.now()+60*60*1000).toISOString().slice(0,10))
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const load=useCallback(async()=>{
    if(!token)return
    const response=await fetch('/api/manager/food-distribution',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
    const data=await response.json()
    if(!response.ok)throw new Error(data.error||'Food distribution desk unavailable')
    setTeam(data.team);setProducts(data.productTypes||[])
  },[token])
  useEffect(()=>{if(isInitialized&&token&&['agent','bridger'].includes(user?.role||''))load().catch(e=>setError(e.message))},[isInitialized,token,user?.role,load])
  const submit=async()=>{
    if(!token||busy)return
    setBusy(true);setError('');setMessage('')
    try{
      const response=await fetch('/api/manager/food-distribution',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({
        productType,customerType,recipientName,quantity:Number(quantity),evidenceReference,distributionDate
      })})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Could not submit distribution')
      setMessage(data.message||'Submitted for Administration verification.')
      setRecipientName('');setQuantity('1');setEvidenceReference('')
      await load()
    }catch(e){setError(e instanceof Error?e.message:'Could not submit distribution')}
    finally{setBusy(false)}
  }
  if(!isInitialized||!token)return null
  if(error&&!team)return <section className="mt-6 rounded-2xl border border-amber-300/20 p-4" data-food-distribution-desk="true"><h2 className="text-lg font-black">Food Distribution Desk</h2><p className="mt-2 text-sm text-slate-300">{error}</p></section>
  if(!team)return <section className="mt-6 rounded-2xl border border-white/10 p-4" data-food-distribution-desk="true"><p className="text-sm text-slate-300">Opening the verified Food Distribution Desk…</p></section>
  return <section className="mt-7 space-y-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.035] p-4 sm:p-5" data-food-distribution-desk="true">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Food Distribution · Monthly target</p><h2 className="mt-1 text-xl font-black text-white">200 verified food distributions</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-300">Record completed handoffs of any WEAVE food product to consumers or businesses. Each distinct handoff counts once, regardless of the quantity delivered. Administration verifies the order or receipt before it counts.</p></div>
      <button type="button" onClick={()=>load().catch(e=>setError(e.message))} className="min-h-10 rounded-xl border border-white/15 px-3 text-xs font-bold text-emerald-100">Refresh</button>
    </header>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Metric label="Verified this month" value={`${team.verified} / ${team.target}`}/>
      <Metric label="Remaining" value={String(team.remaining)}/>
      <Metric label="Awaiting verification" value={String(team.pending)}/>
      <Metric label="Product types distributed" value={`${team.productTypesVerified} / ${products.length}`}/>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-300" style={{width:`${team.progressPercent}%`}}/></div>
    <p className="text-xs text-slate-400">Calendar month: {team.monthStart} through {team.monthEnd} · Target applies to the whole manager-and-assistants team.</p>
    {error&&<p role="alert" className="rounded-xl border border-rose-300/20 p-3 text-xs text-rose-200">{error}</p>}
    {message&&<p role="status" className="rounded-xl border border-emerald-300/20 p-3 text-xs text-emerald-100">{message}</p>}
    <div className="rounded-xl border border-white/10 bg-black/15 p-4">
      <h3 className="text-base font-black text-white">Record a completed food handoff</h3>
      <p className="mt-1 text-xs leading-5 text-slate-400">Use a WEAVE order number, receipt reference or delivery record as evidence. Do not enter payment credentials or unnecessary personal information.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Food product type"><select value={productType} onChange={e=>setProductType(e.target.value)} className={fieldClass}>{products.map(p=><option key={p} value={p}>{p}</option>)}</select></Field>
        <Field label="Recipient category"><select value={customerType} onChange={e=>setCustomerType(e.target.value as 'consumer'|'business')} className={fieldClass}><option value="consumer">Consumer</option><option value="business">Business</option></select></Field>
        <Field label="Consumer or business name"><input value={recipientName} onChange={e=>setRecipientName(e.target.value)} maxLength={120} minLength={2} placeholder="Recipient / business name" className={fieldClass}/></Field>
        <Field label="Quantity / packages delivered"><input type="number" value={quantity} onChange={e=>setQuantity(e.target.value)} min={1} max={10000} step={1} className={fieldClass}/></Field>
        <Field label="Distribution date"><input type="date" value={distributionDate} onChange={e=>setDistributionDate(e.target.value)} max={new Date(Date.now()+60*60*1000).toISOString().slice(0,10)} className={fieldClass}/></Field>
        <Field label="Order / receipt / delivery reference"><input value={evidenceReference} onChange={e=>setEvidenceReference(e.target.value)} minLength={6} maxLength={500} placeholder="WEAVE order or receipt reference" className={fieldClass}/></Field>
      </div>
      <button type="button" onClick={()=>void submit()} disabled={busy||recipientName.trim().length<2||evidenceReference.trim().length<6||!Number.isInteger(Number(quantity))||Number(quantity)<1||!distributionDate} className="mt-4 min-h-11 rounded-xl bg-emerald-300 px-5 text-sm font-black text-slate-950 disabled:opacity-40">{busy?'Submitting…':'Submit for Administration verification'}</button>
    </div>
    <div>
      <h3 className="text-sm font-black text-white">Recent team distributions</h3>
      <div className="mt-3 space-y-2">{team.recent.map(record=><article key={record.id} className="rounded-xl border border-white/10 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-bold text-white">{record.productType} · {record.quantity} package(s)</p><p className="mt-1 text-xs text-slate-300">{record.recipientName} · {record.customerType} · {record.distributionDate}</p><p className="mt-1 break-all text-[11px] text-slate-500">Evidence: {record.evidenceReference}</p><p className="mt-1 text-[11px] text-slate-500">Recorded by {record.distributorName||'team member'}</p></div><span className={record.status==='verified'?'rounded-full bg-emerald-300/10 px-2 py-1 text-[10px] font-bold text-emerald-200':record.status==='rejected'?'rounded-full bg-rose-300/10 px-2 py-1 text-[10px] font-bold text-rose-200':'rounded-full bg-amber-300/10 px-2 py-1 text-[10px] font-bold text-amber-100'}>{record.status==='verified'?'Verified':record.status==='rejected'?'Rejected':'Pending verification'}</span></div>
        {record.verificationNote&&<p className="mt-2 text-xs text-slate-400">{record.verificationNote}</p>}
      </article>)}{!team.recent.length&&<p className="rounded-xl border border-white/10 p-3 text-xs text-slate-400">No distribution records submitted this month.</p>}</div>
    </div>
  </section>
}
function Metric({label,value}:{label:string,value:string}){return <div className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-lg font-black text-white">{value}</p></div>}
function Field({label,children}:{label:string,children:React.ReactNode}){return <label className="block text-xs font-semibold text-slate-200">{label}<div className="mt-2">{children}</div></label>}
const fieldClass='min-h-11 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-sm text-white'
