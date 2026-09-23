'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import {
  Apple,
  ArrowRight,
  Box,
  CheckCircle2,
  Clock3,
  Droplets,
  EggFried,
  GlassWater,
  Milk,
  PackageCheck,
  PackageOpen,
  ShoppingBag,
  Sparkles,
  Truck,
  UtensilsCrossed,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AGILITY_PROCESS, AGILITY_VARIANTS, type AgilityVariant } from '@/lib/agility-catalog'

type StockRequest = {
  id: string
  variant_id: string
  quantity: number
  unit_price_ngn: number | string
  total_ngn: number | string
  status: string
  agent_note?: string | null
  admin_note?: string | null
  created_at: string
}

const naira = (value: number | string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

const statusClass: Record<string, string> = {
  requested: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  approved: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
  preparing: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
  dispatched: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
  delivered: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  cancelled: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
}

export default function AgilityPage() {
  const { user, token } = useAuth()
  const [requests, setRequests] = useState<StockRequest[]>([])
  const [selected, setSelected] = useState<AgilityVariant>(AGILITY_VARIANTS[0])
  const [quantity, setQuantity] = useState(10)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [message, setMessage] = useState('')

  const isAgent = user?.role === 'agent'
  const total = useMemo(() => selected.priceNgn * Math.max(1, quantity || 1), [selected, quantity])

  const loadRequests = async () => {
    if (!isAgent || !token) return
    setLoadingRequests(true)
    try {
      const response = await fetch('/api/agility/stock', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const data = await response.json()
      if (response.ok && data.success) setRequests(data.requests || [])
    } finally {
      setLoadingRequests(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [isAgent, token])

  const requestStock = async () => {
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
        body: JSON.stringify({ variantId: selected.id, quantity, note }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to request stock')
      setMessage(`${selected.name} stock request entered the Weave.`)
      setNote('')
      await loadRequests()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to request stock')
    } finally {
      setLoading(false)
    }
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
              A complete morning food package prepared as one movement: food, protein, fruit, water and milk,
              packed into one Agility box and delivered through Weave Agent accounts for sale to consumers.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Price rule</p>
                <p className="mt-1 text-2xl font-black text-orange-300">Every package under ₦3,000</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Movement</p>
                <p className="mt-1 text-sm font-semibold text-white">Heat → Pack → Box → Agent → Consumer</p>
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
                {['Egg', 'Bread', 'Butter', 'Akara', 'Pap', 'Sardines', 'Apple', 'Water', 'Milk'].map((item) => (
                  <div key={item} className="rounded-xl bg-white/65 px-2 py-3">{item}</div>
                ))}
              </div>
              <p className="mt-4 text-center text-xs font-bold uppercase tracking-[0.16em] text-[#7a3510]">
                Good food. Brighter morning.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-300">Package family</p>
            <h2 className="mt-1 text-2xl font-bold text-white">Many kinds of Agility. One price ceiling.</h2>
          </div>
          <p className="hidden text-xs text-slate-500 md:block">All listed variants stay below ₦3,000.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {AGILITY_VARIANTS.map((variant) => (
            <article
              key={variant.id}
              className={`rounded-2xl border p-5 transition ${selected.id === variant.id ? 'border-orange-300/50 bg-orange-300/10' : 'border-white/10 bg-white/[0.03]'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300">{variant.accent}</p>
                  <h3 className="mt-1 text-lg font-bold text-white">{variant.name}</h3>
                </div>
                <p className="text-lg font-black text-orange-200">{naira(variant.priceNgn)}</p>
              </div>
              <div className="mt-4 space-y-2 text-xs text-slate-300">
                <p><span className="text-slate-500">Foods:</span> {variant.foods.join(', ')}</p>
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
                  {selected.id === variant.id ? 'Selected for stock' : 'Select package'}
                </Button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 md:p-8">
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-300">Interaction in motion</p>
          <h2 className="mt-1 text-2xl font-bold text-white">How an Agility box moves</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {AGILITY_PROCESS.map((step, index) => {
            const icons = [UtensilsCrossed, PackageCheck, Box, Truck]
            const Icon = icons[index]
            return (
              <div key={step.stage} className="relative rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-300/10 text-orange-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-4xl font-black text-white/5">0{index + 1}</span>
                </div>
                <h3 className="mt-4 font-bold text-white">{step.stage}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{step.detail}</p>
                {index < AGILITY_PROCESS.length - 1 && (
                  <ArrowRight className="absolute -right-2 top-1/2 hidden h-4 w-4 text-orange-300 md:block" />
                )}
              </div>
            )
          })}
        </div>
      </section>

      {isAgent ? (
        <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <div className="rounded-[2rem] border border-orange-300/20 bg-orange-300/5 p-6">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-6 w-6 text-orange-300" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-300">Agent Store</p>
                <h2 className="text-xl font-bold text-white">Request Agility stock</h2>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">{selected.name}</p>
              <p className="mt-1 text-sm text-slate-400">{naira(selected.priceNgn)} per box</p>
            </div>

            <label className="mt-5 block text-xs font-semibold text-slate-300">Number of boxes</label>
            <Input
              className="mt-2"
              type="number"
              min={1}
              max={500}
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Math.min(500, Number(event.target.value) || 1)))}
            />

            <label className="mt-4 block text-xs font-semibold text-slate-300">Agent note</label>
            <textarea
              className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-orange-300/40"
              value={note}
              maxLength={500}
              placeholder="Store location, preferred delivery detail, or preparation note"
              onChange={(event) => setNote(event.target.value)}
            />

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3">
              <span className="text-xs text-slate-500">Stock value</span>
              <span className="text-lg font-black text-orange-200">{naira(total)}</span>
            </div>

            <Button className="mt-4 w-full" disabled={loading} onClick={requestStock}>
              {loading ? 'Entering request…' : 'Request stock from Weave'}
            </Button>
            {message && <p className="mt-3 text-xs leading-5 text-slate-300">{message}</p>}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">My movement</p>
                <h2 className="mt-1 text-xl font-bold text-white">Agility stock requests</h2>
              </div>
              <Clock3 className="h-5 w-5 text-slate-500" />
            </div>

            <div className="mt-5 space-y-3">
              {loadingRequests ? (
                <p className="text-sm text-slate-500">Loading stock movement…</p>
              ) : requests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                  <PackageOpen className="mx-auto h-8 w-8 text-slate-600" />
                  <p className="mt-3 text-sm text-slate-400">No Agility stock request yet.</p>
                </div>
              ) : (
                requests.map((request) => {
                  const variant = AGILITY_VARIANTS.find((item) => item.id === request.variant_id)
                  return (
                    <div key={request.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{variant?.name || request.variant_id}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {request.quantity} boxes · {naira(request.total_ngn)}
                          </p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass[request.status] || 'border-white/10 text-slate-400'}`}>
                          {request.status}
                        </span>
                      </div>
                      {request.admin_note && (
                        <p className="mt-3 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-slate-400">
                          Administration: {request.admin_note}
                        </p>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-7 text-center">
          <PackageCheck className="mx-auto h-9 w-9 text-orange-300" />
          <h2 className="mt-3 text-xl font-bold text-white">Agility moves through Agent accounts</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Product information is visible here. Stock requests and resale distribution are available to authenticated Weave Agents.
          </p>
        </section>
      )}
    </div>
  )
}
