'use client'

import { useEffect, useState } from 'react'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

export function PWARegister() {
  const [availableRelease, setAvailableRelease] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const currentRelease = process.env.NEXT_PUBLIC_WEAVE_RELEASE_SHA || ''
    if (!/^[a-f0-9]{40}$/.test(currentRelease)) return
    let cancelled = false
    let checking = false
    const checkRelease = async () => {
      if (document.visibilityState === 'hidden' || checking) return
      checking = true
      try {
        const response = await fetchWithTimeout('/api/health', { cache: 'no-store' }, 10000)
        const health = await response.json()
        if (!cancelled && response.ok && health.status === 'healthy' &&
          /^[a-f0-9]{40}$/.test(health.releaseSha) && health.releaseSha !== currentRelease) {
          setAvailableRelease(health.releaseSha)
        }
      } catch { /* Offline devices keep their current screen and session. */ }
      finally { checking = false }
    }
    void checkRelease()
    const interval = window.setInterval(() => void checkRelease(), 60000)
    const resume = () => void checkRelease()
    window.addEventListener('focus', resume)
    window.addEventListener('online', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', resume)
      window.removeEventListener('online', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [])

  useEffect(() => {
    // Capture the install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const registerWorker = () => {
      if (!('serviceWorker' in navigator) || window.location.hostname === 'localhost') return
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(
        (registration) => {
          console.log('Service Worker registered with scope:', registration.scope)
          void registration.update()
        },
        (err) => {
          console.log('Service Worker registration failed:', err)
        }
      )
    }

    if (document.readyState === 'complete') registerWorker()
    else window.addEventListener('load', registerWorker, { once: true })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('load', registerWorker)
    }
  }, [])

  const refreshApp = async () => {
    setRefreshing(true)
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        await registration?.update()
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.filter(key => key.startsWith('weave-')).map(key => caches.delete(key)))
      }
    } catch { /* The network-first reload can still recover the current app. */ }
    window.location.reload()
  }

  return availableRelease ? (
    <aside role="status" aria-label="WEAVE app update" className="fixed inset-x-3 bottom-3 z-[200] mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-cyan-300/40 bg-slate-950 p-4 text-sm text-white shadow-2xl">
      <p>A WEAVE update is ready. Save your work, then refresh to use the latest app.</p>
      <button type="button" onClick={() => void refreshApp()} disabled={refreshing} className="shrink-0 rounded-xl bg-cyan-300 px-4 py-2 font-bold text-slate-950 disabled:opacity-60">
        {refreshing ? 'Refreshing…' : 'Refresh app'}
      </button>
    </aside>
  ) : null
}
