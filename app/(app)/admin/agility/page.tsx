'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import {
  Box,
  CheckCircle2,
  Clock3,
  CreditCard,
  PackageCheck,
  Store,
  Truck,
  UtensilsCrossed,
  WalletCards,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AGILITY_AGENT_BOX_PRICE_NGN,
  AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN,
  AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN,
  AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN,
  AGILITY_OPAY_ACCOUNT_NUMBER,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_RETAIL_BOX_VALUE_NGN,
  AGILITY_RETAIL_UNIT_PRICE_NGN,
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
  distribution_mode: 'wholesaler' | 'retailer'
  box_count: number
  packages_per_box: number
  package_count: number
  retail_unit_price_ngn: number | string
  retail_box_value_ngn: number | string
  agent_box_price_ngn: number | string
  agent_unit_cost_ngn: number | string
  total_ngn: number | string
  agent_expected_gross_profit_ngn: number | string
  payment_reference: string
  payment_method: string
  opay_account_number: string
  opay_receipt_data?: string | null
  payment_status: string
  payment_verified_at?: string | null
  fulfillment_status: string
  planned_company_cost_per_box_ngn?: number | string | null
  planned_company_total_cost_ngn?: number | string | null
  planned_company_gross_profit_ngn?: number | string | null
  actual_company_cost_per_box_ngn?: number | string | null
  actual_company_total_cost_ngn?: number | string | null
  actual_company_gross_profit_ngn?: number | string | null
  delivery_address?: string | null
  delivery_phone?: string | null
  agent_note?: string | null
  admin_note?: string | null
  sold_packages: number
  recorded_revenue_ngn?: number | string
  realized_agent_gross_profit_ngn?: number | string
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
  paid: { status: 'heating', label: 'Approve economics & start preparation' },
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
  }).format(Number(value || 0))

export default function AdminAgilityPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [actualCost, setActualCost] = useState<Record<string, number>>({})
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
      setActualCost((current) => {
        const next = { ...current }
        for (const order of data.orders || []) {
          if (next[order.id] == null) {
            next[order.id] = Number(order.actual_company_cost_per_box_ngn || AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN)
          }
        }
        return next
      })
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
      proofSubmitted: orders.filter((order) => order.payment_status === 'proof_submitted').length,
      paidOrders: paid.length,
      paidWholesaleValue: paid.reduce((sum, order) => sum + Number(order.total_ngn), 0),
      plannedCompanyGross: paid.reduce((sum, order) => sum + Number(order.planned_company_gross_profit_ngn || 0), 0),
      actualCompanyGross: paid.reduce((sum, order) => sum + Number(order.actual_company_gross_profit_ngn || 0), 0),
      received: paid.filter((order) => order.fulfillment_status === 'received').length,
    }
  }, [orders])

  const verifyPayment = async (order: OrderRow, status: 'approved' | 'rejected') => {
    if (!token) return
    setSavingId(order.id)
    setMessage('')
    try {
      const response = await fetch('/api/admin/agility/payment/opay/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          status,
          adminNote: order.admin_note || '',
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to verify OPay payment')
      setMessage(data.message || `OPay payment ${status}.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to verify OPay payment')
    } finally {
      setSavingId(null)
    }
  }

  const move = async (order: OrderRow) => {
    if (!token) return
    const movement = nextStage[order.fulfillment_status]
    if (!movement) return

    const costPerBox = AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN
    const actualCostPerBox = Number(actualCost[order.id] || AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN)

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
          actualCostPerBox,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to move Agility order')
      if (data.companyEconomics) {
        setMessage(
          `Production economics approved: planned company gross contribution ${naira(data.companyEconomics.grossProfitNgn)} for this order.`
        )
      } else if (data.actualCompanyEconomics) {
        setMessage(
          `Delivery reconciled: actual company gross contribution ${naira(data.actualCompanyEconomics.grossProfitNgn)} for this order.${data.economicsWarning ? ' ' + data.economicsWarning : ''}`
        )
      }
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
          Agility uses the same manual OPay method already used by Agents and Bridgers. Administration verifies
          the OPay proof, then controls company economics and physical fulfillment before stock reaches the Agent Store.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <WalletCards className="h-5 w-5 text-amber-300" />
          <p className="mt-3 text-xs text-slate-500">OPay proofs waiting</p>
          <p className="mt-1 text-2xl font-black text-white">{summary.proofSubmitted}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <CreditCard className="h-5 w-5 text-emerald-300" />
          <p className="mt-3 text-xs text-slate-500">Paid orders</p>
          <p className="mt-1 text-2xl font-black text-white">{summary.paidOrders}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <Clock3 className="h-5 w-5 text-cyan-300" />
          <p className="mt-3 text-xs text-slate-500">Wholesale value</p>
          <p className="mt-1 text-xl font-black text-white">{naira(summary.paidWholesaleValue)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <Store className="h-5 w-5 text-orange-300" />
          <p className="mt-3 text-xs text-slate-500">Planned company gross</p>
          <p className="mt-1 text-xl font-black text-emerald-200">{naira(summary.plannedCompanyGross)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <Store className="h-5 w-5 text-cyan-300" />
          <p className="mt-3 text-xs text-slate-500">Actual company gross</p>
          <p className="mt-1 text-xl font-black text-cyan-200">{naira(summary.actualCompanyGross)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-300" />
          <p className="mt-3 text-xs text-slate-500">Agent received</p>
          <p className="mt-1 text-2xl font-black text-white">{summary.received}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-orange-300/20 bg-orange-300/5 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Fixed company economics</p>
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-3 xl:grid-cols-6">
          <p className="text-slate-300"><strong className="text-white">Retail:</strong> {naira(AGILITY_RETAIL_UNIT_PRICE_NGN)} / package</p>
          <p className="text-slate-300"><strong className="text-white">Box:</strong> {AGILITY_PACKAGES_PER_BOX} packages</p>
          <p className="text-slate-300"><strong className="text-white">Retail value:</strong> {naira(AGILITY_RETAIL_BOX_VALUE_NGN)}</p>
          <p className="text-slate-300"><strong className="text-white">Agent pays:</strong> {naira(AGILITY_AGENT_BOX_PRICE_NGN)}</p>
          <p className="text-slate-300"><strong className="text-white">Agent gross:</strong> {naira(AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN)}</p>
          <p className="text-slate-300"><strong className="text-white">Company gross:</strong> {naira(AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN)}</p>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Standard preparation cost is {naira(AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN)} per box.
          At the {naira(AGILITY_AGENT_BOX_PRICE_NGN)} Agent box price, WEAVE makes {naira(AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN)} gross profit per box.
          OPay receiving account: {AGILITY_OPAY_ACCOUNT_NUMBER}.
        </p>
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
            const cost = AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN
            const actual = Number(actualCost[order.id] || order.actual_company_cost_per_box_ngn || AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN)
            const previewCompanyGross =
              AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN * Number(order.box_count)
            const previewActualCompanyGross =
              actual > 0 ? (AGILITY_AGENT_BOX_PRICE_NGN - actual) * Number(order.box_count) : 0

            return (
              <article key={order.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-white">{variant?.name || order.variant_id}</h2>
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">
                        {order.distribution_mode || 'retailer'}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                        paid
                          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                          : order.payment_status === 'rejected'
                            ? 'border-rose-400/30 bg-rose-400/10 text-rose-200'
                            : 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                      }`}>
                        OPay · {order.payment_status.replaceAll('_', ' ')}
                      </span>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">
                        {order.fulfillment_status}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-300">
                      {order.agent_name || order.agent_username || 'Agent'} · {order.box_count} box{Number(order.box_count) === 1 ? '' : 'es'} · {order.package_count} packages
                    </p>
                    <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
                      <p className="rounded-xl bg-black/20 px-3 py-2 text-slate-400">Agent pays <strong className="text-white">{naira(order.total_ngn)}</strong></p>
                      <p className="rounded-xl bg-black/20 px-3 py-2 text-slate-400">Retail value <strong className="text-white">{naira(Number(order.box_count) * Number(order.retail_box_value_ngn))}</strong></p>
                      <p className="rounded-xl bg-black/20 px-3 py-2 text-slate-400">Agent gross spread <strong className="text-emerald-300">{naira(order.agent_expected_gross_profit_ngn)}</strong></p>
                    </div>

                    <p className="mt-3 text-[11px] text-slate-600">
                      {order.departmental_code || 'No department code'} {order.agent_email ? '· ' + order.agent_email : ''}
                    </p>

                    <div className="mt-3 rounded-xl border border-violet-400/15 bg-violet-400/5 p-3 text-xs">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Delivery destination</p>
                      <p className="mt-2 text-slate-200">{order.delivery_address || 'Delivery address not recorded'}</p>
                      <p className="mt-1 text-slate-500">{order.delivery_phone || 'Delivery phone not recorded'}</p>
                    </div>

                    <div className="mt-4 grid gap-2 text-[11px] sm:grid-cols-2">
                      <p className="rounded-xl bg-black/20 px-3 py-2 text-slate-500">
                        OPay account: <span className="font-mono text-slate-300">{order.opay_account_number || AGILITY_OPAY_ACCOUNT_NUMBER}</span>
                      </p>
                      <p className="rounded-xl bg-black/20 px-3 py-2 text-slate-500">
                        Order reference: <span className="font-mono text-slate-300">{order.payment_reference}</span>
                      </p>
                    </div>

                    {order.opay_receipt_data && (
                      <div className="mt-3 rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">Agent OPay proof</p>
                        <p className="mt-2 break-words text-xs leading-5 text-slate-300">{order.opay_receipt_data}</p>
                      </div>
                    )}

                    {order.agent_note && (
                      <p className="mt-3 text-xs leading-5 text-slate-500">Agent note: {order.agent_note}</p>
                    )}

                    <textarea
                      className="mt-4 min-h-20 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-orange-300/40"
                      value={order.admin_note || ''}
                      placeholder="Administration payment / sourcing / dispatch note"
                      onChange={(event) => setOrders((current) =>
                        current.map((item) => item.id === order.id ? { ...item, admin_note: event.target.value } : item)
                      )}
                    />

                    {order.planned_company_cost_per_box_ngn && (
                      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
                        <p className="rounded-xl bg-emerald-400/5 px-3 py-2 text-slate-400">
                          Planned cost / box <strong className="text-white">{naira(order.planned_company_cost_per_box_ngn)}</strong>
                        </p>
                        <p className="rounded-xl bg-emerald-400/5 px-3 py-2 text-slate-400">
                          Planned total cost <strong className="text-white">{naira(order.planned_company_total_cost_ngn || 0)}</strong>
                        </p>
                        <p className="rounded-xl bg-emerald-400/5 px-3 py-2 text-slate-400">
                          Planned company gross <strong className="text-emerald-300">{naira(order.planned_company_gross_profit_ngn || 0)}</strong>
                        </p>
                      </div>
                    )}

                    {order.actual_company_cost_per_box_ngn && (
                      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
                        <p className="rounded-xl bg-cyan-400/5 px-3 py-2 text-slate-400">
                          Actual cost / box <strong className="text-white">{naira(order.actual_company_cost_per_box_ngn)}</strong>
                        </p>
                        <p className="rounded-xl bg-cyan-400/5 px-3 py-2 text-slate-400">
                          Actual total cost <strong className="text-white">{naira(order.actual_company_total_cost_ngn || 0)}</strong>
                        </p>
                        <p className="rounded-xl bg-cyan-400/5 px-3 py-2 text-slate-400">
                          Actual company gross <strong className={Number(order.actual_company_gross_profit_ngn || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{naira(order.actual_company_gross_profit_ngn || 0)}</strong>
                        </p>
                      </div>
                    )}

                    {order.fulfillment_status === 'received' && (
                      <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs text-emerald-100">
                        Agent confirmed receipt. {Number(order.sold_packages || 0)} of {order.package_count} packages have been recorded as sold.
                        Recorded Agent gross spread: {naira(order.realized_agent_gross_profit_ngn || 0)}.
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Company control</p>

                    {order.payment_status === 'proof_submitted' ? (
                      <>
                        <WalletCards className="mt-4 h-7 w-7 text-cyan-300" />
                        <p className="mt-3 text-sm font-bold text-white">Verify OPay payment</p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Match the submitted OPay proof to the exact expected amount of {naira(order.total_ngn)} before approval.
                        </p>
                        <Button
                          className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700"
                          disabled={savingId === order.id}
                          onClick={() => verifyPayment(order, 'approved')}
                        >
                          Approve OPay payment
                        </Button>
                        <Button
                          variant="outline"
                          className="mt-2 w-full"
                          disabled={savingId === order.id}
                          onClick={() => verifyPayment(order, 'rejected')}
                        >
                          Reject proof
                        </Button>
                      </>
                    ) : !paid ? (
                      <>
                        <CreditCard className="mt-4 h-7 w-7 text-amber-300" />
                        <p className="mt-3 text-sm font-bold text-white">
                          {order.payment_status === 'rejected' ? 'Waiting for corrected OPay proof' : 'Waiting for Agent OPay proof'}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Food preparation is locked until Administration approves the Agent payment.
                        </p>
                      </>
                    ) : movement ? (
                      <>
                        {order.fulfillment_status === 'paid' ? (
                          <UtensilsCrossed className="mt-4 h-7 w-7 text-orange-300" />
                        ) : order.fulfillment_status === 'dispatched' ? (
                          <Truck className="mt-4 h-7 w-7 text-violet-300" />
                        ) : (
                          <Box className="mt-4 h-7 w-7 text-orange-300" />
                        )}
                        <p className="mt-3 text-sm font-bold text-white">Next: {movement.status}</p>

                        {order.fulfillment_status === 'paid' && (
                          <>
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              Agility preparation is fixed at {naira(AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN)} per box.
                              The Agent pays {naira(AGILITY_AGENT_BOX_PRICE_NGN)}, so company gross profit is
                              {naira(AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN)} per box.
                            </p>
                            <div className="mt-3 rounded-xl bg-white/[0.04] p-3 text-xs">
                              <p className="text-slate-500">Company gross for this order</p>
                              <p className="mt-1 text-lg font-black text-emerald-300">
                                {naira(previewCompanyGross)}
                              </p>
                            </div>
                          </>
                        )}

                        {order.fulfillment_status === 'dispatched' && (
                          <>
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              The standard actual cost is prefilled at {naira(AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN)} per box.
                              Change it only if the real completed cost differed before marking delivery.
                            </p>
                            <Input
                              className="mt-3"
                              type="number"
                              min={1}
                              value={actualCost[order.id] || AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN}
                              placeholder={AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN.toString()}
                              onChange={(event) => setActualCost((current) => ({
                                ...current,
                                [order.id]: Math.max(0, Number(event.target.value) || 0),
                              }))}
                            />
                            {actual > 0 && (
                              <div className="mt-3 rounded-xl bg-white/[0.04] p-3 text-xs">
                                <p className="text-slate-500">Actual company gross preview for this order</p>
                                <p className={`mt-1 text-lg font-black ${previewActualCompanyGross >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                  {naira(previewActualCompanyGross)}
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        <p className="mt-3 text-xs leading-5 text-slate-500">Company stages are sequential and cannot be skipped.</p>
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
                          Administration has marked the stock delivered. The Agent must confirm physical receipt before consumer sales open.
                        </p>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mt-4 h-7 w-7 text-emerald-300" />
                        <p className="mt-3 text-sm font-bold text-white">Company handoff complete</p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Stock is under Agent Store inventory. Consumer sales reduce inventory and record the Agent gross spread.
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
