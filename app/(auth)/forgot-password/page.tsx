'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Portal = 'standard' | 'client' | 'admin'

export default function ForgotPasswordPage() {
  const [portal, setPortal] = useState<Portal>('standard')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [stage, setStage] = useState<'request' | 'verify' | 'done'>('request')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const [loginHref, setLoginHref] = useState('/login')
  const [adminRecoveryMode, setAdminRecoveryMode] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedPortal = params.get('portal')
    if (requestedPortal === 'client' || requestedPortal === 'admin') setPortal(requestedPortal)
    if (params.get('recovery') === 'admin') {
      setAdminRecoveryMode(true)
      const suppliedEmail = params.get('email')
      if (suppliedEmail) {
        setEmail(suppliedEmail)
        setStage('verify')
      }
    }
  }, [])

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setInterval(() => setResendIn(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

  const returnHref = useMemo(() => {
    if (portal === 'client') return '/client/login'
    if (portal === 'admin') return '/login?portal=admin'
    return '/login'
  }, [portal])

  const portalLabel = portal === 'client' ? 'Client Access Recovery' : portal === 'admin' ? 'Administration Access Recovery' : 'Access Recovery'

  const requestCode = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to send recovery code.')
      setStage('verify')
      setResendIn(60)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send recovery code.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault()
    await requestCode()
  }

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code sent to your email.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to reset password.')

      const destination = result.role === 'admin' && portal === 'admin'
        ? '/login?portal=admin'
        : result.login === '/client/login'
          ? '/client/login'
          : '/login'
      setLoginHref(destination)
      setStage('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (stage === 'done') {
    return (
      <Card className="w-full max-w-md border-cyan-200/10 bg-[#050b12]/92 text-white backdrop-blur-xl">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-300" />
          </div>
          <h1 className="mt-5 text-2xl font-black">Access restored</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Your password has been changed and previous sessions were closed.</p>
          <Button asChild className="mt-6 w-full bg-cyan-600 hover:bg-cyan-700">
            <Link href={loginHref}>Return to your entrance</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border-cyan-200/10 bg-[#050b12]/92 text-white backdrop-blur-xl">
      <CardHeader>
        <div className="mb-2 flex items-center gap-2">
          <Link href={returnHref} className="text-slate-400 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/70">{portalLabel}</span>
        </div>
        <CardTitle className="text-2xl font-black">{stage === 'request' ? 'Recover your position' : 'Enter your recovery code'}</CardTitle>
        <CardDescription className="text-slate-400">
          {stage === 'request'
            ? portal === 'client'
              ? 'Use the email attached to your Client File Number. You can request an email code or use a one-time code issued by Administration.'
              : 'Use the email attached to your WEAVE account. You can request an email code or use a one-time code issued by Administration.'
            : adminRecoveryMode
              ? `Enter the one-time Administration recovery code for ${email}. It expires in 15 minutes.`
              : `A one-time code was requested for ${email}. It expires in 15 minutes.`}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {stage === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            {error && <div className="border-y border-rose-300/20 bg-rose-400/5 px-4 py-3 text-sm text-rose-300">{error}</div>}
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                type="email"
                placeholder="Registered email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                className="h-12 border-slate-700 bg-slate-900/60 pl-10 text-white"
                required
                disabled={isSubmitting}
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="h-12 w-full bg-cyan-600 font-bold hover:bg-cyan-700" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><KeyRound className="mr-2 h-4 w-4" />Send email code</>}
            </Button>
            <button
              type="button"
              onClick={() => {
                if (!email.trim()) {
                  setError('Enter the registered email first.')
                  return
                }
                setError(null)
                setAdminRecoveryMode(true)
                setStage('verify')
              }}
              className="w-full border-y border-violet-300/15 py-3 text-xs font-bold text-violet-200 transition-colors hover:text-white"
            >
              Use Administration recovery code
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {error && <div className="border-y border-rose-300/20 bg-rose-400/5 px-4 py-3 text-sm text-rose-300">{error}</div>}

            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-12 border-slate-700 bg-slate-900/60 pl-10 font-mono tracking-[0.35em] text-white"
                required
              />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                className="h-12 border-slate-700 bg-slate-900/60 pl-10 pr-10 text-white"
                required
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                className="h-12 border-slate-700 bg-slate-900/60 pl-10 text-white"
                required
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="h-12 w-full bg-cyan-600 font-bold hover:bg-cyan-700" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset password'}
            </Button>

            <div className="flex items-center justify-between gap-3 text-xs">
              {adminRecoveryMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setAdminRecoveryMode(false)
                    setStage('request')
                    setCode('')
                    setError(null)
                  }}
                  className="text-cyan-300"
                >
                  Request email code instead
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void requestCode()}
                  disabled={isSubmitting || resendIn > 0}
                  className="text-cyan-300 disabled:text-slate-600"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                </button>
              )}
              <button type="button" onClick={() => { setStage('request'); setAdminRecoveryMode(false); setCode(''); setError(null) }} className="text-slate-400 hover:text-white">
                Change email
              </button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
