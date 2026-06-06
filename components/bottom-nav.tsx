'use client'

import { Home, Store, MessageSquare, Gamepad2, Globe } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { name: 'Home', href: '/dashboard', icon: Home, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { name: 'Market', href: '/marketplace', icon: Store, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { name: 'Lounge', href: '/lounge', icon: MessageSquare, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { name: 'Casino', href: '/casino', icon: Gamepad2, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { name: 'Arena', href: '/arena', icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ]

  return (
    <nav className="sticky bottom-0 p-4 pb-8 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800 flex justify-around items-center z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        return (
          <Link key={item.name} href={item.href} className="flex flex-col items-center gap-1 group">
            <div className={cn(
              "p-2 rounded-xl transition-all duration-300",
              isActive ? cn(item.bg, item.color) : "text-slate-500 group-hover:text-white"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-tighter transition-colors",
              isActive ? item.color : "text-slate-500 group-hover:text-white"
            )}>
              {item.name}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
