'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { ArrowLeft, Download, ImagePlus, Loader2, RefreshCcw, Sparkles, WandSparkles } from 'lucide-react'

type Asset = {
  id: string; prompt: string; style: string; model: string; aspect: string;
  quality: string; format: string; status: string; url: string | null; createdAt: string;
}
type StudioState = { available: boolean; limit: number; used: number; remaining: number; assets: Asset[] }
type Format = 'png' | 'webp' | 'jpeg' | 'gif' | 'svg'
const STYLES = [
  ['general','Open creative'], ['photographic','Realistic photography'],
  ['cinematic','Cinematic 3D'], ['product','Product imagery'],
  ['architecture','Architecture'], ['illustration','Illustration'],
  ['anime','Anime'], ['advertising','Advertising'],
  ['infographic','Infographics'], ['branding','Brand design'],
] as const
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
const helperClass = 'mb-2 block text-xs font-semibold text-slate-600'

export default function WeaveAdvancedImageWorkshop() {
  const { user } = useAuth()
  const [studio, setStudio] = useState<StudioState | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('general')
  const [aspect, setAspect] = useState('square')
  const [format, setFormat] = useState<Format>('png')
  const [model, setModel] = useState('detail')
  const [quality, setQuality] = useState('high')
  const [complexity, setComplexity] = useState('high')
  const [transparent, setTransparent] = useState(false)
  const [reference, setReference] = useState<File | null>(null)
  const [mask, setMask] = useState<File | null>(null)
  const [source, setSource] = useState<Asset | null>(null)
  const [preview, setPreview] = useState<Asset | null>(null)

  const headers = (): Record<string,string> => {
    const token = typeof window === 'undefined' ? null : localStorage.getItem('ssb_auth_token')
    return token ? { Authorization: 'Bearer ' + token } : {}
  }

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/image-workshop', { headers: headers(), cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to open the image workshop.')
      setStudio(data as StudioState)
      setPreview(current => current || (data.assets as Asset[])[0] || null)
    } catch (error: any) {
      setNotice(error?.message || 'Unable to open the image workshop.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (user) void load() }, [user?.id])

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (prompt.trim().length < 8) return setNotice('Describe the image you want to make in more detail.')
    setBusy(true)
    setNotice('Your image request is being rendered. Keep this page open until it completes.')
    try {
      const form = new FormData()
      form.append('prompt', prompt.trim())
      form.append('style', style)
      form.append('aspect', aspect)
      form.append('format', format)
      form.append('model', model)
      form.append('quality', quality)
      form.append('complexity', complexity)
      form.append('background', transparent ? 'transparent' : 'opaque')
      if (reference) form.append('reference', reference)
      else if (source) form.append('sourceAssetId', source.id)
      if (mask) form.append('mask', mask)
      const response = await fetch('/api/image-workshop', {
        method: 'POST', headers: headers(), body: form,
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'The image could not be created.')
      const asset = data.asset as Asset
      setStudio(current => current ? {
        ...current, assets: [asset, ...current.assets], remaining: data.remaining,
        used: current.limit - data.remaining,
      } : current)
      setPreview(asset)
      setReference(null)
      setMask(null)
      setSource(null)
      setNotice('Image created and saved to your WEAVE workshop history. Open, download or refine it.')
    } catch (error: any) {
      setNotice(error?.message || 'The image could not be created.')
    } finally { setBusy(false) }
  }

  const selectPrevious = (asset: Asset) => {
    if (!['png','webp','jpeg'].includes(asset.format)) {
      setNotice('Choose a PNG, WEBP or JPEG result as the next edit reference.')
      return
    }
    setSource(asset)
    setReference(null)
    setMask(null)
    setFormat('png')
    setTransparent(false)
    setPrompt('Refine this image: preserve the important details while ')
    setNotice('Saved image selected. Finish describing the change and generate an edited version.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const isEditing = Boolean(source || reference)
  const supportsTransparency = format === 'png' || format === 'webp'
  const locked = busy || !studio?.available || (studio?.remaining || 0) <= 0
  const access = ['agent','bridger','client','admin','legion'].includes(user?.role || '')
  if (!user) return <main className="mx-auto max-w-5xl px-4 py-12 text-slate-300">Opening WEAVE Image Workshop…</main>
  if (!access) return <main className="mx-auto max-w-5xl px-4 py-12 text-white">Image production is not available to this position.</main>

  return <main className="mx-auto max-w-7xl space-y-6 px-3 py-5 sm:px-6 sm:py-8" data-weave-advanced-image-workshop="true">
    <header className="rounded-[1.75rem] border border-sky-200/60 bg-gradient-to-br from-white via-slate-50 to-sky-100 px-5 py-7 text-slate-900 shadow-xl sm:px-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><ArrowLeft size={15}/>Company operating center</Link>
      <p className="mt-7 text-[10px] font-black uppercase tracking-[.24em] text-sky-700">WEAVE of Presence · Company of Time</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Advanced Image Workshop</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">Make original images from words, edit a supplied photograph, continue refining your previous work and produce artwork for your business, Client File Folder, Customer Door or company campaigns.</p>
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full border border-sky-200 bg-white px-3 py-2">AI image generation + editing</span>
        <span className="rounded-full border border-sky-200 bg-white px-3 py-2">Detail or fast rendering</span>
        <span className="rounded-full border border-sky-200 bg-white px-3 py-2">Still images · animated GIF · vector SVG</span>
        {user.role!=='admin'&&<Link href="/agent/creative" className="rounded-full bg-slate-900 px-3 py-2 text-white">Classic layout editor · no AI</Link>}
      </div>
    </header>

    {notice && <p role="status" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-800">{notice}</p>}
    {!loading && studio && !studio.available && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">AI rendering is not configured on this WEAVE host. Administrations must add the server-side OpenAI API key before generation can begin. The Classic Studio remains available.</div>}

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
      <form onSubmit={create} className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-900 shadow-lg sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Production desk</p><h2 className="mt-1 text-xl font-black">Describe your image</h2></div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right"><span className="block text-[10px] text-slate-500">Remaining / 24h</span><strong className="text-lg">{loading ? '…' : String(studio?.remaining ?? 0) + ' / ' + String(studio?.limit ?? 0)}</strong></div>
        </div>
        <label className="block"><span className={helperClass}>What should WEAVE create or change?</span>
          <textarea required minLength={8} maxLength={6000} rows={6} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Example: A detailed 3D white-and-gold Client File Folder kingdom on a smartphone, clean architecture, readable signs, realistic morning light. Preserve..." className={inputClass + ' resize-y'} />
        </label>
        <div>
          <p className={helperClass}>Choose the kind of image</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STYLES.map(([key,label])=><button type="button" key={key} aria-pressed={style===key} onClick={()=>setStyle(key)} className={'min-h-12 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ' + (style===key?'border-sky-500 bg-sky-100 text-sky-950':'border-slate-200 bg-white text-slate-600 hover:border-slate-400')}>{label}</button>)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className={helperClass}>AI model</span><select value={model} onChange={e=>setModel(e.target.value)} className={inputClass}><option value="detail">Sunburst · detailed</option><option value="fast">Flare · faster</option></select></label>
          <label className="block"><span className={helperClass}>Image shape</span><select value={aspect} onChange={e=>setAspect(e.target.value)} className={inputClass}><option value="square">Square</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
          <label className="block"><span className={helperClass}>Save format</span><select value={format} onChange={e=>{setFormat(e.target.value as Format);setTransparent(false);setMask(null)}} className={inputClass}><option value="png">PNG · lossless</option><option value="webp">WEBP</option><option value="jpeg">JPEG</option><option value="gif">GIF · animated</option>{!isEditing&&<option value="svg">SVG · vector</option>}</select></label>
          <label className="block"><span className={helperClass}>Render quality</span><select value={quality} onChange={e=>setQuality(e.target.value)} className={inputClass}><option value="high">High</option><option value="medium">Medium</option><option value="low">Draft</option></select></label>
          <label className="block"><span className={helperClass}>Planning detail</span><select value={complexity} onChange={e=>setComplexity(e.target.value)} className={inputClass}><option value="high">Complex scene</option><option value="medium">Balanced</option><option value="low">Simple</option></select></label>
          <label className="flex items-end gap-2 pb-3 text-xs font-semibold text-slate-700"><input type="checkbox" checked={transparent && supportsTransparency} disabled={!supportsTransparency} onChange={e=>setTransparent(e.target.checked)} className="h-4 w-4 accent-sky-600"/>Transparent background</label>
        </div>
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-bold"><ImagePlus size={17}/>Optional image reference</div>
          <p className="text-xs leading-5 text-slate-600">Attach your own PNG, WEBP or JPEG (up to 10MB), or choose a previously generated result below. Describe exactly what to retain and what to change.</p>
          <input type="file" accept="image/png,image/jpeg,image/webp" className="block w-full text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-2 file:font-bold file:text-sky-950" onChange={e=>{setReference(e.target.files?.[0]||null);setSource(null);setMask(null);if(e.target.files?.[0]&&format==='svg')setFormat('png')}} />
          {reference&&<p className="text-xs font-semibold text-sky-800">Using uploaded reference: {reference.name} <button type="button" className="underline" onClick={()=>setReference(null)}>Clear</button></p>}
          {source&&<p className="text-xs font-semibold text-sky-800">Editing saved image: {source.prompt.slice(0,90)} <button type="button" className="underline" onClick={()=>setSource(null)}>Clear</button></p>}
          {isEditing&&format!=='gif'&&<label className="block"><span className={helperClass}>Optional edit mask · PNG, up to 4MB</span><input type="file" accept="image/png" className="w-full text-xs" onChange={e=>setMask(e.target.files?.[0]||null)}/></label>}
          {mask&&<p className="text-xs text-slate-500">Mask: {mask.name}</p>}
        </div>
        {format==='gif'&&<p className="text-xs text-slate-600">Animated GIFs use six frames at 220ms each. Describe the motion and a seamless loop in your prompt. Provider GIF access may require approval.</p>}
        {format==='svg'&&<p className="text-xs text-slate-600">SVG output is delivered as a downloadable vector file rather than an inline preview.</p>}
        <button type="submit" disabled={locked} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
          {busy?<Loader2 className="animate-spin" size={19}/>:<WandSparkles size={19}/>}
          {busy?'CREATING IMAGE…':isEditing?'REFINE IMAGE':'GENERATE IMAGE'}
        </button>
        <p className="text-xs leading-5 text-slate-500">An OpenAI API integration powers AI outputs; ChatGPT subscriptions do not cover these API calls. WEAVE currently enforces a limited included allowance rather than silently charging your System Switch balance. Use images you have permission to edit and publish.</p>
      </form>

      <aside className="min-w-0 space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Image floor</p><h2 className="mt-1 text-xl font-black text-slate-900">Latest production</h2></div><Sparkles size={20} className="text-sky-700"/></div>
          {preview?.url ? <>
            {preview.format==='svg'
              ? <div className="mt-4 flex aspect-square items-center justify-center rounded-2xl bg-slate-100 p-6 text-center text-sm text-slate-600">Vector artwork ready. Download the SVG file to open it in a vector editor.</div>
              : <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%,transparent_75%,#f1f5f9_75%),linear-gradient(45deg,#f1f5f9_25%,transparent_25%,transparent_75%,#f1f5f9_75%)] bg-[length:24px_24px] bg-[position:0_0,12px_12px]"><img src={preview.url} alt={preview.prompt} className="max-h-[60vh] w-full object-contain"/></div>}
            <p className="mt-3 text-xs leading-5 text-slate-700">{preview.prompt}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={preview.url} download={'weave-image-' + preview.id + '.' + preview.format} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"><Download size={16}/>Download {preview.format.toUpperCase()}</a>
              {['png','webp','jpeg'].includes(preview.format)&&<button type="button" onClick={()=>selectPrevious(preview)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-300 px-4 py-2 text-xs font-bold text-sky-950"><RefreshCcw size={16}/>Edit this image</button>}
            </div>
          </> : <div className="mt-5 flex aspect-[4/3] items-center justify-center rounded-2xl bg-slate-100 p-5 text-center text-sm text-slate-500">Your first generated image appears here. Saved artwork remains in your personal workshop history.</div>}
        </section>
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-900 shadow-lg sm:p-6">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">My image history</h2><button type="button" onClick={()=>void load()} disabled={loading} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold">Refresh</button></div>
          {loading?<p className="mt-4 text-sm text-slate-500">Loading saved artwork…</p>:studio?.assets.length
            ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{studio.assets.map(asset=><button type="button" key={asset.id} onClick={()=>setPreview(asset)} className={'overflow-hidden rounded-xl border bg-white text-left ' + (preview?.id===asset.id?'border-sky-500 ring-2 ring-sky-100':'border-slate-200')}>
              {asset.format==='svg'?<div className="flex aspect-square items-center justify-center bg-slate-100 text-xs font-bold text-slate-700">SVG vector</div>:<img src={asset.url||''} alt={asset.prompt} loading="lazy" className="aspect-square w-full object-cover"/>}
              <div className="px-2 py-2"><p className="truncate text-[10px] font-bold">{asset.style}</p><p className="text-[9px] uppercase text-slate-500">{asset.format}</p></div>
            </button>)}</div>
            : <p className="mt-4 text-sm text-slate-500">No AI images saved yet. Your Classic Studio designs are separate and remain on your device.</p>}
        </section>
        <Link href="/video-ad-studio" className="flex min-h-14 items-center justify-center rounded-2xl border border-sky-200 bg-white px-5 py-3 text-sm font-bold text-sky-950">Continue into WEAVE Video Ad Studio</Link>
      </aside>
    </div>
  </main>
}
