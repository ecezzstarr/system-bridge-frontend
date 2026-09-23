'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import {
  ArrowRight,
  Box,
  CheckCircle2,
  Clock3,
  CreditCard,
  PackageCheck,
  PackageOpen,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  UtensilsCrossed,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AGILITY_BOX_PRICE_NGN,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_PROCESS,
  AGILITY_UNIT_PRICE_NGN,
  AGILITY_VARIANTS,
  type AgilityVariant,
} from '@/lib/agility-catalog'

type AgilityOrder = {
  id: string
  variant_id: string
  box_count: number
  packages_per_box: number
  package_count: number
  unit_price_ngn: number | string
  box_price_ngn: number | string
  total_ngn: number | string
  payment_reference: string
  payment_status: string
  fulfillment_status: string
  agent_note?: string | null
  admin_note?: string | null
  paid_at?: string | null
  delivered_at?: string | null
  received_at?: string | null
  sold_packages: number
  created_at: string
}

const naira = (value: number | string) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value))

const fulfillmentLabel: Record<string, string> = {
  awaiting_payment: 'Awaiting payment',
  paid: 'Paid · queued',
  heating: 'Heating',
  packed: 'Packages sealed',
  boxed: 'Company box ready',
  dispatched: 'On the way',
  delivered: 'Delivered · confirm receipt',
  received: 'Received · ready to sell',
}

export default function AgilityPage() {
  const { user, token } = useAuth()
  const isAgent = user?.role === 'agent'
  const [orders, setOrders] = useState<AgilityOrder[]>([])
  const [selected, setSelected] = useState<AgilityVariant>(AGILITY_VARIANTS[0])
  const [boxCount, setBoxCount] = useState(1)
  const [note, setNote] = useState('')
  const [saleQty, setSaleQty] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [workingOrder, setWorkingOrder] = useState<string | null>(null)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [message, setMessage] = useState('')

  const packageCount = boxCount * AGILITY_PACKAGES_PER_BOX
  const total = boxCount * AGILITY_BOX_PRICE_NGN

  const loadOrders = async () => {
    if (!isAgent || !token) return
    setLoadingOrders(true)
    try {
      const response = await fetch('/api/agility/stock', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const data = await response.json()
      if (response.ok && data.success) setOrders(data.orders || [])
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [isAgent, token])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const payment = params.get('payment')
    if (!payment) return

    if (payment === 'success') {
      setMessage('Payment verified. Your Agility order has entered company fulfillment.')
      loadOrders()
    } else {
      setMessage(`Payment was not completed: ${payment.replaceAll('_', ' ')}.`)
    }

    window.history.replaceState({}, '', '/agility')
  }, [token, isAgent])

  const beginOrder = async () => {
    if (!token || !isAgent) return
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/agility/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ variantId: selected.id, boxCount, note }),
      })
      const data = await response.json()
      if (!response.ok || !data.success || !data.paymentLink) {
        throw new Error(data.error || 'Unable to open company payment')
      }
      window.location.assign(data.paymentLink)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to begin Agility order')
      setLoading(false)
    }
  }

  const confirmReceipt = async (orderId: string) => {
    if (!token) return
    setWorkingOrder(orderId)
    setMessage('')
    try {
      const response = await fetch('/api/agility/receive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to confirm receipt')
      setMessage('Receipt confirmed. These packages are now Agent Store inventory.')
      await loadOrders()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to confirm receipt')
    } finally {
      setWorkingOrder(null)
    }
  }

  const recordSale = async (order: AgilityOrder) => {
    if (!token) return
    const quantity = Math.max(1, Number(saleQty[order.id] || 1))
    setWorkingOrder(order.id)
    setMessage('')
    try {
      const response = await fetch('/api/agility/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: order.id, quantity }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to record sale')
      setSaleQty((current) => ({ ...current, [order.id]: 1 }))
      setMessage(`Recorded ${quantity} Agility package${quantity === 1 ? '' : 's'} sold to consumers.`)
      await loadOrders()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to record sale')
    } finally {
      setWorkingOrder(null)
    }
  }

  const receivedOrders = useMemo(
    () => orders.filter((order) => order.fulfillment_status === 'received'),
    [orders]
  )
  const availablePackages = receivedOrders.reduce(
    (sum, order) => sum + Math.max(0, Number(order.package_count) - Number(order.sold_packages || 0)),
    0
  )

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-orange-400/20 bg-gradient-to-br from-orange-500/15 via-amber-300/5 to-slate-950 p-6 md:p-10">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-orange-200">
              <Sparkles className="h-3.5 w-3.5" />
              Weave Morning Food
            </div>
            <h1 className="text-5xl font-black tracking-tight text-white md:text-7xl">AGILITY</h1>
            <p className="mt-2 text-xl font-semibold text-orange-200 md:text-2xl">Intelligence in Action</p>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              One company product family for the morning: prepared food, protein, fruit, water and milk,
              paid for by the Agent, fulfilled by Weave, delivered to the Agent Store, then sold to consumers.
            </p>

            <div className="mt-6 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">1 package</p>
                <p className="mt-1 text-2xl font-black text-orange-300">{naira(AGILITY_UNIT_PRICE_NGN)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">1 company box</p>
                <p className="mt-1 text-2xl font-black text-white">{AGILITY_PACKAGES_PER_BOX} packages</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Box price</p>
                <p className="mt-1 text-2xl font-black text-emerald-300">{naira(AGILITY_BOX_PRICE_NGN)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-orange-300/20 bg-[#f3c77b]/95 p-4 text-[#2b1608] shadow-2xl shadow-orange-950/20">
            <div className="rounded-[1.5rem] border-2 border-[#7a3510]/20 bg-[#fff0ca] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#a14a13]">WEAVE</p>
                  <p className="mt-1 text-4xl font-black">AGILITY</p>
                  <p className="text-sm font-semibold">Complete Morning Food Package</p>
                </div>
                <PackageOpen className="h-11 w-11 text-[#b95416]" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                {['Fried egg', 'Bread', 'Butter', 'Akara', 'Pap', 'Sardines', 'Apple', 'Water', 'Milk'].map((item) => (
                  <div key={item} className="rounded-xl bg-white/65 px-2 py-3">{item}</div>
                ))}
              </div>
              <p className="mt-4 text-center text-xs font-bold uppercase tracking-[0.16em] text-[#7a3510]">
                {AGILITY_PACKAGES_PER_BOX} complete packages per company box
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-300">Package family</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Different Agility meals. Same ₦3,000 package standard.</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {AGILITY_VARIANTS.map((variant) => (
            <article
              key={variant.id}
              className={`rounded-2xl border p-5 transition ${selected.id === variant.id ? 'border-orange-300/50 bg-orange-300/10' : 'border-white/10 bg-white/[0.03]'}`}
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300">{variant.accent}</p>
              <h3 className="mt-1 text-lg font-bold text-white">{variant.name}</h3>
              <p className="mt-1 text-xl font-black text-orange-200">{naira(AGILITY_UNIT_PRICE_NGN)}</p>
              <div className="mt-4 space-y-2 text-xs text-slate-300">
                <p><span className="text-slate-500">Five foods:</span> {variant.foods.join(', ')}</p>
                <p><span className="text-slate-500">Protein:</span> {variant.protein}</p>
                <p><span className="text-slate-500">Fruit:</span> {variant.fruit}</p>
                <p><span className="text-slate-500">Drink:</span> {variant.drink} · {variant.water}</p>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">{variant.note}</p>
              {isAgent && (
                <Button
                  type="button"
                  variant={selected.id === variant.id ? 'default' : 'outline'}
                  className="mt-5 w-full"
                  onClick={() => setSelected(variant)}
                >
                  {selected.id === variant.id ? 'Selected' : 'Choose for order'}
                </Button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 md:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-300">Company movement</p>
        <h2 className="mt-1 text-2xl font-bold text-white">Pay first. Then Agility moves.</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {AGILITY_PROCESS.map((step, index) => {
            const icons = [CreditCard, UtensilsCrossed, PackageCheck, Box, Truck, Store]
            const Icon = icons[index]
            return (
              <div key={step.stage} className="relative rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-300/10 text-orange-300">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-white">{step.stage}</h3>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">{step.detail}</p>
                {index < AGILITY_PROCESS.length - 1 && (
                  <ArrowRight className="absolute -right-2 top-1/2 hidden h-4 w-4 text-orange-300 xl:block" />
                )}
              </div>
            )
          })}
        </div>
      </section>

      {isAgent ? (
        <>
          <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
            <div className="rounded-[2rem] border border-orange-300/20 bg-orange-300/5 p-6">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-6 w-6 text-orange-300" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-300">Agent Store Purchase</p>
                  <h2 className="text-xl font-bold text-white">Buy Agility boxes from Weave</h2>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="font-semibold text-white">{selected.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {AGILITY_PACKAGES_PER_BOX} packages per box · {naira(AGILITY_BOX_PRICE_NGN)} per box
                </p>
              </div>

              <label className="mt-5 block text-xs font-semibold text-slate-300">Number of company boxes</label>
              <Input
                className="mt-2"
                type="number"
                min={1}
                max={50}
                value={boxCount}
                onChange={(event) => setBoxCount(Math.max(1, Math.min(50, Number(event.target.value) || 1)))}
              />

              <label className="mt-4 block text-xs font-semibold text-slate-300">Agent delivery note</label>
              <textarea
                className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-orange-300/40"
                value={note}
                maxLength={500}
                placeholder="Store area, delivery note, or company handling note"
                onChange={(event) => setNote(event.target.value)}
              />

              <div className="mt-5 space-y-2 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <div className="flex justify-between gap-3 text-slate-400">
                  <span>Packages</span>
                  <span>{packageCount}</span>
                </div>
                <div className="flex justify-between gap-3 text-slate-400">
                  <span>Price per package</span>
                  <span>{naira(AGILITY_UNIT_PRICE_NGN)}</span>
                </div>
                <div className="flex justify-between gap-3 border-t border-white/10 pt-2 font-black text-white">
                  <span>Pay now</span>
                  <span className="text-orange-200">{naira(total)}</span>
                </div>
              </div>

              <Button className="mt-4 w-full" disabled={loading} onClick={beginOrder}>
                {loading ? 'Opening payment…' : `Pay ${naira(total)} and order ${boxCount} box${boxCount === 1 ? '' : 'es'}`}
              </Button>
              <p className="mt-3 text-[11px] leading-5 text-slate-500">
                Company fulfillment does not open until Flutterwave returns a verified successful NGN payment.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Order movement</p>
                  <h2 className="mt-1 text-xl font-bold text-white">My Agility orders</h2>
                </div>
                <Clock3 className="h-5 w-5 text-slate-500" />
              </div>

              {message && (
                <div className="mt-4 rounded-xl border border-orange-300/20 bg-orange-300/5 px-3 py-2 text-xs leading-5 text-orange-100">
                  {message}
                </div>
              )}

              <div className="mt-5 space-y-3">
                {loadingOrders ? (
                  <p className="text-sm text-slate-500">Loading company orders…</p>
                ) : orders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                    <PackageOpen className="mx-auto h-8 w-8 text-slate-600" />
                    <p className="mt-3 text-sm text-slate-400">No Agility order yet.</p>
                  </div>
                ) : (
                  orders.map((order) => {
                    const variant = AGILITY_VARIANTS.find((item) => item.id === order.variant_id)
                    const sold = Number(order.sold_packages || 0)
                    const remaining = Math.max(0, Number(order.package_count) - sold)
                    return (
                      <div key={order.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{variant?.name || order.variant_id}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {order.box_count} box{Number(order.box_count) === 1 ? '' : 'es'} · {order.package_count} packages · {naira(order.total_ngn)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${order.payment_status === 'paid' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/30 bg-amber-400/10 text-amber-200'}`}>
                              {order.payment_status}
                            </span>
                            <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                              {fulfillmentLabel[order.fulfillment_status] || order.fulfillment_status}
                            </p>
                          </div>
                        </div>

                        {order.admin_note && (
                          <p className="mt-3 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-slate-400">
                            Administration: {order.admin_note}
                          </p>
                        )}

                        {order.fulfillment_status === 'delivered' && (
                          <Button
                            className="mt-4 w-full"
                            disabled={workingOrder === order.id}
                            onClick={() => confirmReceipt(order.id)}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Confirm {order.package_count} packages received
                          </Button>
                        )}

                        {order.fulfillment_status === 'received' && (
                          <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold text-emerald-200">Agent Store inventory</p>
                                <p className="mt-1 text-[11px] text-slate-500">{remaining} available · {sold} sold</p>
                              </div>
                              <p className="text-sm font-black text-white">{naira(remaining * AGILITY_UNIT_PRICE_NGN)}</p>
                            </div>
                            {remaining > 0 && (
                              <div className="mt-3 flex gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  max={remaining}
                                  value={saleQty[order.id] || 1}
                                  onChange={(event) => setSaleQty((current) => ({
                                    ...current,
                                    [order.id]: Math.max(1, Math.min(remaining, Number(event.target.value) || 1)),
                                  }))}
                                />
                                <Button
                                  className="shrink-0"
                                  disabled={workingOrder === order.id}
                                  onClick={() => recordSale(order)}
                                >
                                  Record consumer sale
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-xs text-slate-500">Received stock available</p>
              <p className="mt-2 text-3xl font-black text-white">{availablePackages}</p>
              <p className="mt-1 text-[11px] text-slate-600">Agility packages</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-xs text-slate-500">Consumer unit price</p>
              <p className="mt-2 text-3xl font-black text-orange-200">{naira(AGILITY_UNIT_PRICE_NGN)}</p>
              <p className="mt-1 text-[11px] text-slate-600">Per package</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-xs text-slate-500">Available retail value</p>
              <p className="mt-2 text-3xl font-black text-emerald-200">{naira(availablePackages * AGILITY_UNIT_PRICE_NGN)}</p>
              <p className="mt-1 text-[11px] text-slate-600">From confirmed received stock</p>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-7 text-center">
          <PackageCheck className="mx-auto h-9 w-9 text-orange-300" />
          <h2 className="mt-3 text-xl font-bold text-white">Agility distribution belongs to Weave Agent accounts</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            The product standard is visible here; paid stock purchasing, receipt confirmation and consumer-sale inventory are restricted to Agents.
          </p>
        </section>
      )}
    </div>
  )
}
