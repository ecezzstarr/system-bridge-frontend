'use client'

import { FlameEventWorldGate } from '@/components/events/flame-event-world-gate'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    // If already logged in, redirect to dashboard
    if (isAuthenticated && !isLoading) {
      router.push('/weave')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <FlameEventWorldGate intensity="soft" />
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      <FlameEventWorldGate intensity="soft" />
      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
    </div>
  )
}
