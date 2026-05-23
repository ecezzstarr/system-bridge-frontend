'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { saveClientToken, saveClientUser } from '@/lib/client-auth'

export default function ClientLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/client/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      // Save auth using cookies (works on mobile)
      saveClientToken(data.token)
      saveClientUser(data.client)

      // Use window.location for reliable mobile navigation
      window.location.href = '/client/dashboard'
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Branding */}
      <div className="text-center mb-8">
        <div className="inline-block mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <span className="text-3xl">🔒</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">SSBNOW.SHOP</h1>
        <p className="text-xs text-slate-500 mb-4">Weave of Presence · System Switch Bridge Radiance</p>
        <p className="text-sm text-slate-400">Client Services Portal</p>
      </div>

      {/* Card */}
      <Card className="bg-slate-900/60 backdrop-blur border border-slate-800">
        <CardHeader>
          <CardTitle className="text-xl">Client Login</CardTitle>
          <CardDescription>Access your dedicated service channels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">Email Address</label>
              <Input
                type="email"
                placeholder="business@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-800/50 border border-slate-700 text-white text-sm"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-800/50 border border-slate-700 text-white text-sm"
                disabled={isSubmitting}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 font-semibold"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block animate-spin">⟳</span>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-900/60 text-slate-400">New here?</span>
            </div>
          </div>

          <Link href="/client/register" className="block">
            <button className="w-full px-4 py-2.5 rounded-lg border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition text-sm font-medium text-slate-300 hover:text-white">
              Create Account
            </button>
          </Link>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-xs text-slate-500">
        Protected by enterprise-grade security · All data encrypted
      </p>
    </div>
  )
}
