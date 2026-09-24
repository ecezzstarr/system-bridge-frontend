import type { Metadata, Viewport } from 'next'
import { ClientNavigation } from '@/components/client-navigation'
import { LiveAdSurface } from '@/components/live-ad-surface'

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
  maximumScale: 1,
  userScalable: false,
  themeColor: '#020617',
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Client routes share the root AuthProvider.
  return (
    <div className="min-h-screen bg-slate-950">
      <ClientNavigation />
      <LiveAdSurface />
      {children}
    </div>
  )
}
