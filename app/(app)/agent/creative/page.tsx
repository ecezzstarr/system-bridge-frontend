'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Clapperboard, Download, ImagePlus, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

type Format = 'post' | 'story' | 'banner'
type Style = 'editorial' | 'warm' | 'midnight' | 'product' | 'portrait' | 'minimal'

const FORMATS: Record<Format, { width: number; height: number; label: string }> = {
  post: { width: 1080, height: 1350, label: 'Feed · 4:5' },
  story: { width: 1080, height: 1920, label: 'Story · 9:16' },
  banner: { width: 1200, height: 628, label: 'Wide · 1.91:1' },
}
const STYLES: Record<Style, { background: string; ink: string; accent: string; label: string }> = {
  editorial: { background: '#111513', ink: '#f9f6ec', accent: '#dfc99b', label: 'Editorial' },
  warm: { background: '#2c211b', ink: '#fff7e9', accent: '#f0bd80', label: 'Warm' },
  midnight: { background: '#0c1b28', ink: '#f2f8ff', accent: '#86d0e8', label: 'Midnight' },
  product: { background: '#10241d', ink: '#ffffff', accent: '#a5f3cb', label: 'Product photo' },
  portrait: { background: '#241b25', ink: '#fff5fa', accent: '#f5a8d3', label: 'Portrait' },
  minimal: { background: '#161616', ink: '#ffffff', accent: '#f3f3f3', label: 'Minimal' },
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight)
  const sw = w / scale
  const sh = h / scale
  ctx.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, x, y, w, h)
}

function wrapLines(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number) {
  const words = value.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? current + ' ' + word : word
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  if (lines.length > maxLines) {
    const clipped = lines.slice(0, maxLines)
    clipped[maxLines - 1] = clipped[maxLines - 1].replace(/\s+\S+$/, '') + '…'
    return clipped
  }
  return lines
}

export default function AgentCreativeStudio() {
  const { user } = useAuth()
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [brand, setBrand] = useState('YOUR BRAND')
  const [headline, setHeadline] = useState('Make something worth seeing.')
  const [description, setDescription] = useState('The story, the product and the reason to care.')
  const [action, setAction] = useState('ORDER TODAY')
  const [format, setFormat] = useState<Format>('post')
  const [style, setStyle] = useState<Style>('editorial')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => { if (user && !['agent','bridger','client'].includes(user.role||'')) router.replace('/dashboard') }, [user, router])
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const { width: w, height: h } = FORMATS[format]
    canvas.width = w
    canvas.height = h
    const ctx = context
    const palette = STYLES[style]
    let cancelled = false
    setReady(false)

    const paint = (image: HTMLImageElement | null) => {
      if (cancelled) return
      ctx.fillStyle = palette.background
      ctx.fillRect(0, 0, w, h)
      if (image) {
        ctx.save()
        ctx.globalAlpha = 0.92
        drawCover(ctx, image, 0, 0, w, h * 0.89)
        ctx.restore()
      } else {
        const glow = ctx.createRadialGradient(w * 0.77, h * 0.23, 30, w * 0.77, h * 0.23, h * 0.7)
        glow.addColorStop(0, palette.accent + '5c')
        glow.addColorStop(1, palette.background + '00')
        ctx.fillStyle = glow
        ctx.fillRect(0, 0, w, h)
      }
      const shade = ctx.createLinearGradient(0, h * 0.18, 0, h)
      shade.addColorStop(0, 'rgba(0,0,0,0.05)')
      shade.addColorStop(0.49, palette.background + '96')
      shade.addColorStop(0.77, palette.background + 'f5')
      shade.addColorStop(1, palette.background)
      ctx.fillStyle = shade
      ctx.fillRect(0, 0, w, h)

      const pad = w * 0.074
      ctx.textBaseline = 'top'
      ctx.fillStyle = palette.accent
      ctx.font = `700 ${Math.round(w * 0.024)}px Arial, sans-serif`
      ctx.fillText(brand.trim().toUpperCase().slice(0, 46) || 'YOUR BRAND', pad, h * 0.08, w - 2 * pad)
      ctx.fillRect(pad, h * 0.125, w * 0.09, Math.max(3, w * 0.004))

      const fontSize = Math.round(w * (format === 'banner' ? 0.055 : 0.069))
      const lineHeight = fontSize * 1.14
      ctx.font = `700 ${fontSize}px Georgia, serif`
      const titleLines = wrapLines(ctx, headline || 'Your message here', w - 2 * pad, format === 'banner' ? 2 : 3)
      const copyY = format === 'banner' ? h * 0.45 : h * 0.635
      ctx.fillStyle = palette.ink
      titleLines.forEach((line, index) => ctx.fillText(line, pad, copyY + lineHeight * index, w - 2 * pad))

      let subY = copyY + lineHeight * titleLines.length + h * 0.018
      const subSize = Math.round(w * (format === 'banner' ? 0.021 : 0.027))
      ctx.font = `400 ${subSize}px Arial, sans-serif`
      ctx.fillStyle = palette.ink
      const subLines = wrapLines(ctx, description, w - 2 * pad, 2)
      subLines.forEach((line, index) => ctx.fillText(line, pad, subY + subSize * 1.42 * index, w - 2 * pad))
      const barY = h * 0.92
      ctx.fillStyle = palette.accent
      ctx.fillRect(pad, barY, w - 2 * pad, Math.max(2, h * 0.002))
      ctx.font = `700 ${Math.round(w * 0.025)}px Arial, sans-serif`
      ctx.fillText((action || 'LEARN MORE').trim().toUpperCase().slice(0, 48), pad, barY + h * 0.018, w - 2 * pad)
      setReady(true)
    }

    if (photoUrl) {
      const image = new Image()
      image.onload = () => paint(image)
      image.onerror = () => paint(null)
      image.src = photoUrl
    } else {
      paint(null)
    }
    return () => { cancelled = true }
  }, [brand, headline, description, action, format, style, photoUrl])

  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    setPhotoUrl(URL.createObjectURL(file))
  }

  const saveImage = () => {
    if (!ready || !canvasRef.current) return
    canvasRef.current.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `weave-classic-${format}.png`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1500)
    }, 'image/png')
  }

  if (!user || !['agent','bridger','client'].includes(user.role||'')) return null

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 text-white" data-agent-creative-studio="true">
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-slate-400"><ArrowLeft className="h-4 w-4" />Return to WEAVE</Link>
    <header className="space-y-3 border-b border-white/10 pb-6">
      <p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">WEAVE · Agent · Bridger · Client · Creative work</p>
      <h1 className="text-3xl font-bold sm:text-5xl">WEAVE CREATIVE STUDIO</h1>
      <p className="max-w-3xl text-sm leading-6 text-slate-300">Design clear commercial images for stores, products and companies. Create a finished PNG on your phone, or open the Video Studio for moving advertisements. You can sell the finished work to outside customers at your own price.</p>
      <div className="flex flex-wrap gap-3">
        <span className="border border-emerald-300/20 bg-emerald-300/5 px-3 py-2 text-xs text-emerald-200">Classic image layout · 0 Flame Coin</span>
        <span className="border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs text-amber-200">Video production · role-based pricing shown in Video Studio</span>
      </div>
    </header>

    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.85fr)]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-300">Business or product name
            <input className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 p-3 text-white" value={brand} maxLength={46} onChange={e=>setBrand(e.target.value)} />
          </label>
          <label className="text-xs text-slate-300">Image size
            <select className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b1016] p-3 text-white" value={format} onChange={e=>setFormat(e.target.value as Format)}>
              {Object.entries(FORMATS).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-xs text-slate-300">Main headline
          <input className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 p-3 text-white" value={headline} maxLength={110} onChange={e=>setHeadline(e.target.value)} />
        </label>
        <label className="block text-xs text-slate-300">Supporting sentence
          <textarea className="mt-2 min-h-24 w-full rounded-lg border border-white/15 bg-white/5 p-3 text-white" value={description} maxLength={145} onChange={e=>setDescription(e.target.value)} />
        </label>
        <label className="block text-xs text-slate-300">Customer action
          <input className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 p-3 text-white" value={action} maxLength={48} onChange={e=>setAction(e.target.value)} />
        </label>
        <div>
          <p className="mb-2 text-xs text-slate-300">Editorial finish</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{(Object.entries(STYLES) as [Style, typeof STYLES[Style]][]).map(([key,value])=>
            <button key={key} onClick={()=>setStyle(key)} className={`rounded-lg border p-3 text-xs ${style===key?'border-amber-300 text-amber-100':'border-white/10 text-slate-400'}`}>{value.label}</button>
          )}</div>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/[.03] p-4 text-sm text-white">
          <ImagePlus className="h-5 w-5 text-amber-200" />Use a real product, location, work or customer photo
          <input type="file" className="hidden" accept="image/*" onChange={selectPhoto} />
        </label>
        <p className="text-xs leading-5 text-slate-400">Choose Product photo, Portrait or Minimal for new real-photo layouts. The image is composed locally on your device; this layout tool does not generate new AI imagery, upload the photo, or deduct Flame Coin. Use photos you have permission to publish.</p>
        <button onClick={saveImage} disabled={!ready} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-200 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">
          <Download className="h-5 w-5" />SAVE HIGH-RESOLUTION PNG · FREE
        </button>
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-[#05080d] p-3">
          <p className="mb-3 text-[10px] uppercase tracking-[.18em] text-slate-400">Live layout preview</p>
          <canvas ref={canvasRef} className="mx-auto h-auto max-h-[68vh] w-full rounded-lg object-contain" style={{maxWidth:540}} aria-label="Your image advertisement preview" />
        </div>
        <Link href="/video-ad-studio" className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/[.08] px-5 py-4 text-sm font-bold text-fuchsia-100">
          <Clapperboard className="h-5 w-5" />OPEN WEAVE VIDEO AD STUDIO
        </Link>
        <p className="text-xs leading-5 text-slate-400">To begin earning: prepare a sample image, show it to a shop or company, agree on their selling price, produce approved artwork, and deliver the finished file. Video productions require customer media and the separately displayed Studio-use fee.</p>
      </div>
    </section>
  </main>
}
