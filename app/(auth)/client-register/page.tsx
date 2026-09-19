'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, Lock, Mail, User, Phone } from 'lucide-react'
import { WeaveLogo } from '@/components/weave-logo'

function ClientRegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bridgeCode = searchParams.get('bridge') || undefined
  const bridgeSessionId = searchParams.get('session') || undefined

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', business_name: '', password: '', confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/client/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          business_name: formData.business_name,
          password: formData.password,
          bridgeCode,
          bridgeSessionId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')

      localStorage.setItem('ssb_client_token', data.token)
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur max-w-md mx-4 sm:mx-0">
      <CardHeader className="text-center flex flex-col items-center">
        <WeaveLogo size="md" className="mb-2" />
        <CardTitle className="text-xl sm:text-2xl">Join Weave</CardTitle>
        <CardDescription>Create your client account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              type="text" placeholder="Full Name" value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              required disabled={isSubmitting}
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              type="email" placeholder="Email" value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              required disabled={isSubmitting}
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              type="tel" placeholder="Phone (optional)" value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              disabled={isSubmitting}
            />
          </div>
          <Input
            type="text" placeholder="Business Name (optional)" value={formData.business_name}
            onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
            disabled={isSubmitting}
          />
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              type={showPassword ? 'text' : 'password'} placeholder="Password" value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              required disabled={isSubmitting}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Input
            type="password" placeholder="Confirm Password" value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
            required disabled={isSubmitting}
          />
          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </Button>
          <div className="text-center text-sm">
            <span className="text-slate-400">Already have an account? </span>
            <Link href="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ClientRegisterPage() {
  return (
    <Suspense fallback={<div className="text-slate-400">Loading...</div>}>
      <ClientRegisterContent />
    </Suspense>
  )
}
