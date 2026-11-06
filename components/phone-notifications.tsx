'use client'
import { useEffect, useState } from 'react'

export function PhoneNotifications({ userId }: { userId: string }) {
  const [message, setMessage] = useState('Receive alerts while WEAVE is in the background')
  const [busy, setBusy] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const sync = async (ask: boolean) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setMessage('Use a supported browser. On iPhone, add WEAVE to your Home Screen first.')
      return
    }
    if (ask && Notification.permission === 'default') await Notification.requestPermission()
    if (Notification.permission !== 'granted') {
      setMessage(Notification.permission === 'denied' ? 'Allow notifications in your phone browser settings.' : 'Allow phone notifications to receive background alerts.')
      return
    }
    setBusy(true)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      if (!token) return
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      const response = await fetch('/api/notifications/push', { headers, cache: 'no-store' })
      if (!response.ok) throw new Error('Phone notifications unavailable. Try again.')
      const { publicKey } = await response.json()
      const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      await navigator.serviceWorker.ready
      const key = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
      const saved = await fetch('/api/notifications/push', { method: 'POST', headers, body: JSON.stringify(subscription.toJSON()) })
      if (!saved.ok) throw new Error('Could not save phone notifications. Try again.')
      setEnabled(true)
      setMessage('Phone notifications enabled, including when WEAVE is in the background.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not enable phone notifications. Try again.') }
    finally { setBusy(false) }
  }
  useEffect(() => { void sync(false) }, [userId])
  return <div className="border-b border-slate-700 px-3 py-3">
    <p role="status" className="mb-2 text-xs text-slate-300">{message}</p>
    {!enabled && <button type="button" disabled={busy} onClick={() => void sync(true)} className="rounded-lg bg-cyan-400/15 px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50">{busy ? 'Enabling…' : 'Enable phone notifications'}</button>}
  </div>
}
