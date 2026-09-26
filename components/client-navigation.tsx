'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, GitBranch, Home, LayoutGrid, Orbit } from 'lucide-react'

const items = [
  { label: 'Home World', href: '/client/dashboard', icon: Home },
  { label: 'Operating Room', href: '/client/functions', icon: LayoutGrid },
  { label: 'File Folder', href: '/client/system-switch', icon: Orbit },
  { label: 'Loop Field', href: '/client/loops', icon: GitBranch },
  { label: 'Loop 1 Ground', href: '/client/event', icon: Flame },
]

export function ClientNavigation() {
  const pathname = usePathname()

  const isClientEntry =
    pathname === '/client' ||
    pathname === '/client/login' ||
    pathname.startsWith('/client/login/') ||
    pathname === '/client/register' ||
    pathname.startsWith('/client/register/')

  if (isClientEntry) return null

  return (
    <nav className="sticky top-0 z-40 border-b border-sky-300/10 bg-[#03101d]/90 px-1.5 py-1.5 backdrop-blur-2xl">
      <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/client/dashboard' && pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[7px] font-black uppercase tracking-[0.06em] transition ${
                active
                  ? 'border border-sky-300/20 bg-sky-400/[0.08] text-white'
                  : 'border border-transparent text-slate-500'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? 'text-sky-300' : 'text-slate-500'}`} />
              <span className="w-full truncate text-center">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
