'use client'

import { useEffect,useMemo,useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BriefcaseBusiness,CheckCircle2,Clapperboard,Loader2,UserRound } from 'lucide-react'

type Offer={packageKey:string;name:string;description:string;durationSeconds:number;personalPrice:number|null;businessPrice:number|null;currency:string}
type State={provider:{displayName:string;tagline:string;role:string};packages:Offer[]}

function durationLabel(seconds:number){if(seconds<60)return `${seconds}s`;const m=Math.floor(seconds/60),s=seconds%60;return s?`${m}m ${s}s`:`${m}m`}

export default function PublicVideoServiceDoor(){
  const params=useParams<{code:string}>()
  const code=String(params?.code||'')
  const [state,setState]=useState<State|null>(null)
  const [kind,setKind]=useState<'personal'|'business'>('business')
  const [selected,setSelected]=useState<Offer|null>(null)
  const [loading,setLoading]=useState(true)
  const [sending,setSending]=useState(false)
  const [message,setMessage]=useState<string|null>(null)
  const [success,setSuccess]=useState(false)
  const [form,setForm]=useState({customerName:'',customerContact:'',customerEmail:'',businessName:'',subject:'',objective:'',audience:'',notes:''})

  useEffect(()=>{if(!code)return;void(async()=>{try{setLoading(true);const r=await fetch(`/api/video-service/${encodeURIComponent(code)}`,{cache:'no-store'});const d=await r.json();if(!r.ok||!d.success)throw new Error(d.error||'Video Service Door could not open');setState(d)}catch(e:any){setMessage(e.message||'Video Service Door could not open')}finally{setLoading(false)}})()},[code])

  const available=useMemo(()=>(state?.packages||[]).filter(p=>kind==='business'?p.businessPrice!==null:p.personalPrice!==null),[state,kind])
  useEffect(()=>{if(selected&&!(kind==='business'?selected.businessPrice!==null:selected.personalPrice!==null))setSelected(null)},[kind,selected])
  const price=selected?(kind==='business'?selected.businessPrice:selected.personalPrice):null
  const canSend=Boolean(selected&&form.customerName.trim()&&form.customerContact.trim()&&form.subject.trim()&&form.objective.trim()&&form.audience.trim()&&(kind==='personal'||form.businessName.trim()))

  const send=async()=>{if(!selected||!canSend)return;setSending(true);setMessage(null);try{const r=await fetch(`/api/video-service/${encodeURIComponent(code)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerKind:kind,packageKey:selected.packageKey,...form})});const d=await r.json();if(!r.ok||!d.success)throw new Error(d.error||'Order could not be sent');setSuccess(true);setMessage(`${d.message} Order ${d.orderId}.`)}catch(e:any){setMessage(e.message||'Order could not be sent')}finally{setSending(false)}}

  if(loading)return <main className="flex min-h-screen items-center justify-center bg-[#05070b] text-white"><Loader2 className="h-7 w-7 animate-spin"/></main>

  return <main className="min-h-screen bg-[#05070b] px-4 py-8 text-white sm:px-6">
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="border-y border-fuchsia-300/20 bg-[radial-gradient(circle_at_10%_0%,rgba(217,70,239,.12),transparent_34%),#080b12] p-6 sm:rounded-3xl sm:border sm:p-8">
        <p className="text-[9px] font-black uppercase tracking-[.28em] text-fuchsia-300">WEAVE VIDEO SERVICE DOOR</p>
        <h1 className="mt-3 text-3xl font-black sm:text-5xl">{state?.provider.displayName||'Video Producer'}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{state?.provider.tagline||'Order a video directly. No WEAVE account or registration is required.'}</p>
      </section>

      {message&&<div className={`border px-4 py-3 text-sm ${success?'border-emerald-300/20 bg-emerald-300/[.05] text-emerald-100':'border-fuchsia-300/15 bg-fuchsia-300/[.04] text-fuchsia-100'}`}>{message}</div>}
      {success?<section className="border border-emerald-300/20 bg-emerald-300/[.04] p-6"><CheckCircle2 className="h-6 w-6 text-emerald-300"/><h2 className="mt-3 text-xl font-black">ORDER SENT</h2><p className="mt-2 text-sm text-slate-400">The producer now has your brief and will continue payment and delivery directly with you.</p></section>:<>
        <section className="grid gap-3 sm:grid-cols-2">
          <button onClick={()=>setKind('personal')} className={`border p-5 text-left ${kind==='personal'?'border-cyan-300/50 bg-cyan-300/[.06]':'border-white/10 bg-white/[.02]'}`}><UserRound className="h-5 w-5 text-cyan-300"/><p className="mt-3 text-sm font-black">PERSONAL</p><p className="mt-1 text-xs text-slate-500">For yourself, a personal project, event, profile or individual movement.</p></button>
          <button onClick={()=>setKind('business')} className={`border p-5 text-left ${kind==='business'?'border-fuchsia-300/50 bg-fuchsia-300/[.06]':'border-white/10 bg-white/[.02]'}`}><BriefcaseBusiness className="h-5 w-5 text-fuchsia-300"/><p className="mt-3 text-sm font-black">BUSINESS</p><p className="mt-1 text-xs text-slate-500">For a company, product, service, platform or campaign.</p></button>
        </section>

        <section><p className="text-[9px] font-black uppercase tracking-[.24em] text-slate-600">Choose video</p><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{available.map(offer=>{const offerPrice=kind==='business'?offer.businessPrice:offer.personalPrice;return <button key={offer.packageKey} onClick={()=>setSelected(offer)} className={`border p-5 text-left ${selected?.packageKey===offer.packageKey?'border-fuchsia-300/50 bg-fuchsia-300/[.06]':'border-white/10 bg-black/20'}`}><p className="text-[9px] font-black uppercase tracking-wider text-slate-600">{durationLabel(offer.durationSeconds)}</p><h3 className="mt-2 text-lg font-black">{offer.name}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{offer.description}</p><p className="mt-4 text-xl font-black">{Number(offerPrice||0).toLocaleString()} <span className="text-[10px] text-slate-500">{offer.currency}</span></p></button>})}</div>{available.length===0&&<p className="mt-4 text-sm text-slate-600">No {kind} video offer is open at this door yet.</p>}</section>

        {selected&&<section className="border-y border-white/10 bg-black/15 p-5 sm:border sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-fuchsia-300">{selected.name}</p><h2 className="mt-1 text-xl font-black">SEND YOUR VIDEO BRIEF</h2></div><p className="text-right text-xl font-black">{Number(price||0).toLocaleString()} <span className="text-[10px] text-slate-500">{selected.currency}</span></p></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Input value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})} placeholder="Your name" className="border-white/10 bg-black/30"/><Input value={form.customerContact} onChange={e=>setForm({...form,customerContact:e.target.value})} placeholder="Phone / WhatsApp / contact" className="border-white/10 bg-black/30"/><Input value={form.customerEmail} onChange={e=>setForm({...form,customerEmail:e.target.value})} placeholder="Email (optional)" className="border-white/10 bg-black/30"/>{kind==='business'&&<Input value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})} placeholder="Business name" className="border-white/10 bg-black/30"/>}</div><div className="mt-3 space-y-3"><textarea rows={3} value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="What should the video be about?" className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"/><textarea rows={3} value={form.objective} onChange={e=>setForm({...form,objective:e.target.value})} placeholder="What should people understand or do after watching?" className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"/><Input value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})} placeholder="Who should the video speak to?" className="border-white/10 bg-black/30"/><textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Extra direction (optional)" className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"/></div><Button onClick={send} disabled={!canSend||sending} className="mt-5 w-full bg-fuchsia-300 font-black text-slate-950 hover:bg-fuchsia-200">{sending?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Clapperboard className="mr-2 h-4 w-4"/>}{sending?'SENDING…':'SEND ORDER TO PRODUCER'}</Button><p className="mt-3 text-center text-[10px] text-slate-600">Payment is arranged directly with this producer. WEAVE does not require you to create an account.</p></section>}
      </>}
    </div>
  </main>
}
