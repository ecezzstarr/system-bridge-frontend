'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Mail,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react'
import { getAuthHeaders } from '@/lib/auth-client'

type Outreach={
  id:string
  contact_name:string|null
  phone:string|null
  email:string|null
  bridger_name:string
  sender_role:string
  sender_email:string|null
  channel:'whatsapp'|'email'
  message_sent:string
  provider_message_id:string|null
  delivery_error:string|null
  status:string
  sent_at:string|null
  last_activity_at:string
  created_at:string
}

const STATUS:Record<string,{label:string;tone:string;stage:number}>={
  pending:{label:'Awaiting send',tone:'text-slate-300 border-white/10 bg-white/[0.025]',stage:0},
  sent:{label:'Message sent',tone:'text-sky-300 border-sky-300/15 bg-sky-400/[0.04]',stage:1},
  opened:{label:'Bridge opened',tone:'text-amber-300 border-amber-300/15 bg-amber-400/[0.04]',stage:2},
  responded:{label:'Response recorded',tone:'text-cyan-300 border-cyan-300/15 bg-cyan-400/[0.04]',stage:3},
  converted:{label:'Converted to Client',tone:'text-emerald-300 border-emerald-300/15 bg-emerald-400/[0.04]',stage:4},
  invalid_number:{label:'WhatsApp unavailable',tone:'text-rose-300 border-rose-300/15 bg-rose-400/[0.04]',stage:-1},
  unsubscribed:{label:'Outreach ended',tone:'text-slate-400 border-white/10 bg-white/[0.02]',stage:-1},
}

export default function OutreachMovementRegistryPage(){
  const [rows,setRows]=useState<Outreach[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  const load=async()=>{
    setLoading(true);setError('')
    try{
      const response=await fetch('/api/admin/market/prospects/outreach/pending',{headers:getAuthHeaders(),cache:'no-store'})
      const data=await response.json()
      if(!response.ok||!data.success)throw new Error(data.error||'Unable to read outreach movement')
      setRows(data.pending||[])
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to read outreach movement')
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{void load()},[])

  const stats=useMemo(()=>({
    total:rows.length,
    email:rows.filter(row=>row.channel==='email').length,
    whatsapp:rows.filter(row=>row.channel!=='email').length,
    sent:rows.filter(row=>['sent','opened','responded','converted'].includes(row.status)).length,
    clients:rows.filter(row=>row.status==='converted').length,
    failed:rows.filter(row=>Boolean(row.delivery_error)||row.status==='invalid_number').length,
  }),[rows])

  return <main className="mx-auto w-full max-w-7xl p-3 md:p-6">
    <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-emerald-300/15 bg-[#030a15]/72">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(16,185,129,.13),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(14,165,233,.07),transparent_28%)] p-5 md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">Administration · Outreach Movement Registry</p>
            <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">One registry for every Prospect message.</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">WhatsApp and email movement share one causality chain from Prospect assignment through sender identity, send report, Bridge Radiance and Client conversion. Prospects remain in Bridge Radiance until recorded Client conversion.</p>
          </div>
          <button onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/>Refresh</button>
        </div>
      </header>

      <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_300px]">
        <section className="weave-reading-surface rounded-3xl p-4 md:p-5">
          <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
            <Metric label="Tracked" value={stats.total} tone="sky"/>
            <Metric label="Email" value={stats.email} tone="sky"/>
            <Metric label="WhatsApp" value={stats.whatsapp} tone="amber"/>
            <Metric label="Sent" value={stats.sent} tone="sky"/>
            <Metric label="Clients" value={stats.clients} tone="emerald"/>
            <Metric label="Needs attention" value={stats.failed} tone="rose"/>
          </div>

          {error&&<div className="mt-4 rounded-xl border border-rose-300/15 bg-rose-400/[0.05] p-3 text-sm text-rose-100">{error}</div>}

          <div className="mt-5 border-b border-white/10 pb-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Recorded Prospect movement</p>
            <p className="mt-1 text-xs text-slate-400">Sender, channel, delivery state and conversion remain in one record.</p>
          </div>

          {loading?(
            <div className="py-16 text-center text-slate-400">Reading outreach movement…</div>
          ):rows.length===0?(
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-8 text-center"><Users className="mx-auto h-8 w-8 text-slate-500"/><p className="mt-3 text-sm font-black text-white">No outreach movement is recorded.</p></div>
          ):(
            <div className="mt-4 space-y-2">
              {rows.map(row=>{
                const meta=STATUS[row.status]||STATUS.pending
                const contact=row.channel==='email'?row.email:row.phone
                return <article key={row.id} className={`rounded-2xl border p-4 ${meta.tone}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-white">{row.contact_name||'Prospect'}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase ${row.channel==='email'?'border-sky-300/20 text-sky-300':'border-amber-300/20 text-amber-300'}`}>{row.channel||'whatsapp'}</span>
                      </div>
                      <p className="mt-1 break-all text-[10px] text-slate-400">{contact||'No contact value'} · Sender {row.bridger_name}</p>
                      {row.channel==='email'&&row.sender_email&&<p className="mt-1 break-all text-[9px] text-slate-500">Mailbox {row.sender_email}</p>}
                      <p className="mt-3 text-[9px] font-black uppercase tracking-[0.1em]">{meta.label}</p>
                      {row.delivery_error&&<p className="mt-2 text-[10px] leading-5 text-rose-200">Delivery: {row.delivery_error}</p>}
                      {row.message_sent&&<p className="mt-2 line-clamp-2 text-[10px] leading-5 text-slate-300">{row.message_sent}</p>}
                      {row.provider_message_id&&<p className="mt-2 break-all font-mono text-[8px] text-slate-600">Message {row.provider_message_id}</p>}
                    </div>
                    <div className="sm:text-right">
                      <p className="text-[9px] text-slate-500">{new Date(row.last_activity_at||row.created_at).toLocaleString()}</p>
                      <div className="mt-2 flex items-center gap-1 sm:justify-end">{[0,1,2,3,4].map(stage=><span key={stage} className={`h-1.5 w-7 rounded-full ${meta.stage>=stage?'bg-current':'bg-white/10'}`}/>)}</div>
                    </div>
                  </div>
                </article>
              })}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-sky-300/15 bg-sky-400/[0.04] p-4">
            <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-sky-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Prospect causality</p></div>
            <div className="mt-3 space-y-2 text-xs font-semibold text-slate-300"><p>Prospect → assignment.</p><p>Assignment → sender.</p><p>Sender → message.</p><p>Message → Bridge movement.</p><p>Movement → Client conversion.</p></div>
          </section>

          <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Google sender proof</p></div>
            <p className="mt-3 text-xs leading-5 text-slate-300">Email rows report the authenticated mailbox used for delivery. Mailbox credentials are encrypted and never returned to this screen.</p>
          </section>

          <section className="rounded-3xl border border-violet-300/15 bg-violet-400/[0.04] p-4">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-violet-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Email movement</p></div>
            <p className="mt-3 text-xs leading-5 text-slate-300">Administration automated sends and Bridger sends land in the same registry. Delivery errors remain visible instead of being reported as successful movement.</p>
          </section>

          <section className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.04] p-4">
            <div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-amber-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Conversion meaning</p></div>
            <p className="mt-3 text-xs leading-5 text-slate-300">Converted means the Prospect became a Client in recorded WEAVE state. It does not claim a business outcome.</p>
          </section>
        </aside>
      </div>
    </section>
  </main>
}

function Metric({label,value,tone}:{label:string;value:number;tone:'sky'|'amber'|'emerald'|'rose'}){
  const color=tone==='emerald'?'text-emerald-300 border-emerald-300/15 bg-emerald-400/[0.04]':tone==='amber'?'text-amber-300 border-amber-300/15 bg-amber-400/[0.04]':tone==='rose'?'text-rose-300 border-rose-300/15 bg-rose-400/[0.04]':'text-sky-300 border-sky-300/15 bg-sky-400/[0.04]'
  return <div className={`rounded-xl border px-3 py-3 ${color}`}><p className="text-[8px] font-black uppercase tracking-wider">{label}</p><p className="mt-1 text-xl font-black text-white">{value}</p></div>
}
