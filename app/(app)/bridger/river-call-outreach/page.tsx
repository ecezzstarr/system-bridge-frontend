'use client'
import { useCallback,useEffect,useState } from 'react'
import Link from 'next/link'
import { getAuthHeaders } from '@/lib/auth-client'
import { PhoneCall,RefreshCw,MessageCircle,Wallet } from 'lucide-react'

type Prospect={outreachId:string;name:string;phone:string;prospectWhatsapp:string}
type Call={id:string;candidate_name:string|null;phone_e164:string;status:string;price_flame_coin:string;
  whatsapp_status:string;whatsapp_consent:boolean;created_at:string;refund_at:string|null}
type State={enabled:boolean;providerReady:boolean;priceFlameCoin:number|null;walletBalance:number;calls:Call[]}
export default function RiverCallOutreachPage(){
  const [state,setState]=useState<State|null>(null)
  const [prospects,setProspects]=useState<Prospect[]>([])
  const [selected,setSelected]=useState('')
  const [phone,setPhone]=useState('')
  const [name,setName]=useState('')
  const [consentSource,setConsentSource]=useState('')
  const [confirmed,setConfirmed]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [requestKey,setRequestKey]=useState('')
  const load=useCallback(async()=>{
    try{
      const [calls,people]=await Promise.all([
        fetch('/api/bridger/river-calls',{headers:getAuthHeaders(),cache:'no-store'}),
        fetch('/api/bridger/prospects',{headers:getAuthHeaders(),cache:'no-store'})
      ])
      const report=await calls.json()
      const own=await people.json()
      if(!calls.ok)throw new Error(report.error||'River calls unavailable')
      setState(report)
      if(people.ok && own.success)setProspects(own.prospects||[])
    }catch(e:any){setError(e.message||'Could not open River Outreach')}
  },[])
  useEffect(()=>{load()},[load])
  useEffect(()=>{
    const timer=setInterval(()=>{if(!document.hidden)load()},12000)
    return ()=>clearInterval(timer)
  },[load])
  const select=(id:string)=>{
    setSelected(id)
    const row=prospects.find(x=>x.outreachId===id)
    if(row){setPhone(row.prospectWhatsapp||row.phone||'');setName(row.name||'')}
    else{setPhone('');setName('')}
    setRequestKey('')
  }
  const dial=async()=>{
    setBusy(true);setError('');setNotice('')
    const key=requestKey||crypto.randomUUID()
    setRequestKey(key)
    try{
      const response=await fetch('/api/bridger/river-calls',{
        method:'POST',headers:getAuthHeaders(),
        body:JSON.stringify({requestKey:key,sourceOutreachId:selected||null,
          name,phone,consentSource,confirmedRequestedCall:confirmed})
      })
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||'River could not start the call')
      setNotice(result.replayed?'This call was already requested; no second payment was made.':
        'River call accepted by the provider. The candidate may answer or decline. Check the status below.')
      setRequestKey('');setConfirmed(false);setConsentSource('')
      await load()
    }catch(e:any){setError(e.message||'River call failed. Check the report before retrying.')}
    finally{setBusy(false)}
  }
  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-white" data-river-calls="bridger">
    <div className="mx-auto max-w-5xl">
      <Link href="/weave/market/prospects" className="text-xs text-sky-300">← My Prospects</Link>
      <header className="mt-6 border-b border-white/10 pb-7">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-300">Hope · Bridger · River Outreach</p>
        <h1 className="mt-2 text-3xl font-black">AI River · Live Prospect Calls</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">A Bridger pays for one AI phone call with Flame Coin. River introduces itself as an AI, explains WEAVE and listens to the candidate. If the candidate wants more, River asks permission for WhatsApp, ends the call and opens a handoff to the Bridger.</p>
      </header>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="border border-white/10 bg-white/[.025] p-4"><p className="text-[10px] text-slate-400">Call price · set by Administration</p><p className="mt-2 text-xl font-bold">{state?.priceFlameCoin==null?'Not set':state.priceFlameCoin+' Flame Coin'}</p></div>
        <div className="border border-white/10 bg-white/[.025] p-4"><p className="flex items-center gap-2 text-[10px] text-slate-400"><Wallet className="h-3.5 w-3.5"/>Available balance</p><p className="mt-2 text-xl font-bold">{state?.walletBalance?.toFixed(2)??'—'} Flame Coin</p></div>
        <div className="border border-white/10 bg-white/[.025] p-4"><p className="text-[10px] text-slate-400">River calling</p><p className="mt-2 text-sm font-bold">{state?.enabled&&state.providerReady?'Available':'Not yet activated'}</p></div>
      </div>
      {(error||notice)&&<p role="status" className={'mt-5 border-l-2 px-3 py-3 text-sm '+(error?'border-rose-400 text-rose-200':'border-emerald-400 text-emerald-200')}>{error||notice}</p>}
      <section className="mt-7 border-y border-white/10 py-6">
        <p className="text-sm font-bold">01 · Candidate for River to call</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">Choose one of your assigned candidates or enter another person who has specifically requested or agreed to a WEAVE AI call. Buying a Prospect number alone does not establish permission to place an automated call.</p>
        <label className="mt-5 block text-xs text-slate-300">My Prospects</label>
        <select value={selected} onChange={e=>select(e.target.value)} className="mt-2 w-full border border-white/15 bg-slate-900 p-3 text-sm">
          <option value="">Enter a candidate manually</option>
          {prospects.map(p=><option key={p.outreachId} value={p.outreachId}>{p.name||'Candidate'} · {p.prospectWhatsapp||p.phone}</option>)}
        </select>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className="text-xs text-slate-300">Candidate name</label><input value={name} onChange={e=>setName(e.target.value)} maxLength={150} placeholder="Name" className="mt-2 w-full border border-white/15 bg-slate-900 p-3 text-sm"/></div>
          <div><label className="text-xs text-slate-300">Phone with country code</label><input value={phone} disabled={Boolean(selected)} onChange={e=>{setPhone(e.target.value);setRequestKey('')}} placeholder="+2348012345678" className="mt-2 w-full border border-white/15 bg-slate-900 p-3 text-sm"/></div>
        </div>
        <label className="mt-5 block text-xs text-slate-300">How did this person request or agree to the call?</label>
        <textarea value={consentSource} onChange={e=>setConsentSource(e.target.value)} rows={3} maxLength={400} placeholder="Record the candidate's request or permission and when it was given" className="mt-2 w-full border border-white/15 bg-slate-900 p-3 text-sm"/>
        <label className="mt-4 flex items-start gap-3 text-xs leading-5 text-slate-300">
          <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1"/>
          I confirm that this candidate agreed to receive an AI phone call, and I have not received an opt-out or request to stop.
        </label>
        <button onClick={dial} disabled={!state?.enabled||!state.providerReady||busy||!confirmed||consentSource.trim().length<8||!name.trim()||!/^\+[1-9]\d{7,14}$/.test(phone)}
          className="mt-6 flex w-full items-center justify-center gap-2 border border-sky-300/40 bg-sky-600/20 px-4 py-3 text-sm font-bold text-sky-100 disabled:cursor-not-allowed disabled:opacity-35">
          <PhoneCall className="h-4 w-4"/>{busy?'Contacting provider…':'Call with River · '+(state?.priceFlameCoin??'—')+' Flame Coin'}
        </button>
        <p className="mt-3 text-[11px] text-slate-500">A failed or unanswered call is refunded. A connected call is charged even if the candidate declines. Calls are not recorded; River retains a limited text exchange for the handoff.</p>
      </section>
      <section className="mt-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-sm font-bold">02 · Call report and WhatsApp follow-up</h2>
          <button onClick={load} className="flex items-center gap-2 text-xs text-sky-300"><RefreshCw className="h-4 w-4"/>Refresh</button>
        </div>
        <div className="divide-y divide-white/10">
          {(state?.calls||[]).map(call=>{
            const text='Hello '+(call.candidate_name||'')+', I am your Bridger from WEAVE. River mentioned that you wanted to understand more. What would you like to start with?'
            const wa='https://wa.me/'+call.phone_e164.replace(/\D/g,'')+'?text='+encodeURIComponent(text)
            return <div key={call.id} className="flex flex-wrap items-center justify-between gap-3 py-5">
              <div><p className="text-sm font-semibold">{call.candidate_name||'Candidate'} · {call.phone_e164}</p>
                <p className="mt-1 text-xs text-slate-400">{call.status}{call.refund_at?' · refunded':''} · {new Date(call.created_at).toLocaleString()} · {call.price_flame_coin} Flame Coin</p>
                {call.whatsapp_consent&&<p className="mt-1 text-xs text-emerald-300">WhatsApp permission received · {call.whatsapp_status==='provider_accepted'?'WEAVE Business template submitted':'Bridger handoff ready'}</p>}
              </div>
              {call.whatsapp_consent&&<a href={wa} className="inline-flex items-center gap-2 border border-emerald-400/30 px-3 py-2 text-xs text-emerald-200"><MessageCircle className="h-4 w-4"/>Follow up on WhatsApp</a>}
            </div>
          })}
          {!state?.calls?.length&&<p className="py-8 text-sm text-slate-500">No River calls yet.</p>}
        </div>
        <p className="mt-5 text-xs leading-5 text-slate-500">River cannot send messages from a Bridger’s personal WhatsApp account. With an approved WhatsApp Business template and connected WEAVE sender, River can automatically message the prospect with the Bridger’s direct WhatsApp link. Otherwise, the Bridger uses the follow-up button after the prospect’s permission.</p>
      </section>
    </div>
  </main>
}
