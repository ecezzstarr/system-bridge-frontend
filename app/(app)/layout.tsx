'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { AppHeader } from '@/components/app-header'
import { AgentSmartGuide, BridgerSmartGuide } from '@/components/agent/agent-smart-guide'
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
import { WeaveExistingPageImage } from '@/components/world/weave-existing-page-image'
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
  const [legionEmployment, setLegionEmployment] = useState<any>(null)
  const [legionChecked, setLegionChecked] = useState(false)
  const routeAllowed = canAccessEnvironmentRoute(pathname, user?.role)
  const restoringHope = user?.role === 'bridger' || pathname.startsWith('/bridger') || pathname === '/weave/market/prospects'

  useEffect(() => {
    if (isInitialized && !isLoading && isAuthenticated && !routeAllowed) {
      router.replace(user?.role === 'admin' ? '/admin/agent-channels' : '/client/dashboard')
    }
  }, [isInitialized, isLoading, isAuthenticated, routeAllowed, user?.role, router])

  useEffect(() => {
    if (isInitialized && !isLoading && !isAuthenticated && !isRedirecting) {
      setIsRedirecting(true)
      router.replace('/login')
    }
  }, [isInitialized, isLoading, isAuthenticated, isRedirecting, router])

  // Legion is an exclusive Client employment Lifestyle. The underlying account
  // remains Agent/Bridger, but once accepted the person no longer operates that
  // normal position until the Legion employment ends.
  useEffect(() => {
    const checkLegion = async () => {
      if (!user?.id || !['agent', 'bridger'].includes(user.role || '')) {
        setLegionEmployment(null)
        setLegionChecked(true)
        return
      }
      try {
        const token = localStorage.getItem('ssb_auth_token')
        const res = await fetch('/api/weave/lifestyles/legion', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        })
        const data = await res.json().catch(() => ({}))
        const employment = data?.employment?.active ? data.employment : null
        setLegionEmployment(employment)
        if (employment && !pathname.startsWith('/weave/lifestyles/legion')) {
          router.replace('/weave/lifestyles/legion')
        }
      } catch (e) {
        console.error('Legion position check error:', e)
      } finally {
        setLegionChecked(true)
      }
    }
    if (isAuthenticated && user?.id) void checkLegion()
  }, [isAuthenticated, user?.id, user?.role, pathname, router])

  // Continuance enforcement for Bridgers who are still operating as Bridgers.
  useEffect(() => {
    const checkSub = async () => {
      if (user?.role === 'bridger' && !legionEmployment?.active && !['/bridger/subscription', '/weave/lifestyles', '/wallet', '/wallet/deposit-withdraw'].includes(pathname)) {
        try {
          const token = localStorage.getItem('ssb_auth_token')
          const res = await fetch('/api/bridger/subscription', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            cache: 'no-store',
          })
          const data = await res.json()
          if (data.success && data.subscription?.status === 'suspended') {
            router.replace('/weave/lifestyles')
            toast.error('Bridger Continuance is due. Subscribe from Lifestyle or fund your Flame Coin wallet to reopen it.')
          }
        } catch (e) {
          console.error('Sub check error:', e)
        }
      }
    }
    if (isAuthenticated && user?.role === 'bridger' && legionChecked) void checkSub()
  }, [user, pathname, isAuthenticated, router, legionEmployment, legionChecked])

  const [termsNeeded, setTermsNeeded] = useState(false)
  const [termsChecked, setTermsChecked] = useState(false)

  useEffect(() => {
    const checkTerms = async () => {
      if (legionEmployment?.active) {
        setTermsNeeded(false)
        setTermsChecked(true)
        return
      }
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
        if (data.success) setTermsNeeded(data.needsAcceptance)
      } catch (e) {
        console.error('Terms check error:', e)
      } finally {
        setTermsChecked(true)
      }
    }

    if (isAuthenticated && user?.id && legionChecked) void checkTerms()
  }, [isAuthenticated, user?.id, user?.role, legionEmployment, legionChecked])

  const legionPositionPending = Boolean(user?.role && ['agent','bridger'].includes(user.role) && !legionChecked)
  if (!isInitialized || isLoading || legionPositionPending || (isRedirecting && !isAuthenticated)) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-transparent px-4 text-center"
        data-environment-pending="true"
        role="status"
        aria-live="polite"
      >
        <div className="max-w-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border border-amber-200/15 border-t-amber-200 motion-reduce:animate-none" />
          <p className="mt-4 text-[9px] font-black uppercase tracking-[.18em] text-amber-100">{restoringHope ? 'Hope · Bridger Department' : 'Opening WEAVE'}</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">{restoringHope ? 'WEAVE builds across the world. Hope works through Prospect possibilities until real response can become Client ownership and use.' : 'Restoring your position and the current environment.'}</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null
  if (!routeAllowed) return null
  if (legionEmployment?.active && !pathname.startsWith('/weave/lifestyles/legion')) return null

  return (
    <EnvironmentOrganizerProvider>
    <div className="weave-app-shell relative min-h-dvh overflow-hidden bg-transparent" data-weave-world-runtime="persistent" data-legion-exclusive={legionEmployment?.active ? 'true' : 'false'}>
      <div className="relative z-10 flex min-h-dvh min-w-0 flex-col">
        <AppHeader user={user as any} />
        <FlameEventAd />
        <main className="relative min-w-0 flex-1 overflow-x-clip" data-weave-world-interior="route">
          <PresenceCameraViewport>
            <WeaveEnvironmentSurface role={user?.role} userName={user?.name}>
              <FlameEventRoleAtmosphere userRole={user?.role} userName={user?.name} pathname={pathname}>
                <NormalWeaveRoleAtmosphere userRole={user?.role} userName={user?.name} pathname={pathname}>
                  <EnvironmentPageGuard><WeaveExistingPageImage/>{children}</EnvironmentPageGuard>
                </NormalWeaveRoleAtmosphere>
              </FlameEventRoleAtmosphere>
            </WeaveEnvironmentSurface>
          </PresenceCameraViewport>
        </main>
      </div>
      {user?.role==='agent'&&termsChecked&&!termsNeeded&&!legionEmployment?.active&&user.id&&<AgentSmartGuide userId={user.id}/>}
      {user?.role==='bridger'&&termsChecked&&!termsNeeded&&!legionEmployment?.active&&user.id&&<BridgerSmartGuide userId={user.id}/>}
      <Toaster position="top-center" richColors />
      <LiveAdSurface />
      <PresenceCameraSignal />
      {termsChecked && termsNeeded && !legionEmployment?.active && user?.role && ['agent', 'bridger'].includes(user.role) && (
        <TermsAcceptanceModal role={user.role as 'agent' | 'bridger'} userName={user.name} onAccepted={() => setTermsNeeded(false)} />
      )}
    </div>
    </EnvironmentOrganizerProvider>
  )
}
