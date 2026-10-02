'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const REQUEST_KEY = 'weave_recovery_desk_request'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [details, setDetails] = useState('')
  const [token, setToken] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [stage, setStage] = useState<'request' | 'waiting' | 'verify' | 'done'>('request')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loginHref, setLoginHref] = useState('/login')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('portal') === 'client') setLoginHref('/client/login')
    if (params.get('portal') === 'admin') setLoginHref('/login?portal=admin')
    try {
      const saved = JSON.parse(sessionStorage.getItem(REQUEST_KEY) || 'null')
      if (saved && /^[0-9a-f]{64}$/.test(saved.token)) {
        setEmail(saved.email); setToken(saved.token); setStage('waiting'); return
      }
    } catch {}
    if (params.get('recovery') === 'admin') {
      setEmail(params.get('email') || ''); setStage('verify')
    }
  }, [])

  useEffect(() => {
    if (stage !== 'waiting' || !token) return
    const controller = new AbortController()
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        if (!document.hidden) {
          const response = await fetch('/api/auth/recovery-desk', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'status', token }), signal: controller.signal, cache: 'no-store',
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || 'Unable to check your request.')
          if (stopped) return
          setError('')
          if (result.status === 'approved') {
            setCode(result.code); setExpiresAt(result.expiresAt); setStage('verify'); return
          }
          if (['denied', 'expired', 'used'].includes(result.status)) {
            sessionStorage.removeItem(REQUEST_KEY); setToken(''); setStage('request')
            setError(result.status === 'denied' ? 'Administration could not approve this request. Contact your WEAVE administrator.' : 'This recovery request has ended. You can request a new passcode.'); return
          }
        }
      } catch (err) {
        if (!stopped) setError(err instanceof Error ? err.message : 'Unable to check your request.')
      }
      if (!stopped) timer = setTimeout(poll, 5000)
    }
    void poll()
    return () => { stopped = true; controller.abort(); clearTimeout(timer) }
  }, [stage, token])

  const requestPasscode = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const response = await fetch('/api/auth/recovery-desk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, details }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to request a passcode.')
      sessionStorage.setItem(REQUEST_KEY, JSON.stringify({ email: normalizedEmail, token: result.token }))
      setEmail(normalizedEmail); setToken(result.token); setCode(''); setExpiresAt(''); setStage('waiting')
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to request a passcode.') }
    finally { setBusy(false) }
  }

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault(); setError('')
    if (!/^\d{6}$/.test(code)) { setError('Enter your 6-digit Administration passcode.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setBusy(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to reset password.')
      sessionStorage.removeItem(REQUEST_KEY)
      setCode(''); setPassword(''); setConfirmPassword(''); setToken('')
      if (result.role === 'client') setLoginHref('/client/login')
      else if (result.role === 'admin') setLoginHref('/login?portal=admin')
      else setLoginHref('/login')
      setStage('done')
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to reset password.') }
    finally { setBusy(false) }
  }

  return <Card className="w-full max-w-md border-cyan-200/10 bg-[#050b12]/92 text-white backdrop-blur-xl">
    <CardHeader>
      <Link href={loginHref} className="flex items-center gap-2 text-xs text-slate-400"><ArrowLeft className="h-4 w-4"/>Back to login</Link>
      <CardTitle className="pt-3 text-2xl font-black">{stage === 'done' ? 'Access restored' : 'Recovery Desk'}</CardTitle>
      <CardDescription className="text-slate-400">
        {stage === 'request' ? 'Request a passcode from Administration to reset your password.' : stage === 'waiting' ? 'Your request is waiting for Administration.' : stage === 'verify' ? 'Use your Administration passcode and choose a new password.' : 'Your password has changed and previous sessions have closed.'}
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {stage === 'request' && <form onSubmit={requestPasscode} className="space-y-4">
        <Input aria-label="Registered email" type="email" placeholder="Registered email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required disabled={busy}/>
        <textarea aria-label="Note for Administration" value={details} onChange={e => setDetails(e.target.value)} placeholder="Your name and registered phone or Client File Number" required minLength={6} maxLength={500} rows={3} disabled={busy} className="w-full rounded-md border border-slate-700 bg-slate-900/60 p-3 text-sm"/>
        <Button type="submit" disabled={busy} className="w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Request recovery passcode'}</Button>
        <button type="button" onClick={() => { setError(''); setStage('verify') }} className="w-full text-xs text-cyan-300">Use Administration recovery code</button>
      </form>}
      {stage === 'waiting' && <div className="space-y-4 text-center">
        <KeyRound className="mx-auto h-8 w-8 text-cyan-300"/>
        <p className="text-sm leading-6 text-slate-400">If this email belongs to an active account, Admin has been notified. After verifying your identity, Admin will send a passcode here. Keep this desk open in the same browser. Requests last one hour.</p>
        <button onClick={() => setStage('verify')} className="text-xs text-cyan-300">I already have a recovery code</button>
      </div>}
      {stage === 'verify' && <form onSubmit={resetPassword} className="space-y-4">
        {expiresAt && <p className="text-sm text-emerald-300">Admin sent your passcode. It expires at {new Date(expiresAt).toLocaleTimeString()}.</p>}
        <Input aria-label="Registered email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Registered email" required readOnly={!!token}/>
        <Input aria-label="Recovery passcode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit passcode" required/>
        <Input aria-label="New password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" required/>
        <Input aria-label="Confirm new password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required/>
        <Button type="submit" disabled={busy} className="w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Reset password'}</Button>
        <button type="button" onClick={() => { setCode(''); setError(''); setStage(token ? 'waiting' : 'request') }} className="w-full text-xs text-cyan-300">Back to recovery desk</button>
      </form>}
      {stage === 'done' && <div className="space-y-5 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300"/><Button asChild className="w-full"><Link href={loginHref}>Return to your entrance</Link></Button></div>}
    </CardContent>
  </Card>
}
