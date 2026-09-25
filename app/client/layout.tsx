import type { Metadata, Viewport } from 'next'
import { ClientNavigation } from '@/components/client-navigation'
import { LiveAdSurface } from '@/components/live-ad-surface'
import { WeaveWorldEnvironment } from '@/components/world/weave-world-environment'
import { ClientRouteGuard } from '@/components/client/client-route-guard'
import { FlameEventAd } from '@/components/events/flame-event-ad'
import { PresenceCameraProvider, PresenceCameraSignal, PresenceCameraViewport } from '@/components/world/presence-camera'

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
    <PresenceCameraProvider role="client">
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <WeaveWorldEnvironment />
      <ClientRouteGuard>
        <div className="relative z-10 min-h-screen">
          <ClientNavigation />
          <FlameEventAd />
          <LiveAdSurface />
          <PresenceCameraViewport>{children}</PresenceCameraViewport>
          <PresenceCameraSignal />
        </div>
      </ClientRouteGuard>
    </div>
    </PresenceCameraProvider>
  )
}
