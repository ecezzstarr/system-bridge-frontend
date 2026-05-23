'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogOut, MessageCircle, ArrowRight, Menu, X, ArrowUpRight, ArrowDownLeft, Phone } from 'lucide-react'
import { getClientUser, clearClientAuth } from '@/lib/client-auth'
import { openWhatsAppWithNumber, SUPPORT_NUMBERS } from '@/components/external-apps-nav'

interface ClientUser {
  id: string
  email: string
  phone: string
  name: string
  business_name: string
  role?: 'admin' | 'client'
  referred_by?: string
  bridger_whatsapp?: string
}

interface PositionAgent {
  position: string
  agent_name: string
  agent_username: string
  icon: string
  description: string
  whatsapp?: string
}

const POSITIONS: PositionAgent[] = [
  { position: 'mandate', agent_name: 'Mandate Officer', agent_username: '', icon: '📋', description: 'Mandate Officer', whatsapp: SUPPORT_NUMBERS.mandate },
  { position: 'forensic', agent_name: 'Forensic Expert', agent_username: '', icon: '🔍', description: 'Forensic Expert', whatsapp: SUPPORT_NUMBERS.forensic },
  { position: 'lawyer', agent_name: 'Legal Counsel', agent_username: '', icon: '⚖️', description: 'Attorney', whatsapp: SUPPORT_NUMBERS.legal },
  { position: 'admin', agent_name: 'Administrator', agent_username: '', icon: '👤', description: 'Admin Support', whatsapp: SUPPORT_NUMBERS.admin },
  { position: 'bridger', agent_name: 'Your Bridger', agent_username: '', icon: '🌉', description: 'Your Bridger' },
]

export default function ClientDashboardPage() {
  const router = useRouter()
  const [client, setClient] = useState<ClientUser | null>(null)
  const [positions, setPositions] = useState<PositionAgent[]>(POSITIONS)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Get client from cookies (works on mobile)
    const clientData = getClientUser()
    
    if (!clientData) {
      window.location.href = '/client/login'
      return
    }
    
    setClient(clientData)

    // Fetch bridger info if client was referred
    const fetchBridgerInfo = async () => {
      try {
        const response = await fetch(`/api/client/bridger?clientId=${clientData.id}`)
        const data = await response.json()
        if (data.bridger) {
          // Update the bridger position with actual bridger info
          setPositions(prev => prev.map(pos => 
            pos.position === 'bridger' 
              ? { ...pos, agent_name: data.bridger.name, whatsapp: data.bridger.whatsapp_number }
              : pos
          ))
        }
      } catch (error) {
        console.error('Error fetching bridger info:', error)
      }
    }
    fetchBridgerInfo()
    setIsLoading(false)
  }, [router])

  const handleLogout = () => {
    clearClientAuth()
    window.location.href = '/client/login'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">SSBNOW.SHOP</h1>
            <p className="text-[10px] text-slate-500">Client Services</p>
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-slate-800 text-white"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex">
        {/* Sidebar - Hidden on mobile, slides in when open */}
        <div className={`
          fixed lg:sticky top-0 left-0 z-50 lg:z-0
          w-64 h-screen bg-slate-900/95 lg:bg-slate-900/80 
          border-r border-slate-800 p-4 lg:p-6 
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Close button for mobile */}
          <div className="lg:hidden flex justify-end mb-4">
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg bg-slate-800 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6 lg:mb-8">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Service Positions</h2>
          </div>

          <nav className="flex-1 space-y-1 lg:space-y-2 overflow-y-auto">
            {positions.map((pos) => (
              <div key={pos.position} className="flex items-center gap-2">
                <Link href={`/client/chat/${pos.position}`} onClick={() => setSidebarOpen(false)} className="flex-1">
                  <button className="w-full text-left px-3 py-3 lg:py-2.5 rounded-lg hover:bg-slate-800/50 active:bg-slate-800 transition group flex items-center gap-3">
                    <span className="text-xl lg:text-lg">{pos.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm lg:text-xs font-semibold text-slate-300 group-hover:text-white transition">{pos.description}</p>
                      <p className="text-xs text-slate-500">{pos.agent_name}</p>
                    </div>
                  </button>
                </Link>
                {pos.whatsapp && (
                  <button
                    onClick={() => openWhatsAppWithNumber(pos.whatsapp!, `Hi, I need assistance from ${pos.description}`)}
                    className="p-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 transition"
                    title={`WhatsApp ${pos.description}`}
                  >
                    <Phone className="w-4 h-4 text-green-400" />
                  </button>
                )}
              </div>
            ))}
          </nav>

          <div className="pt-4 border-t border-slate-800 space-y-1 lg:space-y-2">
            {client?.role === 'admin' && (
              <>
                <Link href="/client/admin-chat" className="w-full block" onClick={() => setSidebarOpen(false)}>
                  <button className="w-full text-left px-3 py-3 lg:py-2.5 rounded-lg hover:bg-green-900/30 active:bg-green-900/40 transition text-sm text-green-300 hover:text-green-200 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" /> Manage All Chats
                  </button>
                </Link>
                <Link href="/dashboard" className="w-full block" onClick={() => setSidebarOpen(false)}>
                  <button className="w-full text-left px-3 py-3 lg:py-2.5 rounded-lg hover:bg-purple-900/30 active:bg-purple-900/40 transition text-sm text-purple-300 hover:text-purple-200">
                    ← Back to Platform
                  </button>
                </Link>
              </>
            )}
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-3 lg:py-2.5 rounded-lg hover:bg-red-900/20 active:bg-red-900/30 transition text-sm text-red-400 hover:text-red-300"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
          {/* Desktop Top Bar */}
          <div className="hidden lg:block border-b border-slate-800 px-6 lg:px-8 py-4 lg:py-6 bg-slate-900/40 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-white">SSBNOW.SHOP</h1>
                <p className="text-[10px] lg:text-xs text-slate-500">Weave of Presence · System Switch Bridge Radiance</p>
              </div>
              <div className="flex items-center gap-2 lg:gap-4">
                <div className="px-3 lg:px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                  <p className="text-[10px] lg:text-xs text-slate-400 uppercase tracking-wider">Status</p>
                  <p className="text-xs lg:text-sm font-semibold text-green-400 flex items-center gap-2 mt-1">
                    <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Connected
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Positions Grid */}
          <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
            {/* Mobile Status */}
            <div className="lg:hidden mb-4 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700 inline-flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-xs font-semibold text-green-400">Connected</span>
            </div>

            <div className="mb-6">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Your Service Channels</h2>
              <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 lg:gap-4">
                {positions.map((pos) => (
                  <Link key={pos.position} href={`/client/chat/${pos.position}`}>
                    <div className="group relative h-full">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
                      <div className="relative bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-4 lg:p-6 hover:border-cyan-500/50 active:border-cyan-500 transition cursor-pointer h-full">
                        <div className="flex items-center justify-between mb-3 lg:mb-4">
                          <span className="text-2xl lg:text-4xl">{pos.icon}</span>
                          <div className="w-2 h-2 lg:w-3 lg:h-3 bg-green-400 rounded-full animate-pulse"></div>
                        </div>
                        <h3 className="font-semibold text-white text-sm lg:text-base mb-1">{pos.description}</h3>
                        <p className="text-xs lg:text-sm text-slate-400 mb-2 lg:mb-4 truncate">{pos.agent_name}</p>
                        <p className="text-[10px] lg:text-xs text-slate-500 group-hover:text-cyan-400 transition flex items-center gap-1">
                          Open chat <ArrowRight className="w-3 h-3" />
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Wallet Section */}
            <div className="mt-8 lg:mt-12 pt-6 lg:pt-8 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Wallet & Payments</h3>
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <Link href="/client/deposit">
                  <div className="group bg-slate-800/30 border border-slate-700 rounded-lg p-4 hover:border-green-500/50 transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <ArrowDownLeft className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Deposit</p>
                        <p className="text-xs text-slate-400">Add funds</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/client/withdraw">
                  <div className="group bg-slate-800/30 border border-slate-700 rounded-lg p-4 hover:border-red-500/50 transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <ArrowUpRight className="h-5 w-5 text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Withdraw</p>
                        <p className="text-xs text-slate-400">Cash out</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 lg:mt-12 pt-6 lg:pt-8 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-3 lg:gap-4">
                <WhatsAppButton />
              </div>
            </div>

            {/* Account Info */}
            <div className="mt-8 lg:mt-12 pt-6 lg:pt-8 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Account Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3 lg:p-4">
                  <p className="text-[10px] lg:text-xs text-slate-500 uppercase tracking-wider mb-1 lg:mb-2">Business Name</p>
                  <p className="text-sm font-semibold text-white truncate">{client?.business_name}</p>
                </div>
                <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3 lg:p-4">
                  <p className="text-[10px] lg:text-xs text-slate-500 uppercase tracking-wider mb-1 lg:mb-2">Contact Email</p>
                  <p className="text-sm font-semibold text-white truncate">{client?.email}</p>
                </div>
                <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3 lg:p-4">
                  <p className="text-[10px] lg:text-xs text-slate-500 uppercase tracking-wider mb-1 lg:mb-2">Contact Person</p>
                  <p className="text-sm font-semibold text-white truncate">{client?.name}</p>
                </div>
                <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3 lg:p-4">
                  <p className="text-[10px] lg:text-xs text-slate-500 uppercase tracking-wider mb-1 lg:mb-2">Phone</p>
                  <p className="text-sm font-semibold text-white truncate">{client?.phone || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
