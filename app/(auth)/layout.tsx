'use client'

import { WeaveWorldBackdrop } from '@/components/world/weave-world-backdrop'
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
      <div className="relative min-h-screen flex items-center justify-center bg-[#010711]">
        <WeaveWorldBackdrop intensity="soft" />
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#010711] px-4">
      <WeaveWorldBackdrop intensity="soft" />
      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
    </div>
  )
}
