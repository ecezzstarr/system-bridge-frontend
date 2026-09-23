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
  WalletCards,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WeaveAssistant, type ChecklistItem } from '@/components/weave-assistant'
import { AGILITY_AGENT_TUTORIAL } from '@/lib/agility-tutorial'
import {
  AGILITY_AGENT_BOX_PRICE_NGN,
  AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN,
  AGILITY_AGENT_GROSS_PROFIT_PER_PACKAGE_NGN,
  AGILITY_AGENT_UNIT_COST_NGN,
  AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN,
  AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN,
  AGILITY_OPAY_ACCOUNT_NUMBER,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_PROCESS,
  AGILITY_RETAIL_BOX_VALUE_NGN,
  AGILITY_RETAIL_UNIT_PRICE_NGN,
  AGILITY_VARIANTS,
  type AgilityVariant,
} from '@/lib/agility-catalog'

type AgilityOrder = {
  id: string
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
  fulfillment_status: string
  delivery_address?: string | null
  delivery_phone?: string | null
  agent_note?: string | null
  admin_note?: string | null
  paid_at?: string | null
  delivered_at?: string | null
  received_at?: string | null
  sold_packages: number
  recorded_revenue_ngn?: number | string
  realized_agent_gross_profit_ngn?: number | string
  created_at: string
}

const naira = (value: number | string) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value))

const fulfillmentLabel: Record<string, string> = {
  awaiting_payment: 'Awaiting OPay verification',
  paid: 'Paid · company queue',
  heating: 'Heating / preparation',
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
  const [distributionMode, setDistributionMode] = useState<'wholesaler' | 'retailer'>('retailer')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [note, setNote] = useState('')
  const [proof, setProof] = useState<Record<string, string>>({})
  const [saleQty, setSaleQty] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [workingOrder, setWorkingOrder] = useState<string | null>(null)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [message, setMessage] = useState('')
  const [openTutorial, setOpenTutorial] = useState(false)

  const packageCount = boxCount * AGILITY_PACKAGES_PER_BOX
  const agentPayable = boxCount * AGILITY_AGENT_BOX_PRICE_NGN
  const retailValue = boxCount * AGILITY_RETAIL_BOX_VALUE_NGN
  const expectedAgentGross = boxCount * AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN

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
    if (new URLSearchParams(window.location.search).get('tutorial') === '1') {
      setOpenTutorial(true)
    }
  }, [])

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
        body: JSON.stringify({ variantId: selected.id, boxCount, distributionMode, deliveryAddress, deliveryPhone, note }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to create Agility order')
      }
      setMessage(
        `Order created. Send exactly ${naira(data.payment.amountNgn)} to OPay ${data.payment.accountNumber}, then submit the transaction reference or receipt below.`
      )
      setNote('')
      await loadOrders()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create Agility order')
    } finally {
      setLoading(false)
    }
  }

  const submitProof = async (order: AgilityOrder) => {
    if (!token) return
    const receipt = String(proof[order.id] || '').trim()
    if (!receipt) {
      setMessage('Enter the OPay transaction reference or receipt before submitting.')
      return
    }

    setWorkingOrder(order.id)
    setMessage('')
    try {
      const response = await fetch('/api/agility/payment/opay/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: order.id, receipt }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to submit OPay proof')
      setProof((current) => ({ ...current, [order.id]: '' }))
      setMessage('OPay proof submitted. Administration will verify it before the food order enters preparation.')
      await loadOrders()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to submit OPay proof')
    } finally {
      setWorkingOrder(null)
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
      setMessage('Receipt confirmed. These Agility packages are now Agent Store inventory.')
      await loadOrders()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to confirm receipt')
    } finally {
      setWorkingOrder(null)
    }
  }

  const recordSale = async (order: AgilityOrder) => {
    if (!token) return
    const remaining = Math.max(0, Number(order.package_count) - Number(order.sold_packages || 0))
    const quantity = Math.max(1, Math.min(remaining, Number(saleQty[order.id] || 1)))
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
      setMessage(
        data.economics.saleMode === 'wholesale_box'
          ? `Recorded ${quantity} wholesale box sale${quantity === 1 ? '' : 's'}: ${naira(data.economics.saleRevenueNgn)} revenue and ${naira(data.economics.agentGrossProfitNgn)} Agent gross profit.`
          : `Recorded ${quantity} consumer package sale${quantity === 1 ? '' : 's'}: ${naira(data.economics.saleRevenueNgn)} revenue and ${naira(data.economics.agentGrossProfitNgn)} Agent gross profit.`
      )
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
  const realizedGross = orders.reduce(
    (sum, order) => sum + Number(order.realized_agent_gross_profit_ngn || 0),
    0
  )

  const scrollTo = (id: string) => {
    if (typeof document === 'undefined') return
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const latestOrder = orders[0]
  const agilityChecklist: ChecklistItem[] = []

  if (!latestOrder) {
    agilityChecklist.push({
      id: 'agility-start',
      label: 'Start your first Agility order',
      detail: 'Choose Retailer or Wholesaler, select your boxes, add the delivery destination, then create the OPay order.',
      actLabel: 'Start order',
      onAct: () => scrollTo('agility-order'),
    })
  } else if (['pending', 'rejected'].includes(latestOrder.payment_status)) {
    agilityChecklist.push({
      id: 'agility-payment-proof',
      label: latestOrder.payment_status === 'rejected' ? 'Submit corrected OPay proof' : 'Pay and submit OPay proof',
      detail: `Exact order amount: ${naira(latestOrder.total_ngn)}. Use the OPay details shown on the order.`,
      actLabel: 'Open order',
      onAct: () => scrollTo('agility-orders'),
    })
  } else if (latestOrder.payment_status === 'proof_submitted') {
    agilityChecklist.push({
      id: 'agility-await-verification',
      label: 'OPay proof is with Administration',
      detail: 'Preparation opens only after Administration verifies the payment.',
      done: true,
    })
  } else if (latestOrder.fulfillment_status === 'delivered') {
    agilityChecklist.push({
      id: 'agility-confirm-receipt',
      label: 'Confirm your Agility stock received',
      detail: 'Administration marked the order delivered. Confirm the physical stock so it becomes sellable inventory.',
      actLabel: 'Confirm receipt',
      onAct: () => scrollTo('agility-orders'),
    })
  } else if (latestOrder.fulfillment_status === 'received') {
    const remaining = Math.max(0, Number(latestOrder.package_count) - Number(latestOrder.sold_packages || 0))
    if (remaining > 0) {
      agilityChecklist.push({
        id: 'agility-sell-stock',
        label: latestOrder.distribution_mode === 'wholesaler' ? 'Record your next Agility box sale' : 'Record your next Agility package sale',
        detail: `${remaining} package${remaining === 1 ? '' : 's'} remain in this order.`,
        actLabel: 'Open inventory',
        onAct: () => scrollTo('agility-orders'),
      })
    } else {
      agilityChecklist.push({
        id: 'agility-sold-out',
        label: 'This Agility order is sold out',
        detail: `Recorded gross profit: ${naira(latestOrder.realized_agent_gross_profit_ngn || 0)}.`,
        done: true,
      })
    }
  } else if (latestOrder.payment_status === 'paid') {
    agilityChecklist.push({
      id: 'agility-company-movement',
      label: `WEAVE is moving your order: ${fulfillmentLabel[latestOrder.fulfillment_status] || latestOrder.fulfillment_status}`,
      detail: 'Track the preparation, packing, boxing and dispatch movement here. No Agent action is required until delivery.',
      done: true,
    })
  }

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
              Agility is a company food-distribution product. The Agent buys a discounted company box through the
              existing OPay payment method, receives the physical stock, then sells each complete morning package
              to consumers at the fixed retail price.
            </p>
            {isAgent && (
              <Button
                type="button"
                variant="outline"
                className="mt-4 border-orange-300/30 bg-orange-300/5 text-orange-100 hover:bg-orange-300/10"
                onClick={() => setOpenTutorial(true)}
              >
                How does Agility work? · Open WEAVE tutorial
              </Button>
            )}

            <div className="mt-6 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Consumer price</p>
                <p className="mt-1 text-xl font-black text-orange-300">{naira(AGILITY_RETAIL_UNIT_PRICE_NGN)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">1 box</p>
                <p className="mt-1 text-xl font-black text-white">{AGILITY_PACKAGES_PER_BOX} packages</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Agent buys box</p>
                <p className="mt-1 text-xl font-black text-cyan-300">{naira(AGILITY_AGENT_BOX_PRICE_NGN)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Agent gross / box</p>
                <p className="mt-1 text-xl font-black text-emerald-300">{naira(AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN)}</p>
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
                {AGILITY_PACKAGES_PER_BOX} packages · {naira(AGILITY_RETAIL_BOX_VALUE_NGN)} retail value
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-emerald-400/15 bg-emerald-400/[0.04] p-6 md:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">Agility economics</p>
        <h2 className="mt-1 text-2xl font-bold text-white">The box creates room for both company and Agent.</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-slate-500">Box retail value</p>
            <p className="mt-2 text-2xl font-black text-white">{naira(AGILITY_RETAIL_BOX_VALUE_NGN)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-slate-500">Agent wholesale price</p>
            <p className="mt-2 text-2xl font-black text-cyan-300">{naira(AGILITY_AGENT_BOX_PRICE_NGN)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-slate-500">Agent gross spread if sold out</p>
            <p className="mt-2 text-2xl font-black text-emerald-300">{naira(AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN)}</p>
            <p className="mt-1 text-[11px] text-slate-600">{naira(AGILITY_AGENT_GROSS_PROFIT_PER_PACKAGE_NGN)} per package</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-slate-500">Company preparation cost</p>
            <p className="mt-2 text-2xl font-black text-orange-200">{naira(AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN)}</p>
            <p className="mt-1 text-[11px] text-slate-600">Company gross profit {naira(AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN)} / box</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-bold text-white">Wholesaler Agent</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              Buys one Agility box from WEAVE for {naira(AGILITY_AGENT_BOX_PRICE_NGN)} and moves the complete
              10-package box for {naira(AGILITY_RETAIL_BOX_VALUE_NGN)}. Gross Agent profit: {naira(AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN)} per box.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-bold text-white">Retailer Agent</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              Buys the same box for {naira(AGILITY_AGENT_BOX_PRICE_NGN)}, opens it into 10 consumer packages,
              and sells each at {naira(AGILITY_RETAIL_UNIT_PRICE_NGN)}. Base gross profit remains {naira(AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN)} per full box,
              while direct consumer patronage can create repeat demand around the Agent Store.
            </p>
          </div>
        </div>
        <p className="mt-4 text-[11px] leading-5 text-slate-500">
          These figures are gross operating economics. Company net profit can still be affected by overhead,
          spoilage, refunds and other operating expenses.
        </p>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-300">Package family</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Different morning combinations. One retail standard.</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {AGILITY_VARIANTS.map((variant) => (
            <article
              key={variant.id}
              className={`rounded-2xl border p-5 transition ${selected.id === variant.id ? 'border-orange-300/50 bg-orange-300/10' : 'border-white/10 bg-white/[0.03]'}`}
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300">{variant.accent}</p>
              <h3 className="mt-1 text-lg font-bold text-white">{variant.name}</h3>
              <p className="mt-1 text-xl font-black text-orange-200">{naira(AGILITY_RETAIL_UNIT_PRICE_NGN)} retail</p>
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
        <h2 className="mt-1 text-2xl font-bold text-white">Order → OPay → Verify → Prepare → Pack → Sell</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {AGILITY_PROCESS.map((step, index) => {
            const icons = [ShoppingBag, WalletCards, CreditCard, UtensilsCrossed, Box, Store]
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
          <section id="agility-order" className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
            <div className="rounded-[2rem] border border-orange-300/20 bg-orange-300/5 p-6">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-6 w-6 text-orange-300" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-300">Agent Store Order</p>
                  <h2 className="text-xl font-bold text-white">Order discounted Agility boxes</h2>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="font-semibold text-white">{selected.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {AGILITY_PACKAGES_PER_BOX} packages per box · Agent price {naira(AGILITY_AGENT_BOX_PRICE_NGN)}
                </p>
              </div>

              <label className="mt-5 block text-xs font-semibold text-slate-300">How this Agent will sell Agility</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={distributionMode === 'retailer' ? 'default' : 'outline'}
                  onClick={() => setDistributionMode('retailer')}
                >
                  Retailer
                </Button>
                <Button
                  type="button"
                  variant={distributionMode === 'wholesaler' ? 'default' : 'outline'}
                  onClick={() => setDistributionMode('wholesaler')}
                >
                  Wholesaler
                </Button>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                Retailer: sell the 10 packages directly to consumers at {naira(AGILITY_RETAIL_UNIT_PRICE_NGN)} each.
                Wholesaler: move the complete box at {naira(AGILITY_RETAIL_BOX_VALUE_NGN)}.
              </p>

              <label className="mt-5 block text-xs font-semibold text-slate-300">Number of company boxes</label>
              <Input
                className="mt-2"
                type="number"
                min={1}
                max={50}
                value={boxCount}
                onChange={(event) => setBoxCount(Math.max(1, Math.min(50, Number(event.target.value) || 1)))}
              />

              <label className="mt-4 block text-xs font-semibold text-slate-300">Agent Store delivery address</label>
              <textarea
                className="mt-2 min-h-20 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-orange-300/40"
                value={deliveryAddress}
                maxLength={500}
                placeholder="Street / area / landmark where the Agility box should be delivered"
                onChange={(event) => setDeliveryAddress(event.target.value)}
              />

              <label className="mt-4 block text-xs font-semibold text-slate-300">Delivery phone</label>
              <Input
                className="mt-2"
                type="tel"
                value={deliveryPhone}
                maxLength={40}
                placeholder="Phone number for delivery contact"
                onChange={(event) => setDeliveryPhone(event.target.value)}
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
                  <span>Packages</span><span>{packageCount}</span>
                </div>
                <div className="flex justify-between gap-3 text-slate-400">
                  <span>Retail value</span><span>{naira(retailValue)}</span>
                </div>
                <div className="flex justify-between gap-3 text-slate-400">
                  <span>Agent gross profit</span><span className="text-emerald-300">{naira(expectedAgentGross)}</span>
                </div>
                <div className="flex justify-between gap-3 border-t border-white/10 pt-2 font-black text-white">
                  <span>Pay WEAVE through OPay</span><span className="text-orange-200">{naira(agentPayable)}</span>
                </div>
              </div>

              <Button
                className="mt-4 w-full"
                disabled={loading || deliveryAddress.trim().length < 5 || deliveryPhone.replace(/\D/g, '').length < 7}
                onClick={beginOrder}
              >
                {loading ? 'Creating order…' : `Create ${boxCount}-box OPay order`}
              </Button>
              <p className="mt-3 text-[11px] leading-5 text-slate-500">
                Payment method: OPay. After the order is created, send the exact amount to {AGILITY_OPAY_ACCOUNT_NUMBER}
                and submit the transaction reference or receipt.
              </p>
            </div>

            <div id="agility-orders" className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6">
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
                    const canSubmitProof = ['pending', 'rejected'].includes(order.payment_status)
                    return (
                      <div key={order.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{variant?.name || order.variant_id}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {order.box_count} box{Number(order.box_count) === 1 ? '' : 'es'} · {order.package_count} packages · Agent pays {naira(order.total_ngn)}
                            </p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-cyan-300">
                              {order.distribution_mode === 'wholesaler' ? 'Wholesaler · box sales' : 'Retailer · direct consumer sales'}
                            </p>
                            <p className="mt-1 text-[11px] text-emerald-300">
                              Sell-out gross spread: {naira(order.agent_expected_gross_profit_ngn)}
                            </p>
                            {(order.delivery_address || order.delivery_phone) && (
                              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                                Delivery: {order.delivery_address || '—'}{order.delivery_phone ? ` · ${order.delivery_phone}` : ''}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                              order.payment_status === 'paid'
                                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                                : order.payment_status === 'rejected'
                                  ? 'border-rose-400/30 bg-rose-400/10 text-rose-200'
                                  : 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                            }`}>
                              OPay · {order.payment_status.replaceAll('_', ' ')}
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

                        {canSubmitProof && (
                          <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                            <p className="text-xs font-bold text-cyan-200">Pay through existing Weave OPay</p>
                            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                              <p className="text-slate-400">OPay account: <strong className="text-white">{order.opay_account_number || AGILITY_OPAY_ACCOUNT_NUMBER}</strong></p>
                              <p className="text-slate-400">Exact amount: <strong className="text-white">{naira(order.total_ngn)}</strong></p>
                              <p className="text-slate-400 sm:col-span-2">Order reference: <strong className="font-mono text-white">{order.payment_reference}</strong></p>
                            </div>
                            <textarea
                              className="mt-3 min-h-20 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/40"
                              value={proof[order.id] || ''}
                              placeholder="Paste OPay transaction reference or receipt details"
                              onChange={(event) => setProof((current) => ({ ...current, [order.id]: event.target.value }))}
                            />
                            <Button
                              className="mt-3 w-full"
                              disabled={workingOrder === order.id || !(proof[order.id] || '').trim()}
                              onClick={() => submitProof(order)}
                            >
                              Submit OPay proof for verification
                            </Button>
                          </div>
                        )}

                        {order.payment_status === 'proof_submitted' && (
                          <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-100">
                            OPay proof submitted. Administration must verify the payment before preparation can begin.
                          </div>
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
                              <div className="text-right">
                                <p className="text-sm font-black text-white">{naira(remaining * Number(order.retail_unit_price_ngn))}</p>
                                <p className="text-[10px] text-slate-600">remaining retail value</p>
                              </div>
                            </div>
                            {remaining > 0 && (
                              <div className="mt-3">
                                <p className="mb-2 text-[11px] text-slate-500">
                                  {order.distribution_mode === 'wholesaler'
                                    ? `Record complete boxes sold at ${naira(order.retail_box_value_ngn)} each.`
                                    : `Record individual packages sold to consumers at ${naira(order.retail_unit_price_ngn)} each.`}
                                </p>
                                <div className="flex gap-2">
                                  <Input
                                    type="number"
                                    min={1}
                                    max={order.distribution_mode === 'wholesaler' ? Math.floor(remaining / AGILITY_PACKAGES_PER_BOX) : remaining}
                                    value={saleQty[order.id] || 1}
                                    onChange={(event) => {
                                      const max = order.distribution_mode === 'wholesaler'
                                        ? Math.max(1, Math.floor(remaining / AGILITY_PACKAGES_PER_BOX))
                                        : remaining
                                      setSaleQty((current) => ({
                                        ...current,
                                        [order.id]: Math.max(1, Math.min(max, Number(event.target.value) || 1)),
                                      }))
                                    }}
                                  />
                                  <Button
                                    className="shrink-0"
                                    disabled={workingOrder === order.id || (order.distribution_mode === 'wholesaler' && remaining < AGILITY_PACKAGES_PER_BOX)}
                                    onClick={() => recordSale(order)}
                                  >
                                    {order.distribution_mode === 'wholesaler' ? 'Record box sale' : 'Record consumer sale'}
                                  </Button>
                                </div>
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
              <p className="text-xs text-slate-500">Consumer retail price</p>
              <p className="mt-2 text-3xl font-black text-orange-200">{naira(AGILITY_RETAIL_UNIT_PRICE_NGN)}</p>
              <p className="mt-1 text-[11px] text-slate-600">Agent cost basis {naira(AGILITY_AGENT_UNIT_COST_NGN)} per package</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-xs text-slate-500">Realized Agent gross spread</p>
              <p className="mt-2 text-3xl font-black text-emerald-200">{naira(realizedGross)}</p>
              <p className="mt-1 text-[11px] text-slate-600">from recorded consumer sales</p>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-7 text-center">
          <PackageCheck className="mx-auto h-9 w-9 text-orange-300" />
          <h2 className="mt-3 text-xl font-bold text-white">Agility distribution belongs to Weave Agent accounts</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Product information is visible here; OPay stock ordering, receipt confirmation and consumer-sale inventory are restricted to Agents.
          </p>
        </section>
      )}

      {isAgent && (
        <WeaveAssistant
          role="agent"
          checklist={agilityChecklist}
          tutorial={AGILITY_AGENT_TUTORIAL}
          openTutorial={openTutorial}
        />
      )}
    </div>
  )
}
