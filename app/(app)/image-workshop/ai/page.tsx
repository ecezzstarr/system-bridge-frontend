'use client'

import Link from 'next/link'
import {useEffect,useState,type FormEvent} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {ArrowLeft,Download,ImagePlus,RefreshCw,Sparkles} from 'lucide-react'

type Asset={id:string;prompt:string;preset:string;image_size:string;model:string;created_at:string}
type Gallery={success:boolean;configured:boolean;limit:number;used:number;assets:Asset[];presets:string[];error?:string}
const variants=[['photographic','Realistic photography'],['product','Product imagery'],['architecture','Architecture'],['cinematic','Cinema'],['portrait','Portrait'],['fashion','Fashion'],['poster','Poster'],['illustration','Illustration'],['fantasy','Fantasy'],['threed','3D systems'],['social','Social advertisement'],['storybook','Storybook']]
const control='min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 focus:border-amber-600 focus:outline-none'
const headers=():Record<string,string>=>{
  const token=typeof window==='undefined'?'':localStorage.getItem('ssb_auth_token')||''
  return token?{Authorization:'Bearer '+token}:{}
}
export default function WeaveOptionalAiImageWorkshop(){
  const {user,isInitialized}=useAuth()
  const [gallery,setGallery]=useState<Gallery|null>(null)
  const [selected,setSelected]=useState<Asset|null>(null)
  const [previewUrl,setPreviewUrl]=useState('')
  const [prompt,setPrompt]=useState('')
  const [preset,setPreset]=useState('photographic')
  const [model,setModel]=useState('gpt-image-2.5-flare')
  const [size,setSize]=useState('1024x1024')
  const [quality,setQuality]=useState('medium')
  const [transparent,setTransparent]=useState(false)
  const [reference,setReference]=useState<File|null>(null)
  const [refineId,setRefineId]=useState('')
  const [notice,setNotice]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const load=async()=>{
    try{
      const res=await fetch('/api/image-workshop',{headers:headers(),cache:'no-store'})
      const data:Gallery=await res.json()
      if(!res.ok||!data.success)throw new Error(data.error||'Image gallery unavailable.')
      setGallery(data)
      setSelected(current=>current||data.assets[0]||null)
    }catch(error){setNotice(error instanceof Error?error.message:'Image gallery unavailable.')}
    finally{setLoading(false)}
  }
  useEffect(()=>{if(user?.id)void load()},[user?.id])
  useEffect(()=>{
    if(!selected){setPreviewUrl('');return}
    let alive=true;let created=''
    fetch('/api/image-workshop/assets/[id]'.replace('[id]',encodeURIComponent(selected.id)),{headers:headers(),cache:'no-store'})
      .then(async r=>{if(!r.ok)throw new Error('The saved image could not be opened.');return r.blob()})
      .then(blob=>{if(!alive)return;created=URL.createObjectURL(blob);setPreviewUrl(created)})
      .catch(()=>{if(alive)setPreviewUrl('')})
    return ()=>{alive=false;if(created)URL.revokeObjectURL(created)}
  },[selected?.id])
  const create=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();if(busy||!gallery?.configured)return
    setBusy(true);setNotice('')
    try{
      const form=new FormData()
      form.set('prompt',prompt.trim());form.set('preset',preset);form.set('model',model)
      form.set('size',size);form.set('quality',quality)
      form.set('background',transparent?'transparent':'opaque');form.set('count','1')
      if(reference)form.append('references',reference)
      else if(refineId)form.set('refineId',refineId)
      const res=await fetch('/api/image-workshop',{method:'POST',headers:headers(),body:form})
      const data=await res.json()
      if(!res.ok||!data.success)throw new Error(data.error||'Generation did not complete.')
      setGallery(current=>current?{...current,assets:data.assets,used:data.used,limit:data.limit}:current)
      setSelected(data.assets[0]||null);setReference(null);setRefineId('')
      setNotice('Image saved in your private AI workshop.')
    }catch(error){setNotice(error instanceof Error?error.message:'Generation failed. No completed image was recorded.')}
    finally{setBusy(false)}
  }
  const download=async(asset:Asset)=>{
    setNotice('')
    try{
      const res=await fetch('/api/image-workshop/assets/[id]'.replace('[id]',encodeURIComponent(asset.id)),{headers:headers(),cache:'no-store'})
      if(!res.ok)throw new Error('The selected image is unavailable.')
      const url=URL.createObjectURL(await res.blob())
      const a=document.createElement('a');a.href=url;a.download='weave-image-'+asset.id.slice(0,8)+'.png'
      document.body.appendChild(a);a.click();a.remove()
      window.setTimeout(()=>URL.revokeObjectURL(url),10000)
    }catch(error){setNotice(error instanceof Error?error.message:'Download unavailable.')}
  }
  if(!isInitialized)return <main className="p-8 text-slate-800">Opening WEAVE Image Workshop…</main>
  if(!user)return <main className="p-8"><Link href="/login" className="underline">Sign in to use the Image Workshop</Link></main>
  const remaining=Math.max(0,(gallery?.limit||0)-(gallery?.used||0))
  return <main className="min-h-screen bg-[#f5f7f9] px-3 py-6 text-slate-900 sm:px-6" data-weave-advanced-image-workshop="true">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-3xl border border-amber-200 bg-gradient-to-br from-white via-[#fefbf4] to-sky-50 p-5 sm:p-7">
        <Link href="/image-workshop" className="inline-flex items-center gap-2 text-sm font-bold text-slate-700"><ArrowLeft size={17}/>Back to paid Image House</Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-widest text-amber-800">Weave of Presence · Advanced AI production</p>
        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Image creation and refinement</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">Produce original AI imagery or refine an image you own. This optional provider service is separate from the paid, no-API Image House. Administrations must enable and fund the provider before generation is available.</p>
      </header>
      {notice&&<p role="status" className="rounded-xl border border-sky-200 bg-white p-4 text-sm text-slate-900">{notice}</p>}
      {gallery&&!gallery.configured&&<p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-base leading-7">Live AI generation is not enabled. The <Link href="/image-workshop" className="font-bold underline">Image House</Link> continues to produce licensed commercial samples without an API key.</p>}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <form onSubmit={create} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Production desk</h2><span className="text-sm font-bold text-amber-800">{remaining} / {gallery?.limit??0} today</span></div>
          <label className="block text-sm font-semibold">Describe the image
            <textarea required minLength={6} maxLength={5000} rows={5} value={prompt} onChange={e=>setPrompt(e.target.value)} className={control+' mt-2 min-h-36 resize-y'} placeholder="Describe the scene, details, lighting, materials, text and the result you need."/></label>
          <div><p className="mb-2 text-sm font-semibold">Production style</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{variants.map(([key,label])=><button key={key} type="button" aria-pressed={preset===key} onClick={()=>setPreset(key)} className={'min-h-12 rounded-xl border p-2 text-left text-sm '+(preset===key?'border-amber-600 bg-amber-50 font-bold':'border-slate-200')}>{label}</button>)}</div></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Model<select className={control+' mt-2'} value={model} onChange={e=>setModel(e.target.value)}><option value="gpt-image-2.5-flare">Flare</option><option value="gpt-image-2.5-sunburst">Sunburst</option></select></label>
            <label className="text-sm font-semibold">Canvas<select className={control+' mt-2'} value={size} onChange={e=>setSize(e.target.value)}><option value="1024x1024">Square</option><option value="1024x1536">Portrait</option><option value="1536x1024">Wide</option></select></label>
            <label className="text-sm font-semibold">Quality<select className={control+' mt-2'} value={quality} onChange={e=>setQuality(e.target.value)}><option value="medium">Medium</option><option value="high">High</option></select></label>
            <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={transparent} onChange={e=>setTransparent(e.target.checked)} className="h-5 w-5"/>Transparent background</label>
          </div>
          <label className="block text-sm font-semibold"><span className="inline-flex items-center gap-2"><ImagePlus size={17}/>Reference image (optional)</span>
            <input type="file" accept="image/png,image/webp,image/jpeg" className="mt-3 block w-full text-sm" onChange={e=>{setReference(e.target.files?.[0]||null);setRefineId('')}}/>
            <span className="mt-1 block text-sm font-normal text-slate-600">PNG, JPEG or WEBP, maximum 8MB. Only upload images you may use.</span></label>
          {refineId&&<p className="rounded-lg bg-sky-50 p-3 text-sm">Refining your saved image. <button type="button" onClick={()=>setRefineId('')} className="font-bold underline">Clear</button></p>}
          <button disabled={busy||!gallery?.configured||remaining<1} type="submit" className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-base font-bold text-white disabled:opacity-50"><Sparkles size={18}/>{busy?'Creating image…':refineId||reference?'Refine image':'Create image'}</button>
          <p className="text-sm leading-6 text-slate-600">This API service currently has a daily usage limit but no System Switch charge. Administrations must separately approve any provider cost and pricing before enabling it. ChatGPT subscriptions do not supply an API key.</p>
        </form>
        <aside className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-black">Latest production</h2>
            {selected&&previewUrl?<img src={previewUrl} alt={selected.prompt} className="mt-4 max-h-[60vh] w-full rounded-xl object-contain"/>:<div className="mt-4 flex aspect-square items-center justify-center rounded-xl bg-slate-100 p-6 text-center text-sm text-slate-600">{loading?'Loading images…':'Select saved artwork or create an image.'}</div>}
            {selected&&<><p className="mt-3 text-sm text-slate-700">{selected.prompt}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={()=>void download(selected)} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white"><Download size={17}/>Download PNG</button><button type="button" onClick={()=>{setRefineId(selected.id);setReference(null);setPrompt('Refine this image, preserving important details while ');window.scrollTo({top:0,behavior:'smooth'})}} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-amber-400 px-4 text-sm font-bold"><RefreshCw size={17}/>Refine</button></div></>}
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-black">My saved images</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">{gallery?.assets.map(asset=><button key={asset.id} type="button" onClick={()=>setSelected(asset)} aria-pressed={selected?.id===asset.id} className={'min-h-20 rounded-xl border p-3 text-left text-sm '+(selected?.id===asset.id?'border-amber-600 bg-amber-50':'border-slate-200')}><strong className="block">{asset.preset}</strong><span className="mt-1 block line-clamp-2 text-slate-600">{asset.prompt}</span></button>)}</div>
            {!gallery?.assets.length&&<p className="mt-3 text-sm text-slate-600">No completed AI images recorded for this account.</p>}
          </section>
        </aside>
      </div>
    </div>
  </main>
}
