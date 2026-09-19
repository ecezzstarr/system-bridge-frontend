'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-provider'

export default function ClientHomePage() {
  const { user } = useAuth()
  useEffect(() => {
    if (user) {
      window.location.href = '/client/dashboard'
    }
  }, [user])

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 flex flex-col items-center justify-center p-6">
      {/* Branding */}
      <div className="text-center mb-8">
        <div className="inline-block mb-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
          <span className="text-5xl">🌐</span>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter mb-1">WEAVE</h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Ecosystem Authority</p>
        <p className="text-lg text-slate-400">Client Services Portal</p>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-xs space-y-4">
        <Link href="/client/login" className="block">
          <Button className="w-full h-12 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-base">
            Sign In
          </Button>
        </Link>
        
        <Link href="/client/register" className="block">
          <Button variant="outline" className="w-full h-12 border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-white font-semibold text-base">
            Create Account
          </Button>
        </Link>
      </div>

      {/* Footer */}
      <p className="mt-12 text-center text-xs text-slate-500">
        Connect with your dedicated service team
      </p>
    </div>
  )
}
