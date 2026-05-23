'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect /wallet to /wallet/deposit-withdraw
export default function WalletRedirectPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/wallet/deposit-withdraw')
  }, [router])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
        <p className="text-slate-400">Redirecting to wallet...</p>
      </div>
    </div>
  )
}
