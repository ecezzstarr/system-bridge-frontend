import type { Metadata, Viewport } from 'next'
import './globals.css'
import './weave-readability.css'
import './weave-theme.css'
import './weave-mobile.css'
import './weave-home-burning-river.css'
import './weave-company-theme.css'
import './weave-position-ticket-theme.css'
import './weave-plus-app-foundation.css'
import { AuthProvider } from '@/lib/auth-provider'
import { ThemeProvider } from 'next-themes'
import { PWARegister } from '@/components/pwa-register'
import { PublicAppDownloadEntry } from '@/components/public-app-download-entry'
import { DJBroadcastPlayer } from '@/components/dj-broadcast-player'
import { WEAVE_PUBLIC_ORIGIN } from '@/lib/weave-origin'
import { PresenceCameraProvider, PresenceCameraRootViewport } from '@/components/world/presence-camera'
import { WeaveWorldEnvironment } from '@/components/world/weave-world-environment'
import { InteractionMotionLayer } from '@/components/world/interaction-motion-layer'
import { DivineShieldGate } from '@/components/divine-shield-gate'
import { WeaveEnvironmentTransit } from '@/components/world/weave-environment-transit'
import { WeavePresenceAmbience } from '@/components/world/weave-presence-ambience'
import { WeaveRadianceCrossing } from '@/components/world/weave-radiance-crossing'

// Every phone navigation must render the currently deployed WEAVE release.
// Keep immutable Next.js assets cached; never retain an old application shell.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(WEAVE_PUBLIC_ORIGIN),
  applicationName: 'WEAVE of Presence',
  title: 'The Weave of Presence: System Switch — Bridge of Radiance',
  description: 'Interaction in Motion. The Weave of Presence: System Switch — Bridge of Radiance. A living environment for participation, working systems, value and livelihood.',
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
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
  themeColor: '#eaf6fc',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden" data-weave-theme="river-gold" data-weave-app-theme="river-gold">
      <body className="bg-background text-foreground overflow-x-hidden antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
          <AuthProvider>
            <PresenceCameraProvider>
              <WeaveWorldEnvironment />
              <InteractionMotionLayer />
              <PWARegister />
              <PublicAppDownloadEntry />
              <WeaveEnvironmentTransit>
                <DivineShieldGate>
                  <PresenceCameraRootViewport>{children}</PresenceCameraRootViewport>
                  <WeaveRadianceCrossing />
                  <WeavePresenceAmbience />
                  <DJBroadcastPlayer />
                </DivineShieldGate>
              </WeaveEnvironmentTransit>
            </PresenceCameraProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
