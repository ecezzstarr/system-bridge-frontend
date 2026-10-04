'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Gamepad2, Loader2, LockKeyhole, Megaphone, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

type AccessState = {
  active: boolean
  status: string
  expiresAt: string | null
}

export default function WeaveLifestylesPage() {
  const [access, setAccess] = useState<AccessState | null>(null)
  const [monthlyPrice, setMonthlyPrice] = useState(0)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/weave/lifestyles/access', { headers: authHeaders(), cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not read Subscribed WEAVE access')
      setAccess(data.access)
      setMonthlyPrice(Number(data.monthlyPrice || 0))
    } catch (error: any) {
      toast.error(error.message || 'Could not read Subscribed WEAVE access')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const subscribe = async () => {
    setSubscribing(true)
    try {
      const response = await fetch('/api/weave/lifestyles/subscribe', {
        method: 'POST',
        headers: authHeaders(),
        body: '{}',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not open Subscribed WEAVE')
      setAccess(data.access)
      toast.success('Subscribed WEAVE is open')
    } catch (error: any) {
      toast.error(error.message || 'Could not open Subscribed WEAVE')
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <main className="weave-operating-environment min-h-[70vh] overflow-hidden border-y border-yellow-300/15 bg-[#080b12]/78 px-4 py-6 sm:rounded-[2rem] sm:border sm:px-7">
      <header className="border-b border-white/10 pb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.34em] text-yellow-300/70">Monthly Weave Access</p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">SUBSCRIBED WEAVE</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Another layer of Weave. One subscription opens different lifestyles, identities and environments without changing your main Weave role.</p>
          </div>
          <Sparkles className="h-8 w-8 shrink-0 text-yellow-400" />
        </div>
      </header>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-yellow-400" /></div>
      ) : (
        <>
          <section className="mt-6 border-y border-white/10 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Access</p>
                <p className="mt-1 text-sm font-black text-white">{access?.active ? 'OPEN' : 'CLOSED'}</p>
                {access?.expiresAt && <p className="mt-1 text-xs text-slate-500">Until {new Date(access.expiresAt).toLocaleDateString()}</p>}
              </div>
              {!access?.active && (
                monthlyPrice > 0 ? (
                  <Button onClick={subscribe} disabled={subscribing} className="bg-yellow-400 font-black text-slate-950 hover:bg-yellow-300">
                    {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : `OPEN · ${monthlyPrice} FLAME COIN / MONTH`}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><LockKeyhole className="h-4 w-4" /> Monthly price awaiting Administration</div>
                )
              )}
            </div>
          </section>

          <section className="mt-7">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Lifestyle Grounds</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Link href="/arena" className="group border-y border-yellow-400/20 bg-yellow-400/[0.04] px-4 py-5 transition hover:bg-yellow-400/[0.08] sm:border">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">Weave Arena</p>
                    <h2 className="mt-1 text-xl font-black text-white">ACE</h2>
                    <p className="mt-2 text-xs leading-5 text-slate-400">Choose a supported online game, stream it through Weave, carry a seasonal Ace record and enter the live Arena ground.</p>
                  </div>
                  <Gamepad2 className="h-8 w-8 shrink-0 text-yellow-400" />
                </div>
              </Link>

              <Link href="/weave/carrier" className="group border-y border-sky-300/15 bg-sky-400/[0.03] px-4 py-5 transition hover:bg-sky-400/[0.07] sm:border">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">Carrier</p>
                    <h2 className="mt-1 text-xl font-black text-white">ACE PUBLISHING</h2>
                    <p className="mt-2 text-xs leading-5 text-slate-400">Publish each Ace game into a direct public Carrier, send it through WhatsApp or the web, and see who enters, supports and carries it onward.</p>
                  </div>
                  <Megaphone className="h-8 w-8 shrink-0 text-sky-300" />
                </div>
              </Link>

              <div className="border-y border-white/10 px-4 py-5 sm:border">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">More lifestyles</p>
                <h2 className="mt-1 text-xl font-black text-white">FORMING</h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">Subscribed WEAVE is the layer. Arena is one lifestyle inside it, and Carrier moves those activities beyond the logged-in world.</p>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  )
}
