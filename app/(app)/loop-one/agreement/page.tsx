'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import { CheckCircle2, FileText, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'

const AGREEMENT_VERSION = 'loop-one-v1-2026-09-07'

const TERMS = {
  agent: {
    title: 'Agent Loop One Participation Agreement', role: 'Agent',
    intro: 'I understand my position in Loop One as a salary-based Weave worker who brings, organizes, and supports Bridgers.',
    sections: [
      ['Position', 'The Agent manages Bridgers within the company structure and does not become the Client or own the Client File Folder.'],
      ['Loop One', 'For a qualifying File Folder value, the Agent position is 5%. The distribution is recorded by the company transaction system.'],
      ['Responsibilities', 'I will support Bridgers, preserve accurate company records, communicate the Client position truthfully, and use only authorized company functions.'],
      ['Boundaries', 'I cannot alter Client Vault balances, approve Client Vault withdrawals, or represent an entitlement that is not present in the company record.'],
      ['Distribution', 'Loop One distributes 30% Bridger, 5% Agent, 35% Company, and 30% Client Siblings Fund / Client Vault.'],
    ],
  },
  bridger: {
    title: 'Bridger Loop One Participation Agreement', role: 'Bridger',
    intro: 'I understand my position in Loop One as the human connection who accompanies prospects and Clients toward participation in Weave.',
    sections: [
      ['Position', 'The Bridger connects and accompanies the Client. The Client is the person who crosses System Switch.'],
      ['Loop One', 'For a qualifying File Folder value, the Bridger position is 30%. The distribution is recorded by the company transaction system.'],
      ['Responsibilities', 'I will work assigned prospects, use approved Bridge AI and communication processes, accompany the Client through File Folder formation, and maintain truthful continuity.'],
      ['Boundaries', 'I do not own the Client File Folder or enterprise, do not pass through System Switch, and cannot approve Client Vault withdrawals.'],
      ['Distribution', 'Loop One distributes 30% Bridger, 5% Agent, 35% Company, and 30% Client Siblings Fund / Client Vault.'],
    ],
  },
} as const

export default function LoopOneAgreementPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [signed, setSigned] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const role = user?.role === 'agent' || user?.role === 'bridger' ? user.role : null
  const terms = role ? TERMS[role] : null

  useEffect(() => {
    if (!user || !role) {
      if (user?.role === 'admin') router.replace('/admin/dashboard')
      else if (user) router.replace('/dashboard')
      return
    }
    fetch('/api/loop-one/agreement', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(res => res.json())
      .then(data => {
        if (data.signed) router.replace(role === 'agent' ? '/agent/dashboard' : '/bridger/dashboard')
        else setLoading(false)
      })
      .catch(() => { setError('Unable to verify the agreement status.'); setLoading(false) })
  }, [user, role, token, router])

  const signAgreement = async () => {
    if (!role || !accepted) return
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/loop-one/agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ agreementVersion: AGREEMENT_VERSION, accept: true }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Signing failed')
      setSigned(true)
      router.replace(role === 'agent' ? '/agent/dashboard' : '/bridger/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signing failed')
    } finally { setSubmitting(false) }
  }

  if (loading || !terms) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading Loop One agreement...</div>
  if (signed) return null

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5">
          <div className="flex items-start gap-4">
            <LockKeyhole className="mt-1 h-6 w-6 shrink-0 text-cyan-400" />
            <div><p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Loop One · Required</p><h1 className="mt-1 text-2xl font-bold">Your Loop One position must be established</h1><p className="mt-2 text-sm leading-6 text-slate-300">Read this agreement before entering Loop One functions. Your role determines the position and participation terms shown below.</p></div>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/90 overflow-hidden">
          <header className="border-b border-slate-700 p-6 sm:p-8">
            <div className="flex items-center gap-3"><FileText className="h-6 w-6 text-cyan-400" /><div><p className="text-xs text-slate-500">Weave of Presence · System Switch · Bridge Radiance</p><h2 className="text-xl font-bold sm:text-2xl">{terms.title}</h2></div></div>
            <div className="mt-5 rounded-xl bg-slate-950/70 p-4 text-sm leading-6 text-slate-300">{terms.intro}</div>
          </header>
          <div className="p-6 sm:p-8 space-y-6">
            {terms.sections.map(([heading, body]) => <section key={heading}><h3 className="font-semibold text-white">{heading}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{body}</p></section>)}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5"><p className="text-sm font-semibold text-amber-300">Access condition</p><p className="mt-2 text-sm leading-6 text-slate-400">Until this agreement is signed, Loop One activation and Loop One earning functions remain unavailable for this {terms.role} position.</p></div>
            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700 bg-slate-950/60 p-4 hover:border-cyan-500/40">
              <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 h-4 w-4 accent-cyan-500" />
              <span className="text-sm leading-6 text-slate-300">I have read the Loop One Participation Agreement, understand my {terms.role} position, its economic terms, responsibilities, and boundaries, and I agree to operate Loop One accordingly.</span>
            </label>
            <Button onClick={signAgreement} disabled={submitting || !accepted} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 py-6 text-base font-semibold">{submitting ? 'Recording agreement...' : 'Sign Loop One Agreement'}</Button>
          </div>
        </section>
      </div>
    </main>
  )
}
