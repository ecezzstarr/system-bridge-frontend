'use client'

import { Suspense } from 'react'
import ClientLoginForm from '@/components/client/login-form'

export default function ClientLoginPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 flex items-center justify-center p-4 sm:p-6">
      <Suspense fallback={
        <div className="w-full max-w-md text-white text-center">
          <div className="text-sm sm:text-base">Loading...</div>
        </div>
      }>
        <div className="w-full max-w-md">
          <ClientLoginForm />
        </div>
      </Suspense>
    </div>
  )
}
