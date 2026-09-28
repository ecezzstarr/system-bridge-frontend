'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, GitBranch, Home, LayoutGrid, Orbit, Route } from 'lucide-react'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'

const items = [
  { label: 'Home World', href: '/client/dashboard', icon: Home },
  { label: 'Operating Room', href: '/client/functions', icon: LayoutGrid },
  { label: 'File Folder', href: '/client/system-switch', icon: Orbit },
  { label: 'Loop Field', href: '/client/loops', icon: GitBranch },
  { label: 'Loop 1 Ground', href: '/client/event', icon: Flame },
]

export function ClientNavigation() {
  const pathname = usePathname()
  const { isVisible, orderFor } = useEnvironmentOrganizer()
  const visibleItems = items.filter(item => isVisible(item.href)).sort((a,b) => orderFor(a.href) - orderFor(b.href))

  const isClientEntry =
    pathname === '/client' ||
    pathname === '/client/login' ||
    pathname.startsWith('/client/login/') ||
    pathname === '/client/register' ||
    pathname.startsWith('/client/register/')

  if (isClientEntry) return null

  return (
    <nav className="weave-client-nav sticky top-0 z-40 border-b border-sky-300/10 bg-[#020912]/94 px-2 py-2 backdrop-blur-2xl" aria-label="Client world routes">
      <div className="mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto"><div className="mr-1 hidden shrink-0 items-center gap-1.5 border-r border-white/10 pr-3 text-[8px] font-black uppercase tracking-[.14em] text-sky-300 sm:flex"><Route className="h-3.5 w-3.5"/>World routes</div>
        {visibleItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/client/dashboard' && pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              data-active={active ? 'true' : 'false'}
              className={`weave-client-nav-item flex min-w-[88px] shrink-0 items-center justify-center gap-2 border-l-2 px-2.5 py-2 text-[7px] font-black uppercase tracking-[0.06em] transition ${
                active
                  ? 'border-sky-300 bg-sky-400/[0.08] text-white'
                  : 'border-white/10 text-slate-500'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? 'text-sky-300' : 'text-slate-500'}`} />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </div></div>
    </nav>
  )
}
