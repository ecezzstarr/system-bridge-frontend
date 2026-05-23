'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { isClientAuthenticated } from '@/lib/client-auth'

export default function ClientHomePage() {
  useEffect(() => {
    // Check if client is already logged in (using cookies)
    if (isClientAuthenticated()) {
      window.location.href = '/client/dashboard'
    }
  }, [])

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 flex flex-col items-center justify-center p-6">
      {/* Branding */}
      <div className="text-center mb-8">
        <div className="inline-block mb-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
          <span className="text-5xl">🌐</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">SSBNOW.SHOP</h1>
        <p className="text-sm text-slate-500 mb-2">Weave of Presence</p>
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
