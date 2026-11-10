'use client'

import Link from 'next/link'
import {photoForSample} from '@/lib/weave-image-photo-library'
import {useEffect,useMemo,useState} from 'react'
import {useRouter} from 'next/navigation'
import {useAuth} from '@/lib/auth-provider'
import {
  WEAVE_IMAGE_SAMPLES,WEAVE_SAMPLE_FORMATS,defaultSampleEdits,
  renderWeaveSampleSvg,type SampleEdits,type SampleFormat,
} from '@/lib/weave-image-sample-art'
import {
  ArrowLeft,CheckCircle2,Copy,Download,Image as ImageIcon,
  Paintbrush,ReceiptText,RefreshCw,ShoppingBag,Wallet,
} from 'lucide-react'

type License={id:string;sample_id:string;edits:SampleEdits;fee_system_switch:number;receipt_number:string|null;service_order_id:string|null;created_at:string}
type Request={id:string;sample_id:string|null;customer_name:string;customer_contact:string;customer_brief:string;quoted_price_ngn:number|null;status:string;customer_payment_status:string;created_at:string}
type Profile={public_code:string;display_name:string;description:string;example_price_ngn:number|null;active:boolean}
type Day={day:string;sales:number;companyEarned:number}
type Studio={
  success:boolean;error?:string;fee:number;walletBalance:number;
  licenses:License[];requests:Request[];profile:Profile|null;serviceDoorUrl:string|null;companyDaily?:Day[]
}

const input='mt-2 w-full rounded-xl border border-white/15 bg-[#0a1824] px-3 py-3 text-sm text-white outline-none focus:border-cyan-300'
const small='inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[.04] px-3 py-2 text-xs font-bold text-slate-100 hover:border-cyan-200/40 disabled:opacity-40'
const num=(value:number)=>Number(value).toLocaleString('en-NG',{maximumFractionDigits:3})

export default function WeaveImageSamples(){
  const {user,isInitialized}=useAuth()
  const router=useRouter()
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [studio,setStudio]=useState<Studio|null>(null)
  const [category,setCategory]=useState('All')
  const [featured,setFeatured]=useState<string[]>([])
  const [chosen,setChosen]=useState(WEAVE_IMAGE_SAMPLES[0].id)
  const selected=WEAVE_IMAGE_SAMPLES.find(item=>item.id===chosen)||WEAVE_IMAGE_SAMPLES[0]
  const [edits,setEdits]=useState<SampleEdits>(defaultSampleEdits(WEAVE_IMAGE_SAMPLES[0]))
  const [licenseId,setLicenseId]=useState('')
  const [confirmed,setConfirmed]=useState(false)
  const [customerOrderId,setCustomerOrderId]=useState('')
  const [profile,setProfile]=useState({displayName:'',description:'',examplePriceNgn:'',active:true})
  const [adminFee,setAdminFee]=useState('')
  const isAdmin=user?.role==='admin'
  const categories=useMemo(()=>['All',...Array.from(new Set(WEAVE_IMAGE_SAMPLES.map(sample=>sample.category)))],[])
  const samples=useMemo(()=>[...(category==='All'?WEAVE_IMAGE_SAMPLES:WEAVE_IMAGE_SAMPLES.filter(sample=>sample.category===category))].sort((a,b)=>Number(featured.includes(b.id))-Number(featured.includes(a.id)) || Number(Boolean(photoForSample(b.id)))-Number(Boolean(photoForSample(a.id)))),[category,featured])
  const selectedPreview=useMemo(()=>'data:image/svg+xml;charset=utf-8,'+
    encodeURIComponent(renderWeaveSampleSvg(selected,edits,true)),[selected,edits])

  const headers=():Record<string,string>=>{
    const token=typeof window==='undefined'?'':localStorage.getItem('ssb_auth_token')||''
    return token?{Authorization:'Bearer '+token}:{}
  }
  const load=async()=>{
    try{
      const response=await fetch('/api/image-workshop/samples',{headers:headers(),cache:'no-store'})
      const data:Studio=await response.json()
      if(!response.ok||!data.success)throw new Error(data.error||'Image Studio could not be opened')
      setStudio(data)
      if(data.profile)setProfile({
        displayName:data.profile.display_name||'',description:data.profile.description||'',
        examplePriceNgn:data.profile.example_price_ngn===null?'':String(data.profile.example_price_ngn),
        active:data.profile.active!==false,
      })
      setAdminFee(String(data.fee))
    }catch(e){setError(e instanceof Error?e.message:'Image Studio could not be opened')}
    finally{setLoading(false)}
  }
  useEffect(()=>{if(isInitialized&&!user)router.replace('/login')},[isInitialized,user,router])
  useEffect(()=>{if(user?.id)void load()},[user?.id])
  useEffect(()=>{if(!user?.id)return;fetch('/api/image-workshop/business',{headers:headers(),cache:'no-store'}).then(r=>r.json()).then(d=>{if(d.success&&Array.isArray(d.featured))setFeatured(d.featured)}).catch(()=>{})},[user?.id])

  const send=async(action:string,rest:Record<string,unknown>)=>{
    const response=await fetch('/api/image-workshop/samples',{
      method:'POST',headers:{...headers(),'Content-Type':'application/json'},
      body:JSON.stringify({action,...rest}),
    })
    const data=await response.json().catch(()=>({}))
    if(!response.ok||!data.success)throw new Error(data.error||'WEAVE could not finish the action')
    return data
  }
  const run=async(key:string,fn:()=>Promise<void>)=>{
    setBusy(key);setError('');setMessage('')
    try{await fn()}catch(e){setError(e instanceof Error?e.message:'The action did not finish')}
    finally{setBusy('')}
  }
  const choose=(id:string)=>{
    const sample=WEAVE_IMAGE_SAMPLES.find(item=>item.id===id)
    if(!sample)return
    setChosen(id);setEdits(defaultSampleEdits(sample));setLicenseId('');setConfirmed(false)
  }
  const update=(key:keyof SampleEdits,value:string)=>{
    setEdits(previous=>({...previous,[key]:value}))
    setLicenseId('');setConfirmed(false)
  }
  const checkout=()=>void run('checkout',async()=>{
    if(!confirmed)throw new Error('Review and approve the displayed production fee and commercial license.')
    const result=await send('checkout',{sampleId:selected.id,edits,serviceOrderId:customerOrderId||null})
    setLicenseId(result.license.id)
    setMessage(result.existing?'This exact production is already licensed to you. No second charge was made.':
      'Commercial design licensed. The System Switch fee is recorded for WEAVE, and your final artwork is ready.')
    await load()
  })
  const download=async(license:string)=>{
    await run('download-'+license,async()=>{
      const response=await fetch('/api/image-workshop/samples/export?license='+encodeURIComponent(license),
        {headers:headers(),cache:'no-store'})
      if(!response.ok)throw new Error('This design is not available as a licensed download.')
      const content=await response.text()
      const svgUrl=URL.createObjectURL(new Blob([content],{type:'image/svg+xml;charset=utf-8'}))
      try{
        const img=new Image()
        await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error('Could not render licensed artwork.'));img.src=svgUrl})
        const width=img.naturalWidth||1080,height=img.naturalHeight||1350
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
        const ctx=canvas.getContext('2d')
        if(!ctx)throw new Error('Image export is unavailable on this phone.')
        ctx.drawImage(img,0,0,width,height)
        const png=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG export failed.')),'image/png'))
        const pngUrl=URL.createObjectURL(png)
        const anchor=document.createElement('a');anchor.href=pngUrl;anchor.download='weave-commercial-'+license.slice(0,8)+'.png'
        document.body.append(anchor);anchor.click();anchor.remove()
        setTimeout(()=>URL.revokeObjectURL(pngUrl),30000)
        setMessage('Licensed high-resolution PNG prepared for download.')
      }finally{URL.revokeObjectURL(svgUrl)}
    })
  }
  const copyDoor=()=>void run('copy',async()=>{
    if(!studio?.serviceDoorUrl)return
    await navigator.clipboard.writeText(studio.serviceDoorUrl)
    setMessage('Your customer service link was copied.')
  })
  const saveProfile=()=>void run('profile',async()=>{
    await send('save_profile',{...profile})
    setMessage('Your image service identity and public quote have been updated.')
    await load()
  })
  const changeOrder=(id:string,transition:string)=>void run('order-'+id,async()=>{
    await send('request_status',{id,transition})
    setMessage('Customer request record updated. Unverified outside payments are not counted as WEAVE earnings.')
    await load()
  })
  const saveFee=()=>void run('fee',async()=>{
    const result=await send('admin_set_fee',{fee:Number(adminFee)})
    setMessage('Administrations production fee updated to '+num(Number(result.fee))+' System Switch.')
    await load()
  })
  if(!isInitialized||!user)return <main className="min-h-screen p-8 text-slate-300">Opening the WEAVE Image Workshop…</main>
  const fee=isAdmin?0:Number(studio?.fee??1)
  const existing=studio?.licenses.find(item=>item.sample_id===selected.id&&!item.edits.artworkHash&&!item.edits.printText&&
    item.edits.brand===edits.brand&&item.edits.headline===edits.headline&&
    item.edits.description===edits.description&&item.edits.action===edits.action&&
    item.edits.format===edits.format&&item.edits.accent===edits.accent&&
    item.service_order_id===(customerOrderId||null))
  const finalLicenseId=licenseId||existing?.id||''
  const activeRequest=studio?.requests.find(item=>item.id===customerOrderId)

  return <main data-weave-offline-image-business="true" className="mx-auto min-h-screen max-w-7xl space-y-6 px-3 py-5 text-white sm:px-6">
    <Link href={isAdmin?'/authority/workshops':'/dashboard'} className="inline-flex items-center gap-2 text-xs text-slate-300"><ArrowLeft className="h-4 w-4"/>Return to WEAVE</Link>
    <header className="rounded-[1.6rem] border border-cyan-200/20 bg-[radial-gradient(ellipse_at_top_right,#25445b,#091723_70%)] p-5 sm:p-9">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/30 bg-cyan-200/10"><Paintbrush className="h-6 w-6 text-cyan-200"/></div>
      <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">WEAVE of Presence · Company creative workshop</p>
      <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">The WEAVE Image House</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
        Explore original visual collections, personalize a finished design for a real business, and sell your production to customers.
        No API key, live AI generation or paid image provider is required.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:max-w-2xl sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/[.04] p-3"><div className="text-2xl font-black text-cyan-100">{WEAVE_IMAGE_SAMPLES.length}</div><p className="text-[10px] text-slate-400">Original examples</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[.04] p-3"><div className="text-2xl font-black text-cyan-100">{categories.length-1}</div><p className="text-[10px] text-slate-400">Business styles</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[.04] p-3"><div className="text-2xl font-black text-cyan-100">{loading?'…':num(fee)}</div><p className="text-[10px] text-slate-400">System Switch / license</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[.04] p-3"><div className="text-2xl font-black text-cyan-100">{loading?'…':num(studio?.walletBalance||0)}</div><p className="text-[10px] text-slate-400">Your System Switch balance</p></div>
      </div>
    </header>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-image-house-business-systems="true">
      <Link href="/image-workshop/branding" className="flex min-h-16 items-center justify-center rounded-xl border border-cyan-200/25 bg-cyan-200/[.06] px-5 py-3 text-center text-base font-bold text-cyan-100">Brand clothes, mugs, packaging and artist merchandise</Link>
      <Link href="/image-workshop/business" className="flex min-h-16 items-center justify-center rounded-xl border border-amber-200/25 bg-amber-200/[.06] px-5 py-3 text-center text-base font-bold text-amber-100">Start and scale a branding business · Guided ads</Link>
      {isAdmin&&<Link href="/admin/image-branding" className="flex min-h-16 items-center justify-center rounded-xl border border-white/20 bg-white/[.05] px-5 py-3 text-center text-base font-bold text-white">Administrations · Branding workshop</Link>}
    </div>

    {error&&<div role="alert" className="rounded-xl border border-rose-300/25 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</div>}
    {message&&<div role="status" className="rounded-xl border border-emerald-200/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">{message}</div>}

    <section aria-label="WEAVE sample catalogue" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-amber-200">WEAVE original productions</p>
          <h2 className="mt-1 text-xl font-bold">Choose a business image</h2></div>
        <span className="text-sm text-slate-300">Real product photography for physical mockups · Original vector artwork for other concepts</span>
      </div>
      <p className="max-w-3xl text-sm leading-6 text-slate-200">Photographic examples are actual product images with a credited source—not digitally invented clothing. Select one to edit a branded material, or use the vector collection for illustrated campaigns. Upload your actual goods for a faithful customer presentation.</p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(item=><button type="button" key={item} onClick={()=>setCategory(item)}
          aria-pressed={item===category} className={'shrink-0 rounded-full border px-4 py-2 text-xs font-bold '+(item===category?'border-cyan-200 bg-cyan-200 text-[#071622]':'border-white/15 text-slate-300')}>{item}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {samples.map(item=>{
          const thumb=renderWeaveSampleSvg(item,defaultSampleEdits(item),true)
          const photo=photoForSample(item.id)
          const preview=photo?.url||'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(thumb)
          const content=<><div className="relative"><img src={preview} loading="lazy" alt={photo?item.name+' · actual material photograph':item.name+' illustrated vector concept'} className="aspect-[4/5] w-full object-cover"/>{photo&&<span className="absolute bottom-2 left-2 rounded-md border border-white/30 bg-black/80 px-2 py-1 text-[11px] font-bold text-white">Real photograph · editable</span>}</div>
            <span className="block space-y-1 bg-[#102031] p-3"><strong className="block text-sm text-white">{item.name}</strong><span className="block text-xs text-slate-300">{item.sector}</span></span></>
          return photo?.printZone?<Link key={item.id} href={'/image-workshop/branding?sampleId='+encodeURIComponent(item.id)} className="group overflow-hidden rounded-2xl border border-amber-300/40 text-left transition hover:border-amber-200">{content}</Link>
            :<button key={item.id} type="button" onClick={()=>{choose(item.id);document.getElementById('weave-image-editor')?.scrollIntoView({behavior:'smooth',block:'start'})}}
              aria-pressed={chosen===item.id} className={'group overflow-hidden rounded-2xl border text-left transition '+(chosen===item.id?'border-cyan-200 ring-2 ring-cyan-200/20':'border-white/10 hover:border-white/30')}>{content}</button>
        })}
      </div>
    </section>

    <section id="weave-image-editor" className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.9fr)]">
      <div className="space-y-5 rounded-2xl border border-white/10 bg-[#0b1927] p-4 sm:p-6">
        <div><p className="text-[10px] font-black uppercase tracking-widest text-cyan-200">Production desk</p>
          <h2 className="mt-1 text-xl font-bold">{selected.name}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">Edit the words, size and finish. The watermarked preview is free. A paid license unlocks your exact finished image.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-200">Business or brand
            <input className={input} maxLength={55} value={edits.brand} onChange={e=>update('brand',e.target.value)}/></label>
          <label className="text-xs text-slate-200">Final image format
            <select className={input} value={edits.format} onChange={e=>update('format',e.target.value as SampleFormat)}>
              {Object.entries(WEAVE_SAMPLE_FORMATS).map(([key,value])=><option value={key} key={key}>{value.label}</option>)}
            </select></label>
        </div>
        <label className="block text-xs text-slate-200">Main headline
          <textarea className={input+' min-h-24 resize-y'} maxLength={110} value={edits.headline} onChange={e=>update('headline',e.target.value)}/></label>
        <label className="block text-xs text-slate-200">Supporting message
          <textarea className={input+' min-h-24 resize-y'} maxLength={150} value={edits.description} onChange={e=>update('description',e.target.value)}/></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-200">Customer action
            <input className={input} maxLength={55} value={edits.action} onChange={e=>update('action',e.target.value)}/></label>
          <label className="text-xs text-slate-200">Decorative accent
            <input className={input+' h-12 cursor-pointer p-1'} type="color" value={edits.accent} onChange={e=>update('accent',e.target.value)}/></label>
        </div>
        {!isAdmin&&studio?.requests.some(item=>item.status==='accepted')&&<label className="block text-xs text-slate-200">Attach to an accepted customer job
          <select className={input} value={customerOrderId} onChange={e=>{setCustomerOrderId(e.target.value);setLicenseId('');setConfirmed(false)}}>
            <option value="">Own production / portfolio</option>
            {studio.requests.filter(item=>item.status==='accepted').map(item=><option value={item.id} key={item.id}>{item.customer_name} · {item.customer_brief.slice(0,50)}</option>)}
          </select></label>}
        {activeRequest&&<p className="text-xs text-slate-300">Production linked to request from <strong>{activeRequest.customer_name}</strong>. Each customer commission requires its own WEAVE production license.</p>}
        <div className="rounded-xl border border-amber-200/20 bg-amber-200/[.06] p-4">
          <h3 className="text-sm font-bold text-amber-100">Commercial production terms</h3>
          <p className="mt-2 text-xs leading-5 text-slate-300">
            {isAdmin?'Official Administrations output · No internal wallet debit.':
              'WEAVE company fee: '+num(fee)+' System Switch for this customized production. You may sell the finished, licensed output at a price you agree with your customer. No third-party customer payment is collected by this checkout.'}
          </p>
          <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-300">
            <input type="checkbox" className="mt-1" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>
            I approve the displayed production fee and understand that I may sell customized finished work, not the unmodified source templates or WEAVE brand ownership.
          </label>
        </div>
        {finalLicenseId?<button disabled={Boolean(busy)} type="button" onClick={()=>void download(finalLicenseId)}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-200 px-4 text-sm font-black text-[#0d2a21] disabled:opacity-50">
          <Download className="h-5 w-5"/>Download licensed high-resolution PNG</button>:
          <button type="button" onClick={checkout} disabled={Boolean(busy)||!confirmed||loading}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-cyan-200 px-4 text-sm font-black text-[#061521] disabled:opacity-50">
            <ShoppingBag className="h-5 w-5"/>{busy==='checkout'?'Recording purchase…':isAdmin?'License official image · No charge':'Approve '+num(fee)+' System Switch and license image'}
          </button>}
        {!isAdmin&&<Link href="/wallet/deposit-withdraw" className={small+' w-full'}><Wallet className="h-4 w-4"/>Fund System Switch wallet</Link>}
        <p className="text-[11px] leading-5 text-slate-400">All sample artwork is predesigned, vector-based illustration. This is not live AI photography or custom AI generation. The licensed file contains your edits and is saved in your WEAVE production records.</p>
      </div>
      <div className="space-y-4 lg:sticky lg:top-5">
        <div className="rounded-2xl border border-white/10 bg-[#0b1927] p-3 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-bold"><ImageIcon className="h-4 w-4 text-cyan-200"/>Live image preview</h2>
            <span className="text-[10px] text-slate-400">{WEAVE_SAMPLE_FORMATS[edits.format].width}×{WEAVE_SAMPLE_FORMATS[edits.format].height}</span></div>
          <img src={selectedPreview} alt={'Current WEAVE sample preview: '+selected.name} className="max-h-[72vh] w-full rounded-xl border border-white/10 bg-black/30 object-contain"/>
          <p className="mt-3 text-xs text-slate-400">Watermark disappears from the purchased commercial export.</p>
        </div>
      </div>
    </section>

    <section className="grid gap-5 lg:grid-cols-2">
      {!isAdmin&&<div id="image-house-customer-door" className="space-y-4 rounded-2xl border border-white/10 bg-[#0b1927] p-5">
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-amber-200">Your business door</p>
          <h2 className="mt-1 text-xl font-bold">Let customers commission you</h2>
          <p className="mt-2 text-xs leading-5 text-slate-400">Choose your customer quote. Share your WEAVE service link. Each customer submits a brief, and you create and license their finished design.</p></div>
        <label className="block text-xs text-slate-200">Business display name<input className={input} maxLength={160} value={profile.displayName} onChange={e=>setProfile(p=>({...p,displayName:e.target.value}))}/></label>
        <label className="block text-xs text-slate-200">What you offer<textarea className={input+' min-h-20'} maxLength={350} value={profile.description} onChange={e=>setProfile(p=>({...p,description:e.target.value}))}/></label>
        <label className="block text-xs text-slate-200">Indicative customer price in NGN (optional, not a guaranteed sale)
          <input className={input} type="number" min={0} step={1} value={profile.examplePriceNgn} onChange={e=>setProfile(p=>({...p,examplePriceNgn:e.target.value}))}/></label>
        <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={profile.active} onChange={e=>setProfile(p=>({...p,active:e.target.checked}))}/>Public customer service door open</label>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={saveProfile} disabled={Boolean(busy)} className={small}><CheckCircle2 className="h-4 w-4"/>Save your service door</button>
          <button type="button" onClick={copyDoor} disabled={!studio?.serviceDoorUrl||Boolean(busy)} className={small}><Copy className="h-4 w-4"/>Copy customer link</button></div>
        {studio?.serviceDoorUrl&&<a href={studio.serviceDoorUrl} target="_blank" rel="noreferrer" className="block break-all text-xs text-cyan-200 underline">{studio.serviceDoorUrl}</a>}
        <p className="text-xs leading-5 text-slate-400">Outside customer payments remain your responsibility. Reporting receipt is not verification by WEAVE and is not company revenue.</p>
      </div>}
      {isAdmin&&<div className="space-y-4 rounded-2xl border border-white/10 bg-[#0b1927] p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200">Administrations · company production income</p>
        <h2 className="text-xl font-bold">Verified System Switch earnings</h2>
        <label className="block text-xs text-slate-200">Published fee per commercial production license
          <input className={input} type="number" min={0} max={1000} step=".001" value={adminFee} onChange={e=>setAdminFee(e.target.value)}/></label>
        <button type="button" onClick={saveFee} disabled={Boolean(busy)} className={small}>Publish company fee</button>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {(studio?.companyDaily||[]).length?<table className="w-full text-left text-xs"><thead><tr><th className="p-2">Day (UTC)</th><th className="p-2">Licenses sold</th><th className="p-2">Company earnings</th></tr></thead>
          <tbody>{(studio?.companyDaily||[]).map(item=><tr className="border-t border-white/10" key={item.day}>
            <td className="p-2">{new Date(item.day).toISOString().slice(0,10)}</td><td className="p-2">{item.sales}</td><td className="p-2">{num(item.companyEarned)} System Switch</td>
          </tr>)}</tbody></table>:<p className="py-6 text-xs text-slate-400">No paid sample exports recorded yet. Previews and official internal designs do not count as company sales.</p>}
        </div>
        <p className="text-xs text-slate-400">Only committed paid licensing records appear here. Unverified customer promises and sample views are excluded.</p>
      </div>}

      <div className="rounded-2xl border border-white/10 bg-[#0b1927] p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Your licensed productions</h2><button type="button" onClick={()=>void load()} className={small} disabled={Boolean(busy)}><RefreshCw className="h-4 w-4"/>Refresh</button></div>
        <div className="mt-3 max-h-96 space-y-2 overflow-auto">
          {!studio?.licenses?.length?<p className="py-8 text-center text-xs text-slate-400">Commercial licenses and their receipts will be saved here.</p>:
            studio.licenses.map(item=><div key={item.id} className="rounded-xl border border-white/10 bg-white/[.03] p-3">
              <p className="text-xs font-bold">{WEAVE_IMAGE_SAMPLES.find(s=>s.id===item.sample_id)?.name||item.sample_id}</p>
              <p className="mt-1 text-[11px] text-slate-300">{item.edits.brand} · {item.edits.format} · {num(item.fee_system_switch)} System Switch</p>
              <p className="mt-1 break-all text-[10px] text-slate-500"><ReceiptText className="mr-1 inline h-3 w-3"/>{item.receipt_number||'Official Administrations production'} · {new Date(item.created_at).toLocaleDateString()}</p>
              <button type="button" className={small+' mt-2'} disabled={Boolean(busy)} onClick={()=>void download(item.id)}><Download className="h-4 w-4"/>Download PNG again</button>
            </div>)}
        </div>
      </div>
    </section>

    {!isAdmin&&<section id="image-house-orders" className="rounded-2xl border border-white/10 bg-[#0b1927] p-5">
      <h2 className="text-lg font-bold">Customer requests · Daily work</h2>
      <p className="mt-1 text-xs leading-5 text-slate-400">Respond to inquiries, agree on the customer's price, produce the image, then record completion. The customer payment status below is a producer report, not a verified WEAVE settlement.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {!studio?.requests?.length?<p className="p-4 text-xs text-slate-400">No incoming requests yet. Share your service door to begin prospecting.</p>:
          studio.requests.map(order=><article key={order.id} className="space-y-2 rounded-xl border border-white/10 bg-[#102031] p-4">
            <div className="flex items-start justify-between gap-3"><strong className="text-sm">{order.customer_name}</strong>
              <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] uppercase text-slate-300">{order.status}</span></div>
            <p className="text-xs leading-5 text-slate-300">{order.customer_brief}</p>
            <p className="text-[11px] text-slate-400">Contact: {order.customer_contact}</p>
            <p className="text-[11px] text-slate-400">Payment: {order.customer_payment_status==='reported_received'?'Reported received (unverified)':'Not verified'}{order.quoted_price_ngn!==null?' · Quoted ₦'+num(Number(order.quoted_price_ngn)):''}</p>
            <div className="flex flex-wrap gap-2">
              {order.status==='requested'&&<><button type="button" className={small} disabled={Boolean(busy)} onClick={()=>changeOrder(order.id,'accept')}>Accept</button>
                <button type="button" className={small} disabled={Boolean(busy)} onClick={()=>changeOrder(order.id,'reject')}>Decline</button></>}
              {order.status==='accepted'&&<>
                <button type="button" className={small} onClick={()=>{setCustomerOrderId(order.id);if(order.sample_id)choose(order.sample_id);setTimeout(()=>document.getElementById('weave-image-editor')?.scrollIntoView({behavior:'smooth'}),0)}}>Create this image</button>
                {order.customer_payment_status!=='reported_received'&&<button type="button" className={small} disabled={Boolean(busy)} onClick={()=>changeOrder(order.id,'payment_reported')}>Report customer paid</button>}
                <button type="button" className={small} disabled={Boolean(busy)} onClick={()=>changeOrder(order.id,'complete')}>Mark production complete</button>
              </>}
            </div>
          </article>)}
      </div>
    </section>}
    <footer className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
      <Link href="/agent/creative" className={small}>Free classic image layouts</Link>
      <Link href={isAdmin?'/admin/video-ad-workshop':'/video-ad-studio'} className={small}>Video production workshop</Link>
      <Link href="/receipts" className={small}>My company receipts</Link>
    </footer>
  </main>
}
