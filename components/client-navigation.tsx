'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, GitBranch, Home, Orbit } from 'lucide-react'

const items = [
  { label: 'Client Portal', href: '/client/dashboard', icon: Home },
  { label: 'File Folder', href: '/client/system-switch', icon: Orbit },
  { label: 'Company Loops', href: '/client/loops', icon: GitBranch },
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
    <nav className="sticky top-0 z-40 border-b border-sky-300/10 bg-[#03101d]/88 px-3 py-2.5 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/client/dashboard' && pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                active
                  ? 'border border-sky-300/20 bg-sky-400/[0.08] text-white'
                  : 'border border-transparent text-slate-400 hover:bg-white/[0.03] hover:text-white'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? 'text-sky-300' : 'text-slate-500'}`} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
