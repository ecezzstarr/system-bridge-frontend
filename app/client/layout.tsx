import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'SSBNOW.SHOP - Client Services',
  description: 'Client Services Portal - Connect with your dedicated service team',
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
  // Client routes use separate auth (client_token/client_user)
  // Not wrapped in main AuthProvider
  return (
    <div className="min-h-screen bg-slate-950">
      {children}
    </div>
  )
}
