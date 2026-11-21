'use client'

import Link from 'next/link'
import { Download, Smartphone } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const PUBLIC_ENTRY_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/client/login',
  '/client/register',
])

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

export function PublicAppDownloadEntry() {
  const pathname = usePathname()
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setInstalled(isStandalone())
    const media = window.matchMedia('(display-mode: standalone)')
    const sync = () => setInstalled(isStandalone())
    media.addEventListener?.('change', sync)
    window.addEventListener('appinstalled', sync)
    return () => {
      media.removeEventListener?.('change', sync)
      window.removeEventListener('appinstalled', sync)
    }
  }, [])

  if (!pathname || pathname === '/download' || !PUBLIC_ENTRY_ROUTES.has(pathname) || installed) return null

  return (
    <div className="fixed bottom-3 right-3 z-[80] max-w-[calc(100vw-1.5rem)] sm:bottom-5 sm:right-5" data-weave-public-download-entry>
      <Link
        href="/download"
        className="group flex min-h-12 items-center gap-3 rounded-2xl border border-cyan-200/20 bg-[#04111f]/95 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,.45)] backdrop-blur-xl transition hover:border-cyan-200/35 hover:bg-[#07192a] active:scale-[.99]"
        aria-label="Download the WEAVE app"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-slate-950">
          <Download className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.16em] text-cyan-200">
            <Smartphone className="h-3 w-3" /> Official WEAVE App
          </span>
          <span className="mt-0.5 block text-xs font-black text-white">Download / Install</span>
        </span>
      </Link>
    </div>
  )
}
