'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong')
      }

      setIsSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSent) {
    return (
      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-500/20 p-3 rounded-full">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription className="text-slate-400 mt-2">
            We've sent a password reset link to <span className="text-white font-medium">{email}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            asChild
            variant="outline"
            className="w-full border-slate-700 hover:bg-slate-700 text-white"
          >
            <Link href="/login">
              Return to login
            </Link>
          </Button>
          <p className="text-center text-xs text-slate-500">
            Didn't receive the email? Check your spam folder or{' '}
            <button 
              onClick={() => setIsSent(false)} 
              className="text-blue-400 hover:underline"
            >
              try again
            </button>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur max-w-md w-full">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/login" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Forgot Password</span>
        </div>
        <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
        <CardDescription className="text-slate-400">
          Enter your email address and we'll send you a link to reset your password.
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
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {isSubmitting ? 'Sending link...' : 'Send reset link'}
          </Button>

          <div className="text-center text-sm">
            <Link href="/login" className="text-slate-400 hover:text-white transition-colors">
              Return to login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
