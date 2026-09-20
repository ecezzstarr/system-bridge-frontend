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
  // Client routes share the root AuthProvider.
  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="flex gap-4 border-b border-white/10 px-5 py-3 text-sm text-slate-300"><a href="/client/dashboard">Client Portal</a><a href="/client/system-switch">My Workshop & Store</a><a href="/client/loops">Company Loops</a></nav>
      {children}
    </div>
  )
}
