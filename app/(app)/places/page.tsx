'use client'

import { useAuth } from '@/lib/auth-provider'
import { clearToken } from '@/lib/auth-client'
import { LogOut, Store, Gamepad2, MessageCircle, Wallet, ChevronLeft } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import Market from '@/components/places/market'
import Arena from '@/components/places/arena'
import Lounge from '@/components/places/lounge'

export default function PlacesLayout() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activePlace, setActivePlace] = useState<'market' | 'arena' | 'lounge'>('market')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const place = searchParams.get('place') as 'market' | 'arena' | 'lounge'
    if (place && ['market', 'arena', 'lounge'].includes(place)) {
      setActivePlace(place)
    }
  }, [searchParams])

  if (!user) {
    return null
  }

  const handleLogout = () => {
    logout()
    clearToken()
    router.push('/')
  }

  const placeConfig = {
    market: { icon: Store, label: 'Market', color: 'emerald' },
    arena: { icon: Gamepad2, label: 'Arena', color: 'yellow' },
    lounge: { icon: MessageCircle, label: 'Lounge', color: 'cyan' },
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mobile Layout */}
      <div className="max-w-md mx-auto bg-slate-950 min-h-screen flex flex-col">
        {/* Header with Place Selector and User Info */}
        <div className="sticky top-0 z-50 bg-slate-950 border-b border-slate-800">
          {/* Top Bar */}
          <div className="px-4 py-3 flex items-center justify-between">
            <Link href="/dashboard">
              <button className="p-2 hover:bg-slate-800 rounded-lg transition">
                <ChevronLeft className="h-5 w-5 text-slate-400" />
              </button>
            </Link>
            
            <div className="flex-1 text-center">
              <h1 className="text-lg font-bold text-white">Weave</h1>
              <p className="text-xs text-slate-400">of Presence</p>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 hover:bg-slate-800 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          {/* User Info Bar */}
          <div className="px-4 py-2 bg-slate-900/50 border-t border-slate-800 flex items-center gap-2">
            <div className="text-lg">
              {
                {
                  admin: '👑',
                  agent: '🤝',
                  client: '👤',
                  bridger: '🌉',
                }[user.role]
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role}</p>
            </div>
            <div className="flex items-center gap-1">
              <Wallet className="h-4 w-4 text-yellow-400" />
              <p className="text-xs font-bold text-white">{user.wallet_balance}</p>
            </div>
          </div>

          {/* Place Navigation Tabs */}
          <div className="flex border-t border-slate-800">
            {(Object.entries(placeConfig) as [keyof typeof placeConfig, (typeof placeConfig)[keyof typeof placeConfig]][]).map(([key, config]) => {
              const Icon = config.icon
              return (
                <button
                  key={key}
                  onClick={() => setActivePlace(key)}
                  className={`flex-1 flex flex-col items-center gap-1 px-3 py-3 transition-colors border-b-2 ${
                    activePlace === key
                      ? `border-${config.color}-500 text-${config.color}-400`
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium capitalize">{config.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Place Content - Full Screen */}
        <div className="flex-1 overflow-y-auto pb-4">
          {mounted && (
            <>
              {activePlace === 'market' && <Market />}
              {activePlace === 'arena' && <Arena />}
              {activePlace === 'lounge' && <Lounge />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
