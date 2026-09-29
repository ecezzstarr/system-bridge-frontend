'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { AppHeader } from '@/components/app-header'
import { usePathname } from 'next/navigation'
import { TermsAcceptanceModal } from '@/components/terms-acceptance-modal'
import { Toaster } from '@/components/ui/sonner'
import { LiveAdSurface } from '@/components/live-ad-surface'
import { FlameEventRoleAtmosphere } from '@/components/events/flame-event-role-atmosphere'
import { NormalWeaveRoleAtmosphere } from '@/components/world/normal-weave-role-atmosphere'
import { FlameEventAd } from '@/components/events/flame-event-ad'
import { PresenceCameraSignal, PresenceCameraViewport } from '@/components/world/presence-camera'
import { WeaveEnvironmentSurface } from '@/components/world/weave-environment-surface'
import { EnvironmentOrganizerProvider, EnvironmentPageGuard } from '@/components/world/environment-organizer-provider'
import { isLeanAccountRole, isRoleAccountRouteAllowed, roleAccountHome } from '@/lib/role-account-scope'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading, isAuthenticated, isInitialized } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Only redirect if we've finished loading and confirmed not authenticated
    if (isInitialized && !isLoading && !isAuthenticated && !isRedirecting) {
      setIsRedirecting(true)
      // Use replace to avoid back button issues
      router.replace('/login')
    }
  }, [isInitialized, isLoading, isAuthenticated, isRedirecting, router])

  // Agent and Bridger accounts intentionally expose only their defined working places.
  // Historical routes remain in source for Administration and migration safety, but are
  // not part of these account surfaces.
  useEffect(() => {
    if (!isAuthenticated || !isLeanAccountRole(user?.role)) return
    if (isRoleAccountRouteAllowed(user.role, pathname)) return
    router.replace(roleAccountHome(user.role))
  }, [isAuthenticated, user?.role, pathname, router])

  // Terms acceptance gate for Agents and Bridgers
  const [termsNeeded, setTermsNeeded] = useState(false)
  const [termsChecked, setTermsChecked] = useState(false)

  useEffect(() => {
    const checkTerms = async () => {
      if (!user?.id || !['agent', 'bridger'].includes(user.role || '')) {
        setTermsChecked(true)
        return
      }
      try {
        const token = localStorage.getItem('ssb_auth_token')
        const res = await fetch('/api/terms', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        })
        const data = await res.json()
        if (data.success) {
          setTermsNeeded(data.needsAcceptance)
        }
      } catch (e) {
        console.error('Terms check error:', e)
      } finally {
        setTermsChecked(true)
      }
    }

    if (isAuthenticated && user?.id) {
      checkTerms()
    }
  }, [isAuthenticated, user?.id, user?.role])

  // The global environment transit owns the visible loading experience.
  // This marker keeps the destination covered until auth has resolved.
  if (!isInitialized || isLoading || (isRedirecting && !isAuthenticated)) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-transparent px-4 text-center"
        data-environment-pending="true"
        role="status"
        aria-live="polite"
      >
        <div className="max-w-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border border-amber-200/15 border-t-amber-200 motion-reduce:animate-none" />
          <p className="mt-4 text-[9px] font-black uppercase tracking-[.18em] text-amber-100">Opening WEAVE</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">Restoring your position and the current environment.</p>
        </div>
      </div>
    )
  }

  // Only render children if authenticated
  if (!isAuthenticated) {
    return null
  }

  if (isLeanAccountRole(user?.role) && !isRoleAccountRouteAllowed(user.role, pathname)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-transparent px-4 text-center" role="status" aria-live="polite">
        <div>
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border border-sky-200/15 border-t-sky-200 motion-reduce:animate-none" />
          <p className="mt-4 text-[9px] font-black uppercase tracking-[.18em] text-sky-100">Returning to your position</p>
        </div>
      </div>
    )
  }

  return (
    <EnvironmentOrganizerProvider>
    <div className="weave-app-shell relative min-h-dvh overflow-hidden bg-transparent" data-weave-world-runtime="persistent">
      <div className="relative z-10 flex min-h-dvh min-w-0 flex-col">
        <AppHeader user={user as any} />
        <FlameEventAd />
        <main className="relative min-w-0 flex-1 overflow-x-clip" data-weave-world-interior="route">
          <PresenceCameraViewport>
            <WeaveEnvironmentSurface role={user?.role} userName={user?.name}>
              <FlameEventRoleAtmosphere
                userRole={user?.role}
                userName={user?.name}
                pathname={pathname}
              >
                <NormalWeaveRoleAtmosphere
                  userRole={user?.role}
                  userName={user?.name}
                  pathname={pathname}
                >
                  <EnvironmentPageGuard>{children}</EnvironmentPageGuard>
                </NormalWeaveRoleAtmosphere>
              </FlameEventRoleAtmosphere>
            </WeaveEnvironmentSurface>
          </PresenceCameraViewport>
        </main>
      </div>
      <Toaster position="top-center" richColors />
      <LiveAdSurface />
      <PresenceCameraSignal />
      {termsChecked && termsNeeded && user?.role && ['agent', 'bridger'].includes(user.role) && (
        <TermsAcceptanceModal
          role={user.role as 'agent' | 'bridger'}
          userName={user.name}
          onAccepted={() => setTermsNeeded(false)}
        />
      )}
    </div>
    </EnvironmentOrganizerProvider>
  )
}
