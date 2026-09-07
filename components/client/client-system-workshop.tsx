'use client'

import { useEffect, useState } from 'react'
import { Activity, ArrowDownToLine, ArrowUpFromLine, Bot, BriefcaseBusiness, CircleUserRound, Cpu, FileText, LineChart, RefreshCw, ShieldCheck, Users, WalletCards } from 'lucide-react'

interface WorkshopProps { fileNumber: string; clientName: string }

export default function ClientSystemWorkshop({ fileNumber, clientName }: WorkshopProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reporting, setReporting] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const token = document.cookie.split('; ').find(v => v.startsWith('client_token='))?.split('=')[1]
      const response = await fetch('/api/client/system-switch/workshop', { headers: { Authorization: `Bearer ${decodeURIComponent(token || '')}` } })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to load workshop')
      setData(body)
    } catch (error: any) { setMessage(error.message || 'Unable to load workshop') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const createReport = async () => {
    setReporting(true); setMessage('')
    try {
      const token = document.cookie.split('; ').find(v => v.startsWith('client_token='))?.split('=')[1]
      const response = await fetch('/api/bridge-ai/report', { method:'POST', headers:{ Authorization:`Bearer ${decodeURIComponent(token || '')}` } })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Bridge AI could not prepare the report')
      setMessage('Bridge AI report sent to Administration.')
      await load()
    } catch (error: any) { setMessage(error.message || 'Report failed') }
    finally { setReporting(false) }
  }

  if (loading) return <div className="rounded-[2rem] border border-white/10 bg-slate-950 p-10 text-slate-400">Opening the workshop for {clientName}…</div>
  if (!data) return <div className="rounded-[2rem] border border-red-500/20 bg-slate-950 p-10 text-red-300">{message || 'Workshop unavailable.'}</div>

  const crypto = data.crypto_workspace
  const report = data.bridge_ai?.last_report

  return <section className="space-y-5">
    <div className="rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 md:p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3"><Cpu className="h-5 w-5 text-cyan-300" /><span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">System Switch · Productive Workshop</span></div>
          <h2 className="mt-3 text-2xl md:text-3xl font-semibold text-white">{data.workshop?.title || `${clientName} · System Switch`}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{data.workshop?.description}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3"><p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">File Number</p><p className="mt-1 font-mono text-xs text-white">{fileNumber}</p></div>
      </div>
    </div>

    {crypto && <div className="rounded-[2rem] border border-cyan-400/20 bg-gradient-to-br from-cyan-950/30 to-slate-950 p-6 md:p-8">
      <div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.25em] text-cyan-300">Workshop forming</p><h3 className="mt-2 text-xl font-semibold text-white">Crypto Market System</h3></div><LineChart className="h-6 w-6 text-cyan-300" /></div>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
        {[['Market',LineChart],['Buy',ArrowDownToLine],['Sell',ArrowUpFromLine],['Holdings',WalletCards],['Orders',FileText],['Activity',Activity]].map(([label,Icon]:any)=><button key={label} className="rounded-2xl border border-white/10 bg-black/20 p-5 text-left hover:border-cyan-400/30 transition"><Icon className="h-5 w-5 text-cyan-300"/><p className="mt-4 text-sm font-semibold text-white">{label}</p><p className="mt-1 text-[10px] text-slate-500">Open workshop function</p></button>)}
      </div>
      <p className="mt-5 text-[11px] leading-5 text-slate-500">{crypto.execution}</p>
    </div>}

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="rounded-3xl border border-white/10 bg-slate-950 p-5"><div className="flex items-center gap-3"><CircleUserRound className="h-5 w-5 text-slate-300"/><span className="text-sm font-semibold text-white">Bridge</span></div><p className="mt-3 text-xs text-slate-400">{data.bridge ? `${data.bridge.name} is connected as the Client's Bridger.` : 'No Bridger is currently attached.'}</p></div>
      <div className="rounded-3xl border border-white/10 bg-slate-950 p-5"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-slate-300"/><span className="text-sm font-semibold text-white">Approved Agents</span></div><p className="mt-3 text-xs text-slate-400">{data.approved_agents?.length ? data.approved_agents.map((a:any)=>a.name).join(', ') : 'Waiting for Administration to approve support.'}</p></div>
      <div className="rounded-3xl border border-purple-400/20 bg-purple-950/10 p-5"><div className="flex items-center gap-3"><Bot className="h-5 w-5 text-purple-300"/><span className="text-sm font-semibold text-white">Bridge AI</span></div><p className="mt-3 text-xs text-slate-400">Bridge AI reads the interaction record and reports operational insight to Administration.</p><button onClick={createReport} disabled={reporting} className="mt-4 inline-flex items-center gap-2 rounded-full border border-purple-400/20 px-3 py-2 text-[10px] uppercase tracking-widest text-purple-200 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${reporting ? 'animate-spin' : ''}`}/>{reporting ? 'Reporting…' : 'Report to Admin'}</button></div>
    </div>

    {report && <div className="rounded-3xl border border-emerald-400/20 bg-emerald-950/10 p-6"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300"/><p className="text-[10px] uppercase tracking-widest text-emerald-300">Latest Bridge AI report recorded</p></div><p className="mt-3 text-sm leading-6 text-slate-300">{report.summary}</p></div>}
    {message && <p className="text-xs text-slate-400">{message}</p>}
  </section>
}
