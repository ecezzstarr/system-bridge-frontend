'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { AppHeader } from '@/components/app-header'
import { toast } from 'sonner'
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
import { canAccessEnvironmentRoute } from '@/lib/company-guidance-access'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading, isAuthenticated, isInitialized } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const routeAllowed = canAccessEnvironmentRoute(pathname, user?.role)

  useEffect(() => {
    if (isInitialized && !isLoading && isAuthenticated && !routeAllowed) {
      router.replace(user?.role === 'admin' ? '/admin/agent-channels' : '/client/dashboard')
    }
  }, [isInitialized, isLoading, isAuthenticated, routeAllowed, user?.role, router])

  useEffect(() => {
    // Only redirect if we've finished loading and confirmed not authenticated
    if (isInitialized && !isLoading && !isAuthenticated && !isRedirecting) {
      setIsRedirecting(true)
      // Use replace to avoid back button issues
      router.replace('/login')
    }
  }, [isInitialized, isLoading, isAuthenticated, isRedirecting, router])

  // Continuance enforcement for Bridgers
  useEffect(() => {
    const checkSub = async () => {
      if (user?.role === 'bridger' && pathname !== '/bridger/subscription') {
        try {
          const token = localStorage.getItem('ssb_auth_token')
          const res = await fetch('/api/bridger/subscription', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            cache: 'no-store',
          })
          const data = await res.json()
          if (data.success && data.subscription.subscription_status === 'suspended') {
            router.replace('/bridger/subscription')
            toast.error('Automatic renewal could not complete. Add enough Flame Coin to your wallet to restore Continuance.')
          }
        } catch (e) {
          console.error('Sub check error:', e)
        }
      }
    }
    
    if (isAuthenticated && user?.role === 'bridger') {
      checkSub()
    }
  }, [user, pathname, isAuthenticated, router])

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

  if (!routeAllowed) return null

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
