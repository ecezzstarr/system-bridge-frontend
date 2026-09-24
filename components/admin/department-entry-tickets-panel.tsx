'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, Copy, Loader2, RefreshCw, Ticket, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type EntryTicket = {
  id: string
  ticket_number: string
  department: 'AGENT' | 'BRIDGER'
  status: string
  price_flame_coin: number | string
  amount_ngn: number | string
  payer_name?: string | null
  payer_email?: string | null
  payer_phone?: string | null
  payment_reference?: string | null
  payment_submitted_at?: string | null
  departmental_code?: string | null
  verified_by_name?: string | null
  created_at: string
}

export function DepartmentEntryTicketsPanel() {
  const [tickets, setTickets] = useState<EntryTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState<string | null>(null)

  const authHeaders = () => {
    const token = localStorage.getItem('ssb_auth_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/admin/department-entry/tickets', { headers: authHeaders() })
      const data = await res.json()
      if (res.ok && data.success) setTickets(data.tickets || [])
    } catch (error) {
      console.error('Failed to load Department Entry Tickets:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const timer = window.setInterval(() => load(true), 8000)
    return () => window.clearInterval(timer)
  }, [])

  const verify = async (ticketId: string, action: 'approve' | 'reject') => {
    setWorkingId(ticketId)
    try {
      const res = await fetch('/api/admin/department-entry/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ticketId, action }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Unable to verify ticket')
      toast.success(action === 'approve' ? 'Payment verified and code released' : 'Ticket rejected')
      await load(true)
    } catch (error: any) {
      toast.error(error?.message || 'Unable to verify ticket')
    } finally {
      setWorkingId(null)
    }
  }

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value)
    toast.success('Copied')
  }

  const pending = tickets.filter(t => t.status === 'PAYMENT_PENDING')
  const others = tickets.filter(t => t.status !== 'PAYMENT_PENDING')

  const renderTicket = (ticket: EntryTicket) => (
    <div key={ticket.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
              ticket.department === 'AGENT'
                ? 'bg-blue-500/10 text-blue-300'
                : 'bg-green-500/10 text-green-300'
            }`}>
              {ticket.department}
            </span>
            <code className="text-xs font-bold text-white">{ticket.ticket_number}</code>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{ticket.status.replaceAll('_', ' ')}</span>
          </div>

          <p className="mt-3 text-sm font-bold text-white">
            {Number(ticket.price_flame_coin).toLocaleString()} Flame Coin · ₦{Number(ticket.amount_ngn).toLocaleString()}
          </p>

          <div className="mt-2 space-y-1 text-xs text-slate-400">
            <p>{ticket.payer_name || 'Visitor has not submitted payment details yet.'}</p>
            {(ticket.payer_phone || ticket.payer_email) && <p>{ticket.payer_phone || ticket.payer_email}</p>}
            {ticket.payment_reference && (
              <div className="flex items-center gap-2">
                <span>OPay ref: <span className="font-mono text-slate-200">{ticket.payment_reference}</span></span>
                <button onClick={() => copy(ticket.payment_reference!)} className="text-slate-500 hover:text-white">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            )}
            {ticket.departmental_code && (
              <div className="flex items-center gap-2">
                <span>Code: <span className="font-mono font-bold text-green-300">{ticket.departmental_code}</span></span>
                <button onClick={() => copy(ticket.departmental_code!)} className="text-slate-500 hover:text-white">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {ticket.status === 'PAYMENT_PENDING' && (
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              onClick={() => verify(ticket.id, 'approve')}
              disabled={workingId === ticket.id}
              className="bg-green-600 text-xs font-black uppercase hover:bg-green-500"
            >
              {workingId === ticket.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="mr-1 h-4 w-4" /> Verify</>}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => verify(ticket.id, 'reject')}
              disabled={workingId === ticket.id}
              className="border-red-500/30 text-xs font-black uppercase text-red-300 hover:bg-red-500/10"
            >
              <XCircle className="mr-1 h-4 w-4" /> Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.03] p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-amber-300" />
            <h2 className="text-sm font-black uppercase tracking-widest">Department Entry Tickets</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Agent and Bridger visitors pay for a 3 Flame Coin ticket. Verify OPay payment here to release the one-use departmental code.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => load()} disabled={loading} className="text-slate-400">
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Sync
        </Button>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-purple-300" />
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-300">
            Awaiting Verification · {pending.length}
          </p>
        </div>
        <div className="space-y-2">
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-500" /></div>
          ) : pending.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-center text-xs text-slate-600">No ticket payments awaiting verification.</p>
          ) : pending.map(renderTicket)}
        </div>
      </div>

      {others.length > 0 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-slate-500">
            Ticket History · {others.length}
          </summary>
          <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
            {others.map(renderTicket)}
          </div>
        </details>
      )}
    </section>
  )
}
