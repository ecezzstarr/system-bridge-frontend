'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'

type GuardRole = 'admin' | 'agent' | 'bridger'

const WORLD_NAME: Record<GuardRole, string> = {
  admin: 'Administration',
  agent: 'Agent',
  bridger: 'Bridger',
}

export function RoleRouteGuard({
  role,
  children,
}: {
  role: GuardRole
  children: ReactNode
}) {
  const router = useRouter()
  const { user, isInitialized } = useAuth()
  const allowed = user?.role === role

  useEffect(() => {
    if (!isInitialized) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!allowed) router.replace('/dashboard')
  }, [allowed, isInitialized, router, user])

  if (!isInitialized || !allowed) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <div className="rounded-2xl border border-sky-300/10 bg-[#030b17]/64 px-5 py-4 text-center backdrop-blur-xl">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-sky-300/20 border-t-sky-300" />
          <p className="mt-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
            Synchronizing {WORLD_NAME[role]} environment
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
