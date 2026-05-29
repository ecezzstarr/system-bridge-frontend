'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Code, GitBranch, Zap, Terminal, Settings, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { EcosystemNav } from '@/components/ecosystem-nav'

export default function DeveloperWorkshop() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'tools' | 'systems' | 'config'>('tools')

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, router])

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-purple-900/50 backdrop-blur-sm bg-slate-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <Code className="h-8 w-8 text-purple-400" />
                  <h1 className="text-3xl font-bold text-white">Developer Workshop</h1>
                </div>
                <p className="text-sm text-purple-300 mt-1">WEAVINGSYSTEM.ONLINE - Admin Refinement Layer</p>
              </div>
              <Link href="/admin/dashboard">
                <Button className="gap-2 bg-slate-700 hover:bg-slate-600">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Admin
                </Button>
              </Link>
            </div>

            {/* Ecosystem Navigation */}
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-500 mb-3 font-semibold">NAVIGATE ECOSYSTEM</p>
              <EcosystemNav currentSystem="workshop" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-purple-900/50 backdrop-blur-sm bg-slate-900/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-8">
              {[
                { id: 'tools' as const, label: 'Tools & Commands', icon: <Terminal className="h-4 w-4" /> },
                { id: 'systems' as const, label: 'System Status', icon: <GitBranch className="h-4 w-4" /> },
                { id: 'config' as const, label: 'Configuration', icon: <Settings className="h-4 w-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm gap-2 flex items-center transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-300'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'tools' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* EIGHT Dev Workshop */}
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
                  <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6 h-48">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Code className="h-5 w-5 text-purple-400" />
                        EIGHT Dev Workshop
                      </h3>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">
                      Code your ecosystem with EIGHT. Generate API endpoints, database schemas, and gcloud deploy commands.
                    </p>
                    <Link href="/admin/dev-workshop">
                      <Button className="bg-purple-600 hover:bg-purple-700 w-full">
                        Open Dev Workshop
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* System Debugger */}
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
                  <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6 h-48">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Terminal className="h-5 w-5 text-blue-400" />
                        System Debugger
                      </h3>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">
                      Monitor ecosystem health, trace transaction flow, and debug cross-system operations in real-time.
                    </p>
                    <Button className="bg-blue-600 hover:bg-blue-700 w-full" disabled>
                      Coming Soon
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick Commands */}
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Quick Commands for EIGHT</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { cmd: 'sweep 10 trx to company wallet', desc: 'Execute ecosystem fund sweep' },
                      { cmd: 'status', desc: 'Get unified ecosystem status' },
                      { cmd: 'systems', desc: 'List all connected systems' },
                      { cmd: 'help', desc: 'Show EIGHT command help' },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                        <code className="text-sm text-purple-300 font-mono">{item.cmd}</code>
                        <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'systems' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: 'SSBNOW.SHOP', type: 'Origin Authority', status: 'Active', icon: '🔵', url: 'https://v0-live-site-deployment-pink.vercel.app' },
                  { name: 'SSBNOW.ONLINE', type: 'Service System', status: 'Active', icon: '🟢', url: 'https://v0-live-site-deployment-pink.vercel.app/client/login' },
                  { name: 'WEAVINGSYSTEM.ONLINE', type: 'Workshop', status: 'Active', icon: '🔒', url: '#' },
                ].map((sys, idx) => (
                  <a key={idx} href={sys.url !== '#' ? sys.url : '#'} target={sys.url !== '#' ? '_blank' : undefined} rel={sys.url !== '#' ? 'noreferrer' : undefined}>
                    <div className={`group relative cursor-pointer ${sys.url === '#' ? 'opacity-60' : ''}`}>
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
                      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-lg p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-2xl mb-2">{sys.icon}</div>
                            <h4 className="font-bold text-white">{sys.name}</h4>
                            <p className="text-xs text-slate-400">{sys.type}</p>
                          </div>
                          <span className="text-xs font-mono bg-green-500/20 text-green-300 px-2 py-1 rounded">
                            {sys.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {/* Ecosystem Map */}
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-8">
                  <h3 className="text-lg font-bold text-white mb-6">Unified Ecosystem Architecture</h3>
                  <div className="flex flex-col items-center gap-4">
                    <div className="px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded text-purple-300 font-mono text-sm">
                      🔵 SSBNOW.SHOP (Origin Authority)
                    </div>
                    <div className="h-8 w-1 bg-gradient-to-b from-purple-500 to-transparent"></div>
                    <div className="flex gap-4 justify-center w-full">
                      <div className="px-4 py-2 bg-green-500/20 border border-green-500/50 rounded text-green-300 font-mono text-sm">
                        🟢 SSBNOW.ONLINE (Service)
                      </div>
                      <div className="px-4 py-2 bg-indigo-500/20 border border-indigo-500/50 rounded text-indigo-300 font-mono text-sm">
                        🔒 WEAVINGSYSTEM.ONLINE (Workshop)
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 text-center mt-4">
                      All systems connected through Origin Truth Ledger<br/>
                      EIGHT manages wallet operations and cross-system coordination
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-6">
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Ecosystem Configuration</h3>
                  <div className="space-y-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm font-mono text-slate-300">
                        <span className="text-purple-400">Origin Authority:</span> SSBNOW.SHOP
                      </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm font-mono text-slate-300">
                        <span className="text-green-400">Platform Wallet:</span> TNzNPekX1tbeFYRe3DPjnNV2dG6QfvHymt
                      </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm font-mono text-slate-300">
                        <span className="text-blue-400">Company Wallet:</span> THGBvmPt3XEb8mbSRXViA93GkW3PpCanJk
                      </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm font-mono text-slate-300">
                        <span className="text-indigo-400">Admin Account:</span> ecezzstarr@gmail.com
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Workshop Features</h3>
                    <Link href="/admin/workshop/siblings">
                      <Button className="bg-indigo-600 hover:bg-indigo-700 w-full mb-4">
                        <Users className="h-4 w-4 mr-2" /> Sibling Partnerships
                      </Button>
                    </Link>
                  <ul className="space-y-2">
                    {[
                      'Direct EIGHT multi-system operator control',
                      'Origin Truth Ledger access and management',
                      'Cross-system transaction monitoring',
                      'Ecosystem health diagnostics',
                      'System refinement and optimization tools',
                      'Developer debugging and testing interface',
                    ].map((feature, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-300">
                        <span className="text-purple-400 font-bold">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
