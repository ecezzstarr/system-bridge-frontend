'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Building2, CheckCircle2, Compass, DoorOpen, Handshake, Loader2, ShieldCheck } from 'lucide-react'

type Need = { id: string; category: string; location: string; title: string; description: string; verified_at: string }
const categories = [
  ['food','Food & hospitality'], ['retail','Retail & fashion'],
  ['services','Personal & professional services'], ['agriculture','Agriculture & supply'],
  ['digital','Digital services'], ['creative','Creative production'], ['other','Other industries'],
] as const

const blankNeed = { category:'services', location:'', title:'', description:'', email:'', consent:false, website:'' }
const blankInterest = { businessName:'', email:'', service:'', consent:false }

export default function UnbuiltDoorPage() {
  const [needs,setNeeds] = useState<Need[]>([])
  const [loading,setLoading] = useState(true)
  const [listError,setListError] = useState('')
  const [bridgeCode,setBridgeCode] = useState('')
  const [bridgerName,setBridgerName] = useState('')
  const [selected,setSelected] = useState<Need | null>(null)
  const [needForm,setNeedForm] = useState(blankNeed)
  const [interest,setInterest] = useState(blankInterest)
  const [busy,setBusy] = useState(false)
  const [needStatus,setNeedStatus] = useState('')
  const [interestStatus,setInterestStatus] = useState('')
  const [error,setError] = useState('')

  useEffect(()=>{
    const candidate = new URLSearchParams(window.location.search).get('bridge') || ''
    const bridgeParam = /^[a-zA-Z0-9_-]{6,32}$/.test(candidate) ? candidate : ''
    fetch('/api/unbuilt-door' + (bridgeParam ? '?bridge=' + encodeURIComponent(bridgeParam) : ''),{cache:'no-store'}).then(async response=>{
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load')
      const published: Need[] = Array.isArray(data.demands) ? data.demands : []
      setNeeds(published)
      setBridgeCode(data.bridger?.bridgeCode || '')
      setBridgerName(data.bridger?.name || '')
      const requestedId = new URLSearchParams(window.location.search).get('need')
      if (requestedId) setSelected(published.find(item=>item.id===requestedId) || null)
    }).catch(err=>setListError(err?.message || 'Unable to load confirmed requests'))
      .finally(()=>setLoading(false))
  },[])

  const crossingHref = bridgeCode ? '/bridge/' + encodeURIComponent(bridgeCode) : ''

  async function sendDemand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true);setError('');setNeedStatus('')
    try {
      const response = await fetch('/api/unbuilt-door',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(needForm),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to send request')
      setNeedStatus('Your request has entered private review. Only independently confirmed needs appear in public.')
      setNeedForm(blankNeed)
    } catch (err:any) { setError(err.message || 'Submission failed') }
    finally { setBusy(false) }
  }

  async function sendInterest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    setBusy(true);setError('');setInterestStatus('')
    try {
      const response = await fetch('/api/unbuilt-door',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'interest',demandId:selected.id,...interest,bridgeCode}),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to record interest')
      setInterestStatus('Your proposal is recorded with your Bridger for Administrations review. Continue with your Bridger through the official Bridge to discuss a File Folder.')
      setInterest(blankInterest)
    } catch (err:any) { setError(err.message || 'Submission failed') }
    finally { setBusy(false) }
  }

  const input = 'mt-2 min-h-12 w-full rounded-xl border border-[#dbd5c6] bg-white px-4 py-3 text-base text-[#191a1e] outline-none focus:border-[#a28a54]'
  const label = 'block text-sm font-semibold text-[#37352e]'
  const panel = 'rounded-3xl border border-[#e6ddcc] bg-white p-5 shadow-[0_12px_45px_rgba(67,50,22,.06)] sm:p-7'

  return <main className="min-h-screen bg-[#faf8f3] text-[#171718]" data-weave-unbuilt-door="true">
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-5 sm:px-6">
      <nav className="flex items-center justify-between gap-4 border-b border-[#ddd4c3] pb-5 text-sm">
        <Link href="/" className="font-semibold text-[#645535]">WEAVE · System Switch</Link>
        <Link href="/file-folder-preview" className="flex items-center gap-2 font-semibold text-[#655635]">See File Folders <ArrowRight className="h-4 w-4"/></Link>
      </nav>

      <section className="grid items-center gap-6 border-b border-[#e4dccf] py-10 md:grid-cols-[1.2fr_.8fr]">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.18em] text-[#977640]">
            <DoorOpen className="h-4 w-4"/> The Unbuilt Door · Presence before form
          </div>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.12] tracking-tight sm:text-6xl">A business may be needed before it is built.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#55524c]">
            Discover independently verified customer needs. See where your skills could serve people,
            then explore the Weave File Folder that could help you organize a real business.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#opportunities" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1e2428] px-5 py-3 text-sm font-bold text-white">Explore verified needs <ArrowRight className="h-4 w-4"/></a>
            {crossingHref && <Link href={crossingHref} className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#aa9366] px-5 py-3 text-sm font-bold text-[#4c412d]">Enter your Bridger's Bridge</Link>}
          </div>
          {bridgerName && <p className="mt-4 text-sm font-semibold text-[#5e5036]">Your assigned outreach guide: {bridgerName} · Hope Bridger</p>}
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-[#e5d9c4] bg-gradient-to-b from-white via-[#f1e8d6] to-[#e3d0a8] p-5">
          <img src="/weave/plus-file-folder-white-official.webp" alt="Weave official white-and-gold Plus File Folder" className="mx-auto h-64 w-full object-contain sm:h-80" />
          <p className="text-center text-xs font-semibold text-[#65583d]">Official Plus File Folder · An existing Weave business environment</p>
        </div>
      </section>

      <div className="grid gap-3 py-7 sm:grid-cols-3">
        {[
          {icon:Compass,title:'A need appears',copy:'A customer describes something genuinely wanted.'},
          {icon:ShieldCheck,title:'Administrations verifies',copy:'No demand is displayed until independently reviewed and confirmed.'},
          {icon:Building2,title:'A business takes shape',copy:'An interested entrepreneur proposes a way to serve, then considers a File Folder.'},
        ].map(({icon:Icon,title,copy})=><div key={title} className="rounded-2xl border border-[#e6ddcd] bg-white/75 p-5"><Icon className="h-6 w-6 text-[#9c7b42]"/><h2 className="mt-3 text-base font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-[#5d5951]">{copy}</p></div>)}
      </div>

      <section id="opportunities" className="pt-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#9a7a40]">Public market needs</p><h2 className="mt-2 text-3xl font-semibold">Doors awaiting a business</h2></div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#5c6b58]"><ShieldCheck className="h-4 w-4"/> Verified requests only</div>
        </div>
        {loading ? <p className="rounded-2xl border border-[#ddd4c4] p-6 text-sm"><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Loading verified requests…</p> :
          listError ? <p role="alert" className="rounded-2xl border border-[#b85b54] p-5 text-sm">{listError}</p> :
          needs.length === 0 ? <div className={panel}>
            <DoorOpen className="h-9 w-9 text-[#b19862]"/>
            <h3 className="mt-3 text-xl font-semibold">No verified requests are published yet.</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b5a56]">Weave does not invent customer demand. Real requests appear here only after Administrations confirms them. You can still explore File Folders or submit a genuine need below.</p>
          </div> :
          <div className="grid gap-4 md:grid-cols-2">
            {needs.map(need=><article key={need.id} className={panel}>
              <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#877047]"><CheckCircle2 className="h-4 w-4"/>{categories.find(item=>item[0]===need.category)?.[1] || 'Business'} · {need.location}</p>
              <h3 className="mt-3 text-xl font-semibold">{need.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#504f4a]">{need.description}</p>
              <p className="mt-4 text-xs text-[#77736d]">A verified inquiry, not a paid order, allocated customer, or promised earning.</p>
              {bridgeCode ? <button type="button" onClick={()=>{setSelected(need);setInterestStatus('');setError('');document.getElementById('propose')?.scrollIntoView({behavior:'smooth'})}} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#222a2b] px-5 py-2 text-sm font-bold text-white">Respond through your Bridger <ArrowRight className="h-4 w-4"/></button> :
                <p className="mt-4 text-sm font-semibold text-[#745c36]">A Bridger must invite you through an active WEAVE Bridge to begin a File Folder sales conversation.</p>}
            </article>)}
          </div>}
      </section>

      {selected && bridgeCode && <section id="propose" className="mt-8 scroll-mt-6">
        <div className={panel}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#8f764d]"><Handshake className="h-5 w-5"/> Business response · private</div>
          <h2 className="mt-3 text-2xl font-semibold">{selected.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#55534e]">Tell your Bridger and Administrations how your business could meet this need. Your proposal is assigned to the owner of the verified Bridge through which you arrived. The Bridger handles the sales crossing; Administrations verifies payment and activation. This is not a customer assignment.</p>
          <form onSubmit={sendInterest} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className={label}>Your business or proposed name<input required minLength={2} maxLength={140} className={input} value={interest.businessName} onChange={e=>setInterest({...interest,businessName:e.target.value})}/></label>
            <label className={label}>Contact email<input required type="email" maxLength={255} className={input} value={interest.email} onChange={e=>setInterest({...interest,email:e.target.value})}/></label>
            <label className={label+' sm:col-span-2'}>How would you meet this need?<textarea required minLength={20} maxLength={600} rows={3} className={input} value={interest.service} onChange={e=>setInterest({...interest,service:e.target.value})}/></label>
            <label className="flex items-start gap-3 text-sm leading-6 text-[#504e49] sm:col-span-2"><input required type="checkbox" checked={interest.consent} onChange={e=>setInterest({...interest,consent:e.target.checked})} className="mt-1 h-5 w-5"/><span>I consent to Weave storing this proposal and contacting me about it. No message is sent to the requester automatically.</span></label>
            <button disabled={busy} className="min-h-12 rounded-full bg-[#222a2b] px-6 text-sm font-bold text-white disabled:opacity-50">{busy?'Recording…':'Submit business response'}</button>
          </form>
          {interestStatus && <div role="status" className="mt-4 rounded-xl border border-[#a6baa1] p-4 text-sm">{interestStatus} <Link className="font-bold underline" href={crossingHref}>Continue with your Bridger</Link></div>}
        </div>
      </section>}

      <section className="mt-10 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <div className="py-3">
          <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#9a7a40]">For people who need a service</p>
          <h2 className="mt-2 text-3xl font-semibold">Let the need be heard.</h2>
          <p className="mt-4 text-sm leading-7 text-[#57534c]">Describe a genuine product or service you are looking for. Weave will privately review it. Only a non-identifying summary is published after verification, and submitting does not create an order.</p>
        </div>
        <div className={panel}>
          <form onSubmit={sendDemand} className="grid gap-4">
            <label className={label}>Industry<select className={input} value={needForm.category} onChange={e=>setNeedForm({...needForm,category:e.target.value})}>{categories.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
            <label className={label}>City or region<input required minLength={2} maxLength={90} className={input} placeholder="e.g. Lagos" value={needForm.location} onChange={e=>setNeedForm({...needForm,location:e.target.value})}/></label>
            <label className={label}>What do you need?<input required minLength={8} maxLength={120} className={input} placeholder="e.g. Recurring food supply for our office" value={needForm.title} onChange={e=>setNeedForm({...needForm,title:e.target.value})}/></label>
            <label className={label}>Describe the request<textarea required minLength={20} maxLength={600} rows={3} className={input} value={needForm.description} onChange={e=>setNeedForm({...needForm,description:e.target.value})} placeholder="What exactly do you want, and where? Do not include personal details here."/></label>
            <label className={label}>Your contact email (private)<input required type="email" maxLength={255} className={input} value={needForm.email} onChange={e=>setNeedForm({...needForm,email:e.target.value})}/></label>
            <input tabIndex={-1} autoComplete="off" value={needForm.website} onChange={e=>setNeedForm({...needForm,website:e.target.value})} className="absolute -left-[9999px]" aria-hidden="true" aria-label="Leave this field empty"/>
            <label className="flex items-start gap-3 text-sm leading-6 text-[#504e49]"><input required type="checkbox" className="mt-1 h-5 w-5" checked={needForm.consent} onChange={e=>setNeedForm({...needForm,consent:e.target.checked})}/><span>I agree that Administrations may contact me to verify this request and, if verified, publish its non-identifying summary for business discovery.</span></label>
            <button disabled={busy} className="min-h-12 rounded-full bg-[#222a2b] px-6 text-sm font-bold text-white disabled:opacity-50">{busy?'Sending…':'Submit a real need'}</button>
          </form>
          {needStatus && <p role="status" className="mt-4 rounded-xl border border-[#b0bda7] p-4 text-sm">{needStatus}</p>}
          {error && <p role="alert" className="mt-4 rounded-xl border border-[#c87368] p-4 text-sm">{error}</p>}
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-[#ddcfb6] bg-[#f0e8d8] p-6 sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#8c713e]">The business entrance</p>
        <h2 className="mt-2 text-3xl font-semibold">Your Bridger connects the opportunity to your File Folder.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#4e4a43]">Hope Bridgers carry prospect outreach, explain the File Folder, and accompany the official Bridge crossing. Administrations independently verifies purchase and activation. No inquiry, proposal, preview or purchase guarantees customers, income or a business appointment.</p>
        {crossingHref ? <Link href={crossingHref} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#20272b] px-6 py-3 text-sm font-bold text-white">Continue to {bridgerName || 'your Bridger'}'s Bridge <ArrowRight className="h-4 w-4"/></Link> :
          <p className="mt-4 text-sm font-semibold text-[#665535]">This public discovery page does not sell File Folders directly. Ask a WEAVE Bridger for an active Bridge invitation.</p>}
      </section>
    </div>
  </main>
}
