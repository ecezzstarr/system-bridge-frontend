'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Download, Smartphone } from 'lucide-react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

export function WeaveInstallButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setInstalled(isStandalone())
    const existing = (window as Window & { deferredPrompt?: InstallPromptEvent }).deferredPrompt
    if (existing) setPrompt(existing)

    const beforeInstall = (event: Event) => {
      event.preventDefault()
      const installEvent = event as InstallPromptEvent
      ;(window as Window & { deferredPrompt?: InstallPromptEvent }).deferredPrompt = installEvent
      setPrompt(installEvent)
    }
    const appInstalled = () => {
      setInstalled(true)
      setPrompt(null)
      setMessage('WEAVE is installed on this device.')
      delete (window as Window & { deferredPrompt?: InstallPromptEvent }).deferredPrompt
    }

    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', appInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', appInstalled)
    }
  }, [])

  const install = async () => {
    const activePrompt = prompt || (window as Window & { deferredPrompt?: InstallPromptEvent }).deferredPrompt || null
    if (!activePrompt) {
      setMessage('Use your browser menu and choose “Install app” or “Add to Home screen”. The installed WEAVE stays connected to the current live release.')
      return
    }
    await activePrompt.prompt()
    const choice = await activePrompt.userChoice
    if (choice.outcome === 'accepted') {
      setMessage('WEAVE installation accepted.')
      setPrompt(null)
      delete (window as Window & { deferredPrompt?: InstallPromptEvent }).deferredPrompt
    } else {
      setMessage('Installation was not completed.')
    }
  }

  if (installed) {
    return <div className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[.06] px-5 py-3 text-sm font-black text-emerald-200"><CheckCircle2 className="h-4 w-4"/>WEAVE Installed</div>
  }

  return <div>
    <button onClick={() => void install()} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950"><Download className="h-4 w-4"/>Install WEAVE</button>
    {message&&<p className="mt-3 max-w-xl text-xs leading-5 text-slate-400"><Smartphone className="mr-1 inline h-3.5 w-3.5"/>{message}</p>}
  </div>
}

declare global {
  interface Window {
    deferredPrompt?: InstallPromptEvent
  }
}
