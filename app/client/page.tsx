'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-provider'
import { WeaveLogo } from '@/components/weave-logo'

export default function ClientHomePage() {
  const { user } = useAuth()
  useEffect(() => {
    if (user?.role === 'client') {
      window.location.href = '/client/dashboard'
    }
  }, [user])

  return (
    <div className="min-h-screen w-full bg-transparent flex flex-col items-center justify-center p-6">
      {/* Official WEAVE identity */}
      <div className="text-center mb-8 flex flex-col items-center">
        <WeaveLogo size="lg" className="mb-4" />
        <p className="text-[10px] font-bold text-sky-300/70 uppercase tracking-[0.24em] mb-2">Interaction in Motion</p>
        <p className="text-lg text-slate-300">Client Services Portal</p>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">Client is the system-building position in WEAVE. A valid File Number opens the path to a persistent File Folder where a workshop can become a built and operated system.</p>
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
      <div className="mt-10 grid w-full max-w-md grid-cols-5 gap-1 text-center">
        {['Recognize','Preview','Build','Activate','Operate'].map((stage,index)=><div key={stage} className="rounded-xl border border-white/10 bg-black/20 px-2 py-3"><p className="text-[8px] font-black text-sky-300">{index+1}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[0.06em] text-slate-300">{stage}</p></div>)}
      </div>
      <p className="mt-6 text-center text-xs text-slate-400">A Client account requires an issued WEAVE File Number. Creating an account does not create or purchase a File Folder by itself.</p>
    </div>
  )
}
