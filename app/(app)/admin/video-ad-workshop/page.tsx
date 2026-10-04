'use client'

import Link from 'next/link'
import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowRight,
  Clapperboard,
  Film,
  Image as ImageIcon,
  Loader2,
  Music2,
  Play,
  Save,
  Sparkles,
  Upload,
  Video,
} from 'lucide-react'

type Scene = {
  id: string
  order: number
  durationSeconds: number
  beat: string
  text: string
  visualDirection: string
  voiceover: string
  assetUrl: string | null
  assetType: 'image' | 'video' | null
}

type Project = {
  id: string
  title: string
  subject: string
  objective: string
  audience: string
  durationSeconds: number
  aspectRatio: string
  status: 'draft' | 'planned' | 'rendering' | 'ready' | 'failed'
  storyboard: Scene[]
  soundtrackUrl: string | null
  outputUrl: string | null
  errorMessage: string | null
  updatedAt: string
}

const PRESETS = [30, 45, 60, 90, 120, 180, 240, 300, 360]

function durationLabel(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`
}

function authHeaders(json = false): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function VideoAdWorkshopPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [forming, setForming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: 'WEAVE',
    subject: '',
    objective: '',
    audience: '',
    durationSeconds: 30,
  })

  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard')
  }, [user, router])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/video-ads', { headers: authHeaders(), cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load video ads')
      setProjects(data.projects || [])
      setProject(current => current ? (data.projects || []).find((item: Project) => item.id === current.id) || current : null)
    } catch (error: any) {
      setMessage(error.message || 'Unable to load video ads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') void loadProjects()
  }, [user?.role])

  const totalSeconds = useMemo(
    () => project?.storyboard.reduce((sum, scene) => sum + Number(scene.durationSeconds || 0), 0) || 0,
    [project]
  )

  const formProject = async () => {
    if (!form.title.trim() || !form.subject.trim() || !form.objective.trim() || !form.audience.trim()) {
      setMessage('Name the ad, what it is about, what it should achieve, and who should understand it.')
      return
    }
    setForming(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/video-ads', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to form video ad')
      setProject(data.project)
      setProjects(current => [data.project, ...current.filter(item => item.id !== data.project.id)])
      setMessage(data.provider === 'gemini'
        ? 'Storyboard formed from the WEAVE advertising grammar. Add or replace the real scene media, then render.'
        : 'Storyboard formed from the built-in WEAVE advertising grammar. Add real scene media, then render.')
    } catch (error: any) {
      setMessage(error.message || 'Unable to form video ad')
    } finally {
      setForming(false)
    }
  }

  const updateScene = (index: number, patch: Partial<Scene>) => {
    setProject(current => {
      if (!current) return current
      const storyboard = current.storyboard.map((scene, sceneIndex) => sceneIndex === index ? { ...scene, ...patch } : scene)
      return { ...current, storyboard }
    })
  }

  const saveProject = async (nextProject = project) => {
    if (!nextProject) return
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/video-ads', {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify({
          id: nextProject.id,
          storyboard: nextProject.storyboard,
          soundtrackUrl: nextProject.soundtrackUrl,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to save video ad')
      setProject(data.project)
      setProjects(current => current.map(item => item.id === data.project.id ? data.project : item))
      setMessage('Video ad formation saved.')
    } catch (error: any) {
      setMessage(error.message || 'Unable to save video ad')
    } finally {
      setSaving(false)
    }
  }

  const uploadFile = async (file: File) => {
    const body = new FormData()
    body.append('file', file)
    const response = await fetch('/api/admin/video-ads/upload', { method: 'POST', headers: authHeaders(), body })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || 'Upload failed')
    return data as { url: string; mediaType: 'image' | 'video' | 'audio' }
  }

  const uploadScene = async (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !project) return
    const key = `scene-${index}`
    setUploading(key)
    setMessage(null)
    try {
      const uploaded = await uploadFile(file)
      if (uploaded.mediaType === 'audio') throw new Error('Scene media must be an image or video')
      const next = {
        ...project,
        storyboard: project.storyboard.map((scene, sceneIndex) => sceneIndex === index
          ? { ...scene, assetUrl: uploaded.url, assetType: uploaded.mediaType }
          : scene),
      }
      setProject(next)
      await saveProject(next)
    } catch (error: any) {
      setMessage(error.message || 'Scene upload failed')
    } finally {
      setUploading(null)
      event.target.value = ''
    }
  }

  const uploadSoundtrack = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !project) return
    setUploading('soundtrack')
    setMessage(null)
    try {
      const uploaded = await uploadFile(file)
      if (uploaded.mediaType !== 'audio') throw new Error('Soundtrack must be an audio file')
      const next = { ...project, soundtrackUrl: uploaded.url }
      setProject(next)
      await saveProject(next)
    } catch (error: any) {
      setMessage(error.message || 'Soundtrack upload failed')
    } finally {
      setUploading(null)
      event.target.value = ''
    }
  }

  const renderVideo = async () => {
    if (!project) return
    if (totalSeconds !== project.durationSeconds) {
      setMessage(`Scene timing must total ${project.durationSeconds} seconds. It currently totals ${totalSeconds}.`)
      return
    }
    if (project.storyboard.some(scene => !scene.assetUrl || !scene.assetType)) {
      setMessage('Every scene needs a real image or video before rendering.')
      return
    }
    setRendering(true)
    setMessage('Rendering the vertical video from the current scenes…')
    try {
      await saveProject(project)
      const response = await fetch('/api/admin/video-ads/render', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ projectId: project.id }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Video render failed')
      setProject(data.project)
      setProjects(current => current.map(item => item.id === data.project.id ? data.project : item))
      setMessage('Video ad rendered. Review it here or carry it into the Ad Workshop.')
    } catch (error: any) {
      setMessage(error.message || 'Video render failed')
      await loadProjects()
    } finally {
      setRendering(false)
    }
  }

  const sendToAdWorkshop = () => {
    if (!project?.outputUrl) return
    localStorage.setItem('weave_video_ad_handoff', JSON.stringify({
      title: project.title,
      body: project.objective,
      mediaUrl: project.outputUrl,
      mediaType: 'video',
    }))
    router.push('/admin/ad-workshop?from=video-ad-workshop')
  }

  if (!user || user.role !== 'admin') return null

  return (
    <main className="mx-auto max-w-7xl space-y-6 pb-16">
      <section className="overflow-hidden rounded-3xl border border-fuchsia-300/15 bg-[radial-gradient(circle_at_15%_0%,rgba(217,70,239,.16),transparent_35%),linear-gradient(140deg,#090b12,#05070c)] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 border border-fuchsia-300/15 bg-fuchsia-300/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-fuchsia-200">
              <Clapperboard className="h-3.5 w-3.5" /> Administration Workshop
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">VIDEO AD WORKSHOP</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Form the story before the advertisement appears. Hook → human situation → tension → turn → WEAVE reveal → proof → consequence → one final line.
            </p>
          </div>
          <div className="border border-white/10 bg-black/20 px-5 py-4 text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Production range</p>
            <p className="mt-1 text-2xl font-black text-white">30 SEC — 6 MIN</p>
            <p className="mt-1 text-[10px] text-slate-600">Vertical 9:16 · MP4</p>
          </div>
        </div>
      </section>

      {message && <div className="border-y border-fuchsia-300/15 bg-fuchsia-300/[0.04] px-4 py-3 text-sm text-fuchsia-100 sm:border">{message}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="space-y-5 border-y border-white/10 bg-black/15 p-5 sm:border sm:p-6">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-fuchsia-300/70">Formation</p>
            <h2 className="mt-1 text-xl font-black text-white">WHAT SHOULD THE VIDEO MAKE PEOPLE NOTICE?</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-xs font-bold text-slate-500">AD NAME<Input value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} className="border-white/10 bg-black/30 text-white" /></label>
            <label className="space-y-2 text-xs font-bold text-slate-500">AUDIENCE<Input value={form.audience} onChange={event => setForm(current => ({ ...current, audience: event.target.value }))} placeholder="Who should understand this?" className="border-white/10 bg-black/30 text-white" /></label>
          </div>

          <label className="block space-y-2 text-xs font-bold text-slate-500">SUBJECT / PRODUCT / ENVIRONMENT<textarea rows={3} value={form.subject} onChange={event => setForm(current => ({ ...current, subject: event.target.value }))} placeholder="Example: Premium File Folder — a business world where a Client builds systems, a store and Customer Door." className="w-full resize-y rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-300/40" /></label>
          <label className="block space-y-2 text-xs font-bold text-slate-500">WHAT SHOULD THIS AD ACHIEVE?<textarea rows={3} value={form.objective} onChange={event => setForm(current => ({ ...current, objective: event.target.value }))} placeholder="The human understanding or movement the video should create." className="w-full resize-y rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-300/40" /></label>

          <div className="border-y border-white/10 py-4">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-xs font-black text-white">DURATION</p><p className="text-[10px] text-slate-600">Any production from 30 seconds through 6 minutes.</p></div>
              <p className="text-2xl font-black text-fuchsia-200">{durationLabel(form.durationSeconds)}</p>
            </div>
            <input type="range" min={30} max={360} step={15} value={form.durationSeconds} onChange={event => setForm(current => ({ ...current, durationSeconds: Number(event.target.value) }))} className="mt-4 w-full accent-fuchsia-300" />
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map(seconds => <button key={seconds} onClick={() => setForm(current => ({ ...current, durationSeconds: seconds }))} className={`border px-3 py-1.5 text-[10px] font-black ${form.durationSeconds === seconds ? 'border-fuchsia-300/50 bg-fuchsia-300/10 text-fuchsia-100' : 'border-white/10 text-slate-500'}`}>{durationLabel(seconds)}</button>)}
            </div>
          </div>

          <Button onClick={formProject} disabled={forming} className="w-full bg-fuchsia-300 font-black text-slate-950 hover:bg-fuchsia-200">
            {forming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            FORM VIDEO AD
          </Button>
        </section>

        <aside className="border-y border-white/10 bg-black/15 p-5 sm:border sm:p-6">
          <div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600">Workshop record</p><h2 className="mt-1 text-lg font-black text-white">VIDEO PRODUCTIONS</h2></div><Film className="h-5 w-5 text-fuchsia-200" /></div>
          {loading ? <Loader2 className="mt-8 h-5 w-5 animate-spin text-slate-500" /> : projects.length === 0 ? <p className="mt-6 text-sm text-slate-600">No video production has been formed yet.</p> : <div className="mt-4 divide-y divide-white/10">{projects.map(item => <button key={item.id} onClick={() => setProject(item)} className="block w-full py-3 text-left"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-black text-white">{item.title}</p><span className="text-[9px] font-black uppercase text-fuchsia-200">{item.status}</span></div><p className="mt-1 text-[10px] text-slate-600">{durationLabel(item.durationSeconds)} · {new Date(item.updatedAt).toLocaleString()}</p></button>)}</div>}
        </aside>
      </div>

      {project && (
        <section className="space-y-5 border-y border-white/10 bg-[#070910]/70 px-3 py-6 sm:border sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
            <div><p className="text-[9px] font-black uppercase tracking-[0.28em] text-fuchsia-300/70">Current production</p><h2 className="mt-1 text-2xl font-black text-white">{project.title}</h2><p className="mt-2 text-xs text-slate-500">{durationLabel(project.durationSeconds)} · {project.aspectRatio} · {project.storyboard.length} scenes</p></div>
            <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => saveProject()} disabled={saving} className="border-white/15 text-white">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}SAVE</Button><label className="inline-flex cursor-pointer items-center border border-white/15 px-4 py-2 text-xs font-black text-white"><Music2 className="mr-2 h-4 w-4" />{uploading === 'soundtrack' ? 'UPLOADING…' : project.soundtrackUrl ? 'REPLACE SOUND' : 'ADD SOUND'}<input type="file" accept="audio/*" className="hidden" onChange={uploadSoundtrack} disabled={Boolean(uploading)} /></label></div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {project.storyboard.map((scene, index) => (
              <article key={scene.id} className="overflow-hidden border border-white/10 bg-black/20">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3"><div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-fuchsia-300">SCENE {scene.order} · {scene.beat}</p><p className="mt-1 text-xs text-slate-600">{scene.durationSeconds}s</p></div>{scene.assetType === 'video' ? <Video className="h-5 w-5 text-cyan-300" /> : scene.assetType === 'image' ? <ImageIcon className="h-5 w-5 text-cyan-300" /> : <Upload className="h-5 w-5 text-slate-700" />}</div>
                {scene.assetUrl && <div className="aspect-[9/16] max-h-80 overflow-hidden bg-black">{scene.assetType === 'video' ? <video src={scene.assetUrl} controls className="h-full w-full object-cover" /> : <img src={scene.assetUrl} alt="" className="h-full w-full object-cover" />}</div>}
                <div className="space-y-3 p-4">
                  <label className="block space-y-1 text-[9px] font-black uppercase tracking-widest text-slate-600">ON-SCREEN LINE<Input value={scene.text} onChange={event => updateScene(index, { text: event.target.value })} maxLength={160} className="border-white/10 bg-black/30 text-white" /></label>
                  <label className="block space-y-1 text-[9px] font-black uppercase tracking-widest text-slate-600">WHAT WE SHOULD SEE<textarea rows={3} value={scene.visualDirection} onChange={event => updateScene(index, { visualDirection: event.target.value })} className="w-full resize-y rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs normal-case tracking-normal text-slate-300 outline-none" /></label>
                  <label className="block space-y-1 text-[9px] font-black uppercase tracking-widest text-slate-600">VOICE / SOUND DIRECTION<textarea rows={2} value={scene.voiceover} onChange={event => updateScene(index, { voiceover: event.target.value })} className="w-full resize-y rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs normal-case tracking-normal text-slate-300 outline-none" /></label>
                  <label className="inline-flex cursor-pointer items-center border border-cyan-300/20 bg-cyan-300/[0.04] px-3 py-2 text-[10px] font-black text-cyan-200"><Upload className="mr-2 h-3.5 w-3.5" />{uploading === `scene-${index}` ? 'UPLOADING…' : scene.assetUrl ? 'REPLACE SCENE MEDIA' : 'ADD SCENE MEDIA'}<input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden" onChange={event => uploadScene(index, event)} disabled={Boolean(uploading)} /></label>
                </div>
              </article>
            ))}
          </div>

          <div className="border-y border-white/10 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600">Render check</p><p className="mt-1 text-sm font-black text-white">Timeline {totalSeconds}s / {project.durationSeconds}s · {project.storyboard.filter(scene => scene.assetUrl).length}/{project.storyboard.length} scenes supplied</p><p className="mt-1 text-xs text-slate-600">The renderer crops every scene to 9:16, burns the short on-screen line, joins the scenes, and adds the optional soundtrack.</p></div><Button onClick={renderVideo} disabled={rendering || saving || Boolean(uploading)} className="bg-cyan-300 font-black text-slate-950 hover:bg-cyan-200">{rendering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}{rendering ? 'RENDERING…' : 'RENDER VIDEO'}</Button></div>
          </div>

          {project.status === 'failed' && project.errorMessage && <div className="border border-red-400/20 bg-red-400/[0.05] p-4 text-sm text-red-200">{project.errorMessage}</div>}

          {project.outputUrl && (
            <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
              <div className="mx-auto w-full max-w-sm overflow-hidden border border-white/10 bg-black"><video src={project.outputUrl} controls className="aspect-[9/16] w-full object-contain" /></div>
              <div className="flex flex-col justify-center"><p className="text-[9px] font-black uppercase tracking-[0.28em] text-emerald-300">FINISHED VIDEO</p><h3 className="mt-2 text-3xl font-black text-white">CARRY IT INTO MOVEMENT</h3><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">The Video Ad Workshop forms and renders the production. The existing Ad Workshop remains the place that chooses who receives it, where it appears, and when it goes live.</p><div className="mt-5 flex flex-wrap gap-3"><Button onClick={sendToAdWorkshop} className="bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200">SEND TO AD WORKSHOP <ArrowRight className="ml-2 h-4 w-4" /></Button><Button asChild variant="outline" className="border-white/15 text-white"><Link href={project.outputUrl} target="_blank">OPEN VIDEO</Link></Button></div></div>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
