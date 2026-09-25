'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'

export default function DashboardRedirect() {
  const { user, isLoading, isInitialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isInitialized || isLoading) return
    if (!user) {
      router.replace('/login')
      return
    }

    if (user.role === 'client') {
      router.replace('/client/dashboard')
      return
    }
    if (user.role === 'admin') {
      router.replace('/admin/dashboard')
      return
    }
    if (user.role === 'agent') {
      router.replace('/agent/dashboard')
      return
    }
    if (user.role === 'bridger') {
      router.replace('/bridger/dashboard')
      return
    }

    router.replace('/weave')
  }, [isInitialized, isLoading, user, router])

  return (
    <div className="flex min-h-[45vh] items-center justify-center">
      <div className="rounded-2xl border border-sky-300/10 bg-black/20 px-5 py-4 text-center backdrop-blur-md">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-sky-300/20 border-b-sky-300" />
        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Opening your WEAVE position</p>
      </div>
    </div>
  )
}
