'use client'

import { useAuth } from '@/lib/auth-provider'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { WeaveEnvironmentSurface } from '@/components/world/weave-environment-surface'
import { RegistrationReferralCapture } from '@/components/registration-referral-capture'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, isInitialized, user } = useAuth()

  useEffect(() => {
    // Registration controls its own position-specific success destination.
    // Never race its redirect by pushing a newly registered Bridger into /weave.
    if (isInitialized && isAuthenticated && !isLoading && pathname !== '/register') {
      router.replace(user?.role === 'bridger' ? '/bridger/dashboard' : user?.role === 'agent' ? '/agent/dashboard' : user?.role === 'admin' ? '/admin/dashboard' : '/weave')
    }
  }, [isInitialized, isAuthenticated, isLoading, pathname, user?.role, router])

  // Do not unmount children during the registration request. Unmounting resets
  // every controlled input and puts a rejected paid applicant back at Step 1.

  return <div className="relative flex min-h-dvh items-start justify-center overflow-x-hidden overflow-y-auto bg-transparent px-4 py-8 sm:items-center" data-weave-position-access-shell="homepage-theme">
    <div className="w-full max-w-2xl relative z-10">
      <RegistrationReferralCapture />
      <WeaveEnvironmentSurface compact>{children}</WeaveEnvironmentSurface>
    </div>
  </div>
}
