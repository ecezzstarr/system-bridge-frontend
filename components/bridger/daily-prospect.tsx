'use client'

import { useEffect, useState } from 'react'
import { Gift, MessageCircle, Phone, CheckCircle2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAuthHeaders } from '@/lib/auth-client'
import { openWhatsAppWithNumber } from '@/components/external-apps-nav'

export function DailyProspect() {
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [claim, setClaim] = useState<any>(null)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/bridger/daily-prospect', { headers: getAuthHeaders() })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load daily prospect')
      setClaimed(Boolean(data.claimed))
      setClaim(data.claim || null)
    } catch (err: any) {
      setError(err?.message || 'Unable to load daily prospect')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const claimToday = async () => {
    setClaiming(true)
    setError('')
    try {
      const response = await fetch('/api/bridger/daily-prospect', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No free prospect is available')
      setClaimed(true)
      setClaim(data.claim || null)
    } catch (err: any) {
      setError(err?.message || 'Unable to claim daily prospect')
    } finally {
      setClaiming(false)
    }
  }

  const phone = claim?.phone || claim?.whatsapp || claim?.phone_number
  const name = claim?.name || claim?.full_name || 'Daily Prospect'

  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-5 sm:p-6 shadow-lg">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
              <Gift className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-white">Daily Prospect</h2>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">1 FREE / DAY</span>
              </div>
              <p className="mt-1 text-sm text-slate-400">One free verified prospect each calendar day as a Bridger outreach bonus.</p>
            </div>
          </div>
          {!claimed && !loading && (
            <Button onClick={claimToday} disabled={claiming} className="bg-emerald-600 hover:bg-emerald-700">
              {claiming ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Gift className="mr-2 h-4 w-4" />}
              Claim Today&apos;s Prospect
            </Button>
          )}
        </div>

        {loading && <div className="mt-5 h-20 animate-pulse rounded-xl bg-slate-800/60" />}

        {!loading && error && <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">{error}</div>}

        {!loading && claimed && claim && (
          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-400">Claimed for today</span>
                </div>
                <p className="text-lg font-semibold text-white">{name}</p>
                {phone && <p className="text-sm text-slate-400">{phone}</p>}
              </div>
              {phone && <Button onClick={() => openWhatsAppWithNumber(phone, `Hi ${name}, this is your Bridger from Weave.`)} className="bg-green-600 hover:bg-green-700"><MessageCircle className="mr-2 h-4 w-4" />Message Prospect</Button>}
            </div>
            <p className="mt-3 text-xs text-slate-500">Your one free Daily Prospect has been claimed. The next free prospect becomes available on the next calendar day.</p>
          </div>
        )}

        {!loading && !claimed && !error && <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400"><Phone className="h-4 w-4 text-emerald-400" />Claim once each day, then take the prospect directly into your outreach.</div>}
      </div>
    </section>
  )
}
