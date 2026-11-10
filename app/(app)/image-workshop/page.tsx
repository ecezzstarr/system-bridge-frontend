'use client'

import Link from 'next/link'
import {useCallback,useEffect,useRef,useState,type ChangeEvent} from 'react'
import {useRouter} from 'next/navigation'
import {useAuth} from '@/lib/auth-provider'
import {
  ArrowLeft,Check,Download,Image as ImageIcon,ImagePlus,LoaderCircle,
  RefreshCw,Sparkles,UploadCloud,WandSparkles,X,
} from 'lucide-react'

type ImageAsset={id:string;prompt:string;preset:string;image_size:string;model:string;created_at:string}
type WorkshopData={success:boolean;configured:boolean;limit:number;used:number;assets:ImageAsset[];error?:string}
type Preset='photographic'|'product'|'architecture'|'cinematic'|'portrait'|'fashion'|'poster'|'illustration'|'fantasy'|'threed'|'social'|'storybook'
const presets:{key:Preset;name:string;hint:string}[]=[
  {key:'photographic',name:'Photography',hint:'Natural realism'},
  {key:'product',name:'Product',hint:'Commercial shots'},
  {key:'architecture',name:'Architecture',hint:'Spaces and buildings'},
  {key:'cinematic',name:'Cinema',hint:'Atmospheric scenes'},
  {key:'portrait',name:'Portrait',hint:'People and expressions'},
  {key:'fashion',name:'Fashion',hint:'Editorial campaigns'},
  {key:'poster',name:'Poster',hint:'Designed typography'},
  {key:'illustration',name:'Illustration',hint:'Illustrated artwork'},
  {key:'fantasy',name:'Worldbuilding',hint:'Imagined worlds'},
  {key:'threed',name:'3D artwork',hint:'Dimensional renders'},
  {key:'social',name:'Social ads',hint:'Marketing visuals'},
  {key:'storybook',name:'Storybook',hint:'Narrative pages'},
]
const field='w-full rounded-xl border border-white/15 bg-[#101d2b] px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/70'
const action='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-40'

export default function WeaveImageWorkshopPage(){
  const {user,isInitialized}=useAuth()
  const router=useRouter()
  const [loading,setLoading]=useState(true)
  const [making,setMaking]=useState(false)
  const [configured,setConfigured]=useState(false)
  const [limit,setLimit]=useState(8)
  const [used,setUsed]=useState(0)
  const [assets,setAssets]=useState<ImageAsset[]>([])
  const [urls,setUrls]=useState<Record<string,string>>({})
  const imageUrls=useRef(new Map<string,string>())
  const [prompt,setPrompt]=useState('')
  const [preset,setPreset]=useState<Preset>('photographic')
  const [size,setSize]=useState('1024x1536')
  const [model,setModel]=useState('gpt-image-2.5-flare')
  const [quality,setQuality]=useState('high')
  const [background,setBackground]=useState('auto')
  const [count,setCount]=useState(1)
  const [references,setReferences]=useState<File[]>([])
  const [refineId,setRefineId]=useState('')
  const [error,setError]=useState('')
  const [success,setSuccess]=useState('')
  const [preview,setPreview]=useState('')
  const [previewUrls,setPreviewUrls]=useState<string[]>([])

  const token=()=>typeof window==='undefined'?'':localStorage.getItem('ssb_auth_token')||''
  const headers=():Record<string,string>=>token()?{Authorization:'Bearer '+token()}:{}

  useEffect(()=>{
    if(isInitialized&&!user)router.replace('/login')
  },[isInitialized,user,router])

  useEffect(()=>()=>{for(const url of imageUrls.current.values())URL.revokeObjectURL(url)},[])
  useEffect(()=>{
    const next=references.map(file=>URL.createObjectURL(file))
    setPreviewUrls(next)
    return ()=>next.forEach(url=>URL.revokeObjectURL(url))
  },[references])

  const loadImages=useCallback(async(list:ImageAsset[])=>{
    // Private images are fetched with the user's session; no public image URL is issued.
    const recent=list.slice(0,18)
    await Promise.all(recent.map(async item=>{
      if(imageUrls.current.has(item.id))return
      try{
        const response=await fetch('/api/image-workshop/media?asset='+encodeURIComponent(item.id),
          {headers:headers(),cache:'no-store'})
        if(!response.ok)return
        const url=URL.createObjectURL(await response.blob())
        if(imageUrls.current.has(item.id))URL.revokeObjectURL(url)
        else imageUrls.current.set(item.id,url)
      }catch{/* A failed thumbnail does not remove the saved image record. */}
    }))
    setUrls(Object.fromEntries(imageUrls.current.entries()))
  },[])

  const load=useCallback(async()=>{
    try{
      setError('')
      const response=await fetch('/api/image-workshop',{headers:headers(),cache:'no-store'})
      const data:WorkshopData=await response.json()
      if(!response.ok||!data.success)throw new Error(data.error||'Unable to open Image Workshop')
      setConfigured(data.configured);setLimit(data.limit);setUsed(data.used);setAssets(data.assets)
      void loadImages(data.assets)
    }catch(e){setError(e instanceof Error?e.message:'Could not open this workshop')}
    finally{setLoading(false)}
  },[loadImages])

  useEffect(()=>{if(user?.id)void load()},[user?.id,load])

  const upload=(event:ChangeEvent<HTMLInputElement>)=>{
    const files=Array.from(event.target.files||[])
    event.target.value=''
    if(!files.length)return
    if(files.length+references.length>3){setError('Use a maximum of three reference images.');return}
    if(files.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)){
      setError('Upload JPG, PNG or WEBP reference images no larger than 8 MB.');return
    }
    if(files.length+references.length+(refineId?1:0)>3){setError('Remove a reference before adding another.');return}
    setReferences(previous=>[...previous,...files])
    setError('')
  }

  const generate=async()=>{
    if(making)return
    if(prompt.trim().length<6){setError('Describe what you want to create.');return}
    if(count>limit-used){setError('Not enough daily image creations remain.');return}
    setMaking(true);setError('');setSuccess('')
    try{
      const form=new FormData()
      for(const [key,value] of Object.entries({prompt,preset,size,model,quality,background,count:String(count),refineId}))form.append(key,value)
      references.forEach(file=>form.append('references',file))
      const response=await fetch('/api/image-workshop',{method:'POST',headers:headers(),body:form})
      const data=await response.json().catch(()=>({}))
      if(!response.ok||!data.success)throw new Error(data.error||'Image generation did not complete')
      setUsed(Number(data.used||0));setAssets(data.assets||[])
      setReferences([]);setRefineId('')
      setPreview(data.created?.[0]||'')
      setSuccess(data.created?.length===1?'Image created and saved in your private gallery.':`${data.created?.length||0} images created and saved in your private gallery.`)
      await loadImages(data.assets||[])
    }catch(e){setError(e instanceof Error?e.message:'Unable to generate artwork')}
    finally{setMaking(false)}
  }

  const download=async(id:string)=>{
    setError('')
    try{
      const response=await fetch('/api/image-workshop/media?asset='+encodeURIComponent(id)+'&download=1',
        {headers:headers(),cache:'no-store'})
      if(!response.ok)throw new Error('This saved image could not be downloaded.')
      const url=URL.createObjectURL(await response.blob())
      const element=document.createElement('a')
      element.href=url;element.download='weave-image-'+id.slice(0,8)+'.png'
      document.body.append(element);element.click();element.remove()
      setTimeout(()=>URL.revokeObjectURL(url),30000)
    }catch(e){setError(e instanceof Error?e.message:'Image download failed')}
  }

  if(!isInitialized||!user)return <main className="min-h-screen p-8 text-slate-300">Opening WEAVE Image Workshop…</main>
  const remaining=Math.max(0,limit-used)
  const previewAsset=assets.find(a=>a.id===preview)||assets[0]
  return <main data-weave-ai-image-workshop="true" className="mx-auto min-h-screen max-w-7xl space-y-5 px-3 py-5 text-white sm:px-6 sm:py-8">
    <div className="flex items-center justify-between gap-3">
      <Link href={user.role==='admin'?'/authority/workshops':'/dashboard'} className="inline-flex items-center gap-2 text-xs text-slate-300">
        <ArrowLeft className="h-4 w-4"/>Return to WEAVE</Link>
      <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-200">Company of Time · Creative Production</span>
    </div>

    <header className="overflow-hidden rounded-[1.6rem] border border-cyan-300/20 bg-[radial-gradient(ellipse_at_top_right,#21415c_0%,#0b1623_48%,#070d17_100%)] p-5 shadow-2xl sm:p-8">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10"><WandSparkles className="h-6 w-6 text-cyan-200"/></div>
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">WEAVE · Image Production Workshop</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Imagine. Create. Refine.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Create advanced images for businesses, stories, products, real environments and new worlds. Start with a description, upload reference images, or refine artwork already saved in your workshop.</p>
      <div className="mt-5 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full border border-white/15 px-3 py-1.5 text-slate-200">Text to image</span>
        <span className="rounded-full border border-white/15 px-3 py-1.5 text-slate-200">Reference-based editing</span>
        <span className="rounded-full border border-white/15 px-3 py-1.5 text-slate-200">Private image gallery</span>
      </div>
    </header>

    {error&&<p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</p>}
    {success&&<p role="status" className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">{success}</p>}
    {!loading&&!configured&&<div role="status" className="rounded-xl border border-amber-200/25 bg-amber-300/10 p-4 text-sm text-amber-100">
      Advanced AI image production awaits Administrations activation and provider configuration. The existing free image-layout maker remains available.
    </div>}

    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(330px,.95fr)]">
      <section className="space-y-5 rounded-2xl border border-white/10 bg-[#0a1420] p-4 sm:p-6" aria-label="Image creation controls">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="flex items-center gap-2 text-lg font-black"><Sparkles className="h-5 w-5 text-cyan-200"/> Create artwork</h2>
            <p className="mt-1 text-xs text-slate-400">Describe the result and choose the visual direction.</p></div>
          <span className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-slate-200">{loading?'Loading…':`${remaining} of ${limit} creations left today`}</span>
        </div>
        <label className="block text-xs font-bold text-slate-200">Your image description
          <textarea className={field+' mt-2 min-h-32 resize-y leading-6'} value={prompt} onChange={e=>setPrompt(e.target.value)}
            placeholder="Example: A realistic, beautifully detailed three-dimensional File Folder workshop in a modern citadel, mobile portrait composition, warm light, people at work…" maxLength={5000}/>
        </label>
        <div>
          <p className="mb-2 text-xs font-bold text-slate-200">Choose a visual style</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {presets.map(item=><button key={item.key} type="button" onClick={()=>setPreset(item.key)}
              aria-pressed={preset===item.key} className={`min-h-16 rounded-xl border p-3 text-left transition ${preset===item.key?'border-cyan-300/70 bg-cyan-300/15':'border-white/10 bg-white/[.03] hover:border-white/30'}`}>
              <span className="flex items-center justify-between gap-1 text-xs font-black">{item.name}{preset===item.key&&<Check className="h-3.5 w-3.5 text-cyan-200"/>}</span>
              <span className="mt-1 block text-[10px] text-slate-400">{item.hint}</span>
            </button>)}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-200">Canvas shape
            <select className={field+' mt-2'} value={size} onChange={e=>setSize(e.target.value)}>
              <option value="1024x1536">Portrait · 2:3</option><option value="1024x1024">Square · 1:1</option><option value="1536x1024">Landscape · 3:2</option>
            </select></label>
          <label className="text-xs font-bold text-slate-200">Image engine
            <select className={field+' mt-2'} value={model} onChange={e=>setModel(e.target.value)}>
              <option value="gpt-image-2.5-flare">Flare · Fast generation</option><option value="gpt-image-2.5-sunburst">Sunburst · Detailed precision</option>
            </select></label>
          <label className="text-xs font-bold text-slate-200">Detail level
            <select className={field+' mt-2'} value={quality} onChange={e=>setQuality(e.target.value)}>
              <option value="medium">Standard detail</option><option value="high">High detail</option>
            </select></label>
          <label className="text-xs font-bold text-slate-200">Background
            <select className={field+' mt-2'} value={background} onChange={e=>setBackground(e.target.value)}>
              <option value="auto">Scene-appropriate</option><option value="opaque">Solid / full scene</option><option value="transparent">Transparent (when supported)</option>
            </select></label>
          <label className="text-xs font-bold text-slate-200">Number of images
            <select className={field+' mt-2'} value={count} onChange={e=>setCount(Number(e.target.value))}>
              <option value={1}>One image</option><option value={2}>Two alternatives</option>
            </select></label>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div className="flex items-center gap-2"><UploadCloud className="h-5 w-5 text-cyan-200"/><h3 className="text-sm font-bold">References and edits</h3></div>
          <p className="mt-2 text-xs leading-5 text-slate-400">Add up to three JPG, PNG or WEBP images. You can also select one of your saved creations to edit. Tell the workshop exactly what to keep or change.</p>
          <label className={action+' mt-3 cursor-pointer'}><ImagePlus className="h-4 w-4"/>Add reference images
            <input className="sr-only" aria-label="Choose reference images" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={upload}/></label>
          {(previewUrls.length>0||refineId)&&<div className="mt-3 flex flex-wrap gap-3">
            {references.map((file,index)=><div key={file.name+index} className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/20">
              {/* These are temporary local previews; uploaded files are never public media. */}
              {previewUrls[index]&&<img alt={file.name} src={previewUrls[index]} className="h-full w-full object-cover"/>}
              <button aria-label="Remove reference" type="button" onClick={()=>setReferences(list=>list.filter((_,i)=>i!==index))}
                className="absolute right-1 top-1 rounded-full bg-black/80 p-1"><X className="h-4 w-4"/></button>
            </div>)}
            {refineId&&<button type="button" className="flex h-24 max-w-36 items-center gap-1 rounded-xl border border-cyan-300/40 bg-cyan-300/10 p-3 text-xs" onClick={()=>setRefineId('')}>Gallery reference <X className="h-4 w-4"/></button>}
          </div>}
        </div>
        <button className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-cyan-200 px-4 py-3 text-sm font-black text-[#092030] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!configured||making||loading||remaining<count||prompt.trim().length<6} type="button" onClick={()=>void generate()}>
          {making?<LoaderCircle className="h-5 w-5 animate-spin"/>:<WandSparkles className="h-5 w-5"/>}
          {making?'Creating your artwork…':references.length||refineId?'Create edited artwork':'Generate advanced images'}
        </button>
        <p className="text-[11px] leading-5 text-slate-400">AI artwork uses a third-party image model. Availability and outputs depend on provider approval and quotas. No System Switch wallet debit is made by this workshop.</p>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-[#0a1420] p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-black">Latest creation</h2><button className={action} onClick={()=>void load()} disabled={loading||making} type="button"><RefreshCw className="h-4 w-4"/>Refresh</button></div>
          <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_center,#1c3a45,#080f17)]">
            {previewAsset&&urls[previewAsset.id]?<img src={urls[previewAsset.id]} alt={previewAsset.prompt} className="max-h-[68vh] w-full object-contain"/>:
              <div className="flex flex-col items-center gap-3 p-6 text-center text-slate-400"><ImageIcon className="h-10 w-10"/><p className="text-xs">{loading?'Opening private gallery…':'Your next creation will appear here.'}</p></div>}
          </div>
          {previewAsset&&<div className="mt-3 flex flex-wrap gap-2">
            <button className={action} type="button" onClick={()=>void download(previewAsset.id)}><Download className="h-4 w-4"/>Download PNG</button>
            <button className={action} type="button" onClick={()=>{setRefineId(previewAsset.id);setReferences([]);setPrompt('Preserve the original subject and composition, but change ');window.scrollTo({top:0,behavior:'smooth'})}}><WandSparkles className="h-4 w-4"/>Refine this image</button>
          </div>}
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0a1420] p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black">Your private gallery</h2><span className="text-xs text-slate-400">{assets.length} recent</span></div>
          {!assets.length?<p className="py-8 text-center text-xs text-slate-400">Completed artwork is kept here across sessions.</p>:
            <div className="grid grid-cols-2 gap-3">
              {assets.map(item=><article key={item.id} className="overflow-hidden rounded-xl border border-white/10 bg-[#101e2a]">
                <button type="button" onClick={()=>setPreview(item.id)} className="block aspect-square w-full bg-black/30">
                  {urls[item.id]?<img src={urls[item.id]} alt={item.prompt} loading="lazy" className="h-full w-full object-contain"/>:<span className="text-xs text-slate-400">Open saved image</span>}
                </button>
                <div className="space-y-2 p-2.5"><p className="line-clamp-2 text-[11px] text-slate-200">{item.prompt}</p>
                  <div className="flex gap-2"><button type="button" onClick={()=>void download(item.id)} className={action+' flex-1 px-2'} aria-label="Download image"><Download className="h-4 w-4"/></button>
                  <button type="button" onClick={()=>{setRefineId(item.id);setReferences([]);setPreview(item.id);setPrompt('Keep the main subject, but change ');window.scrollTo({top:0,behavior:'smooth'})}} className={action+' flex-1 px-2'} aria-label="Edit saved image"><WandSparkles className="h-4 w-4"/></button></div>
                </div></article>)}
            </div>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/agent/creative" className={action}><ImageIcon className="h-4 w-4"/>Classic layout maker · Free</Link>
          <Link href={user.role==='admin'?'/admin/video-ad-workshop':'/video-ad-studio'} className={action}><Sparkles className="h-4 w-4"/>Video production</Link>
        </div>
      </section>
    </div>
  </main>
}
