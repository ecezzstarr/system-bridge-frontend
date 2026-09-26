'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'

const PUBLIC_CLIENT_PATHS = new Set(['/client', '/client/login', '/client/register'])

export function ClientRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isInitialized } = useAuth()

  const isPublic = PUBLIC_CLIENT_PATHS.has(pathname)

  useEffect(() => {
    if (!isInitialized) return

    if (isPublic) {
      if (user?.role === 'client' && pathname !== '/client') {
        router.replace('/client/dashboard')
      }
      return
    }

    if (!user) {
      router.replace('/client/login')
      return
    }

    if (user.role !== 'client') {
      router.replace('/dashboard')
    }
  }, [isInitialized, isPublic, pathname, router, user?.id, user?.role])

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020713]/82 text-slate-400 backdrop-blur-xl">
        Synchronizing Client environment...
      </div>
    )
  }

  if (!isPublic && (!user || user.role !== 'client')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020713]/82 text-slate-400 backdrop-blur-xl">
        Opening authorized Client world...
      </div>
    )
  }

  return <>{children}</>
}
