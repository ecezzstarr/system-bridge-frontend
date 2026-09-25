'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { toast } from 'sonner'
import { usePathname } from 'next/navigation'
import { TermsAcceptanceModal } from '@/components/terms-acceptance-modal'
import { Toaster } from '@/components/ui/sonner'
import { LiveAdSurface } from '@/components/live-ad-surface'
import { FlameEventRoleAtmosphere } from '@/components/events/flame-event-role-atmosphere'
import { WeaveWorldEnvironment } from '@/components/world/weave-world-environment'
import { NormalWeaveRoleAtmosphere } from '@/components/world/normal-weave-role-atmosphere'
import { FlameEventAd } from '@/components/events/flame-event-ad'
import { PresenceCameraSignal, PresenceCameraViewport } from '@/components/world/presence-camera'

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

  // Continuance enforcement for Bridgers
  useEffect(() => {
    const checkSub = async () => {
      if (user?.role === 'bridger' && pathname !== '/bridger/functions') {
        try {
          const token = localStorage.getItem('ssb_auth_token')
          const res = await fetch('/api/bridger/subscription', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
          const data = await res.json()
          if (data.success && data.subscription.subscription_status === 'suspended') {
            router.push('/bridger/functions')
            toast.error('Your movement here has paused — renewal is needed to continue.')
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

  // Show loading state while checking auth or redirecting
  if (!isInitialized || isLoading || (isRedirecting && !isAuthenticated)) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] animate-pulse">Establishing WEAVE Connection...</p>
        </div>
      </div>
    )
  }

  // Only render children if authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-950">
      <WeaveWorldEnvironment />
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 z-40">
        <AppSidebar user={user as any} />
      </div>
      <div className="relative z-10 flex-1 flex flex-col lg:pl-64">
        <AppHeader user={user as any} />
        <FlameEventAd />
        <main className="relative flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 max-w-[100vw]">
          <PresenceCameraViewport>
          <NormalWeaveRoleAtmosphere
            userRole={user?.role}
            userName={user?.name}
            pathname={pathname}
          >
            <FlameEventRoleAtmosphere
              userRole={user?.role}
              userName={user?.name}
              pathname={pathname}
            >
              {children}
            </FlameEventRoleAtmosphere>
          </NormalWeaveRoleAtmosphere>
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
  )
}
