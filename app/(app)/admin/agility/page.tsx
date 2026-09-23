'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { Box, CheckCircle2, Clock3, PackageCheck, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AGILITY_VARIANTS } from '@/lib/agility-catalog'

type RequestRow = {
  id: string
  agent_id: string
  agent_name?: string | null
  agent_username?: string | null
  agent_email?: string | null
  departmental_code?: string | null
  variant_id: string
  quantity: number
  unit_price_ngn: number | string
  total_ngn: number | string
  status: string
  agent_note?: string | null
  admin_note?: string | null
  created_at: string
}

const statuses = ['requested', 'approved', 'preparing', 'dispatched', 'delivered', 'cancelled'] as const

const naira = (value: number | string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

export default function AdminAgilityPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const load = async () => {
    if (!token) return
    setLoading(true)
    try {
      const response = await fetch('/api/admin/agility/stock', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load fulfillment')
      setRows(data.requests || [])
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load fulfillment')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/dashboard')
      return
    }
    if (user?.role === 'admin' && token) load()
  }, [user?.role, token])

  const summary = useMemo(() => {
    return {
      requested: rows.filter((row) => row.status === 'requested').length,
      preparing: rows.filter((row) => ['approved', 'preparing'].includes(row.status)).length,
      dispatched: rows.filter((row) => row.status === 'dispatched').length,
      delivered: rows.filter((row) => row.status === 'delivered').length,
    }
  }, [rows])

  const update = async (row: RequestRow, status: string) => {
    if (!token) return
    setSavingId(row.id)
    setMessage('')
    try {
      const response = await fetch('/api/admin/agility/stock', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: row.id,
          status,
          adminNote: row.admin_note || '',
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to update request')
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, status } : item))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update request')
    } finally {
      setSavingId(null)
    }
  }

  if (!user || user.role !== 'admin') return null

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-300">Administration · Agility</p>
        <h1 className="mt-2 text-3xl font-black text-white">Morning Food Fulfillment</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Move Agent stock requests from request to preparation, dispatch and delivery.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Requested', summary.requested, Clock3],
          ['Preparing', summary.preparing, Box],
          ['Dispatched', summary.dispatched, Truck],
          ['Delivered', summary.delivered, CheckCircle2],
        ].map(([label, value, Icon]: any) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Icon className="h-5 w-5 text-orange-300" />
            <p className="mt-3 text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      {message && <div className="rounded-xl border border-orange-300/20 bg-orange-300/5 p-3 text-sm text-orange-100">{message}</div>}

      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-slate-500">Loading Agility movement…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <PackageCheck className="mx-auto h-9 w-9 text-slate-600" />
            <p className="mt-3 text-sm text-slate-500">No Agent stock requests yet.</p>
          </div>
        ) : (
          rows.map((row) => {
            const variant = AGILITY_VARIANTS.find((item) => item.id === row.variant_id)
            return (
              <article key={row.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-white">{variant?.name || row.variant_id}</h2>
                      <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-orange-200">
                        {row.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {row.agent_name || row.agent_username || 'Agent'} · {row.quantity} boxes · {naira(row.total_ngn)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {row.departmental_code || 'No department code'} {row.agent_email ? '· ' + row.agent_email : ''}
                    </p>
                    {row.agent_note && <p className="mt-3 text-xs leading-5 text-slate-500">Agent note: {row.agent_note}</p>}
                    <textarea
                      className="mt-4 min-h-20 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-orange-300/40"
                      value={row.admin_note || ''}
                      placeholder="Administration fulfillment note"
                      onChange={(event) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, admin_note: event.target.value } : item))}
                    />
                  </div>

                  <div className="flex min-w-44 flex-col gap-2">
                    {statuses.map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={row.status === status ? 'default' : 'outline'}
                        disabled={savingId === row.id}
                        onClick={() => update(row, status)}
                        className="justify-start capitalize"
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
