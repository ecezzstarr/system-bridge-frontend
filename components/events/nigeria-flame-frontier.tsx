'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronRight, Flame, Loader2, MapPinned, Send } from 'lucide-react'
import { visiblePoll } from '@/lib/visible-poll'

type Phase = 'recognized' | 'organized' | 'delivered'
type StateCurrent = {
  code: string
  name: string
  zone: string
  recognized: number
  organized: number
  delivered: number
  total: number
}
type PublicCurrent = {
  states: StateCurrent[]
  totals: {
    recognized: number
    organized: number
    delivered: number
    statesWithVerifiedMovement: number
    fctHasVerifiedMovement: boolean
  }
  recent: {
    id: string
    state_code: string
    sector: string
    phase: Phase
    title: string
    public_summary: string
    reviewed_at: string
  }[]
}
const sectors = [
  ['food', 'Food'], ['work', 'Work & Livelihood'], ['health', 'Health'],
  ['markets', 'Markets'], ['transport', 'Transport'], ['education', 'Education'],
  ['enterprise', 'Enterprise'], ['public_services', 'Public Services'],
] as const
const phaseLabels: Record<Phase, string> = {
  recognized: 'Need recognized',
  organized: 'Work organized',
  delivered: 'Outcome delivered',
}

export function NigeriaFlameFrontier({ allowSubmission = true }: { allowSubmission?: boolean } = {}) {
  const [current, setCurrent] = useState<PublicCurrent | null>(null)
  const [error, setError] = useState('')
  const [zone, setZone] = useState('All')
  const [selectedCode, setSelectedCode] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('recognized')
  const [sector, setSector] = useState<string>('work')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [evidenceNote, setEvidenceNote] = useState('')
  const [sharePublicly, setSharePublicly] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState('')

  useEffect(() => {
    let mounted = true
    const stop = visiblePoll(async signal => {
      try {
        const response = await fetch('/api/events/flame/frontier', { cache: 'no-store', signal })
        const body = await response.json()
        if (!response.ok || !body.success) throw new Error(body.error || 'Frontier data unavailable')
        if (mounted) { setCurrent(body); setError('') }
      } catch (cause) {
        if (mounted && !(cause instanceof Error && cause.name === 'AbortError')) {
          setError('Unable to load verified state movement.')
        }
      }
    }, 20000)
    return () => { mounted = false; stop() }
  }, [])

  const states = current?.states || []
  const zones = useMemo(() => ['All', ...Array.from(new Set(states.map(state => state.zone)))], [states])
  const visibleStates = states.filter(state => zone === 'All' || state.zone === zone)
  const selected = states.find(state => state.code === selectedCode)
  const totals = current?.totals
  const deliveredNames = states.filter(state => state.delivered > 0).map(state => state.name)

  async function submitMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCode || submitting) return
    setSubmitting(true)
    setFormMessage('')
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/events/flame/frontier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ stateCode: selectedCode, phase, sector, title, summary, evidenceNote, sharePublicly }),
      })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || 'Unable to submit movement')
      setTitle('')
      setSummary('')
      setEvidenceNote('')
      setSharePublicly(false)
      setFormMessage('Submitted for Administration review. This does not count as verified public movement yet.')
    } catch (cause) {
      setFormMessage(cause instanceof Error ? cause.message : 'Unable to submit movement')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="relative border-b border-white/10 px-4 py-7 sm:px-6 lg:px-8 lg:py-10" data-flame-nigeria-frontier="verified-movement">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.2em] text-orange-200">
            <MapPinned className="h-4 w-4" /> Nigeria · Flame frontier
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            A living field of work, not a map of promises.
          </h2>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-stone-400">
            36 states and the FCT. A flame becomes visible here only after Administration verifies an actual movement
            and the contributor has permitted public display. Recognized needs, organized work and delivered outcomes remain distinct.
          </p>
        </div>
        <span className="border border-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-stone-300">
          Verified movement only
        </span>
      </header>

      <div className="mt-6 grid grid-cols-2 border-y border-white/10 sm:grid-cols-4">
        {[
          ['States with movement', totals ? `${totals.statesWithVerifiedMovement}/36` : '—'],
          ['FCT', totals ? totals.fctHasVerifiedMovement ? 'Recorded' : 'Awaiting' : '—'],
          ['Needs recognized', totals?.recognized ?? '—'],
          ['Work delivered', totals?.delivered ?? '—'],
        ].map(([label, value]) => (
          <div key={label} className="border-r border-b border-white/10 p-4 last:border-r-0 sm:border-b-0">
            <p className="text-[9px] uppercase tracking-[.12em] text-stone-500">{label}</p>
            <p className="mt-2 text-xl font-black tabular-nums text-white">{value}</p>
          </div>
        ))}
      </div>
      {error && <p role="alert" className="mt-4 text-xs text-rose-300">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-2" aria-label="Select geopolitical zone">
        {zones.map(item => (
          <button
            key={item}
            type="button"
            onClick={() => setZone(item)}
            aria-pressed={zone === item}
            className={`border px-3 py-2 text-[9px] font-bold transition ${zone === item ? 'border-orange-300/50 bg-orange-300/10 text-orange-100' : 'border-white/10 text-stone-400 hover:text-white'}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-3 lg:grid-cols-6" role="group" aria-label="State movement selector">
        {visibleStates.map(state => {
          const active = state.total > 0
          return (
            <button
              type="button"
              key={state.code}
              onClick={() => setSelectedCode(state.code)}
              aria-pressed={selectedCode === state.code}
              data-frontier-state={state.code}
              data-frontier-verified={active ? 'true' : 'false'}
              className={`relative flex min-h-24 flex-col items-start justify-between bg-[#0d0c0d] p-3 text-left transition hover:bg-white/[.08] ${selectedCode === state.code ? 'ring-1 ring-inset ring-sky-300/80' : ''}`}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-[9px] font-black text-stone-200">{state.name}</span>
                <Flame className={`h-4 w-4 shrink-0 ${state.delivered ? 'text-orange-300' : active ? 'text-amber-300/70' : 'text-stone-700'}`} />
              </span>
              <span className="mt-3 text-[9px] text-stone-500">
                {active ? `${state.total} verified · ${state.delivered} delivered` : 'Awaiting movement'}
              </span>
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="mt-4 border-l-2 border-sky-300/60 bg-white/[.03] p-4" data-frontier-selected-state={selected.code}>
          <p className="text-xs font-black text-white">{selected.name} · {selected.zone}</p>
          <p className="mt-1 text-xs text-stone-400">
            {selected.recognized} verified needs · {selected.organized} organized movements · {selected.delivered} delivered outcomes
          </p>
          {selected.total === 0 && <p className="mt-2 text-xs text-stone-500">No public verified activity is recorded for this state yet.</p>}
          {allowSubmission && <button type="button" onClick={() => { setFormOpen(true); setFormMessage('') }} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-orange-200">
            Record movement from {selected.name} <ChevronRight className="h-4 w-4" />
          </button>}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] text-stone-500">
          {deliveredNames.length
            ? `Verified delivery recorded in: ${deliveredNames.join(', ')}.`
            : 'No publicly verified delivery has been recorded yet. Empty states are not presented as active.'}
        </p>
        {allowSubmission && <button
          type="button"
          onClick={() => { setFormOpen(value => !value); setFormMessage('') }}
          className="inline-flex items-center gap-2 border border-orange-300/25 px-4 py-2 text-xs font-black text-orange-100 hover:bg-orange-300/10"
        >
          <Send className="h-3.5 w-3.5" /> {formOpen ? 'Close submission' : 'Submit real movement'}
        </button>}
      </div>

      {allowSubmission && formOpen && (
        <form onSubmit={submitMovement} className="mt-5 grid gap-4 border border-white/10 bg-black/30 p-4 sm:grid-cols-2 sm:p-6" data-frontier-intake="needs-work-outcomes">
          <div className="sm:col-span-2">
            <p className="text-sm font-black text-white">Record a recognized need, organized work, or delivered outcome</p>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              A real WEAVE position may submit evidence for Administration to review. Do not include personal contact, patient, or recipient information in public text.
            </p>
          </div>
          <label className="text-xs text-stone-300">State / territory
            <select required value={selectedCode} onChange={e => setSelectedCode(e.target.value)} className="mt-1 block w-full border border-white/15 bg-[#181517] p-3 text-white">
              <option value="">Select a state</option>
              {states.map(state => <option key={state.code} value={state.code}>{state.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-stone-300">Sector
            <select value={sector} onChange={e => setSector(e.target.value)} className="mt-1 block w-full border border-white/15 bg-[#181517] p-3 text-white">
              {sectors.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs text-stone-300 sm:col-span-2">Movement stage
            <select value={phase} onChange={e => setPhase(e.target.value as Phase)} className="mt-1 block w-full border border-white/15 bg-[#181517] p-3 text-white">
              {Object.entries(phaseLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs text-stone-300 sm:col-span-2">What happened? (8–120 characters)
            <input required minLength={8} maxLength={120} value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full border border-white/15 bg-[#181517] p-3 text-white" placeholder="e.g. A food delivery route was completed" />
          </label>
          <label className="text-xs text-stone-300 sm:col-span-2">Public-safe summary (25–500 characters)
            <textarea required minLength={25} maxLength={500} rows={3} value={summary} onChange={e => setSummary(e.target.value)} className="mt-1 block w-full border border-white/15 bg-[#181517] p-3 text-white" placeholder="Describe the work and outcome without identifying a private person." />
          </label>
          <label className="text-xs text-stone-300 sm:col-span-2">Private evidence for Administration (20–4000 characters)
            <textarea required minLength={20} maxLength={4000} rows={3} value={evidenceNote} onChange={e => setEvidenceNote(e.target.value)} className="mt-1 block w-full border border-white/15 bg-[#181517] p-3 text-white" placeholder="Provide a transaction, order, operational reference, or other way to verify this event. This is not published." />
          </label>
          <label className="flex items-start gap-3 text-xs leading-5 text-stone-300 sm:col-span-2">
            <input type="checkbox" checked={sharePublicly} onChange={e => setSharePublicly(e.target.checked)} className="mt-1" />
            Permit Administration to publish the verified title, summary, state, sector and stage. Private evidence and identity are not published. Leave unchecked to keep this record internal.
          </label>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <button type="submit" disabled={submitting || !selectedCode} className="inline-flex items-center gap-2 bg-orange-300 px-5 py-3 text-xs font-black text-black disabled:opacity-40">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Send for verification
            </button>
            {formMessage && <p role="status" className="max-w-lg text-xs text-sky-200">{formMessage}</p>}
          </div>
        </form>
      )}

      <div className="mt-8 border-t border-white/10 pt-5">
        <h3 className="text-xs font-black uppercase tracking-[.14em] text-stone-300">Latest verified movement</h3>
        {!current ? <p className="mt-3 text-xs text-stone-500">Loading recorded movement…</p> :
          current.recent.length === 0 ? <p className="mt-3 text-xs text-stone-500">No publicly verified records yet.</p> :
          <div className="mt-3 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {current.recent.map(item => (
              <div key={item.id} className="bg-[#0d0c0d] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[.12em] text-orange-200">
                  {states.find(state => state.code === item.state_code)?.name || item.state_code} · {phaseLabels[item.phase]}
                </p>
                <p className="mt-2 text-xs font-black text-white">{item.title}</p>
                <p className="mt-2 text-[11px] leading-5 text-stone-400">{item.public_summary}</p>
                <p className="mt-3 text-[9px] text-stone-600">Administration verified · {new Date(item.reviewed_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        }
      </div>
    </section>
  )
}
