'use client'

import { useEffect, useState } from 'react'
import { Boxes, Clock3, RefreshCw, Save, ShoppingBag } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

type Item = {
  item_key: string
  name: string
  category: string
  description: string
  price_flame_coin: number | string
  published: boolean
}

type Blueprint = {
  blueprint_key: string
  name: string
  district: string
  description: string
  build_hours: number
  required_item_key: string | null
  required_item_quantity: number
  published: boolean
}

export default function ClientBuildCatalogAdminPage() {
  const { token, user, isInitialized } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [blueprints, setBlueprints] = useState<Blueprint[]>([])
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
      const res = await fetch('/api/admin/client-build-catalog', { headers: headers(), cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to load')
      setItems(data.items || [])
      setBlueprints(data.blueprints || [])
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load Client build catalog')
    } finally {
      setBusy('')
    }
  }

  useEffect(() => {
    if (isInitialized && token && user?.role === 'admin') void load()
  }, [isInitialized, token, user?.role])

  const saveItem = async (item: Item) => {
    setBusy(`item:${item.item_key}`)
    try {
      const res = await fetch('/api/admin/client-build-catalog', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({
          kind: 'item',
          key: item.item_key,
          priceFlameCoin: Number(item.price_flame_coin),
          published: item.published,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to save item')
      setMessage(`${item.name} updated.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save item')
    } finally {
      setBusy('')
    }
  }

  const saveBlueprint = async (blueprint: Blueprint) => {
    setBusy(`blueprint:${blueprint.blueprint_key}`)
    try {
      const res = await fetch('/api/admin/client-build-catalog', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({
          kind: 'blueprint',
          key: blueprint.blueprint_key,
          buildHours: Number(blueprint.build_hours),
          published: blueprint.published,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to save blueprint')
      setMessage(`${blueprint.name} updated.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save blueprint')
    } finally {
      setBusy('')
    }
  }

  if (!isInitialized) return <main className="p-8 text-base text-slate-300">Opening Client Build Catalog...</main>
  if (user?.role !== 'admin') return <main className="p-8 text-base text-red-300">Administration access required.</main>

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-5 text-white md:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-300">Administration · Client Building</p>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">Client Build Catalog</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
            Control what Clients can buy and build inside their File Folders. Component prices are in Flame Coin. Blueprint build time and visibility can be changed here without redeploying WEAVE.
          </p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold">
          <RefreshCw className={`h-4 w-4 ${busy === 'load' ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      {message && <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] p-4 text-base text-cyan-100">{message}</div>}

      <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-emerald-300" />
          <h2 className="text-xl font-black">Build Market components</h2>
        </div>
        <p className="mt-2 text-base text-slate-400">These are the things Clients spend Flame Coin on before starting builds.</p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {items.map((item, index) => (
            <article key={item.item_key} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black text-white">{item.name}</p>
                  <p className="mt-1 text-sm font-bold uppercase tracking-wider text-slate-500">{item.category} · {item.item_key}</p>
                  <p className="mt-3 text-base leading-7 text-slate-300">{item.description}</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={item.published}
                    onChange={event => setItems(prev => prev.map((row, i) => i === index ? { ...row, published: event.target.checked } : row))}
                  />
                  Visible
                </label>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex-1">
                  <span className="text-sm font-bold text-slate-400">Price · Flame Coin</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price_flame_coin}
                    onChange={event => setItems(prev => prev.map((row, i) => i === index ? { ...row, price_flame_coin: event.target.value } : row))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-base text-white"
                  />
                </label>
                <button onClick={() => void saveItem(item)} disabled={busy === `item:${item.item_key}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">
                  <Save className="h-4 w-4" /> Save price
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-center gap-2">
          <Boxes className="h-5 w-5 text-violet-300" />
          <h2 className="text-xl font-black">Build blueprints</h2>
        </div>
        <p className="mt-2 text-base text-slate-400">Blueprints become timed systems after the Client owns the required component.</p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {blueprints.map((blueprint, index) => (
            <article key={blueprint.blueprint_key} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black text-white">{blueprint.name}</p>
                  <p className="mt-1 text-sm font-bold uppercase tracking-wider text-slate-500">{blueprint.district} · {blueprint.blueprint_key}</p>
                  <p className="mt-3 text-base leading-7 text-slate-300">{blueprint.description}</p>
                  <p className="mt-3 text-sm text-cyan-300">Requires: {blueprint.required_item_quantity || 0} × {blueprint.required_item_key || 'No component'}</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={blueprint.published}
                    onChange={event => setBlueprints(prev => prev.map((row, i) => i === index ? { ...row, published: event.target.checked } : row))}
                  />
                  Visible
                </label>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex-1">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-400"><Clock3 className="h-4 w-4" /> Base build hours</span>
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={blueprint.build_hours}
                    onChange={event => setBlueprints(prev => prev.map((row, i) => i === index ? { ...row, build_hours: Number(event.target.value) } : row))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-base text-white"
                  />
                </label>
                <button onClick={() => void saveBlueprint(blueprint)} disabled={busy === `blueprint:${blueprint.blueprint_key}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                  <Save className="h-4 w-4" /> Save blueprint
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
