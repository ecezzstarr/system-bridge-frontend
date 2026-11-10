'use client'

import Link from 'next/link'
import {useEffect,useMemo,useRef,useState,type ChangeEvent} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {ArrowLeft,Download,ImagePlus,ShoppingBag,SlidersHorizontal,Wallet} from 'lucide-react'
import {MATERIAL_MOCKUPS,materialForSample} from '@/lib/weave-branding-business'
import {defaultSampleEdits,findImageSample,renderWeaveSampleSvg,type SampleEdits} from '@/lib/weave-image-sample-art'
import {photoForSample} from '@/lib/weave-image-photo-library'

type CustomerOrder={id:string;customer_name:string;status:string;sample_id:string|null;customer_brief:string}
type Studio={success:boolean;fee:number;walletBalance:number;requests:CustomerOrder[];error?:string}
const input='mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#112536] px-4 py-3 text-base text-white focus:border-cyan-200 focus:outline-none'
const button='inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[.04] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40'
const auth=(json=false):Record<string,string>=>{
  const token=typeof window==='undefined'?'':localStorage.getItem('ssb_auth_token')||''
  return {...(json?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})}
}
function loadImage(src:string){
  return new Promise<HTMLImageElement>((resolve,reject)=>{
    const image=new Image()
    if(src.startsWith('https://'))image.crossOrigin='anonymous'
    image.onload=()=>resolve(image)
    image.onerror=()=>reject(new Error('An artwork preview could not be rendered.'))
    image.src=src
  })
}
function placement(ctx:CanvasRenderingContext2D,kind:string,mark:HTMLImageElement|null,printText:string,color:string,scale:number,offsetX:number,offsetY:number,rotation:number){
  const item=materialForSample(kind)
  if(!item)return
  const factor=1.08,z=item.zone
  const x=z.x*factor,y=z.y*factor,w=z.w*factor,h=z.h*factor
  ctx.save()
  ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(25,w*.08));ctx.clip()
  if(mark){
    const fit=Math.min(w*.88/mark.naturalWidth,h*.84/mark.naturalHeight)*scale
    const mw=mark.naturalWidth*fit,mh=mark.naturalHeight*fit
    const cx=x+w/2+offsetX*factor,cy=y+h/2+offsetY*factor
    ctx.translate(cx,cy);ctx.rotate(rotation*Math.PI/180)
    ctx.drawImage(mark,-mw/2,-mh/2,mw,mh)
    ctx.rotate(-rotation*Math.PI/180);ctx.translate(-cx,-cy)
  }
  if(printText.trim()){
    ctx.fillStyle=color
    ctx.textAlign='center';ctx.textBaseline='middle'
    ctx.font='900 '+Math.round(Math.min(32,w*.125))+'px Arial,sans-serif'
    const words=printText.trim().split(/\s+/)
    const rows:string[]=[];let current=''
    for(const word of words){
      const next=current?current+' '+word:word
      if(ctx.measureText(next).width>w*.88&&current){rows.push(current);current=word}else current=next
    }
    if(current)rows.push(current)
    rows.slice(0,3).forEach((row,i)=>ctx.fillText(row,x+w/2,y+h*.74+i*Math.min(36,h*.15),w*.9))
  }
  ctx.restore()
}
export default function WeaveMaterialBranding(){
  const {user,isInitialized}=useAuth()
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [sampleId,setSampleId]=useState('brand-tee-classic')
  const [brand,setBrand]=useState('YOUR BRAND')
  const [headline,setHeadline]=useState('Made for your customers')
  const [printText,setPrintText]=useState('YOUR ART')
  const [printColor,setPrintColor]=useState('#ffffff')
  const [accent,setAccent]=useState('#b9a36f')
  const [scale,setScale]=useState(0.85)
  const [offsetX,setOffsetX]=useState(0)
  const [offsetY,setOffsetY]=useState(0)
  const [rotation,setRotation]=useState(0)
  const [photoUrl,setPhotoUrl]=useState('')
  const [productPhotoUrl,setProductPhotoUrl]=useState('')
  const [productPhotoHash,setProductPhotoHash]=useState('')
  const [usingRealPhotograph,setUsingRealPhotograph]=useState(false)
  const [artworkHash,setArtworkHash]=useState('')
  const [licenseId,setLicenseId]=useState('')
  const [requestId,setRequestId]=useState('')
  const [accepted,setAccepted]=useState(false)
  const [ready,setReady]=useState(false)
  const [busy,setBusy]=useState('')
  const [notice,setNotice]=useState('')
  const [studio,setStudio]=useState<Studio|null>(null)
  const sample=findImageSample(sampleId)
  const referencePhoto=photoForSample(sampleId)
  const sourcePhoto=productPhotoUrl||referencePhoto?.url||''
  const defaultEdits=useMemo(()=>sample?defaultSampleEdits(sample):null,[sample?.id])
  const fee=user?.role==='admin'?0:Number(studio?.fee??1)
  const change=()=>{setLicenseId('');setAccepted(false)}
  useEffect(()=>{if(photoUrl)return()=>URL.revokeObjectURL(photoUrl)},[photoUrl])
  useEffect(()=>{if(productPhotoUrl)return()=>URL.revokeObjectURL(productPhotoUrl)},[productPhotoUrl])
  useEffect(()=>{const selected=new URLSearchParams(window.location.search).get('sampleId');if(selected&&materialForSample(selected)){setSampleId(selected);setBrand(findImageSample(selected)?.brand||'YOUR BRAND')}},[])
  useEffect(()=>{
    if(!user?.id)return
    fetch('/api/image-workshop/samples',{headers:auth(),cache:'no-store'}).then(r=>r.json()).then((d:Studio)=>{if(d.success)setStudio(d)}).catch(()=>setNotice('Production fees and customer work are temporarily unavailable.'))
  },[user?.id])
  const edits:SampleEdits|null=sample&&defaultEdits?{
    ...defaultEdits,brand:brand.trim().slice(0,55),headline:headline.trim().slice(0,110),accent,
    ...(artworkHash?{artworkHash}:{}),
    ...(productPhotoHash?{photoHash:productPhotoHash}:{}),
    ...(printText.trim()?{printText:printText.trim()}:{}),
    printColor,printX:offsetX,printY:offsetY,printScale:scale,printRotation:rotation,
    format:'portrait',
  }:null
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas||!sample||!edits)return
    let cancelled=false
    setReady(false)
    const picture=sourcePhoto
    Promise.all([picture?loadImage(picture):Promise.reject(Error('Provide a real product photo.')),photoUrl?loadImage(photoUrl):Promise.resolve(null)])
      .then(([background,art])=>{
        if(cancelled)return
        const ctx=canvas.getContext('2d');if(!ctx)return
        canvas.width=1080;canvas.height=1350
        ctx.clearRect(0,0,1080,1350)
        const ratio=Math.max(1080/background.naturalWidth,1350/background.naturalHeight)
        const drawW=background.naturalWidth*ratio,drawH=background.naturalHeight*ratio
        ctx.drawImage(background,(1080-drawW)/2,(1350-drawH)/2,drawW,drawH)
        placement(ctx,sampleId,art,printText,printColor,scale,offsetX,offsetY,rotation)
        const fade=ctx.createLinearGradient(0,880,0,1350)
        fade.addColorStop(0,'rgba(2,9,16,0)');fade.addColorStop(1,'rgba(2,9,16,.94)')
        ctx.fillStyle=fade;ctx.fillRect(0,870,1080,480)
        ctx.fillStyle='#f9ead1';ctx.font='bold 38px Arial,sans-serif'
        ctx.fillText(brand.trim().slice(0,32).toUpperCase()||'YOUR BRAND',68,1133,940)
        ctx.font='bold 52px Georgia,serif';ctx.fillText(headline.trim().slice(0,49)||'Your design story',68,1203,940)
        ctx.font='20px Arial,sans-serif';ctx.fillStyle='#d5b879';ctx.fillText('CUSTOM MATERIAL · WEAVE BRANDING STUDIO',68,1267,940)
        // Never debit System Switch if an external photo taints the export canvas.
        // The participant can use their own actual product photo instead.
        ctx.getImageData(0,0,1,1)
        if(!licenseId){ctx.save();ctx.translate(600,635);ctx.rotate(-.3);ctx.fillStyle='rgba(2,9,16,.72)';ctx.fillRect(-530,-44,1060,89);ctx.font='bold 31px Arial,sans-serif';ctx.fillStyle='#fff3db';ctx.textAlign='center';ctx.fillText('WEAVE SAMPLE · PREVIEW',0,9);ctx.restore()}
        setUsingRealPhotograph(true)
        setReady(true)
      }).catch(()=>{if(!cancelled){setUsingRealPhotograph(false);setReady(false);setNotice('The photographic source could not load. Upload an actual product photograph to continue. No payment has been taken.')}})
    return()=>{cancelled=true}
  },[sampleId,brand,headline,printText,printColor,accent,scale,offsetX,offsetY,rotation,photoUrl,productPhotoUrl,licenseId])
  const upload=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];if(!file)return
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024||!file.size){
      setNotice('Upload a PNG, JPG or WEBP image smaller than 5MB.');event.target.value='';return
    }
    try{
      const buffer=await file.arrayBuffer()
      const digest=await crypto.subtle.digest('SHA-256',buffer)
      setArtworkHash(Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join(''))
      setPhotoUrl(URL.createObjectURL(file))
      change();setNotice('Your artwork is loaded locally and has not been sent to a provider.')
    }catch{setNotice('Unable to read that artwork on this phone.')}
  }
  const uploadProduct=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];if(!file)return
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024||!file.size){
      setNotice('Select a real product photograph in PNG, JPG or WEBP under 5MB.');event.target.value='';return
    }
    try{
      const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer())
      setProductPhotoHash(Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join(''))
      setProductPhotoUrl(URL.createObjectURL(file))
      change();setNotice('Your real product photograph is loaded privately on this device.')
    }catch{setNotice('This photograph could not be opened.')}
  }
  const license=async()=>{
    if(!edits||!sample||!accepted||!ready||!usingRealPhotograph)return
    setBusy('license');setNotice('')
    try{
      const response=await fetch('/api/image-workshop/samples',{method:'POST',headers:auth(true),
        body:JSON.stringify({action:'checkout',sampleId,edits,serviceOrderId:requestId||null})})
      const result=await response.json()
      if(!response.ok||!result.success)throw Error(result.error||'Licensing did not complete.')
      setLicenseId(result.license.id)
      setNotice(result.existing?'This exact design was already licensed to your account. No second charge.':
        'Your branded concept is licensed; the System Switch company fee was recorded. Download the finished mockup.')
      setStudio(current=>current?{...current,walletBalance:Number(result.balance??current.walletBalance)}:current)
    }catch(e){setNotice(e instanceof Error?e.message:'Could not license this product.') }
    finally{setBusy('')}
  }
  const download=async()=>{
    if(!licenseId||!sample||!edits)return
    setBusy('download');setNotice('')
    try{
      const res=await fetch('/api/image-workshop/samples/export?license='+encodeURIComponent(licenseId),{headers:auth(),cache:'no-store'})
      if(!res.ok)throw Error('This licensed design cannot be exported.')
      // Export endpoint authorizes the paid, owner-bound production license.
      // The photograph and uploaded logo are composed locally rather than stored by the SVG service.
      try{
        const [background,art]=await Promise.all([sourcePhoto?loadImage(sourcePhoto):Promise.reject(Error('A real product photograph is required.')),photoUrl?loadImage(photoUrl):Promise.resolve(null)])
        const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350
        const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image export is unavailable on this phone.')
        const ratio=Math.max(1080/background.naturalWidth,1350/background.naturalHeight)
        const drawW=background.naturalWidth*ratio,drawH=background.naturalHeight*ratio
        ctx.drawImage(background,(1080-drawW)/2,(1350-drawH)/2,drawW,drawH)
        placement(ctx,sampleId,art,printText,printColor,scale,offsetX,offsetY,rotation)
        const fade=ctx.createLinearGradient(0,880,0,1350)
        fade.addColorStop(0,'rgba(2,9,16,0)');fade.addColorStop(1,'rgba(2,9,16,.94)')
        ctx.fillStyle=fade;ctx.fillRect(0,870,1080,480)
        ctx.fillStyle='#f9ead1';ctx.font='bold 38px Arial,sans-serif'
        ctx.fillText(brand.trim().slice(0,32).toUpperCase()||'YOUR BRAND',68,1133,940)
        ctx.font='bold 52px Georgia,serif';ctx.fillText(headline.trim().slice(0,49)||'Your design story',68,1203,940)
        ctx.font='20px Arial,sans-serif';ctx.fillStyle='#d5b879';ctx.fillText('CUSTOM MATERIAL · WEAVE BRANDING STUDIO',68,1267,940)
        const png=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG export failed.')),'image/png'))
        const url=URL.createObjectURL(png)
        const a=document.createElement('a');a.href=url;a.download='weave-brand-'+sampleId+'.png'
        document.body.appendChild(a);a.click();a.remove()
        window.setTimeout(()=>URL.revokeObjectURL(url),30000)
        setNotice('Your licensed high-resolution product mockup has been prepared for download.')
      }finally{/* Local object URLs are released by their owning effects. */}
    }catch(e){setNotice(e instanceof Error?e.message:'Could not export the licensed mockup.')}
    finally{setBusy('')}
  }
  if(!isInitialized)return <main className="p-8 text-white">Opening WEAVE branding…</main>
  if(!user)return <main className="p-8"><Link href="/login" className="text-cyan-200 underline">Sign in to use the Branding Workshop</Link></main>
  if(!['agent','bridger','client','admin'].includes(String(user.role||'')))return <main className="p-8 text-white">This company workshop requires an approved role.</main>
  return <main className="weave-operating-environment min-h-screen bg-[#071523] px-3 py-6 text-white sm:px-6" data-weave-material-branding="true">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-3xl border border-cyan-200/20 bg-[radial-gradient(ellipse_at_top_right,#2c495b,#071523_75%)] p-5 sm:p-8">
        <Link href="/image-workshop" className="inline-flex items-center gap-2 text-sm text-cyan-200"><ArrowLeft size={16}/>Image House</Link>
        <p className="mt-5 text-xs font-bold uppercase tracking-widest text-amber-200">WEAVE · Material and artist branding</p>
        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Put your own artwork on real-world products</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-200">Make a clothing label, present merchandise, customize product packaging or extend an artist's work onto merchandise. The editor works on your phone without an image-generation API. These are product mockups, not proof of manufactured stock.</p>
      </header>
      {notice&&<div role="status" className="rounded-xl border border-cyan-200/20 p-4 text-sm leading-6">{notice}</div>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
        <section className="space-y-5 rounded-3xl border border-white/10 bg-[#0e2030] p-4 sm:p-6">
          <div className="flex items-center gap-2"><SlidersHorizontal size={20} className="text-cyan-200"/><h2 className="text-xl font-bold">Choose and edit a material</h2></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MATERIAL_MOCKUPS.map(item=><button type="button" key={item.sampleId} onClick={()=>{setSampleId(item.sampleId);setBrand(findImageSample(item.sampleId)?.brand||'YOUR BRAND');setAccent(findImageSample(item.sampleId)?.palette[3]||'#b9a36f');change()}} aria-pressed={sampleId===item.sampleId} className={'min-h-20 rounded-xl border p-3 text-left '+(sampleId===item.sampleId?'border-cyan-200 bg-cyan-200/10':'border-white/15')}><span className="block text-sm font-bold">{item.title}</span><span className="mt-1 block text-xs text-slate-300">{item.kind}</span></button>)}
          </div>
          <div className="rounded-2xl border border-amber-200/30 bg-[#181812] p-4" data-photo-material-origin="real">
            <h3 className="text-base font-bold text-amber-100">Actual product photography · not an illustration</h3>
            <p className="mt-2 text-sm leading-6 text-slate-200">{referencePhoto?'Example: '+referencePhoto.subject+' photographed by '+referencePhoto.credit+'. This is a real photographed item, not your inventory.':'No photographed stock image is supplied for this material.'} For your actual customer product, upload your own photograph below.</p>
            <label className="mt-4 block text-sm font-semibold">Upload a photograph of your own real shirt, bag, package or other product
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void uploadProduct(e)} className="mt-3 block w-full text-sm"/>
            </label>
            {productPhotoUrl&&<button type="button" onClick={()=>{setProductPhotoUrl('');setProductPhotoHash('');change()}} className={button+' mt-3'}>Return to the reference photograph</button>}
            {referencePhoto&&<a href={referencePhoto.source} target="_blank" rel="noreferrer" className="mt-3 block text-sm text-amber-200 underline">View photograph and photographer source</a>}
            <p className="mt-3 text-xs leading-5 text-slate-300">Reference photos require a network connection and may be unavailable. Your upload remains local. Upload and preserve your original photo for repeat jobs; no stock photograph implies physical fulfillment by WEAVE.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Your label / brand<input className={input} value={brand} maxLength={55} onChange={e=>{setBrand(e.target.value);change()}}/></label>
            <label className="text-sm font-semibold">Your offer headline<input className={input} value={headline} maxLength={110} onChange={e=>{setHeadline(e.target.value);change()}}/></label>
            <label className="text-sm font-semibold">Text on print area<input className={input} value={printText} maxLength={85} onChange={e=>{setPrintText(e.target.value);change()}}/></label>
            <label className="text-sm font-semibold">Mockup accent color<input type="color" className={input+' h-14 cursor-pointer p-2'} value={accent} onChange={e=>{setAccent(e.target.value);change()}}/></label>
            <label className="text-sm font-semibold">Print lettering color<input type="color" className={input+' h-14 cursor-pointer p-2'} value={printColor} onChange={e=>{setPrintColor(e.target.value);change()}}/></label>
          </div>
          <div className="space-y-3 rounded-xl border border-white/10 p-4">
            <label className="block text-sm font-bold"><ImagePlus size={16} className="mr-2 inline"/>Place your own image or logo
              <input type="file" accept="image/png,image/jpeg,image/webp" className="mt-3 w-full text-sm text-slate-200" onChange={e=>void upload(e)}/></label>
            <p className="text-xs leading-5 text-slate-300">Your PNG/JPG/WEBP remains on your device. Artwork digest is included in the production license so a different customer design has its own record. Keep the original for future edits.</p>
            {photoUrl&&<button type="button" className={button} onClick={()=>{setPhotoUrl('');setArtworkHash('');change()}}>Remove the uploaded artwork</button>}
            <label className="block text-sm">Artwork size · {Math.round(scale*100)}%<input aria-label="Artwork size" type="range" min={25} max={150} value={Math.round(scale*100)} onChange={e=>{setScale(Number(e.target.value)/100);change()}} className="mt-2 w-full"/></label>
            <label className="block text-sm">Move left / right<input aria-label="Move artwork horizontally" type="range" min={-120} max={120} value={offsetX} onChange={e=>{setOffsetX(Number(e.target.value));change()}} className="mt-2 w-full"/></label>
            <label className="block text-sm">Move up / down<input aria-label="Move artwork vertically" type="range" min={-120} max={120} value={offsetY} onChange={e=>{setOffsetY(Number(e.target.value));change()}} className="mt-2 w-full"/></label>
            <label className="block text-sm">Rotation · {rotation}°<input aria-label="Artwork rotation" type="range" min={-45} max={45} value={rotation} onChange={e=>{setRotation(Number(e.target.value));change()}} className="mt-2 w-full"/></label>
          </div>
          {(studio?.requests||[]).some(r=>r.status==='accepted')&&<label className="block text-sm font-semibold">Customer production reference
            <select className={input} value={requestId} onChange={e=>{setRequestId(e.target.value);change()}}>
              <option value="">Own collection / portfolio</option>
              {(studio?.requests||[]).filter(r=>r.status==='accepted').map(r=><option key={r.id} value={r.id}>{r.customer_name} · {r.customer_brief.slice(0,45)}</option>)}
            </select>
          </label>}
          <div className="rounded-xl border border-amber-200/25 bg-amber-200/[.05] p-4">
            <h3 className="text-base font-bold text-amber-100">Commercial licensing</h3>
            <p className="mt-2 text-sm leading-6 text-slate-200">Your preview is free. {user.role==='admin'?'Official Administrations exports carry no internal fee.':'The company license for a new customized mockup is '+fee+' System Switch. You choose any separate customer service quote; it is not collected here.'}</p>
            <label className="mt-3 flex items-start gap-2 text-sm leading-6 text-slate-200"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} className="mt-1 h-5 w-5"/>I approve the shown fee and have rights to use any uploaded artwork. This is a digital preview, not a physical print order.</label>
          </div>
          {licenseId?
            <button type="button" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-200 px-5 text-base font-black text-[#09251e] disabled:opacity-50" disabled={Boolean(busy)||!ready} onClick={()=>void download()}><Download size={20}/>{busy==='download'?'Preparing PNG…':'Download licensed mockup PNG'}</button>:
            <button type="button" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-cyan-200 px-5 text-base font-black text-[#071923] disabled:opacity-50" disabled={Boolean(busy)||!accepted||!ready||!usingRealPhotograph} onClick={()=>void license()}><ShoppingBag size={20}/>{busy==='license'?'Checking license…':user.role==='admin'?'License official design':'License for '+fee+' System Switch'}</button>}
          {user.role!=='admin'&&<Link href="/wallet/deposit-withdraw" className={button}><Wallet size={17}/>Fund your System Switch</Link>}
        </section>
        <aside className="space-y-4 lg:sticky lg:top-5">
          <div className="rounded-3xl border border-white/10 bg-[#0e2030] p-4"><h2 className="text-lg font-bold">Live product preview</h2>
            <canvas ref={canvasRef} aria-label="Live product branding mockup" className="mt-3 max-h-[75vh] w-full rounded-xl border border-white/10 bg-slate-950 object-contain" style={{aspectRatio:'4 / 5'}}/>
            <p className="mt-3 text-xs leading-6 text-slate-300">A branded composition on a real source photograph or your own photographed product, with editable artwork and typography. A preview is not a claim that WEAVE manufactured the item. No AI image generation.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0e2030] p-5"><h3 className="text-lg font-bold">Turn your product into a company business</h3><p className="mt-2 text-sm leading-6 text-slate-300">Give customers a quote, open a Service Door, build a promotional image and start an authorized advertising routine. Expand into more product types when orders justify it.</p>
            <Link href="/image-workshop/business" className={button+' mt-4'}>Open the branding business system</Link>
          </div>
        </aside>
      </div>
    </div>
  </main>
}
