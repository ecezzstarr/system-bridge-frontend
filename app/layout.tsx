import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-provider'
import { ThemeProvider } from 'next-themes'
import { PWARegister } from '@/components/pwa-register'
import { DJBroadcastPlayer } from '@/components/dj-broadcast-player'
import { WEAVE_PUBLIC_ORIGIN } from '@/lib/weave-origin'
import { PresenceCameraProvider, PresenceCameraRootViewport } from '@/components/world/presence-camera'
import { WeaveWorldEnvironment } from '@/components/world/weave-world-environment'
import { InteractionMotionLayer } from '@/components/world/interaction-motion-layer'
import { DivineShieldGate } from '@/components/divine-shield-gate'

export const metadata: Metadata = {
  metadataBase: new URL(WEAVE_PUBLIC_ORIGIN),
  applicationName: 'WEAVE of Presence',
  title: 'WEAVE of Presence — System Switch — Bridge Radiance',
  description: 'Interaction in Motion: a living WEAVE environment for real participation, systems, value and livelihood.',
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
  themeColor: '#08090f',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body className="bg-slate-950 text-slate-100 overflow-x-hidden antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>
            <PresenceCameraProvider>
              <WeaveWorldEnvironment />
              <InteractionMotionLayer />
              <PWARegister />
              <DivineShieldGate>
                <PresenceCameraRootViewport>{children}</PresenceCameraRootViewport>
                <DJBroadcastPlayer />
              </DivineShieldGate>
            </PresenceCameraProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
