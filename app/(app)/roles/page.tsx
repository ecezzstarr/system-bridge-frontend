'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Fingerprint,
  KeyRound,
  LayoutTemplate,
  Save,
  ShieldCheck,
  UserCircle,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const ROLE_SYSTEM: Record<string, { title: string; detail: string; operatingRoom: string; tone: string }> = {
  admin: {
    title: 'Administration',
    detail: 'Institutional authority, verification, infrastructure and continuity.',
    operatingRoom: '/admin/functions',
    tone: 'border-violet-300/20 bg-violet-400/[0.05] text-violet-200',
  },
  agent: {
    title: 'Agent',
    detail: 'WEAVE employee position supporting Bridgers, Clients and company movement.',
    operatingRoom: '/agent/functions',
    tone: 'border-emerald-300/20 bg-emerald-400/[0.05] text-emerald-200',
  },
  bridger: {
    title: 'Bridger',
    detail: 'Partnership position opening Client paths and continuing beside the Client.',
    operatingRoom: '/bridger/functions',
    tone: 'border-sky-300/20 bg-sky-400/[0.05] text-sky-200',
  },
  creator: {
    title: 'Creator',
    detail: 'Reserved institutional position with creator-level access.',
    operatingRoom: '/dashboard',
    tone: 'border-amber-300/20 bg-amber-400/[0.05] text-amber-200',
  },
}

export default function PositionIdentityPage() {
  const { user, token } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const role = useMemo(() => ROLE_SYSTEM[user?.role || ''] || {
    title: user?.role || 'Participant',
    detail: 'Your current WEAVE position.',
    operatingRoom: '/dashboard',
    tone: 'border-white/10 bg-white/[0.035] text-slate-200',
  }, [user?.role])

  if (!user) {
    return <div className="p-6 text-slate-400">A signed-in WEAVE position is required.</div>
  }

  const handleSave = async () => {
    setError('')
    setMessage('')

    if (newPassword && newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword && newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    const changedName = name.trim() && name.trim() !== user.name ? name.trim() : undefined
    if (!changedName && !newPassword) {
      setMessage('Your identity record is already current.')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          name: changedName,
          newPassword: newPassword || undefined,
          confirmPassword: newPassword ? confirmPassword : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Identity update failed')
      setMessage('Identity record updated.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identity update failed')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-sky-300/15 bg-[#030a15]/72">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(56,189,248,.13),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(139,92,246,.08),transparent_30%)] p-5 md:p-7">
          <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Position + Identity Engine</p>
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Who you are and what position is operating are separate records.</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
            Identity is your authenticated human account. Position is the function WEAVE currently recognizes you as performing. Changing your name or password does not silently change your institutional position.
          </p>
        </header>

        <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_340px]">
          <section className="weave-reading-surface rounded-3xl p-5 md:p-6">
            <div className="grid gap-3 md:grid-cols-2">
              <div className={`rounded-2xl border p-5 ${role.tone}`}>
                <div className="flex items-center gap-2"><LayoutTemplate className="h-4 w-4"/><p className="text-[9px] font-black uppercase tracking-[0.18em]">Operating position</p></div>
                <p className="mt-4 text-xl font-black text-white">{role.title}</p>
                <p className="mt-2 text-xs leading-5 text-slate-300">{role.detail}</p>
                <Link href={role.operatingRoom} className="mt-4 inline-flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white">
                  Open operating room <ArrowRight className="h-3.5 w-3.5"/>
                </Link>
              </div>

              <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.04] p-5">
                <div className="flex items-center gap-2"><Fingerprint className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Authenticated identity</p></div>
                <p className="mt-4 text-lg font-black text-white">{user.name}</p>
                <p className="mt-1 break-all text-xs text-slate-400">{user.email}</p>
                <p className="mt-3 text-[10px] leading-5 text-slate-400">This record controls authentication and attribution. It is not a substitute for Standing, File Number or role authority.</p>
              </div>
            </div>

            <div className="mt-5 border-t border-white/10 pt-5">
              <div className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-sky-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Identity controls</p></div>
              <div className="mt-4 grid gap-3">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Email · read only</label>
                  <Input type="email" value={user.email || ''} disabled className="border-white/10 bg-black/25 text-slate-300"/>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Name</label>
                  <Input value={name} onChange={event=>setName(event.target.value)} className="border-white/10 bg-black/25 text-white"/>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input type="password" placeholder="New password · optional" value={newPassword} onChange={event=>setNewPassword(event.target.value)} className="border-white/10 bg-black/25 text-white"/>
                  <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} className="border-white/10 bg-black/25 text-white"/>
                </div>
              </div>

              {message && <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.05] px-4 py-3 text-sm text-emerald-100">{message}</div>}
              {error && <div className="mt-4 rounded-xl border border-rose-300/15 bg-rose-400/[0.05] px-4 py-3 text-sm text-rose-100">{error}</div>}

              <Button onClick={()=>void handleSave()} disabled={isSaving} className="mt-4 w-full bg-sky-300 font-black text-slate-950 hover:bg-sky-200">
                <Save className="mr-2 h-4 w-4"/>{isSaving ? 'Updating identity…' : 'Update identity'}
              </Button>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-violet-300/15 bg-violet-400/[0.04] p-4">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-violet-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Standing is separate</p></div>
              <p className="mt-3 text-xs leading-5 text-slate-300">Standing records recognized access, crossing and File identity. Use it to understand what the system recognizes, not merely what your account says.</p>
              <Link href="/weave/standing" className="mt-4 inline-flex w-full items-center justify-between rounded-xl border border-violet-300/15 bg-violet-400/[0.06] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-violet-100">Open Standing <ArrowRight className="h-3.5 w-3.5"/></Link>
            </section>

            <section className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.04] p-4">
              <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-amber-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Authority rule</p></div>
              <p className="mt-3 text-xs leading-5 text-slate-300">A password change changes authentication. A role change requires an authorized institutional process. The interface does not blur those two kinds of movement.</p>
            </section>

            <Link href="/ledger" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs font-black text-white">
              <span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-sky-300"/>Record</span>
              <ArrowRight className="h-4 w-4 text-sky-300"/>
            </Link>
          </aside>
        </div>
      </section>
    </main>
  )
}
