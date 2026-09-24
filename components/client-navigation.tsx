'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function ClientNavigation() {
  const pathname = usePathname()

  // The client login is an entry gate, not part of the authenticated client workspace.
  if (pathname === '/client/login') return null

  return (
    <nav className="flex gap-4 border-b border-white/10 px-5 py-3 text-sm text-slate-300">
      <Link href="/client/dashboard">Client Portal</Link>
      <Link href="/client/system-switch">My Workshop & Store</Link>
      <Link href="/client/loops">Company Loops</Link>
    </nav>
  )
}
