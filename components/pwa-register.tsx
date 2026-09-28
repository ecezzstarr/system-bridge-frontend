'use client'

import { useEffect } from 'react'

export function PWARegister() {
  useEffect(() => {
    // Capture the install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const registerWorker = () => {
      if (!('serviceWorker' in navigator) || window.location.hostname === 'localhost') return
      navigator.serviceWorker.register('/sw.js').then(
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

  return null
}
