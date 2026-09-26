'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, ChevronLeft, Eye, Moon, Save, ShieldCheck, UserCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

export default function ClientSettings() {
  const { user, token } = useAuth()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState({
    showPresence: true,
    emailNotifications: true,
    darkMode: true,
  })

  useEffect(() => {
    setName(user?.name || '')
    try {
      const savedSettings = localStorage.getItem('user_feature_settings')
      if (savedSettings) setSettings({ ...settings, ...JSON.parse(savedSettings) })
    } catch {
      // Local display preferences must not block the Client settings surface.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const toggleSetting = (key: keyof typeof settings) => {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    try { localStorage.setItem('user_feature_settings', JSON.stringify(next)) } catch {}
  }

  const handleSave = async () => {
    if (!user || !token) return
    setError('')
    setMessage('')

    if (password && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password && password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    const changedName = name.trim() && name.trim() !== user.name ? name.trim() : undefined
    if (!changedName && !password) {
      setMessage('Your Client identity is already current. Display preferences save immediately.')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: changedName,
          newPassword: password || undefined,
          confirmPassword: password ? confirmPassword : undefined,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to update Client identity')
      setPassword('')
      setConfirmPassword('')
      setMessage('Client identity updated in the live WEAVE account record.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update Client identity')
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) return null

  return (
    <main className="mx-auto w-full max-w-5xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-sky-300/15 bg-[#030a15]/72">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(14,165,233,.13),transparent_34%),radial-gradient(circle_at_86%_0%,rgba(139,92,246,.08),transparent_28%)] p-5 md:p-7">
          <Link href="/client/functions" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-sky-200"><ChevronLeft className="h-4 w-4"/>Client Operating Room</Link>
          <div className="mt-4 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10"><UserCircle className="h-5 w-5 text-sky-200"/></div>
            <div>
              <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Client Identity + Interface Control</p>
              <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">Settings belong to the Client who is signed in.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Identity and password changes update the authenticated WEAVE account. Display preferences remain local to this device.</p>
            </div>
          </div>
        </header>

        <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_340px]">
          <section className="weave-reading-surface rounded-3xl p-5 md:p-6">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Live account identity</p>
              <div className="mt-4 grid gap-3">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Email · read only</label>
                  <Input value={user.email || ''} disabled className="border-white/10 bg-black/25 text-slate-300"/>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Client name</label>
                  <Input value={name} onChange={event=>setName(event.target.value)} className="border-white/10 bg-black/25 text-white"/>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-6">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Security</p>
              <div className="mt-4 grid gap-3">
                <Input type="password" value={password} onChange={event=>setPassword(event.target.value)} placeholder="New password · leave blank to keep current" className="border-white/10 bg-black/25 text-white"/>
                <Input type="password" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} placeholder="Confirm new password" className="border-white/10 bg-black/25 text-white"/>
              </div>
            </div>

            {message && <div className="mt-5 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.05] px-4 py-3 text-sm text-emerald-100">{message}</div>}
            {error && <div className="mt-5 rounded-xl border border-rose-300/15 bg-rose-400/[0.05] px-4 py-3 text-sm text-rose-100">{error}</div>}

            <Button onClick={()=>void handleSave()} disabled={isSaving} className="mt-5 w-full bg-sky-300 font-black text-slate-950 hover:bg-sky-200">
              <Save className="mr-2 h-4 w-4"/>{isSaving ? 'Updating live identity…' : 'Update Client identity'}
            </Button>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Current position</p></div>
              <p className="mt-3 text-sm font-black capitalize text-white">{user.role}</p>
              <p className="mt-1 break-all text-xs text-slate-400">{user.email}</p>
            </section>

            <section className="rounded-3xl border border-violet-300/15 bg-violet-400/[0.04] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Device preferences</p>
              <div className="mt-3 space-y-2">
                {[
                  { key: 'showPresence' as const, label: 'Presence indicator', detail: 'Show your presence state in WEAVE.', icon: Eye },
                  { key: 'emailNotifications' as const, label: 'Notifications', detail: 'Keep notification preference on this device.', icon: Bell },
                  { key: 'darkMode' as const, label: 'Dark interface', detail: 'Keep the dark WEAVE display preference.', icon: Moon },
                ].map(item=>{
                  const Icon=item.icon
                  return <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 p-3">
                    <div className="flex min-w-0 items-start gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-200"/><div><p className="text-xs font-black text-white">{item.label}</p><p className="mt-1 text-[10px] leading-4 text-slate-400">{item.detail}</p></div></div>
                    <Switch checked={settings[item.key]} onCheckedChange={()=>toggleSetting(item.key)}/>
                  </div>
                })}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}
