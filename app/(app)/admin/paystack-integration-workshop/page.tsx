'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, Copy, ExternalLink, ShieldCheck, WalletCards } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

const tasks = [
  { id: 'keys', title: 'Configure server-side credentials', detail: 'Set PAYSTACK_SECRET_KEY in the self-hosted production secret store. Never paste the secret key into this page, browser storage, or source control.' },
  { id: 'origin', title: 'Set the canonical public origin', detail: 'Set WEAVE_PUBLIC_ORIGIN to the public HTTPS origin used by the live Weave deployment.' },
  { id: 'webhook', title: 'Register the Paystack webhook', detail: 'In the Paystack dashboard, register the HTTPS endpoint shown below. The server validates the signature and verifies the transaction with Paystack before crediting a wallet.' },
  { id: 'test-staff', title: 'Test a staff deposit', detail: 'Use Paystack test mode with an Administration, Agent, or Bridger account. Confirm the amount, reference, pending deposit record and final wallet credit.' },
  { id: 'test-client', title: 'Test a Client deposit', detail: 'Use test mode with a Client account and confirm its wallet and Administration deposit record match the verified payment.' },
  { id: 'replay', title: 'Verify duplicate-event safety', detail: 'Replay the same test webhook/reference and confirm the deposit is not credited a second time.' },
]

export default function PaystackIntegrationWorkshopPage() {
  const { user, token, isInitialized } = useAuth()
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isInitialized || !token || user?.role !== 'admin') return
    let active = true
    setBusy(true)
    fetch('/api/admin/paystack-integration/status', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to read integration status')
      if (active) setStatus(data.configured ? 'Server configuration detected. Complete the test-mode checks below before live collection.' : 'Server configuration is incomplete. Add the required values to the self-hosted secret/environment configuration.')
    }).catch(error => {
      if (active) setStatus(error instanceof Error ? error.message : 'Integration status is unavailable.')
    }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [isInitialized, token, user?.role])

  if (!isInitialized) return <main className="p-6 text-slate-300">Opening Paystack Integration Workshop…</main>
  if (user?.role !== 'admin') return <main className="p-6 text-red-300">Administration access required.</main>

  const webhook = '/api/deposit/paystack/webhook'
  const completed = tasks.filter(task => checked[task.id]).length

  return (
    <main className="mx-auto max-w-5xl space-y-7 p-5 text-white md:p-8">
      <header className="space-y-3">
        <Link href="/authority/workshops" className="text-sm text-cyan-300 underline">Return to Authority Workshops</Link>
        <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[.18em] text-emerald-300"><WalletCards className="h-4 w-4" /> Administration · Payment Systems</p>
        <h1 className="text-3xl font-black md:text-5xl">Paystack Integration Workshop</h1>
        <p className="max-w-3xl text-base leading-7 text-slate-300">A controlled Administration workspace for connecting Weave platform wallet deposits to Paystack, checking the server setup, and recording manual release-readiness checks.</p>
      </header>

      <section className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[.04] p-5">
        <div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-cyan-300" /><h2 className="text-xl font-black">Integration status</h2></div>
        <p className="mt-3 text-sm leading-6 text-slate-300">{busy ? 'Checking server configuration…' : status || 'Status not checked yet.'}</p>
        <p className="mt-3 text-xs leading-5 text-slate-500">This check reports whether required environment variables exist; it does not validate credentials with Paystack or prove that a live payment has settled.</p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-black">1. Server-side connection</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">Configure these values on the self-hosted Weave server or its secret manager. This page deliberately does not collect or store secret credentials.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 p-4"><p className="font-mono text-sm text-cyan-200">PAYSTACK_SECRET_KEY</p><p className="mt-2 text-sm text-slate-400">Required server secret. Use a test key while validating the integration; keep it out of browser code and Git.</p></div>
          <div className="rounded-2xl border border-white/10 p-4"><p className="font-mono text-sm text-cyan-200">WEAVE_PUBLIC_ORIGIN</p><p className="mt-2 text-sm text-slate-400">Canonical HTTPS origin used to build the Paystack callback URL.</p></div>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Webhook endpoint path</p>
          <div className="mt-2 flex flex-wrap items-center gap-3"><code className="break-all text-sm text-emerald-200">{webhook}</code><button type="button" onClick={() => { void navigator.clipboard?.writeText(webhook) }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold"><Copy className="h-3.5 w-3.5" /> Copy path</button></div>
          <p className="mt-2 text-sm text-slate-400">Register the full HTTPS URL in Paystack. The endpoint must be publicly reachable over HTTPS.</p>
        </div>
        <a href="https://dashboard.paystack.com/" target="_blank" rel="noreferrer noopener" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950">Open Paystack Dashboard <ExternalLink className="h-4 w-4" /></a>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">2. Manual verification checklist</h2><p className="mt-2 text-sm text-slate-400">Mark each item only after completing it outside this checklist. Progress is a local working note, not a server-side audit record.</p></div><p className="text-sm font-bold text-cyan-200">{completed}/{tasks.length} complete</p></div>
        <div className="mt-5 space-y-3">
          {tasks.map(task => <label key={task.id} className="flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-white/[.02] p-4">
            <input type="checkbox" checked={Boolean(checked[task.id])} onChange={event => setChecked(previous => ({ ...previous, [task.id]: event.target.checked }))} className="mt-1 h-4 w-4 accent-emerald-400" />
            <span className="min-w-0"><span className="block font-bold">{task.title}</span><span className="mt-1 block text-sm leading-6 text-slate-400">{task.detail}</span></span>
          </label>)}
        </div>
      </section>

      <section className="rounded-3xl border border-amber-300/20 bg-amber-300/[.04] p-5">
        <h2 className="text-lg font-black text-amber-200">Release boundary</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">Wallet deposits only. Withdrawals remain on the existing method. Do not enable live collection until test-mode staff and Client payments, verified wallet credit, Administration records, and duplicate-webhook protection have all passed. This workshop does not itself change production environment secrets or enable live payments.</p>
        <div className="mt-4 flex flex-wrap gap-3"><Link href="/admin/control-center#deposits" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold">Open deposit records</Link><Link href="/admin/dashboard" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold">Administration dashboard</Link></div>
      </section>
    </main>
  )
}
