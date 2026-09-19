'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, Lock, Mail, KeyRound, Loader2 } from 'lucide-react'
import { WeaveLogo } from '@/components/weave-logo'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const loggedInUser = await login(email, password)
      if (loggedInUser?.role === 'admin') router.push('/admin/dashboard')
      else if (loggedInUser?.role === 'agent') router.push('/agent/dashboard')
      else if (loggedInUser?.role === 'bridger') router.push('/bridger/dashboard')
      else router.push('/weave')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur max-w-md w-full">
      <CardHeader className="text-center flex flex-col items-center">
        <WeaveLogo size="md" className="mb-2" />
        <CardDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
          Ecosystem Authority · Secure Access
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              required
              disabled={isSubmitting || isLoading}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          <div className="flex justify-end">
            <Link 
              href="/forgot-password" 
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <div className="space-y-4 pt-2">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 font-bold"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-slate-900 px-2 text-slate-500 font-black tracking-[0.2em]">WEAVE Protocol</span>
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-full border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 font-bold uppercase tracking-tighter h-12"
            >
              <Link href="/client-login">
                <KeyRound className="mr-2 h-4 w-4" />
                Client Access Terminal
              </Link>
            </Button>
          </div>

          <div className="text-center text-sm">
            <span className="text-slate-400">{"Don't have an account? "}</span>
            <Link href="/register" className="text-blue-400 hover:text-blue-300">
              Register
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
