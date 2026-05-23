'use client'

import { Suspense } from 'react'
import ClientRegisterForm from '@/components/client/register-form'

export default function ClientRegisterPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 flex items-center justify-center p-4 overflow-y-auto">
      <Suspense fallback={
        <div className="w-full max-w-md text-white text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mb-2"></div>
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      }>
        <div className="w-full max-w-md py-6">
          <ClientRegisterForm />
        </div>
      </Suspense>
    </div>
  )
}
