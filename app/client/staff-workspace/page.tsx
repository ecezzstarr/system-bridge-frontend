'use client'
import Link from 'next/link'
import { useCallback,useEffect,useState } from 'react'
import { getClientToken } from '@/lib/client-auth'

type Item = {id:string;prospect_name:string;organization:string|null;stage:string;next_action:string|null;created_at:string}
type Position = {position_title:string;monthly_salary_usdt:number;ticket_amount_usdt:number;folder_tier:string;file_number:string;receipt_number:string;verified_at:string}
const stages=['introduced','conversation','follow_up','proposal','completed'] as const

export default function CompanyClientStaffWorkspace(){
  const [position,setPosition]=useState<Position|null>(null)
  const [items,setItems]=useState<Item[]>([])
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
      setNotEmployed(false);setPosition(data.position);setItems(data.activity||[]);setError('')
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
          <h2 className="text-2xl font-bold">{position.position_title}</h2>
          <p className="text-sm text-slate-200">Company-granted {position.folder_tier.toUpperCase()} File Folder · {position.file_number}</p>
          <p className="text-sm text-slate-200">Monthly salary in approved offer: {Number(position.monthly_salary_usdt).toLocaleString()} USDT. Salary payments and terms are managed separately by the company.</p>
          <p className="text-xs text-slate-400">Entry ticket: {Number(position.ticket_amount_usdt).toLocaleString()} USDT · receipt {position.receipt_number}</p>
        </section>
        <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[
            ['Meet businesses','Introduce WEAVE and understand how the organization might use a File Folder.','/file-folder-preview'],
            ['Present File Folders','Demonstrate the actual File Folder offer, options and operating systems.','/file-folder'],
            ['My File Folder','Open your company-granted Client systems and Bridge AI assistance.','/client/system-switch'],
            ['Team correspondence','Communicate with other WEAVE participants through company communication channels.','/communications'],
            ['Position notifications','Read approved company instructions and employment updates.','/notifications'],
          ].map(([title,detail,href])=><Link key={title} href={href} className="rounded-xl border border-white/15 bg-white/[.04] p-5">
            <h3 className="font-bold text-cyan-200">{title} →</h3><p className="mt-3 text-xs leading-5 text-slate-300">{detail}</p>
          </Link>)}
        </section>
        <section className="space-y-4 rounded-2xl border border-white/10 p-5">
          <div><h2 className="text-xl font-bold">Record business conversations</h2><p className="text-sm text-slate-400">Log actual introductions, proposals and follow-up actions. This register does not claim a purchase or credit commission automatically.</p></div>
          <form onSubmit={e=>{e.preventDefault();void send({prospectName:name,organization:org,stage,nextAction:next},'POST')}} className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">Business contact<input required value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
            <label className="text-sm">Organization<input value={org} onChange={e=>setOrg(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
            <label className="text-sm">Conversation stage<select value={stage} onChange={e=>setStage(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3">{stages.map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select></label>
            <label className="text-sm">Next action<input value={next} onChange={e=>setNext(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
            <button disabled={busy} className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-40 md:col-span-2">{busy?'Recording…':'Record conversation'}</button>
          </form>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">My active relationships · {items.length}</h2>
          {items.map(item=><article key={item.id} className="rounded-xl border border-white/10 bg-white/[.025] p-4">
            <div className="flex flex-wrap justify-between gap-2"><strong>{item.prospect_name} {item.organization?'· '+item.organization:''}</strong><span className="text-xs text-cyan-200">{item.stage.replaceAll('_',' ')}</span></div>
            <p className="mt-2 text-sm text-slate-300">Next: {item.next_action||'Awaiting next movement'}</p>
            {item.stage!=='completed'&&<button type="button" disabled={busy} onClick={()=>void send({id:item.id,stage:'follow_up',nextAction:item.next_action||''},'PATCH')} className="mt-3 text-xs text-cyan-200 underline disabled:opacity-40">Mark follow-up</button>}
          </article>)}
          {!items.length&&<p className="text-sm text-slate-400">No conversations recorded yet.</p>}
        </section>
      </>}
    </div>
  </main>
}
