'use client'

import { useAuth } from '@/lib/auth-provider'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { WeaveEnvironmentSurface } from '@/components/world/weave-environment-surface'
import { RegistrationReferralCapture } from '@/components/registration-referral-capture'
import { isFlameEventActive } from '@/lib/flame-event-landing'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, isInitialized, user } = useAuth()

  useEffect(() => {
    // The login handler and registration flow own their authenticated arrival.
    // Never race them with a dashboard redirect, which bypasses Burning River.
    if (isInitialized && isAuthenticated && !isLoading && pathname !== '/register' && pathname !== '/login') {
      let cancelled = false
      void isFlameEventActive().then(eventLive => {
        if (cancelled) return
        const destination = user?.role === 'client'
          ? (eventLive ? '/client/event' : '/client/dashboard')
          : eventLive ? '/event'
          : user?.role === 'agent' ? '/agent/dashboard'
          : user?.role === 'bridger' ? '/bridger/dashboard'
          : user?.role === 'admin' ? '/admin/dashboard' : '/weave'
        router.replace(destination)
      })
      return () => { cancelled = true }
    }
  }, [isInitialized, isAuthenticated, isLoading, pathname, user?.role, router])

  // Do not unmount children during the registration request. Unmounting resets
  // every controlled input and puts a rejected paid applicant back at Step 1.

  return <div className="relative flex min-h-dvh items-start justify-center overflow-x-hidden overflow-y-auto bg-transparent px-4 py-8 sm:items-center">
    <div className="w-full max-w-md relative z-10">
      <RegistrationReferralCapture />
      <WeaveEnvironmentSurface compact>{children}</WeaveEnvironmentSurface>
    </div>
  </div>
}
