import type { Metadata, Viewport } from 'next'
import { ClientNavigation } from '@/components/client-navigation'
import { LiveAdSurface } from '@/components/live-ad-surface'
import { ClientRouteGuard } from '@/components/client/client-route-guard'
import { FlameEventAd } from '@/components/events/flame-event-ad'
import { FlameEventRoleAtmosphere } from '@/components/events/flame-event-role-atmosphere'
import { PresenceCameraSignal, PresenceCameraViewport } from '@/components/world/presence-camera'
import { WeaveEnvironmentSurface } from '@/components/world/weave-environment-surface'
import { EnvironmentOrganizerProvider, EnvironmentPageGuard } from '@/components/world/environment-organizer-provider'

export const metadata: Metadata = {
  title: 'WEAVE of Presence — Client Services',
  description: 'WEAVE of Presence · System Switch · Bridge Radiance — Client Services',
  icons: {
    icon: [{ url: '/icon.svg?v=3', type: 'image/svg+xml' }],
    shortcut: '/icon.svg?v=3',
    apple: '/icon.svg?v=3',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#020617',
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Client routes share the root AuthProvider.
  return (
    <EnvironmentOrganizerProvider>
    <div className="weave-client-shell relative min-h-dvh overflow-x-clip bg-transparent">
      <ClientRouteGuard>
        <div className="relative z-10 min-h-screen">
          <ClientNavigation />
          <FlameEventAd />
          <LiveAdSurface />
          <PresenceCameraViewport>
            <WeaveEnvironmentSurface role="client">
              <FlameEventRoleAtmosphere userRole="client">
                <EnvironmentPageGuard>{children}</EnvironmentPageGuard>
              </FlameEventRoleAtmosphere>
            </WeaveEnvironmentSurface>
          </PresenceCameraViewport>
          <PresenceCameraSignal />
        </div>
      </ClientRouteGuard>
    </div>
    </EnvironmentOrganizerProvider>
  )
}
