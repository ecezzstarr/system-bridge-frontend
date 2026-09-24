'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowRight, Megaphone, X } from 'lucide-react'

type LiveAd = {
  id: string
  title: string
  body: string
  media_url: string | null
  media_type: 'none' | 'image' | 'video'
  target_roles: string[]
  placements: string[]
  action_label: string | null
  action_url: string | null
  event_key: string | null
  start_at: string
  end_at: string | null
  frequency: 'once' | 'daily' | 'every_login' | 'persistent'
  priority: number
}

function placementFromPath(pathname: string) {
  if (pathname.includes('/system-switch')) return 'system-switch'
  if (pathname.includes('/market')) return 'marketplace'
  if (pathname.includes('/event')) return 'event'
  if (pathname.includes('/dashboard')) return 'dashboard'
  if (pathname.includes('/login')) return 'login'
  return 'app'
}

function storageKey(ad: LiveAd) {
  if (ad.frequency === 'once') return `weave:ad:once:${ad.id}`
  if (ad.frequency === 'daily') return `weave:ad:daily:${ad.id}:${new Date().toLocaleDateString('en-CA')}`
  if (ad.frequency === 'every_login') return `weave:ad:session:${ad.id}`
  return null
}

function hasBeenSeen(ad: LiveAd) {
  const key = storageKey(ad)
  if (!key) return false
  try {
    return ad.frequency === 'every_login'
      ? sessionStorage.getItem(key) === '1'
      : localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function markSeen(ad: LiveAd) {
  const key = storageKey(ad)
  if (!key) return
  try {
    if (ad.frequency === 'every_login') sessionStorage.setItem(key, '1')
    else localStorage.setItem(key, '1')
  } catch {}
}

function safeActionUrl(value: string | null) {
  if (!value) return null
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? value : null
  } catch {
    return null
  }
}

export function LiveAdSurface() {
  const pathname = usePathname()
  const placement = useMemo(() => placementFromPath(pathname || '/'), [pathname])
  const [ads, setAds] = useState<LiveAd[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])

  const loadAds = useCallback(async () => {
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch(`/api/ads?placement=${encodeURIComponent(placement)}`, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) return
      const data = await response.json()
      if (data?.success && Array.isArray(data.ads)) setAds(data.ads)
    } catch {
      // Ads should never block the participant's movement.
    }
  }, [placement])

  useEffect(() => {
    setDismissed([])
    loadAds()
    const refresh = window.setInterval(loadAds, 20000)
    const onFocus = () => loadAds()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(refresh)
      window.removeEventListener('focus', onFocus)
    }
  }, [loadAds])

  const activeAd = ads.find(ad => !dismissed.includes(ad.id) && !hasBeenSeen(ad))
  if (!activeAd) return null

  const actionUrl = safeActionUrl(activeAd.action_url)

  const dismiss = () => {
    markSeen(activeAd)
    setDismissed(current => [...current, activeAd.id])
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
      <div className="relative max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-cyan-400/20 bg-slate-950 shadow-2xl shadow-cyan-950/50">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close advertisement"
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white backdrop-blur hover:bg-black/80"
        >
          <X className="h-5 w-5" />
        </button>

        {activeAd.media_url && activeAd.media_type === 'image' && (
          <div className="max-h-[52vh] overflow-hidden bg-black">
            <img src={activeAd.media_url} alt="" className="h-full max-h-[52vh] w-full object-contain" />
          </div>
        )}

        {activeAd.media_url && activeAd.media_type === 'video' && (
          <div className="bg-black">
            <video
              src={activeAd.media_url}
              className="max-h-[52vh] w-full"
              controls
              autoPlay
              muted
              playsInline
            />
          </div>
        )}

        <div className="p-6 sm:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
            <Megaphone className="h-3.5 w-3.5" />
            WEAVE · Administration
          </div>
          <h2 className="pr-10 text-2xl font-black tracking-tight text-white sm:text-4xl">{activeAd.title}</h2>
          {activeAd.body && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300 sm:text-base">{activeAd.body}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {actionUrl && activeAd.action_label && (
              <a
                href={actionUrl}
                onClick={() => markSeen(activeAd)}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-400"
              >
                {activeAd.action_label}
                <ArrowRight className="h-4 w-4" />
              </a>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10"
            >
              Continue in Weave
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
