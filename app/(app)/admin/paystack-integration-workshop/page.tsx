'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'

const tasks = [
  { id: 'staff', title: 'Test an Administration, Agent or Bridger deposit', detail: 'Use test mode and confirm the amount, reference, pending record and final Flame Coin wallet credit.' },
  { id: 'client', title: 'Test a Client deposit', detail: 'Confirm the Client wallet and Administration deposit record match the verified payment.' },
  { id: 'webhook', title: 'Register the Paystack webhook', detail: 'Register the full URL ending in /api/deposit/paystack/webhook in the Paystack dashboard.' },
  { id: 'replay', title: 'Verify duplicate-event safety', detail: 'Replay a test webhook/reference and confirm the wallet is not credited twice.' },
]

export default function PaystackIntegrationWorkshopPage() {
  const { user, token, isInitialized } = useAuth()
  const [secretKey, setSecretKey] = useState('')
  const [publicOrigin, setPublicOrigin] = useState('')
  const [mode, setMode] = useState<'test'|'live'>('test')
  const [status, setStatus] = useState('Loading integration status…')
  const [verifiedAt, setVerifiedAt] = useState('')
  const [configured, setConfigured] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  async function loadStatus() {
    if (!token) return
    const response = await fetch('/api/admin/paystack-integration/status', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Could not read Paystack status.')
    setConfigured(Boolean(data.configured))
    setPublicOrigin(data.publicOrigin || '')
    setMode(data.mode === 'live' ? 'live' : 'test')
    setVerifiedAt(data.verifiedAt || '')
    setStatus(data.configured ? 'Server configuration is available. Complete the test-mode checks before live collection.' : 'Paystack is not configured. Enter the credentials and canonical HTTPS origin below.')
  }

  useEffect(() => {
    if (!isInitialized || !token || user?.role !== 'admin') return
    let active = true
    fetch('/api/admin/paystack-integration/status', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not read Paystack status.'); if (active) { setConfigured(Boolean(data.configured)); setPublicOrigin(data.publicOrigin || ''); setMode(data.mode === 'live' ? 'live' : 'test'); setVerifiedAt(data.verifiedAt || ''); setStatus(data.configured ? 'Server configuration is available. Complete the test-mode checks before live collection.' : 'Paystack is not configured. Enter the credentials and canonical HTTPS origin below.') } })
      .catch(error => { if (active) setStatus(error instanceof Error ? error.message : 'Status unavailable.') })
    return () => { active = false }
  }, [isInitialized, token, user?.role])

  async function saveConfiguration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/admin/paystack-integration/config', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey, publicOrigin, mode }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Paystack setup failed.')
      setSecretKey('')
      setConfigured(true)
      setVerifiedAt(data.verifiedAt || '')
      setStatus('Paystack credentials verified with Paystack and stored encrypted.')
      setMessage(data.message || 'Configuration saved and verified.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Paystack setup failed.') }
    finally { setBusy(false) }
  }

  if (!isInitialized) return <main className="p-6 text-slate-300">Opening Paystack Integration Workshop…</main>
  if (user?.role !== 'admin') return <main className="p-6 text-red-300">Administration access required.</main>
  const completed = tasks.filter(task => checked[task.id]).length

  return <main className="mx-auto max-w-5xl space-y-7 p-5 text-white md:p-8">
    <header className="space-y-3">
      <Link href="/authority/workshops" className="text-sm text-cyan-300 underline">Return to Authority Workshops</Link>
      <p className="text-sm font-black uppercase tracking-[.18em] text-emerald-300">Administration · Payment Systems</p>
      <h1 className="text-3xl font-black md:text-5xl">Paystack Integration Workshop</h1>
      <p className="max-w-3xl text-base leading-7 text-slate-300">Connect Weave to Paystack from this protected workspace. Credentials are validated directly with Paystack and stored encrypted on the server; secret keys are never returned to the browser.</p>
    </header>

    <section className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[.04] p-5">
      <h2 className="text-xl font-black">Integration status</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">{status}</p>
      <p className="mt-2 text-sm text-slate-400">Mode: {mode.toUpperCase()} · {verifiedAt ? 'Last credential validation: ' + new Date(verifiedAt).toLocaleString() : 'Credential validation not recorded'}</p>
      <p className="mt-3 text-xs leading-5 text-slate-500">A successful credential check does not replace end-to-end test deposits, webhook verification, or duplicate-settlement checks.</p>
    </section>

    <form onSubmit={saveConfiguration} className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-5">
      <div><h2 className="text-xl font-black">1. Configure connection</h2><p className="mt-2 text-sm leading-6 text-slate-300">Use a Paystack test secret first. The secret is submitted only to the authenticated server endpoint and encrypted before database storage.</p></div>
      <label className="block space-y-2"><span className="text-sm font-bold">Paystack secret key</span><input required autoComplete="new-password" type="password" value={secretKey} onChange={event => setSecretKey(event.target.value)} placeholder={configured ? 'Enter a new key to replace the stored key' : 'sk_test_…'} className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-cyan-300" /></label>
      <label className="block space-y-2"><span className="text-sm font-bold">Canonical public HTTPS origin</span><input required type="url" value={publicOrigin} onChange={event => setPublicOrigin(event.target.value)} placeholder="https://weave.example.com" className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-cyan-300" /><span className="block text-xs text-slate-500">Enter the deployed origin only; no query string or fragment.</span></label>
      <fieldset className="space-y-2"><legend className="text-sm font-bold">Connection mode</legend><div className="flex gap-5 text-sm"><label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === 'test'} onChange={() => setMode('test')} /> Test mode</label><label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === 'live'} onChange={() => setMode('live')} /> Live mode</label></div><p className="text-xs leading-5 text-amber-200">Live mode requires a live secret key. Do not switch to live collection until all test deposits and settlement checks have passed.</p></fieldset>
      <button disabled={busy} type="submit" className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy ? 'Validating and saving…' : 'Validate connection and save'}</button>
      {message && <p role="status" className="rounded-xl border border-white/10 p-3 text-sm leading-6">{message}</p>}
    </form>

    <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <h2 className="text-xl font-black">2. Register webhook</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">In the Paystack dashboard, register this full URL:</p>
      <code className="mt-3 block break-all rounded-xl bg-slate-950 p-3 text-sm text-emerald-200">{publicOrigin.replace(/\/$/, '')}/api/deposit/paystack/webhook</code>
      <a href="https://dashboard.paystack.com/" target="_blank" rel="noreferrer noopener" className="mt-4 inline-flex rounded-xl border border-white/15 px-4 py-3 text-sm font-bold">Open Paystack Dashboard ↗</a>
    </section>

    <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">3. Test before release</h2><p className="mt-2 text-sm text-slate-400">Checklist progress is a local working note, not a server-side audit record.</p></div><p className="text-sm font-bold text-cyan-200">{completed}/{tasks.length} complete</p></div>
      <div className="mt-5 space-y-3">{tasks.map(task => <label key={task.id} className="flex cursor-pointer gap-3 rounded-2xl border border-white/10 p-4"><input type="checkbox" checked={Boolean(checked[task.id])} onChange={event => setChecked(previous => ({ ...previous, [task.id]: event.target.checked }))} className="mt-1 h-4 w-4 accent-emerald-400" /><span><span className="block font-bold">{task.title}</span><span className="mt-1 block text-sm leading-6 text-slate-400">{task.detail}</span></span></label>)}</div>
    </section>

    <section className="rounded-3xl border border-amber-300/20 bg-amber-300/[.04] p-5"><h2 className="text-lg font-black text-amber-200">Release boundary</h2><p className="mt-2 text-sm leading-6 text-slate-300">This integration is for Flame Coin wallet deposits only. Withdrawals remain on the existing method. Saving credentials does not enable automatic live release; complete test-mode staff and Client deposits, verify wallet/ledger records, and confirm duplicate webhooks cannot credit twice.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/admin/control-center#deposits" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold">Open deposit records</Link><Link href="/admin/dashboard" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold">Administration dashboard</Link></div></section>
  </main>
}
