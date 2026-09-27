'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { WeaveEnvironmentSurface } from '@/components/world/weave-environment-surface'

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
      <div className="relative flex min-h-dvh items-center justify-center bg-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh items-start justify-center overflow-x-hidden overflow-y-auto bg-transparent px-4 py-8 sm:items-center">
      <div className="w-full max-w-md relative z-10">
        <WeaveEnvironmentSurface compact>{children}</WeaveEnvironmentSurface>
      </div>
    </div>
  )
}
