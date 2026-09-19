'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password')
      }

      setIsSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-green-500/20 p-3 rounded-full">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white">Password Reset Successful</h2>
        <p className="text-slate-400 mt-2 mb-6">
          Your password has been updated. You will be redirected to the login page shortly.
        </p>
        <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
        <CardDescription className="text-slate-400">
          Please enter your new password below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!token ? (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <XCircle className="h-12 w-12 text-red-500 opacity-50" />
            </div>
            <p className="text-red-400 mb-4">{error}</p>
            <Button asChild variant="outline" className="border-slate-700">
              <Link href="/forgot-password">Request new link</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                required
                disabled={isSubmitting}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating password...' : 'Reset Password'}
            </Button>
          </form>
        )}
      </CardContent>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur max-w-md w-full">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-12">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-400 text-sm">Validating reset token...</p>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </Card>
  )
}
