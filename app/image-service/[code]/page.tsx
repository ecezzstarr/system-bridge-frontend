'use client'
import {useEffect,useState} from 'react'
import {useParams} from 'next/navigation'
import Link from 'next/link'
import {CheckCircle2,Image as ImageIcon,Send,ShieldCheck} from 'lucide-react'
import {WEAVE_IMAGE_SAMPLES,renderWeaveSampleSvg,defaultSampleEdits} from '@/lib/weave-image-sample-art'

type Provider={name:string;description:string;examplePriceNgn:number|null}
const field='mt-2 w-full rounded-xl border border-white/15 bg-[#102130] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300'
export default function WeaveImageServiceDoor(){
  const params=useParams()
  const code=String(params.code||'')
  const [provider,setProvider]=useState<Provider|null>(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [sent,setSent]=useState(false)
  const [name,setName]=useState('')
  const [contact,setContact]=useState('')
  const [brief,setBrief]=useState('')
  const [sampleId,setSampleId]=useState('')
  const [consent,setConsent]=useState(false)
  useEffect(()=>{
    void fetch('/api/image-service/'+encodeURIComponent(code),{cache:'no-store'})
      .then(r=>r.json().then(data=>{if(!r.ok)throw new Error(data.error||'Service unavailable');setProvider(data.provider)}))
      .catch(e=>setError(e instanceof Error?e.message:'Service unavailable'))
      .finally(()=>setLoading(false))
  },[code])
  const send=async()=>{
    if(!consent){setError('Confirm that your contact details can be shared with this producer.');return}
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/image-service/'+encodeURIComponent(code),{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({customerName:name,customerContact:contact,customerBrief:brief,sampleId}),
      })
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'Request could not be sent')
      setSent(true)
    }catch(e){setError(e instanceof Error?e.message:'Request could not be sent')}
    finally{setBusy(false)}
  }
  const sample=WEAVE_IMAGE_SAMPLES.find(item=>item.id===sampleId)
  return <main className="min-h-screen bg-[#071320] px-4 py-6 text-white sm:py-10">
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/" className="text-xs font-bold uppercase tracking-widest text-cyan-200">WEAVE OF PRESENCE · IMAGE SERVICE</Link>
      <header className="rounded-3xl border border-cyan-200/20 bg-[radial-gradient(circle_at_top_right,#2b5262,#0c1b2b_65%)] p-6 sm:p-9">
        <ImageIcon className="h-9 w-9 text-cyan-200"/>
        <h1 className="mt-5 text-3xl font-black">{loading?'Opening a producer’s door…':provider?.name||'WEAVE Image Service'}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{provider?.description||'Request an original branded layout, commercial graphic, cover or image production.'}</p>
        {provider?.examplePriceNgn!==null&&provider?.examplePriceNgn!==undefined&&<p className="mt-4 text-sm font-bold text-amber-200">Indicative producer price: ₦{provider.examplePriceNgn.toLocaleString('en-NG')}. Final scope and payment are agreed directly with the producer.</p>}
      </header>
      {error&&<div role="alert" className="rounded-xl border border-rose-300/30 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</div>}
      {!loading&&provider&&sent?<section className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[.05] p-7 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300"/>
        <h2 className="mt-4 text-xl font-bold">Your production request is recorded</h2>
        <p className="mt-2 text-sm text-slate-300">The producer can now review your brief and contact you. A submitted request does not mean payment has been collected or an order delivered.</p>
      </section>:provider&&<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
        <form className="space-y-4 rounded-2xl border border-white/10 bg-[#0d1b2a] p-5 sm:p-7" onSubmit={e=>{e.preventDefault();void send()}}>
          <h2 className="text-lg font-bold">Describe what you need</h2>
          <label className="block text-xs text-slate-200">Your name
            <input className={field} required minLength={2} maxLength={140} value={name} onChange={e=>setName(e.target.value)} placeholder="Customer or business name"/></label>
          <label className="block text-xs text-slate-200">Phone, WhatsApp or email
            <input className={field} required minLength={5} maxLength={180} value={contact} onChange={e=>setContact(e.target.value)} placeholder="How the producer should reach you"/></label>
          <label className="block text-xs text-slate-200">Example style (optional)
            <select className={field} value={sampleId} onChange={e=>setSampleId(e.target.value)}>
              <option value="">Producer may recommend one</option>{WEAVE_IMAGE_SAMPLES.map(item=><option key={item.id} value={item.id}>{item.name} · {item.category}</option>)}
            </select></label>
          <label className="block text-xs text-slate-200">Your design requirements
            <textarea className={field+' min-h-32 resize-y'} required minLength={12} maxLength={1800} value={brief} onChange={e=>setBrief(e.target.value)}
              placeholder="Business name, intended customer, product, message, design requirements, and delivery date…"/></label>
          <label className="flex items-start gap-2 text-xs leading-5 text-slate-300">
            <input type="checkbox" className="mt-1" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
            I authorize WEAVE to share my contact and brief with this producer so they can respond to my inquiry.
          </label>
          <button disabled={busy||!consent} type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-200 px-4 font-bold text-slate-950 disabled:opacity-40">
            <Send className="h-4 w-4"/>{busy?'Sending…':'Send production request'}</button>
          <p className="flex items-start gap-2 text-xs leading-5 text-slate-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/>WEAVE collects this inquiry for the named producer. No payment is collected on this page. Do not send card numbers or passwords.</p>
        </form>
        <aside className="rounded-2xl border border-white/10 bg-[#0d1b2a] p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-300">Original WEAVE sample</p>
          {sample?<img src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(renderWeaveSampleSvg(sample,defaultSampleEdits(sample),true))} alt={sample.name} className="w-full rounded-xl"/>:
            <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-xs text-slate-400">Choose an example above to see its sample composition.</div>}
          <p className="mt-4 text-xs leading-5 text-slate-400">Samples are visual starting points, not AI generation. Finished custom artwork is produced and delivered after agreement with your producer.</p>
        </aside>
      </div>}
    </div>
  </main>
}
