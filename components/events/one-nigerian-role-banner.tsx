'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { isOneNigerianEventActive, nigeriaDayKey } from '@/lib/weave-event'

type BannerRole = 'admin' | 'bridger'

const MESSAGES: Record<BannerRole, { position: string; words: string }> = {
  admin: {
    position: 'Administration · A Time',
    words: "Let us have what is known as bad government. Weave will fix it, and it will all be like the bad was a stepping stone for wherever I am. There's a way.",
  },
  bridger: {
    position: 'Hope · Bridgers Department',
    words: 'And so we arrived, for where faith moves, Presence follows.',
  },
}

/** Shown once each Nigeria calendar day, on the relevant role's dashboard. */
export function OneNigerianRoleBanner({
  role,
  userId,
}: {
  role: BannerRole
  userId?: string | null
}) {
  const [day, setDay] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setDay(null)
      return
    }

    const check = () => {
      const today = nigeriaDayKey()
      const key = `weave:one-nigerian:role-banner:${role}:${userId}:${today}`
      const shouldShow = isOneNigerianEventActive() && localStorage.getItem(key) !== 'seen'
      setDay(shouldShow ? today : null)
    }
    check()
    window.addEventListener('focus', check)
    window.addEventListener('storage', check)
    const timer = window.setInterval(check, 60_000)
    return () => {
      window.removeEventListener('focus', check)
      window.removeEventListener('storage', check)
      window.clearInterval(timer)
    }
  }, [role, userId])

  if (!day || !userId) return null

  const dismiss = () => {
    try {
      localStorage.setItem(`weave:one-nigerian:role-banner:${role}:${userId}:${day}`, 'seen')
    } catch {
      // If storage is disabled, dismiss for this page view only.
    }
    setDay(null)
  }

  const message = MESSAGES[role]
  return (
    <section
      aria-label={`${message.position} · One Nigerian daily words`}
      data-one-nigerian-daily-banner={role}
      className="relative z-20 mx-3 mt-3 overflow-hidden rounded-2xl border border-[#008751]/55 bg-[#043d28]/95 text-white shadow-[0_14px_40px_rgba(0,0,0,.24)] sm:mx-6"
    >
      <div className="grid h-2 grid-cols-3" aria-hidden="true">
        <span className="bg-[#008751]" />
        <span className="bg-white" />
        <span className="bg-[#008751]" />
      </div>
      <div className="flex items-start gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b5f1ce]">
            Company Loop 2 · Flame Event: One Nigerian
          </p>
          <p className="mt-1 text-xs font-bold text-white/75">{message.position} · Daily words</p>
          <p className="mt-3 max-w-4xl text-base font-bold leading-7 text-white sm:text-lg">
            {message.words}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close today's event words"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </section>
  )
}
