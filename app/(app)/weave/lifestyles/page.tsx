'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, Gamepad2, Loader2, LockKeyhole, Megaphone, Sparkles } from 'lucide-react'
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
  role: string
  source: 'role_monthly_subscription' | 'administration' | 'unsupported'
  positionScoped: true
}

export default function WeaveLifestylesPage() {
  const [access, setAccess] = useState<AccessState | null>(null)
  const [carrierOpen, setCarrierOpen] = useState(false)
  const [carrierReason, setCarrierReason] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const headers = authHeaders()
      const [lifestyleResponse, carrierResponse] = await Promise.all([
        fetch('/api/weave/lifestyles/access', { headers, cache: 'no-store' }),
        fetch('/api/carrier/access', { headers, cache: 'no-store' }),
      ])
      const data = await lifestyleResponse.json()
      const carrierData = await carrierResponse.json().catch(() => ({}))
      if (!lifestyleResponse.ok) throw new Error(data.error || 'Could not read WEAVE Lifestyle access')
      setAccess(data.access)
      setCarrierOpen(Boolean(carrierResponse.ok && carrierData?.access?.active))
      setCarrierReason(String(carrierData?.access?.reason || ''))
    } catch (error: any) {
      toast.error(error.message || 'Could not read WEAVE Lifestyle access')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const roleLabel = useMemo(() => {
    const role = access?.role || 'WEAVE'
    return role === 'bridger' ? 'Bridger' : role === 'agent' ? 'Agent' : role === 'client' ? 'Client' : role === 'admin' ? 'Administration' : 'WEAVE'
  }, [access?.role])
  const managerAvailable = access?.role === 'agent' || access?.role === 'bridger'

  return (
    <main className="weave-operating-environment min-h-[70vh] overflow-hidden border-y border-yellow-300/15 bg-[#080b12]/78 px-4 py-6 sm:rounded-[2rem] sm:border sm:px-7">
      <header className="border-b border-white/10 pb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.34em] text-yellow-300/70">WEAVE Lifestyle · Position Access</p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">LIFESTYLE</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Your existing monthly {roleLabel} subscription covers Lifestyle. There is no second Lifestyle subscription. Your WEAVE position determines which lifestyles, identities and environments open to you.</p>
          </div>
          <Sparkles className="h-8 w-8 shrink-0 text-yellow-400" />
        </div>
      </header>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-yellow-400" /></div>
      ) : (
        <>
          <section className="mt-6 border-y border-white/10 py-4" data-lifestyle-entitlement="position-subscription">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">{roleLabel} monthly subscription</p>
                <p className="mt-1 text-sm font-black text-white">{access?.active ? 'LIFESTYLE OPEN' : 'LIFESTYLE CLOSED'}</p>
                <p className="mt-1 text-xs text-slate-500">One subscription → every Lifestyle allowed by your current position.</p>
                {access?.expiresAt && <p className="mt-1 text-xs text-slate-500">Current period ends {new Date(access.expiresAt).toLocaleDateString()}</p>}
              </div>
              {!access?.active && (
                <div className="max-w-sm border-l border-amber-300/20 pl-3 text-xs leading-5 text-amber-100/70">
                  <span className="inline-flex items-center gap-2 font-black text-amber-200"><LockKeyhole className="h-4 w-4" />Renew your {roleLabel} monthly subscription</span>
                  <p className="mt-1 text-slate-500">Lifestyle reopens automatically when the position subscription returns to active. No separate Lifestyle payment is taken.</p>
                </div>
              )}
            </div>
          </section>

          <section className="mt-7">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Lifestyle Grounds</p>
                <p className="mt-1 text-xs text-slate-500">The catalog changes with your WEAVE position.</p>
              </div>
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-yellow-300/60">{roleLabel} position</p>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Link href="/arena" className="group border-y border-yellow-400/20 bg-yellow-400/[0.04] px-4 py-5 transition hover:bg-yellow-400/[0.08] sm:border">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">WEAVE Arena</p>
                    <h2 className="mt-1 text-xl font-black text-white">ARENA LIFESTYLE</h2>
                    <p className="mt-2 text-xs leading-5 text-slate-400">The live Arena can be watched directly. Playing as Ace opens only when your subscription is active and your current position qualifies for the Ace identity.</p>
                  </div>
                  <Gamepad2 className="h-8 w-8 shrink-0 text-yellow-400" />
                </div>
              </Link>

              {managerAvailable && (
                access?.active ? (
                  <Link href="/manager/dashboard" className="group border-y border-amber-300/15 bg-amber-300/[0.035] px-4 py-5 transition hover:bg-amber-300/[0.07] sm:border" data-lifestyle="manager">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Manager Lifestyle</p>
                        <h2 className="mt-1 text-xl font-black text-white">ENTER MANAGER</h2>
                        <p className="mt-2 text-xs leading-5 text-slate-400">Available to Agent and Bridger positions. Your existing monthly position subscription covers the Lifestyle gate; Manager keeps its own work, document and standing rules.</p>
                      </div>
                      <BriefcaseBusiness className="h-8 w-8 shrink-0 text-amber-300" />
                    </div>
                  </Link>
                ) : (
                  <LockedGround title="Manager Lifestyle" detail={`Renew the ${roleLabel} monthly subscription to reopen this Lifestyle.`} />
                )
              )}

              {carrierOpen ? (
                <Link href="/weave/carrier" className="group border-y border-sky-300/15 bg-sky-400/[0.03] px-4 py-5 transition hover:bg-sky-400/[0.07] sm:border">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">Carrier Entrance</p>
                      <h2 className="mt-1 text-xl font-black text-white">ENTER AS ACE</h2>
                      <p className="mt-2 text-xs leading-5 text-slate-400">Your active subscription covers Lifestyle and your current position has opened Carrier. Inside this environment the operating identity is Ace.</p>
                    </div>
                    <Megaphone className="h-8 w-8 shrink-0 text-sky-300" />
                  </div>
                </Link>
              ) : (
                <LockedGround title="Carrier · Ace" detail={carrierReason || (access?.active ? 'Your current position does not open this Lifestyle identity.' : `Renew the ${roleLabel} monthly subscription first.`)} />
              )}

              <div className="border-y border-white/10 px-4 py-5 sm:border" data-lifestyle-position-rule="true">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Position rule</p>
                <h2 className="mt-1 text-xl font-black text-white">ONE SUBSCRIPTION · POSITION-SCOPED ACCESS</h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">Lifestyle does not sell the same identity to every user. The monthly subscription opens the layer; Agent, Bridger and Client position determines what can be entered inside it.</p>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

function LockedGround({title,detail}:{title:string;detail:string}){
  return <div className="border-y border-white/10 px-4 py-5 sm:border" data-lifestyle-locked="true">
    <div className="flex items-start gap-3">
      <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-slate-600"/>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{title}</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
      </div>
    </div>
  </div>
}
