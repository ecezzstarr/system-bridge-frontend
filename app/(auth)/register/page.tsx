'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, Lock, Mail, User, Briefcase, Handshake, Gift } from 'lucide-react'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register, isLoading } = useAuth()
  
  const [step, setStep] = useState<'role' | 'details'>('role')
  const [referredBy, setReferredBy] = useState<string | null>(null)
  const [forcedRole, setForcedRole] = useState<'bridger' | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: '' as 'agent' | 'bridger' | '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check for referral code and role restriction in URL
  // Agent referrals can ONLY create bridgers (role=bridger in URL)
  useEffect(() => {
    const ref = searchParams.get('ref')
    const roleParam = searchParams.get('role')
    if (ref) {
      setReferredBy(ref)
    }
    // If role=bridger is in URL, this is an Agent's referral - can ONLY register as Bridger
    if (roleParam === 'bridger') {
      setForcedRole('bridger')
      setFormData(prev => ({ ...prev, role: 'bridger' }))
      setStep('details')
    }
  }, [searchParams])

  const handleRoleSelect = (role: 'agent' | 'bridger') => {
    setFormData({ ...formData, role })
    setStep('details')
  }

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

    if (!formData.role) {
      setError('Please select a role')
      return
    }

    setIsSubmitting(true)

    try {
      await register({
        email: formData.email,
        username: formData.username,
        name: formData.name,
        password: formData.password,
        role: formData.role as 'agent' | 'bridger',
        department: formData.role.toUpperCase(),
        referredBy: referredBy || undefined,
      })

      // Use window.location for reliable redirect after auth state changes
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
      setIsSubmitting(false)
    }
  }

  // Step 1: Role Selection
  if (step === 'role') {
    return (
      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur max-w-lg mx-4 sm:mx-0">
        <CardHeader className="text-center">
          <CardTitle className="text-xl sm:text-2xl">Join SSBCOMPANY</CardTitle>
          <CardDescription>Choose how you want to work with us</CardDescription>
          {referredBy && (
            <div className="mt-3 flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
              <Gift className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-300">You were referred! Bonus awaits.</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleRoleSelect('agent')}
              className="p-5 sm:p-6 rounded-lg border-2 border-slate-600 bg-slate-700/30 hover:border-blue-500 hover:bg-blue-500/10 transition-all text-left"
            >
              <Briefcase className="h-8 w-8 text-blue-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Agent</h3>
              <p className="text-sm text-slate-400 mb-3">Be employed by the company</p>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-2">
                <p className="text-xs text-blue-300 font-medium">Earn 1 TRX daily</p>
                <p className="text-xs text-slate-400">Withdraw on the 26th of every month</p>
              </div>
            </button>
            <button
              onClick={() => handleRoleSelect('bridger')}
              className="p-5 sm:p-6 rounded-lg border-2 border-slate-600 bg-slate-700/30 hover:border-green-500 hover:bg-green-500/10 transition-all text-left"
            >
              <Handshake className="h-8 w-8 text-green-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Bridger</h3>
              <p className="text-sm text-slate-400 mb-3">Partner with the company</p>
              <div className="bg-green-500/10 border border-green-500/30 rounded-md p-2">
                <p className="text-xs text-green-300 font-medium">Earn 50% of client share</p>
                <p className="text-xs text-slate-400">Withdraw anytime during contract</p>
              </div>
            </button>
          </div>
          <div className="text-center text-sm pt-2">
            <span className="text-slate-400">Already have an account? </span>
            <Link href="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Step 2: Account Details
  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur max-w-md mx-4 sm:mx-0">
      <CardHeader className="text-center">
        <CardTitle className="text-xl sm:text-2xl">Create Account</CardTitle>
        <CardDescription className="flex items-center justify-center gap-2">
          {formData.role === 'agent' ? (
            <>
              <Briefcase className="h-4 w-4 text-blue-400" />
              <span>Agent - 1 TRX daily, withdraw on 26th</span>
            </>
          ) : (
            <>
              <Handshake className="h-4 w-4 text-green-400" />
              <span>Bridger - 50% client share</span>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              required
              disabled={isSubmitting || isLoading}
            />
          </div>

          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              required
              disabled={isSubmitting || isLoading}
            />
          </div>

          <Input
            type="text"
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
            required
            disabled={isSubmitting || isLoading}
          />

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              required
              disabled={isSubmitting || isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Input
            type="password"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
            required
            disabled={isSubmitting || isLoading}
          />

          <Button
            type="submit"
            className={`w-full ${formData.role === 'agent' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? 'Creating Account...' : `Join as ${formData.role === 'agent' ? 'Agent' : 'Bridger'}`}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep('role')}
            className="w-full text-slate-400"
            disabled={isSubmitting || isLoading}
          >
            Change role
          </Button>

          <div className="text-center text-sm">
            <span className="text-slate-400">Already have an account? </span>
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur max-w-lg mx-4 sm:mx-0">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse text-slate-400">Loading...</div>
        </CardContent>
      </Card>
    }>
      <RegisterContent />
    </Suspense>
  )
}
