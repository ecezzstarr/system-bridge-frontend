import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-provider'
import { ThemeProvider } from 'next-themes'
import { PWARegister } from '@/components/pwa-register'
import { DJBroadcastPlayer } from '@/components/dj-broadcast-player'
import { FlameEventAd } from '@/components/events/flame-event-ad'

export const metadata: Metadata = {
  title: 'WEAVE - System Bridge',
  description: 'Unified ecosystem for bridgers, agents, administrators, and clients',
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
            <PWARegister />
            <FlameEventAd />
            {children}
            <DJBroadcastPlayer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
