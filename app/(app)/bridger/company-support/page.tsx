'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import BridgerCompanySupport from '@/components/bridger-company-support'

export default function BridgerCompanySupportPage() {
  const { user } = useAuth()
  const router = useRouter()

  if (!user || user.role !== 'bridger') {
    router.replace('/dashboard')
    return null
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <a href="/bridger/dashboard" className="mb-6 inline-block text-sm text-slate-400 hover:text-white">← Bridger Dashboard</a>
        <BridgerCompanySupport user={user} />
      </div>
    </main>
  )
}
