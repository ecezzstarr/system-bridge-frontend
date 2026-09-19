'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'

const AUDIENCE = ['client', 'agent', 'bridger'] as const

type Loop = {
  id: string
  loop_number: number
  title: string
  purpose: string
  stage: string
  position: string
  functions: string
  economics: string
  responsibilities: string
  boundaries: string
  agreement_version: string | null
  audience: string[]
  status: string
}

const emptyForm = {
  loopNumber: '1', title: '', purpose: '', stage: '', position: 'all', functions: '',
  economics: '', responsibilities: '', boundaries: '', agreementVersion: '',
  audience: [...AUDIENCE], status: 'draft',
}

export default function LoopWorkshopPage() {
  const { user, isLoading, isInitialized } = useAuth()
  const loading = isLoading || !isInitialized
  const router = useRouter()
  const [form, setForm] = useState(emptyForm)
  const [loops, setLoops] = useState<Loop[]>([])
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.replace('/dashboard')
  }, [loading, user, router])

  const loadLoops = async () => {
    const res = await fetch('/api/company-loops?manage=true', { headers: { Authorization: `Bearer ${localStorage.getItem('ssb_auth_token') || ''}` } })
    const data = await res.json()
    setLoops(data.loops || [])
  }

  useEffect(() => { if (user?.role === 'admin') loadLoops() }, [user])

  const toggleAudience = (role: string) => {
    setForm(current => ({
      ...current,
      audience: current.audience.includes(role)
        ? current.audience.filter(item => item !== role)
        : [...current.audience, role],
    }))
  }

  const createLoop = async () => {
    setSaving(true)
    setMessage('')
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null
      const res = await fetch('/api/company-loops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to create loop')
      setMessage(form.status === 'published' ? 'Loop created and made available.' : 'Loop created as a draft.')
      setForm({ ...emptyForm, loopNumber: String(Number(form.loopNumber) + 1) })
      await loadLoops()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create loop')
    } finally {
      setSaving(false)
    }
  }

  const setStatus = async (id: string, status: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null
    const res = await fetch('/api/company-loops', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) await loadLoops()
  }

  if (loading || !user || user.role !== 'admin') return null

  const field = (label: string, key: keyof typeof form, multiline = false) => (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {multiline ? (
        <textarea value={String(form[key])} onChange={e => setForm({ ...form, [key]: e.target.value })} rows={4}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" />
      ) : (
        <input value={String(form[key])} onChange={e => setForm({ ...form, [key]: e.target.value })}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" />
      )}
    </label>
  )

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Administration Workshop</p>
            <h1 className="mt-2 text-2xl font-bold">Company Loop Workshop</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Create company events, define their position and functions, then publish them to the selected participant positions.</p>
          </div>
          <button onClick={() => router.push('/admin/dashboard')} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Admin Dashboard</button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="mb-5 text-lg font-semibold">Create a Company Loop</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {field('Loop Number', 'loopNumber')}
              {field('Title', 'title')}
              {field('Stage', 'stage')}
              {field('Position', 'position')}
              {field('Agreement Version', 'agreementVersion')}
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Publication</span>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
                  <option value="draft">Draft</option><option value="published">Published</option>
                </select>
              </label>
            </div>
            <div className="mt-4 space-y-4">
              {field('Purpose', 'purpose', true)}
              {field('Functions', 'functions', true)}
              {field('Economics', 'economics', true)}
              {field('Responsibilities', 'responsibilities', true)}
              {field('Boundaries', 'boundaries', true)}
            </div>

            <div className="mt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Make Available To</p>
              <div className="flex flex-wrap gap-2">
                {AUDIENCE.map(role => (
                  <button key={role} type="button" onClick={() => toggleAudience(role)} className={`rounded-full border px-4 py-2 text-sm capitalize ${form.audience.includes(role) ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' : 'border-slate-700 text-slate-500'}`}>
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {message && <p className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">{message}</p>}
            <button disabled={saving || !form.title.trim()} onClick={createLoop} className="mt-5 w-full rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-cyan-500">
              {saving ? 'Creating…' : form.status === 'published' ? 'Create & Publish Loop' : 'Create Draft Loop'}
            </button>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="mb-5 text-lg font-semibold">Company Events</h2>
            {loops.length === 0 ? <p className="text-sm text-slate-500">No published company loops yet.</p> : (
              <div className="space-y-3">
                {loops.map(loop => (
                  <div key={loop.id} className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-xs text-cyan-400">Loop {loop.loop_number}</p><h3 className="font-semibold">{loop.title}</h3></div>
                      <span className={`rounded-full px-2 py-1 text-[10px] uppercase ${loop.status === 'published' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-400'}`}>{loop.status}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Available to: {loop.audience.join(', ')}</p>
                    {loop.status !== 'published' && <button onClick={() => setStatus(loop.id, 'published')} className="mt-3 rounded-md border border-green-500/30 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/10">Publish</button>}
                    {loop.status === 'published' && <button onClick={() => setStatus(loop.id, 'archived')} className="mt-3 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800">Archive</button>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
