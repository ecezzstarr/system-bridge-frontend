'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LogOut, MessageCircle, ArrowRight, Menu, X, ArrowUpRight, ArrowDownLeft, Phone, FileText } from 'lucide-react'
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
  const [client, setClient] = useState<ClientUser | null>(null)
  const [positions, setPositions] = useState<PositionAgent[]>(POSITIONS)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    let isActive = true

    async function loadDashboard() {
      const clientData = getClientUser()
      if (!clientData) {
        window.location.href = '/client/login'
        return
      }

      setClient(clientData)

      try {
        const response = await fetch(`/api/client/bridger?clientId=${clientData.id}`)
        const data = await response.json()

        if (isActive && data.bridger) {
          setPositions((currentPositions) =>
            currentPositions.map((position) =>
              position.position === 'bridger'
                ? {
                    ...position,
                    agent_name: data.bridger.name,
                    whatsapp: data.bridger.whatsapp_number,
                  }
                : position
            )
          )
        }
      } catch (error) {
        console.error('Error fetching bridger info:', error)
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      isActive = false
    }
  }, [])

  const handleLogout = () => {
    clearClientAuth()
    window.location.href = '/client/login'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-400 mb-4" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">SSBNOW.SHOP</h1>
            <p className="text-[10px] text-slate-500">Client Services</p>
          </div>
          <button
            onClick={() => setSidebarOpen((open) => !open)}
            className="rounded-lg bg-slate-800 p-2 text-white"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex">
        <div
          className={`fixed left-0 top-0 z-50 flex h-screen w-64 transform flex-col border-r border-slate-800 bg-slate-900/95 p-4 transition-transform duration-300 ease-in-out lg:sticky lg:z-0 lg:bg-slate-900/80 lg:p-6 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          <div className="mb-4 flex justify-end lg:hidden">
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg bg-slate-800 p-2 text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-6 lg:mb-8">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Service Positions
            </h2>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto lg:space-y-2">
            <Link href="/client/loops" onClick={() => setSidebarOpen(false)}>
              <button className="mb-2 flex w-full items-center gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-3 text-left text-sm font-semibold text-cyan-300 lg:py-2.5">
                <FileText className="h-5 w-5" />
                <div>
                  <p>Client Position</p>
                  <p className="text-[10px] font-normal text-cyan-500/70">Loops & Agreements</p>
                </div>
              </button>
            </Link>

            {positions.map((position) => (
              <div key={position.position} className="flex items-center gap-2">
                <Link
                  href={`/client/chat/${position.position}`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex-1"
                >
                  <button className="group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-slate-800/50 active:bg-slate-800 lg:py-2.5">
                    <span className="text-xl lg:text-lg">{position.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-300 transition group-hover:text-white lg:text-xs">
                        {position.description}
                      </p>
                      <p className="text-xs text-slate-500">{position.agent_name}</p>
                    </div>
                  </button>
                </Link>

                {position.whatsapp && (
                  <button
                    onClick={() =>
                      openWhatsAppWithNumber(
                        position.whatsapp!,
                        `Hi, I need assistance from ${position.description}`
                      )
                    }
                    className="rounded-lg border border-green-500/30 bg-green-600/20 p-2 transition hover:bg-green-600/30"
                    title={`WhatsApp ${position.description}`}
                  >
                    <Phone className="h-4 w-4 text-green-400" />
                  </button>
                )}
              </div>
            ))}
          </nav>

          <div className="space-y-1 border-t border-slate-800 pt-4 lg:space-y-2">
            {client.role === 'admin' && (
              <>
                <Link
                  href="/client/admin-chat"
                  className="block w-full"
                  onClick={() => setSidebarOpen(false)}
                >
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm text-green-300 hover:bg-green-900/30 lg:py-2.5">
                    <MessageCircle className="h-4 w-4" />
                    Manage All Chats
                  </button>
                </Link>
                <Link
                  href="/dashboard"
                  className="block w-full"
                  onClick={() => setSidebarOpen(false)}
                >
                  <button className="w-full rounded-lg px-3 py-3 text-left text-sm text-purple-300 hover:bg-purple-900/30 lg:py-2.5">
                    ← Back to Platform
                  </button>
                </Link>
              </>
            )}

            <button
              onClick={handleLogout}
              className="w-full rounded-lg px-3 py-3 text-left text-sm text-red-400 hover:bg-red-900/20 lg:py-2.5"
            >
              <LogOut className="mr-2 inline h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="flex min-h-screen flex-1 flex-col lg:min-h-0">
          <div className="hidden border-b border-slate-800 bg-slate-900/40 px-6 py-4 backdrop-blur lg:block lg:px-8 lg:py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white lg:text-2xl">SSBNOW.SHOP</h1>
                <p className="text-[10px] text-slate-500 lg:text-xs">
                  Weave of Presence · System Switch Bridge Radiance
                </p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 lg:px-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 lg:text-xs">Status</p>
                <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-green-400 lg:text-sm">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400 lg:h-3 lg:w-3" />
                  Connected
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 lg:hidden">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
              <span className="text-xs font-semibold text-green-400">Connected</span>
            </div>

            <div className="mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Your Service Channels
                </h2>
                <Link href="/client/loops" className="text-xs text-cyan-400 hover:text-cyan-300">
                  Client Position →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                {positions.map((position) => (
                  <Link key={position.position} href={`/client/chat/${position.position}`}>
                    <div className="group relative h-full">
                      <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 blur transition duration-500 group-hover:opacity-100" />
                      <div className="relative h-full rounded-lg border border-slate-700 bg-slate-800/50 p-4 backdrop-blur transition hover:border-cyan-500/50 lg:p-6">
                        <div className="mb-3 flex items-center justify-between lg:mb-4">
                          <span className="text-2xl lg:text-4xl">{position.icon}</span>
                          <div className="h-2 w-2 animate-pulse rounded-full bg-green-400 lg:h-3 lg:w-3" />
                        </div>
                        <h3 className="mb-1 text-sm font-semibold text-white lg:text-base">
                          {position.description}
                        </h3>
                        <p className="mb-2 truncate text-xs text-slate-400 lg:mb-4 lg:text-sm">
                          {position.agent_name}
                        </p>
                        <p className="flex items-center gap-1 text-[10px] text-slate-500 transition group-hover:text-cyan-400 lg:text-xs">
                          Open chat <ArrowRight className="h-3 w-3" />
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <Link href="/client/loops" className="mt-8 block lg:mt-12">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 transition hover:border-cyan-500/40">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-cyan-400">
                      Persistent Client Record
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">
                      Client Position · Company Loops · Agreements
                    </h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Your crossing, current company events, responsibilities, boundaries,
                      and documents to read and sign.
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-cyan-400" />
                </div>
              </div>
            </Link>

            <div className="mt-8 border-t border-slate-800 pt-6 lg:mt-12 lg:pt-8">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Wallet & Payments
              </h3>
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <Link href="/client/deposit">
                  <div className="group cursor-pointer rounded-lg border border-slate-700 bg-slate-800/30 p-4 transition hover:border-green-500/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
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
                  <div className="group cursor-pointer rounded-lg border border-slate-700 bg-slate-800/30 p-4 transition hover:border-red-500/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
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

            <div className="mt-8 border-t border-slate-800 pt-6 lg:mt-12 lg:pt-8">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 gap-3 lg:gap-4">
                <WhatsAppButton />
              </div>
            </div>

            <div className="mt-8 border-t border-slate-800 pt-6 lg:mt-12 lg:pt-8">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Account Information
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
                <AccountInfo label="Business Name" value={client.business_name} />
                <AccountInfo label="Contact Email" value={client.email} />
                <AccountInfo label="Contact Person" value={client.name} />
                <AccountInfo label="Phone" value={client.phone || 'Not provided'} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function WhatsAppButton() {
  return (
    <button
      onClick={() => openWhatsAppWithNumber(SUPPORT_NUMBERS.admin, 'Hi, I need assistance')}
      className="flex w-full items-center gap-3 rounded-lg border border-green-500/30 bg-green-600/10 p-4 transition hover:bg-green-600/20"
    >
      <MessageCircle className="h-5 w-5 text-green-400" />
      <div className="text-left">
        <p className="text-sm font-semibold text-white">WhatsApp Support</p>
        <p className="text-xs text-slate-400">Open a support conversation</p>
      </div>
    </button>
  )
}

function AccountInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-3 lg:p-4">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500 lg:mb-2 lg:text-xs">
        {label}
      </p>
      <p className="truncate text-sm font-semibold text-white">{value}</p>
    </div>
  )
}
