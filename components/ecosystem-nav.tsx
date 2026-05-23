'use client'

import Link from 'next/link'
import { Globe, Code, Store, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-provider'

interface EcosystemNavProps {
  currentSystem?: 'home' | 'shop' | 'online' | 'workshop'
  showMobile?: boolean
}

export function EcosystemNav({ currentSystem = 'shop', showMobile = true }: EcosystemNavProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const systems = [
    {
      id: 'home',
      name: 'Home',
      subtitle: 'Main Landing',
      icon: Home,
      href: '/',
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'shop',
      name: 'SSBNOW.SHOP',
      subtitle: 'Agent & Bridger Hub',
      icon: Store,
      href: '/admin/dashboard',
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'online',
      name: 'SSBNOW.ONLINE',
      subtitle: 'Service System',
      icon: Globe,
      // Admin goes to client messages management, clients go to client dashboard
      href: isAdmin ? '/admin/client-messages' : '/client/dashboard',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'workshop',
      name: 'Dev Workshop',
      subtitle: 'Admin Tools',
      icon: Code,
      href: '/admin/dev-workshop',
      color: 'from-pink-500 to-rose-500',
      adminOnly: true,
    },
  ]

  const visibleSystems = systems.filter(s => !s.adminOnly || isAdmin)

  return (
    <div className="w-full">
      {/* Desktop Navigation */}
      <div className="hidden md:flex gap-2 flex-wrap">
        {visibleSystems.map((system) => {
          const Icon = system.icon
          const isCurrent = currentSystem === system.id
          
          return (
            <Link key={system.id} href={system.href}>
              <Button
                variant={isCurrent ? 'default' : 'outline'}
                className={`gap-2 transition-all ${
                  isCurrent
                    ? `bg-gradient-to-r ${system.color} text-white border-0`
                    : 'border-slate-600 hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                <div className="flex flex-col items-start">
                  <span className="text-xs font-semibold">{system.name}</span>
                  <span className="text-[10px] opacity-75">{system.subtitle}</span>
                </div>
              </Button>
            </Link>
          )
        })}
      </div>

      {/* Mobile Navigation */}
      {showMobile && (
        <div className="md:hidden flex flex-col gap-2">
          {visibleSystems.map((system) => {
            const Icon = system.icon
            const isCurrent = currentSystem === system.id
            
            return (
              <Link key={system.id} href={system.href}>
                <Button
                  variant={isCurrent ? 'default' : 'outline'}
                  className={`w-full gap-2 transition-all text-sm ${
                    isCurrent
                      ? `bg-gradient-to-r ${system.color} text-white border-0`
                      : 'border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">{system.name}</span>
                    <span className="text-xs opacity-75">{system.subtitle}</span>
                  </div>
                </Button>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
