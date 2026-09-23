'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { Box, CheckCircle2, Clock3, CreditCard, PackageCheck, Truck, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AGILITY_BOX_PRICE_NGN,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_UNIT_PRICE_NGN,
  AGILITY_VARIANTS,
} from '@/lib/agility-catalog'

type OrderRow = {
  id: string
  agent_id: string
  agent_name?: string | null
  agent_username?: string | null
  agent_email?: string | null
  departmental_code?: string | null
  variant_id: string
  box_count: number
  packages_per_box: number
  package_count: number
  unit_price_ngn: number | string
  box_price_ngn: number | string
  total_ngn: number | string
  payment_reference: string
  flutterwave_transaction_id?: string | null
  payment_status: string
  fulfillment_status: string
  agent_note?: string | null
  admin_note?: string | null
  sold_packages: number
  paid_at?: string | null
  heated_at?: string | null
  packed_at?: string | null
  boxed_at?: string | null
  dispatched_at?: string | null
  delivered_at?: string | null
  received_at?: string | null
  created_at: string
}

const nextStage: Record<string, { status: string; label: string }> = {
  paid: { status: 'heating', label: 'Start heating' },
  heating: { status: 'packed', label: 'Confirm packages sealed' },
  packed: { status: 'boxed', label: 'Confirm company box ready' },
  boxed: { status: 'dispatched', label: 'Dispatch to Agent' },
  dispatched: { status: 'delivered', label: 'Mark delivered' },
}

const naira = (value: number | string) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value))

export default function AdminAgilityPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<OrderRow[]>([])
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
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load Agility company orders')
      setOrders(data.orders || [])
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load Agility company orders')
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
    const paid = orders.filter((order) => order.payment_status === 'paid')
    return {
      paidOrders: paid.length,
      paidValue: paid.reduce((sum, order) => sum + Number(order.total_ngn), 0),
      preparing: paid.filter((order) => ['heating', 'packed', 'boxed'].includes(order.fulfillment_status)).length,
      dispatched: paid.filter((order) => order.fulfillment_status === 'dispatched').length,
      delivered: paid.filter((order) => ['delivered', 'received'].includes(order.fulfillment_status)).length,
    }
  }, [orders])

  const move = async (order: OrderRow) => {
    if (!token) return
    const movement = nextStage[order.fulfillment_status]
    if (!movement) return

    setSavingId(order.id)
    setMessage('')
    try {
      const response = await fetch('/api/admin/agility/stock', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          status: movement.status,
          adminNote: order.admin_note || '',
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to move Agility order')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to move Agility order')
    } finally {
      setSavingId(null)
    }
  }

  if (!user || user.role !== 'admin') return null

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-300">Administration · Agility</p>
        <h1 className="mt-2 text-3xl font-black text-white">Morning Food Company Fulfillment</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Payment is the gate. Only verified paid orders move through heating, package sealing, company boxing,
          dispatch and delivery. Agents confirm receipt before retail inventory opens.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <CreditCard className="h-5 w-5 text-emerald-300" />
          <p className="mt-3 text-xs text-slate-500">Paid orders</p>
          <p className="mt-1 text-2xl font-black text-white">{summary.paidOrders}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <Clock3 className="h-5 w-5 text-orange-300" />
          <p className="mt-3 text-xs text-slate-500">Paid value</p>
          <p className="mt-1 text-xl font-black text-white">{naira(summary.paidValue)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <UtensilsCrossed className="h-5 w-5 text-orange-300" />
          <p className="mt-3 text-xs text-slate-500">Preparing / boxed</p>
          <p className="mt-1 text-2xl font-black text-white">{summary.preparing}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <Truck className="h-5 w-5 text-violet-300" />
          <p className="mt-3 text-xs text-slate-500">Dispatched</p>
          <p className="mt-1 text-2xl font-black text-white">{summary.dispatched}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-300" />
          <p className="mt-3 text-xs text-slate-500">Delivered / received</p>
          <p className="mt-1 text-2xl font-black text-white">{summary.delivered}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-orange-300/20 bg-orange-300/5 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Fixed company standard</p>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <p className="text-slate-300"><strong className="text-white">1 Agility:</strong> {naira(AGILITY_UNIT_PRICE_NGN)}</p>
          <p className="text-slate-300"><strong className="text-white">1 box:</strong> {AGILITY_PACKAGES_PER_BOX} packages</p>
          <p className="text-slate-300"><strong className="text-white">1 box price:</strong> {naira(AGILITY_BOX_PRICE_NGN)}</p>
        </div>
      </section>

      {message && (
        <div className="rounded-xl border border-orange-300/20 bg-orange-300/5 p-3 text-sm text-orange-100">
          {message}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-slate-500">Loading company movement…</p>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <PackageCheck className="mx-auto h-9 w-9 text-slate-600" />
            <p className="mt-3 text-sm text-slate-500">No Agility orders yet.</p>
          </div>
        ) : (
          orders.map((order) => {
            const variant = AGILITY_VARIANTS.find((item) => item.id === order.variant_id)
            const movement = nextStage[order.fulfillment_status]
            const paid = order.payment_status === 'paid'
            return (
              <article key={order.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-white">{variant?.name || order.variant_id}</h2>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${paid ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/30 bg-amber-400/10 text-amber-200'}`}>
                        {order.payment_status}
                      </span>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">
                        {order.fulfillment_status}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-300">
                      {order.agent_name || order.agent_username || 'Agent'} · {order.box_count} box{Number(order.box_count) === 1 ? '' : 'es'} · {order.package_count} packages
                    </p>
                    <p className="mt-1 text-lg font-black text-orange-200">{naira(order.total_ngn)}</p>
                    <p className="mt-1 text-[11px] text-slate-600">
                      {order.departmental_code || 'No department code'} {order.agent_email ? '· ' + order.agent_email : ''}
                    </p>

                    <div className="mt-4 grid gap-2 text-[11px] sm:grid-cols-2">
                      <p className="rounded-xl bg-black/20 px-3 py-2 text-slate-500">
                        Payment ref: <span className="font-mono text-slate-300">{order.payment_reference}</span>
                      </p>
                      <p className="rounded-xl bg-black/20 px-3 py-2 text-slate-500">
                        Flutterwave: <span className="font-mono text-slate-300">{order.flutterwave_transaction_id || 'Not verified'}</span>
                      </p>
                    </div>

                    {order.agent_note && (
                      <p className="mt-3 text-xs leading-5 text-slate-500">Agent note: {order.agent_note}</p>
                    )}

                    <textarea
                      className="mt-4 min-h-20 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-orange-300/40"
                      value={order.admin_note || ''}
                      placeholder="Administration handling / dispatch note"
                      onChange={(event) => setOrders((current) =>
                        current.map((item) => item.id === order.id ? { ...item, admin_note: event.target.value } : item)
                      )}
                    />

                    {order.fulfillment_status === 'received' && (
                      <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs text-emerald-100">
                        Agent confirmed receipt. {Number(order.sold_packages || 0)} of {order.package_count} packages have been recorded as sold.
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Company control</p>
                    {!paid ? (
                      <>
                        <CreditCard className="mt-4 h-7 w-7 text-amber-300" />
                        <p className="mt-3 text-sm font-bold text-white">Payment gate closed</p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          This order cannot enter food preparation until the payment callback verifies the exact NGN amount and reference.
                        </p>
                      </>
                    ) : movement ? (
                      <>
                        <Box className="mt-4 h-7 w-7 text-orange-300" />
                        <p className="mt-3 text-sm font-bold text-white">Next: {movement.status}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Stages are sequential and cannot be skipped.
                        </p>
                        <Button
                          className="mt-4 w-full"
                          disabled={savingId === order.id}
                          onClick={() => move(order)}
                        >
                          {savingId === order.id ? 'Moving…' : movement.label}
                        </Button>
                      </>
                    ) : order.fulfillment_status === 'delivered' ? (
                      <>
                        <Truck className="mt-4 h-7 w-7 text-violet-300" />
                        <p className="mt-3 text-sm font-bold text-white">Waiting for Agent receipt</p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Administration has delivered the stock. The Agent must confirm receipt in their Agility Store.
                        </p>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mt-4 h-7 w-7 text-emerald-300" />
                        <p className="mt-3 text-sm font-bold text-white">Company handoff complete</p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Stock is now under the Agent Store inventory and consumer-sale record.
                        </p>
                      </>
                    )}
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
