'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FileText,
  Lock,
  Loader2,
  LogIn,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-provider'
import { WeaveLogo } from '@/components/weave-logo'

export default function ClientLoginPage() {
  const router = useRouter()
  const { setSession } = useAuth()

  const [isLoading, setIsLoading] = useState(false)
  const [fileNumber, setFileNumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileNumber || !password) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/client/weave-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileNumber, password })
      })

      const result = await res.json()
      if (result.success) {
        toast.success('Welcome back')
        setSession(result.token, result.user)
        router.push('/client/dashboard')
      } else {
        toast.error(result.error || "That didn't match. Try again.")
      }
    } catch (error) {
      toast.error('Something interrupted that. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-950 rounded-full blur-[120px]" />
      </div>

      <div className="mb-8 text-center relative z-10 flex flex-col items-center">
        <WeaveLogo size="lg" className="mb-4" />
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-sm shadow-blue-500/10">
          <KeyRound className="h-3 w-3" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Authorized Client Access</span>
        </div>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Interaction in Motion</p>
      </div>

      <Card className="w-full max-w-md border-slate-700 bg-slate-900/50 backdrop-blur-xl relative z-10 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl font-bold text-white uppercase tracking-tight flex items-center justify-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-500" />
            Client Portal
          </CardTitle>
          <CardDescription className="text-xs font-medium text-slate-400">
            Sign in using your issued WEAVE File Number.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">File Number Identifier</label>
              <div className="relative group">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  placeholder="WEAVE-583104927361"
                  value={fileNumber}
                  onChange={(e) => setFileNumber(e.target.value.toUpperCase())}
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white font-mono text-sm h-12 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Passkey</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white text-sm h-12 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-bold uppercase tracking-tighter shadow-lg shadow-blue-900/20" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Initiate Session
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center border-t border-slate-800 pt-6">
            <p className="text-xs text-slate-500 font-medium">
              Don't have an account yet?
            </p>
            <Link href="/client/register" className="inline-block mt-2 text-blue-400 font-bold hover:text-blue-300 text-sm tracking-tight transition-colors">
              Register with your File Number
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="mt-12 flex items-center gap-6 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
        <div className="h-[1px] w-12 bg-slate-700" />
        <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.5em]">WEAVE of Presence · System Switch · Bridge Radiance</p>
        <div className="h-[1px] w-12 bg-slate-700" />
      </div>
    </div>
  )
}
