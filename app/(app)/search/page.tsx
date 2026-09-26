'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BookOpen,
  CalendarDays,
  Lightbulb,
  Loader2,
  Quote,
  Radio,
  Search,
  Send,
  ShieldCheck,
} from 'lucide-react'

interface Cadence {
  id: string
  cadence_type: 'thought' | 'quote' | 'experience' | 'lesson' | 'event'
  content: string
  context?: string | null
  created_at: string
  author_id: string
  author_name: string
}

const typeMeta = {
  thought: { label:'Thought', icon:Lightbulb, tone:'text-amber-300 border-amber-300/15 bg-amber-400/[0.04]' },
  quote: { label:'Quote', icon:Quote, tone:'text-violet-300 border-violet-300/15 bg-violet-400/[0.04]' },
  experience: { label:'Experience', icon:Radio, tone:'text-emerald-300 border-emerald-300/15 bg-emerald-400/[0.04]' },
  lesson: { label:'Lesson', icon:BookOpen, tone:'text-sky-300 border-sky-300/15 bg-sky-400/[0.04]' },
  event: { label:'Event', icon:CalendarDays, tone:'text-cyan-300 border-cyan-300/15 bg-cyan-400/[0.04]' },
}

export default function HumanCadenceEnginePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get('q')?.trim() || ''
  const [value, setValue] = useState(query)
  const [cadences, setCadences] = useState<Cadence[]>([])
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [content, setContent] = useState('')
  const [context, setContext] = useState('')
  const [cadenceType, setCadenceType] = useState<Cadence['cadence_type']>('thought')
  const [publishError, setPublishError] = useState('')

  useEffect(()=>setValue(query),[query])

  useEffect(()=>{
    let cancelled=false
    setLoading(true)
    fetch(`/api/cadences${query ? `?q=${encodeURIComponent(query)}` : ''}`, { cache:'no-store' })
      .then(response=>response.ok?response.json():Promise.reject(new Error('Search failed')))
      .then(data=>{ if(!cancelled) setCadences(data.cadences || []) })
      .catch(()=>{ if(!cancelled) setCadences([]) })
      .finally(()=>{ if(!cancelled) setLoading(false) })
    return ()=>{cancelled=true}
  },[query])

  const authors=useMemo(()=>new Set(cadences.map(cadence=>cadence.author_id)).size,[cadences])
  const types=useMemo(()=>new Set(cadences.map(cadence=>cadence.cadence_type)).size,[cadences])

  function submitSearch(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next=value.trim()
    router.push(next ? `/search?q=${encodeURIComponent(next)}` : '/search')
  }

  async function publishCadence(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPublishError('')
    setPublishing(true)
    try {
      const response=await fetch('/api/cadences',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({content,context,cadenceType}),
      })
      const data=await response.json()
      if(!response.ok) throw new Error(data.error || 'Unable to publish cadence')
      setContent('')
      setContext('')
      setCadences(current=>[data.cadence,...current])
    } catch(error) {
      setPublishError(error instanceof Error ? error.message : 'Unable to publish cadence')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-sky-300/15 bg-[#030a15]/72">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(14,165,233,.13),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(245,158,11,.07),transparent_28%)] p-5 md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Human Cadence Engine</p>
              <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Human experience remains attributed, searchable and reusable as institutional knowledge.</h1>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
                Search what people have actually recorded in WEAVE. Results are human cadences, not generated answers. Adding a cadence creates a new attributed record in the same stream.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label="Records" value={cadences.length} tone="sky"/>
              <Metric label="Humans" value={authors} tone="emerald"/>
              <Metric label="Types" value={types} tone="amber"/>
            </div>
          </div>
        </header>

        <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_320px]">
          <section className="space-y-4">
            <div className="weave-reading-surface rounded-3xl p-4 md:p-5">
              <form onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"/>
                  <input
                    autoFocus
                    value={value}
                    onChange={event=>setValue(event.target.value)}
                    placeholder="Search a thought, problem, lesson or event"
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/25 pl-10 pr-3 text-sm text-white outline-none focus:border-sky-300/30"
                    aria-label="Search Human Cadences"
                  />
                </div>
                <button type="submit" className="rounded-xl bg-sky-300 px-5 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950">Search records</button>
              </form>

              <div className="mt-5 border-t border-white/10 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Create a human record</p>
                    <p className="mt-1 text-xs text-slate-400">What you publish remains attributed to you.</p>
                  </div>
                  <Send className="h-4 w-4 text-violet-300"/>
                </div>

                <form onSubmit={publishCadence} className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(typeMeta) as Cadence['cadence_type'][]).map(type=>{
                      const meta=typeMeta[type]
                      const Icon=meta.icon
                      const active=cadenceType===type
                      return <button key={type} type="button" onClick={()=>setCadenceType(type)} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-[0.08em] transition ${active?meta.tone:'border-white/10 bg-black/20 text-slate-400'}`}><Icon className="h-3.5 w-3.5"/>{meta.label}</button>
                    })}
                  </div>
                  <textarea value={content} onChange={event=>setContent(event.target.value)} maxLength={2000} placeholder="What happened, what did you notice, or what did you learn?" required rows={4} className="w-full rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white outline-none focus:border-violet-300/30"/>
                  <input value={context} onChange={event=>setContext(event.target.value)} maxLength={1000} placeholder="Optional context: where, when or why" className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-xs text-white outline-none focus:border-violet-300/30"/>
                  {publishError && <div className="rounded-xl border border-rose-300/15 bg-rose-400/[0.05] px-4 py-3 text-xs text-rose-100">{publishError}</div>}
                  <button type="submit" disabled={publishing || !content.trim()} className="inline-flex items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-400/[0.08] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-violet-100 disabled:opacity-40"><Send className="h-3.5 w-3.5"/>{publishing?'Recording…':'Record cadence'}</button>
                </form>
              </div>
            </div>

            <section className="weave-reading-surface rounded-3xl p-4 md:p-5">
              <div className="border-b border-white/10 pb-4">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">{query ? `Records around “${query}”` : 'Recent human records'}</p>
                <p className="mt-1 text-xs text-slate-400">Every result remains tied to the human who contributed it.</p>
              </div>

              {loading ? (
                <div className="flex justify-center py-16 text-slate-400"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Listening across WEAVE…</div>
              ) : cadences.length===0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-8 text-center">
                  <Search className="mx-auto h-8 w-8 text-slate-500"/>
                  <p className="mt-3 text-sm font-black text-white">No human cadence matches this view.</p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">Try another phrase or create the first attributed record around this subject.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {cadences.map(cadence=>{
                    const meta=typeMeta[cadence.cadence_type] || typeMeta.thought
                    const Icon=meta.icon
                    return (
                      <article key={cadence.id} className={`rounded-2xl border p-4 ${meta.tone}`}>
                        <div className="flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-[0.1em]">
                          <Icon className="h-3.5 w-3.5"/>
                          <span>{meta.label}</span>
                          <span className="text-white/25">·</span>
                          <span className="text-slate-300">{cadence.author_name}</span>
                          <span className="text-white/25">·</span>
                          <time className="text-slate-400" dateTime={cadence.created_at}>{new Date(cadence.created_at).toLocaleDateString()}</time>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white">{cadence.content}</p>
                        {cadence.context && <p className="mt-3 border-l-2 border-white/15 pl-3 text-[11px] leading-5 text-slate-300">Context: {cadence.context}</p>}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
              <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Knowledge causality</p></div>
              <div className="mt-3 space-y-2 text-xs font-semibold text-slate-300">
                <p>Human notices → record.</p>
                <p>Record → searchable cadence.</p>
                <p>Search → recognition.</p>
                <p>Recognition → new movement.</p>
              </div>
            </section>

            <section className="rounded-3xl border border-sky-300/15 bg-sky-400/[0.04] p-4">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-sky-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Attribution rule</p></div>
              <p className="mt-3 text-xs leading-5 text-slate-300">WEAVE does not rewrite these records into anonymous system knowledge. The contributor and date remain visible so interpretation stays anchored to source.</p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}

function Metric({label,value,tone}:{label:string;value:number;tone:'sky'|'emerald'|'amber'}) {
  const color=tone==='emerald'?'text-emerald-300 border-emerald-300/15 bg-emerald-400/[0.04]':tone==='amber'?'text-amber-300 border-amber-300/15 bg-amber-400/[0.04]':'text-sky-300 border-sky-300/15 bg-sky-400/[0.04]'
  return <div className={`rounded-xl border px-3 py-3 ${color}`}><p className="text-[8px] font-black uppercase tracking-wider">{label}</p><p className="mt-1 text-xl font-black text-white">{value}</p></div>
}
