'use client'

import { useEffect, useState } from 'react'
import { Building2, CheckCircle2, RefreshCw, Save, Settings2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

type SystemRow = {
  system_key: string
  name: string
  category: string
  summary: string
  delivery_model: string
  price_gbp: number | string
  published: boolean
}

type OrderRow = {
  id: string
  system_key: string
  system_name: string
  buyer_name: string
  buyer_email: string
  buyer_role: string
  quoted_price_gbp: number | string
  status: string
  acquisition_note?: string | null
  admin_note?: string | null
  created_at: string
}

const statuses = ['requested','reviewing','approved','in_contract','building','delivered','declined']

function gbp(value: number | string) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export default function EnterpriseSystemsAdminPage() {
  const { user, token, isInitialized } = useAuth()
  const [systems, setSystems] = useState<SystemRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  const headers = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  })

  const load = async () => {
    if (!token) return
    setBusy('load')
    try {
      const res = await fetch('/api/admin/enterprise-systems', { headers: headers(), cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to load Enterprise Systems Workshop')
      setSystems(data.systems || [])
      setOrders(data.orders || [])
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load Enterprise Systems Workshop')
    } finally {
      setBusy('')
    }
  }

  useEffect(() => {
    if (isInitialized && token && user?.role === 'admin') void load()
  }, [isInitialized, token, user?.role])

  const saveSystem = async (system: SystemRow) => {
    setBusy(`system:${system.system_key}`)
    try {
      const res = await fetch('/api/admin/enterprise-systems', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({
          action: 'update_system',
          systemKey: system.system_key,
          priceGbp: Number(system.price_gbp),
          published: system.published,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to update system')
      setMessage(`${system.name} updated.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update system')
    } finally {
      setBusy('')
    }
  }

  const updateOrder = async (order: OrderRow) => {
    setBusy(`order:${order.id}`)
    try {
      const res = await fetch('/api/admin/enterprise-systems', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({
          action: 'update_order',
          orderId: order.id,
          status: order.status,
          adminNote: order.admin_note || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to update acquisition')
      setMessage(`${order.system_name} acquisition updated.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update acquisition')
    } finally {
      setBusy('')
    }
  }

  if (!isInitialized) return <main className="p-8 text-base text-slate-300">Opening Enterprise Systems Workshop...</main>
  if (user?.role !== 'admin') return <main className="p-8 text-base text-red-300">Administration access required.</main>

  return (
    <main className="mx-auto max-w-[1500px] space-y-8 p-5 text-white md:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-300">Administration · Enterprise Systems</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">Enterprise Systems Workshop</h1>
          <p className="mt-3 max-w-4xl text-base leading-7 text-slate-300">
            Operate the high-value systems sold through the Enterprise Exchange. Prices are contract-scale GBP values; Administration controls publication and advances each acquisition through review, contract, build and delivery.
          </p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold">
          <RefreshCw className={`h-4 w-4 ${busy === 'load' ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      {message && <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] p-4 text-base text-cyan-100">{message}</div>}

      <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-amber-300" />
          <h2 className="text-2xl font-black">Systems for sale</h2>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {systems.map((system, index) => (
            <article key={system.system_key} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <div className="flex items-start gap-4">
                <Building2 className="mt-1 h-6 w-6 shrink-0 text-cyan-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-black text-white">{system.name}</p>
                  <p className="mt-1 text-sm font-black uppercase tracking-wider text-slate-500">{system.category}</p>
                  <p className="mt-3 text-base leading-7 text-slate-300">{system.summary}</p>
                  <p className="mt-2 text-sm text-slate-500">{system.delivery_model}</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={system.published}
                    onChange={event => setSystems(prev => prev.map((row, i) => i === index ? { ...row, published: event.target.checked } : row))}
                  />
                  Live
                </label>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex-1">
                  <span className="text-sm font-bold text-slate-400">Base price · GBP</span>
                  <input
                    type="number"
                    min="1000000"
                    step="100000"
                    value={system.price_gbp}
                    onChange={event => setSystems(prev => prev.map((row, i) => i === index ? { ...row, price_gbp: event.target.value } : row))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-base font-bold text-white"
                  />
                  <span className="mt-1 block text-sm text-amber-200">{gbp(system.price_gbp)}</span>
                </label>
                <button onClick={() => void saveSystem(system)} disabled={busy === `system:${system.system_key}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">
                  <Save className="h-4 w-4" /> Save
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-300" />
          <h2 className="text-2xl font-black">Acquisition movement</h2>
          <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-slate-300">{orders.length}</span>
        </div>

        {orders.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-white/10 p-6 text-base text-slate-400">No enterprise acquisition request has been submitted yet.</p>
        ) : (
          <div className="mt-5 space-y-4">
            {orders.map((order, index) => (
              <article key={order.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <div className="grid gap-5 xl:grid-cols-[1.1fr_.75fr_1.25fr]">
                  <div>
                    <p className="text-xl font-black text-white">{order.system_name}</p>
                    <p className="mt-1 text-base text-cyan-300">{order.buyer_name || 'Buyer'} · {order.buyer_role}</p>
                    <p className="mt-1 text-sm text-slate-500">{order.buyer_email}</p>
                    <p className="mt-3 text-2xl font-black text-amber-200">{gbp(order.quoted_price_gbp)}</p>
                    <p className="mt-1 text-sm text-slate-500">{new Date(order.created_at).toLocaleString()}</p>
                  </div>

                  <label>
                    <span className="text-sm font-bold text-slate-400">Status</span>
                    <select
                      value={order.status}
                      onChange={event => setOrders(prev => prev.map((row, i) => i === index ? { ...row, status: event.target.value } : row))}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-base text-white"
                    >
                      {statuses.map(status => <option key={status} value={status}>{status.replaceAll('_',' ')}</option>)}
                    </select>
                  </label>

                  <div>
                    <p className="text-sm font-bold text-slate-400">Buyer requirement</p>
                    <p className="mt-2 min-h-16 rounded-xl border border-white/5 bg-black/20 p-3 text-base leading-7 text-slate-300">{order.acquisition_note || 'No additional scope note.'}</p>
                    <textarea
                      value={order.admin_note || ''}
                      onChange={event => setOrders(prev => prev.map((row, i) => i === index ? { ...row, admin_note: event.target.value } : row))}
                      rows={3}
                      placeholder="Administration note..."
                      className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-slate-950 p-3 text-base text-white"
                    />
                    <button onClick={() => void updateOrder(order)} disabled={busy === `order:${order.id}`} className="mt-3 w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">
                      Save acquisition movement
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
