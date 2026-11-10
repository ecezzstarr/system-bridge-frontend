'use client'

import Link from 'next/link'
import {useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {ArrowLeft,Download,Image as ImageIcon} from 'lucide-react'
type Asset={id:string;prompt:string;preset:string;image_size:string;model:string;created_at:string}
type Data={success:boolean;assets:Asset[];retired:boolean;error?:string}
const headers=():Record<string,string>=>{
  const token=typeof window==='undefined'?'':localStorage.getItem('ssb_auth_token')||''
  return token?{Authorization:'Bearer '+token}:{}
}
export default function HistoricalImageGallery(){
  const {user,isInitialized}=useAuth()
  const [assets,setAssets]=useState<Asset[]>([])
  const [notice,setNotice]=useState('')
  useEffect(()=>{
    if(!user?.id)return
    fetch('/api/image-workshop',{headers:headers(),cache:'no-store'})
      .then(r=>r.json()).then((result:Data)=>{if(result.success)setAssets(result.assets);else setNotice(result.error||'The old gallery is unavailable.')})
      .catch(()=>setNotice('The old image records could not be opened.'))
  },[user?.id])
  const download=async(id:string)=>{
    try{
      const urlPath='/api/image-workshop/assets/'+encodeURIComponent(id)
      const r=await fetch(urlPath,{headers:headers(),cache:'no-store'})
      if(!r.ok)throw Error('Private image unavailable.')
      const url=URL.createObjectURL(await r.blob())
      const a=document.createElement('a');a.href=url;a.download='weave-archive-'+id.slice(0,8)+'.png'
      document.body.append(a);a.click();a.remove()
      window.setTimeout(()=>URL.revokeObjectURL(url),15000)
    }catch(e){setNotice(e instanceof Error?e.message:'Image unavailable.')}
  }
  if(!isInitialized)return <main className="p-8 text-slate-200">Opening previous WEAVE artwork…</main>
  if(!user)return <main className="p-8"><Link href="/login" className="underline">Sign in to view saved artwork</Link></main>
  return <main className="mx-auto min-h-screen max-w-5xl space-y-6 bg-[#0a1826] px-4 py-7 text-white" data-weave-ai-gallery-readonly="true">
    <Link href="/image-workshop" className="inline-flex items-center gap-2 text-sm text-cyan-200"><ArrowLeft size={17}/>Return to company Image House</Link>
    <header className="rounded-2xl border border-white/15 p-5"><h1 className="text-3xl font-black">Previous AI artwork</h1>
      <p className="mt-3 text-base leading-7 text-slate-200">Weave has retired externally billed AI image generation. Any previously stored images remain readable and downloadable by their owner. All new production uses the Image House originals, the material editor and authorized company branding systems without an image provider.</p>
      <div className="mt-4 flex flex-wrap gap-2"><Link href="/image-workshop/branding" className="rounded-xl border border-cyan-200/30 px-4 py-3 text-sm font-bold">Brand clothing and materials</Link><Link href="/image-workshop/business" className="rounded-xl border border-amber-200/30 px-4 py-3 text-sm font-bold">Start a branding business</Link></div>
    </header>
    {notice&&<p role="status" className="rounded-xl border border-white/10 p-4 text-sm">{notice}</p>}
    <section><h2 className="text-xl font-bold">Your prior images</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{assets.map(a=><article key={a.id} className="rounded-xl border border-white/10 p-4"><p className="text-sm font-bold">{a.preset}</p><p className="mt-2 text-sm leading-6 text-slate-300">{a.prompt}</p><button type="button" onClick={()=>void download(a.id)} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-lg border border-cyan-200/30 px-4 text-sm font-bold"><Download size={16}/>Download your original</button></article>)}</div>
      {!assets.length&&<div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 p-5 text-sm text-slate-300"><ImageIcon size={19}/>No old AI images recorded for this account.</div>}
    </section>
  </main>
}
