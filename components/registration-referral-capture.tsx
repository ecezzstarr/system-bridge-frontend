'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { CheckCircle2, Gift, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function RegistrationReferralCapture() {
  const pathname = usePathname()
  const router = useRouter()
  const [value, setValue] = useState('')
  const [attached, setAttached] = useState('')

  useEffect(() => {
    if (pathname !== '/register' || typeof window === 'undefined') return
    const ref = new URLSearchParams(window.location.search).get('ref')?.trim() || ''
    setValue(ref)
    setAttached(ref)
  }, [pathname])

  if (pathname !== '/register') return null

  const attachReferral = () => {
    const code = value.trim()
    if (!code || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    params.set('ref', code)
    const query = params.toString()
    setAttached(code)
    router.replace(`/register${query ? `?${query}` : ''}`, { scroll: false })
  }

  const changeReferral = () => setAttached('')

  return (
    <section
      data-registration-referral-capture="true"
      className="mb-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[.04] p-4"
    >
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-emerald-300" />
        <p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">Referral entry</p>
      </div>

      {attached ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <p className="text-xs font-black">Referral attached before registration</p>
            </div>
            <p className="mt-1 break-all font-mono text-xs text-white">{attached}</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">
              If you continue as an Agent or Bridger, WEAVE carries this referral identity into account creation.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={changeReferral}
            className="border-white/10 bg-white/[.03] text-[10px] font-black uppercase tracking-wider text-slate-300"
          >
            Change code
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-xs leading-5 text-slate-300">
            Were you referred by a WEAVE Agent or Bridger? Enter the referral code before registration so the system preserves who carried you into WEAVE.
          </p>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={value}
                onChange={event => setValue(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    attachReferral()
                  }
                }}
                placeholder="Agent or Bridger referral code"
                autoComplete="off"
                className="border-slate-700 bg-slate-950 pl-10 text-xs text-white placeholder:text-slate-600"
              />
            </div>
            <Button
              type="button"
              onClick={attachReferral}
              disabled={!value.trim()}
              className="bg-emerald-500 px-4 text-[10px] font-black uppercase tracking-wider text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
            >
              Attach
            </Button>
          </div>
          <p className="text-[10px] leading-4 text-slate-500">
            If you opened an Agent or Bridger referral link, the code is attached automatically here. You do not need to type it again.
          </p>
        </div>
      )}
    </section>
  )
}
