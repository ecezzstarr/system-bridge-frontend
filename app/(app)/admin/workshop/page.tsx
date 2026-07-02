'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Code, GitBranch, Zap, Terminal, Settings, ArrowLeft, 
  Send, Bot, Shield, Activity, Globe, Rocket, CheckCircle2,
  Clock, Play, Database, Wallet, ShieldAlert, Layers,
  ChevronRight, Sparkles, RefreshCcw, Cpu, ShieldCheck, 
  Key, ScrollText, History, TerminalSquare, Users, Server, Link2, 
  Boxes, MoreHorizontal, Power, FileCode, Anchor
} from 'lucide-react'
import Link from 'next/link'
import { EcosystemNav } from '@/components/ecosystem-nav'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Message {
  role: 'admin' | 'eight'
  content: string
  timestamp: Date
}

export default function AdminWorkshop() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('registry')
  const [selectedObject, setSelectedObject] = useState<{ id: string, type: string } | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'eight',
      content: 'Authority Space Initialized. I am EIGHT, your ecosystem operator and refinement companion. Admin, how shall we expand the weave today?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, router])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (!user || user.role !== 'admin') {
    return null
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const adminMessage: Message = {
      role: 'admin',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, adminMessage])
    setInput('')
    setIsTyping(true)

    try {
      const response = await fetch('/api/eight/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: input,
          context: { history: messages.slice(-5) }
        })
      })

      const data = await response.json()
      
      const eightMessage: Message = {
        role: 'eight',
        content: data.message || data.content || 'I have structured your proposal and prepared for execution.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, eightMessage])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        role: 'eight',
        content: 'Error communicating with core systems. Authority link unstable.',
        timestamp: new Date()
      }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 selection:bg-purple-500/30">
      {/* Background Effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <div className="relative flex flex-col h-screen">
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white uppercase">Authority Workshop</h1>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">EIGHT v4.2 | Expansion Hub Sync: ACTIVE</span>
                </div>
              </div>
            </div>
            
            <div className="h-8 w-px bg-white/10 mx-2"></div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="bg-transparent h-auto p-0 gap-1">
                {[
                  { id: 'registry', label: 'Registry', icon: <ScrollText className="w-4 h-4" /> },
                  { id: 'eight-core', label: 'Eight Core', icon: <Bot className="w-4 h-4" /> },
                  { id: 'ai-foundry', label: 'AI Foundry', icon: <Sparkles className="w-4 h-4" /> },
                  { id: 'ecosystem', label: 'Ecosystem', icon: <Globe className="w-4 h-4" /> },
                  { id: 'positions', label: 'Positions', icon: <Users className="w-4 h-4" /> },
                  { id: 'runtime', label: 'Runtime', icon: <Activity className="w-4 h-4" /> },
                  { id: 'governance', label: 'Governance', icon: <ShieldCheck className="w-4 h-4" /> },
                  { id: 'deployments', label: 'Deployments', icon: <Rocket className="w-4 h-4" /> },
                ].map(tab => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id}
                    className="data-[state=active]:bg-white/5 data-[state=active]:text-white text-slate-500 border-none px-4 py-2 rounded-md transition-all text-xs font-medium uppercase tracking-wider"
                  >
                    <span className="flex items-center gap-2">
                      {tab.icon}
                      {tab.label}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-4">
            {activeTab !== 'registry' && (
              <Button 
                onClick={() => {
                  setActiveTab('registry');
                  setSelectedObject(null);
                }}
                size="sm" variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white text-[10px] tracking-widest font-bold uppercase h-8 px-4"
              >
                <ScrollText className="w-3 h-3 mr-2" />
                Registry Map
              </Button>
            )}
            <EcosystemNav currentSystem="workshop" />
            <Link href="/admin/dashboard">
              <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5 uppercase text-[10px] tracking-widest font-bold">
                <ArrowLeft className="w-3 h-3 mr-2" />
                Exit Workshop
              </Button>
            </Link>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 overflow-hidden flex">
          <div className="flex-1 flex flex-col min-w-0 border-r border-white/5">
            {activeTab === 'registry' && (
              <div className="flex-1 overflow-y-auto p-8 space-y-12 bg-[#080808]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                      <ScrollText className="w-5 h-5 text-purple-400" /> Ecosystem Registry
                    </h2>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Live Operational Index & Mapping</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-white/5 bg-white/5 text-[10px] uppercase tracking-widest font-bold h-9">
                      <RefreshCcw className="w-3 h-3 mr-2" /> Refresh Registry
                    </Button>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase tracking-widest h-9 px-4">
                      Register Component
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-12">
                  {[
                    {
                      title: 'AI Registry',
                      id: 'ai',
                      icon: <Bot className="w-4 h-4 text-purple-400" />,
                      targetTab: 'ai-foundry',
                      items: [
                        { id: 'eight', name: 'EIGHT', type: 'Intelligence Core', status: 'Active', version: 'v4.2.0', updated: 'Live', meta: 'Refinement: Level 9' },
                        { id: 'river', name: 'RIVER', type: 'Assistant Node', status: 'Active', version: 'v2.1.5', updated: '2h ago', meta: 'Refinement: Level 7' },
                        { id: 'echo', name: 'ECHO', type: 'Observer System', status: 'Standby', version: 'v1.0.8', updated: '1d ago', meta: 'Refinement: Level 4' },
                      ]
                    },
                    {
                      title: 'Ecosystem Registry',
                      id: 'ecosystem',
                      icon: <Globe className="w-4 h-4 text-blue-400" />,
                      targetTab: 'ecosystem',
                      items: [
                        { id: 'weaving', name: 'WEAVINGSYSTEM.ONLINE', type: 'Authority Space', status: 'Active', version: 'Production', updated: 'Live', meta: 'Runtime: Sovereign' },
                        { id: 'shop', name: 'SSBNOW.SHOP', type: 'Expansion Hub', status: 'Active', version: 'Production', updated: 'Live', meta: 'Runtime: HA Cluster' },
                        { id: 'online', name: 'SSBNOW.ONLINE', type: 'Service System', status: 'Active', version: 'Production', updated: 'Live', meta: 'Runtime: Distributed' },
                      ]
                    },
                    {
                      title: 'Position Registry',
                      id: 'position',
                      icon: <Users className="w-4 h-4 text-green-400" />,
                      targetTab: 'positions', // Need to add this tab
                      items: [
                        { id: 'admin', name: 'Admin', type: 'Root Authority', status: 'Active', version: 'v1.0', updated: 'Live', meta: 'Operational Count: 1' },
                        { id: 'agents', name: 'Agents', type: 'Operational Node', status: 'Active', version: 'v2.4', updated: 'Live', meta: 'Operational Count: 12' },
                        { id: 'bridgers', name: 'Bridgers', type: 'Connector Node', status: 'Active', version: 'v2.1', updated: 'Live', meta: 'Operational Count: 8' },
                        { id: 'siblings', name: 'Siblings', type: 'Autonomous Node', status: 'Active', version: 'v3.0', updated: 'Live', meta: 'Operational Count: 42' },
                        { id: 'ace', name: 'Ace', type: 'Specialist Node', status: 'Inactive', version: 'v1.2', updated: 'Never', meta: 'Operational Count: 0' },
                      ]
                    },
                    {
                      title: 'Runtime Registry',
                      id: 'runtime',
                      icon: <Activity className="w-4 h-4 text-red-400" />,
                      targetTab: 'runtime',
                      items: [
                        { id: 'database', name: 'Database', type: 'Neon Persistence', status: 'Healthy', version: 'v15.x', updated: 'Live', meta: 'Connections: 24/100' },
                        { id: 'wallet', name: 'Wallet', type: 'Blockchain Link', status: 'Active', version: 'v3.2', updated: 'Live', meta: 'Network: Mainnet' },
                        { id: 'gateway', name: 'API Gateway', type: 'Edge Runtime', status: 'Optimal', version: 'v2.0', updated: 'Live', meta: 'Region: Global' },
                        { id: 'workers', name: 'Workers', type: 'Cloud Tasks', status: 'Running', version: 'v1.5', updated: 'Live', meta: 'Workers: 4 Active' },
                        { id: 'bg-services', name: 'Background Services', type: 'Internal Tasks', status: 'Active', version: 'v1.0', updated: 'Live', meta: 'State: Monitoring' },
                      ]
                    },
                    {
                      title: 'Governance Registry',
                      id: 'governance',
                      icon: <ShieldCheck className="w-4 h-4 text-cyan-400" />,
                      targetTab: 'governance',
                      items: [
                        { id: 'truth-ledger', name: 'Origin Truth Ledger', type: 'Master Record', status: 'Locked', version: 'Immutable', updated: 'Live', meta: 'Integrity: Verified' },
                        { id: 'system-registry', name: 'System Registry', type: 'Operational Map', status: 'Active', version: 'v4.2', updated: 'Live', meta: 'Sync: Ecosystem-Wide' },
                        { id: 'divine-shield', name: 'Divine Shield', type: 'Protection', status: 'Reinforced', version: 'v5.0', updated: 'Live', meta: 'Threat Level: Zero' },
                        { id: 'authority-state', name: 'Authority State', type: 'Consensus', status: 'Active', version: 'v1.2', updated: 'Live', meta: 'Rules: sovereign_mode' },
                      ]
                    },
                    {
                      title: 'Deployment Registry',
                      id: 'deployments',
                      icon: <Rocket className="w-4 h-4 text-orange-400" />,
                      targetTab: 'deployments',
                      items: [
                        { id: 'pending', name: 'Pending', type: 'System-Wide', status: 'Queued', version: 'Build #843', updated: 'Waiting', meta: 'Approval: Needed' },
                        { id: 'gen-code', name: 'Generated Code', type: 'Artifacts', status: 'Ready', version: 'v4.2.0', updated: 'Live', meta: 'Files: 12 Modified' },
                        { id: 'gen-sql', name: 'Generated SQL', type: 'Migrations', status: 'Ready', version: 'v4.2.0', updated: 'Live', meta: 'Queries: 4 Pending' },
                        { id: 'gen-commands', name: 'Generated Commands', type: 'GCloud/CLI', status: 'Ready', version: 'v4.2.0', updated: 'Live', meta: 'Scripts: 2 Prepared' },
                        { id: 'history', name: 'Deployment History', type: 'Audit Trail', status: 'Completed', version: 'v4.2.0', updated: 'Live', meta: 'Last: 2h ago' },
                      ]
                    }
                  ].map((section) => (
                    <div key={section.title} className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                        {section.icon} {section.title}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {section.items.map((item) => (
                          <Card 
                            key={item.name} 
                            onClick={() => {
                              setSelectedObject({ id: item.id, type: 'ai' });
                              setActiveTab(section.targetTab);
                            }}
                            className="bg-white/5 border-white/5 p-5 hover:bg-white/[0.08] transition-all group relative overflow-hidden cursor-pointer"
                          >
                            <div className="flex flex-col h-full space-y-4">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <h4 className="text-sm font-bold text-white tracking-tight leading-none group-hover:text-purple-400 transition-colors">
                                    {item.name}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.type}</p>
                                </div>
                                <Badge className={`
                                  text-[9px] font-bold uppercase tracking-tighter h-5
                                  ${item.status === 'Active' || item.status === 'Healthy' || item.status === 'Optimal' || item.status === 'Live' || item.status === 'Completed' || item.status === 'Reinforced' || item.status === 'Locked' || item.status === 'Ready'
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                    : item.status === 'Standby' || item.status === 'Running' || item.status === 'Queued'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    : 'bg-slate-500/10 text-slate-400 border-white/10'}
                                `}>
                                  {item.status}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                                <div>
                                  <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest mb-0.5">Version</p>
                                  <p className="text-xs text-slate-300 font-mono font-bold tracking-tighter">{item.version}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest mb-0.5">Updated</p>
                                  <p className="text-xs text-slate-300 font-bold tracking-tighter">{item.updated}</p>
                                </div>
                              </div>

                              <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                                <p className="text-[10px] text-purple-400/70 font-mono italic tracking-tight">{item.meta}</p>
                              </div>

                              <div className="pt-2 flex gap-2 mt-auto">
                                <Button 
                                  onClick={() => {
                                    setSelectedObject({ id: item.id, type: 'ai' });
                                    setActiveTab(section.targetTab);
                                  }}
                                  size="sm" variant="ghost" className="h-8 flex-1 text-[10px] uppercase tracking-widest font-bold bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white transition-all"
                                >
                                  Open
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 flex-1 text-[10px] uppercase tracking-widest font-bold bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
                                  View
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Hover Actions Overlay - Quick Buttons */}
                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-[-10px] group-hover:translate-y-0 flex flex-col gap-1">
                              <Button 
                                onClick={() => {
                                  setSelectedObject({ id: item.id, type: section.id });
                                  setActiveTab(section.targetTab);
                                }}
                                size="icon" className="w-7 h-7 bg-purple-600 hover:bg-purple-700 rounded-md shadow-lg" title="Open Workspace"
                              >
                                <ArrowLeft className="w-3 h-3 text-white rotate-180" />
                              </Button>
                              <Button size="icon" className="w-7 h-7 bg-blue-600 hover:bg-blue-700 rounded-md shadow-lg" title="Refine">
                                <Sparkles className="w-3 h-3 text-white" />
                              </Button>
                              <Button size="icon" className="w-7 h-7 bg-green-600 hover:bg-green-700 rounded-md shadow-lg" title="Execute">
                                <Play className="w-3 h-3 text-white" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'eight-core' && (
              <div className="flex-1 flex flex-col h-full bg-[#080808]">
                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8" ref={scrollRef}>
                  <div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-xl text-xs text-purple-300 font-sans leading-relaxed">
                    <p className="font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> Live Admin ⇄ EIGHT Workspace
                    </p>
                    <p>EIGHT functions as the ecosystem&apos;s operator, builder, editor, runtime assistant, and refinement companion. Admin proposes, EIGHT structures, Admin approves, EIGHT prepares execution.</p>
                  </div>
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] flex gap-4 ${msg.role === 'admin' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg ${
                          msg.role === 'admin' ? 'bg-slate-800' : 'bg-purple-900/50 border border-purple-500/30'
                        }`}>
                          {msg.role === 'admin' ? <Shield className="w-4 h-4 text-blue-400" /> : <Bot className="w-4 h-4 text-purple-400" />}
                        </div>
                        <div className={`space-y-1 ${msg.role === 'admin' ? 'items-end' : 'items-start'}`}>
                          <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'admin' 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' 
                              : 'bg-white/5 text-slate-200 border border-white/5'
                          }`}>
                            <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                          </div>
                          <span className="text-[10px] text-slate-600 font-mono">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="bg-white/5 px-4 py-3 rounded-2xl flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-6 bg-black/40 border-t border-white/5">
                  <div className="max-w-4xl mx-auto relative">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Propose a refinement or instruct EIGHT..."
                      className="w-full bg-white/5 border-white/10 h-14 pl-6 pr-16 rounded-xl focus:ring-purple-500 focus:border-purple-500 transition-all text-base placeholder:text-slate-600"
                    />
                    <Button 
                      size="icon" 
                      onClick={handleSendMessage}
                      className="absolute right-2 top-2 w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg shadow-purple-500/20"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="mt-3 flex justify-center gap-4 text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                    <span>Admin Proposal</span>
                    <span className="text-white/10">→</span>
                    <span>EIGHT Structure</span>
                    <span className="text-white/10">→</span>
                    <span>Admin Approval</span>
                    <span className="text-white/10">→</span>
                    <span>Execution</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai-foundry' && (
              <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#080808]">
                {selectedObject?.type === 'ai' ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                          <Bot className="w-8 h-8 text-purple-400" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold text-white tracking-tighter">{selectedObject.id.toUpperCase()} Workspace</h2>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 uppercase text-[10px] tracking-widest font-bold">Operational</Badge>
                            <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">v4.2.0 | Refinement Loop: ACTIVE</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase tracking-widest h-9 px-6 shadow-lg shadow-purple-500/20">
                          Deploy Refinement
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[
                        { label: 'Memory', value: 'Unified & Persistent', icon: <Database className="w-5 h-5" />, desc: 'Access and refine long-term context and history.' },
                        { label: 'Knowledge', value: 'Expanding Core', icon: <Globe className="w-5 h-5" />, desc: 'Manage system-wide knowledge base and RAG layers.' },
                        { label: 'Capabilities', value: '42 Active Protocols', icon: <Zap className="w-5 h-5" />, desc: 'Enable or deactivate specific operational protocols.' },
                        { label: 'Tools', value: '18 System Connectors', icon: <Settings className="w-5 h-5" />, desc: 'Configure external tool and API gateway access.' },
                        { label: 'Refinement', value: 'Active Feedback Loop', icon: <RefreshCcw className="w-5 h-5" />, desc: 'Direct feedback and manual override protocols.' },
                        { label: 'Versioning', value: 'v4.0.2 Stable', icon: <GitBranch className="w-5 h-5" />, desc: 'Rollback, branch, and commit system states.' },
                      ].map(stat => (
                        <Card key={stat.label} className="bg-white/5 border border-white/5 p-6 hover:bg-white/[0.08] transition-all cursor-pointer group">
                          <div className="flex items-start justify-between mb-4">
                            <div className="text-purple-400 p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-all">{stat.icon}</div>
                            <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-all text-slate-500">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">{stat.label}</p>
                            <p className="text-lg font-bold text-white tracking-tight mb-2">{stat.value}</p>
                            <p className="text-xs text-slate-500 leading-relaxed">{stat.desc}</p>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Operational Terminal Preview */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                        <Terminal className="w-4 h-4" /> Live {selectedObject.id.toUpperCase()} Logs
                      </h3>
                      <Card className="bg-black border border-white/5 p-6 font-mono text-[11px] text-green-400/70 h-48 overflow-hidden shadow-2xl relative">
                        <div className="space-y-1">
                          <p>{`> Initializing ${selectedObject.id.toUpperCase()} authority link...`}</p>
                          <p>{`> [SUCCESS] Memory layer synchronized (latency: 14ms)`}</p>
                          <p>{`> [INFO] 42 capability protocols validated`}</p>
                          <p>{`> [WAITING] Admin refinement instruction...`}</p>
                          <p className="animate-pulse">_</p>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Ecosystem Models
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { id: 'eight', name: 'EIGHT', role: 'Operator', color: 'purple', status: 'Optimal' },
                        { id: 'river', name: 'RIVER', role: 'Assistant', color: 'blue', status: 'Active' },
                        { id: 'echo', name: 'ECHO', role: 'Observer', color: 'cyan', status: 'Standby' },
                      ].map(ai => (
                        <Card 
                          key={ai.name} 
                          onClick={() => {
                            setSelectedObject({ id: ai.id, type: 'ai' });
                          }}
                          className="bg-white/5 border-white/5 p-6 space-y-4 hover:border-purple-500/30 transition-all group cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div className={`w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-600 transition-all`}>
                              <Cpu className={`w-6 h-6 text-purple-400 group-hover:text-white transition-all`} />
                            </div>
                            <Badge variant="outline" className={`border-purple-500/50 text-purple-400 bg-purple-500/5`}>{ai.status}</Badge>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white tracking-tighter">{ai.name}</h3>
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{ai.role}</p>
                          </div>
                          <Button variant="ghost" className="w-full text-[10px] uppercase tracking-widest font-bold text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all h-8">
                            Open Workspace
                          </Button>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'positions' && (
              <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#080808]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                      <Users className="w-5 h-5 text-green-400" /> Position Management
                    </h2>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Operational Node Authority & Scaling</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { id: 'admin', name: 'Admin', count: 1, status: 'Active', icon: <Shield className="w-5 h-5" />, color: 'blue' },
                    { id: 'agents', name: 'Agents', count: 12, status: 'Active', icon: <Users className="w-5 h-5" />, color: 'green' },
                    { id: 'bridgers', name: 'Bridgers', count: 8, status: 'Active', icon: <Link2 className="w-5 h-5" />, color: 'purple' },
                    { id: 'siblings', name: 'Siblings', count: 42, status: 'Active', icon: <Boxes className="w-5 h-5" />, color: 'cyan' },
                    { id: 'ace', name: 'Ace', count: 0, status: 'Inactive', icon: <Zap className="w-5 h-5" />, color: 'yellow' },
                  ].map(pos => (
                    <Card key={pos.id} className="bg-white/5 border-white/5 p-6 space-y-6 hover:bg-white/[0.08] transition-all group">
                      <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-xl bg-${pos.color}-500/10 text-${pos.color}-400 group-hover:bg-${pos.color}-500 group-hover:text-white transition-all`}>
                          {pos.icon}
                        </div>
                        <Badge className={pos.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'}>
                          {pos.status}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">{pos.name}</h3>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Operational Capacity</p>
                        <div className="flex items-end gap-2 mt-2">
                          <span className="text-3xl font-bold text-white tracking-tighter">{pos.count}</span>
                          <span className="text-xs text-slate-600 mb-1 font-mono uppercase tracking-widest">Nodes Syncing</span>
                        </div>
                      </div>
                      <div className="pt-2 flex gap-2">
                        <Button size="sm" variant="ghost" className="flex-1 text-[10px] uppercase tracking-widest font-bold bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
                          Manage
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
                          <Settings className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ecosystem' && (
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#080808]">
                {selectedObject?.type === 'ecosystem' ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="flex items-center justify-between border-b border-white/5 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                          <Globe className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold text-white tracking-tighter">{selectedObject.id.toUpperCase()}.ONLINE</h2>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 uppercase text-[10px] tracking-widest font-bold">Live</Badge>
                            <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">Sovereign Mode | Sync: 100%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-white/5 bg-white/5 text-[10px] font-bold uppercase tracking-widest h-9 px-6">
                          Sync State
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-widest h-9 px-6">
                          System Restart
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="bg-white/5 border-white/5 p-6 space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <Activity className="w-4 h-4" /> Runtime Health
                        </h3>
                        <div className="space-y-4 pt-2">
                          {[
                            { label: 'CPU Usage', value: '12%', color: 'blue' },
                            { label: 'Memory Load', value: '45%', color: 'purple' },
                            { label: 'Network Latency', value: '8ms', color: 'green' },
                          ].map(metric => (
                            <div key={metric.label} className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                                <span className="text-slate-500">{metric.label}</span>
                                <span className="text-white">{metric.value}</span>
                              </div>
                              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full bg-${metric.color}-500`} style={{ width: metric.value }}></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                      <Card className="bg-white/5 border-white/5 p-6 space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" /> Security State
                        </h3>
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                            <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Divine Shield</span>
                            <span className="text-[10px] font-bold text-green-400 uppercase">Reinforced</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">SSL Certificate</span>
                            <span className="text-[10px] font-bold text-blue-400 uppercase">Valid</span>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 mb-6">Ecosystem Bodies</h2>
                {[
                  { domain: 'WEAVINGSYSTEM.ONLINE', name: 'Authority Workshop', desc: 'Private authority space for refinement and expansion.', status: 'Refining', traffic: 'Admin Only' },
                  { domain: 'SSBNOW.SHOP', name: 'Expansion Hub', desc: 'Primary node for ecosystem growth and bridge authority.', status: 'Live', traffic: 'Public' },
                  { domain: 'SSBNOW.ONLINE', name: 'Operational Service System', desc: 'Client-facing service delivery and operational runtime.', status: 'Live', traffic: 'Public' },
                ].map(site => (
                  <Card key={site.domain} className="bg-white/5 border-white/5 p-6 hover:bg-white/[0.07] transition-all cursor-default group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-purple-500/30 transition-all">
                          <Globe className="w-7 h-7 text-slate-400 group-hover:text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white tracking-tighter">{site.domain}</h3>
                          <p className="text-xs text-purple-400 uppercase tracking-widest font-bold mb-1">{site.name}</p>
                          <p className="text-xs text-slate-500 leading-relaxed max-w-md">{site.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-600 uppercase font-bold tracking-tighter">Status</p>
                          <Badge className="bg-green-500/10 text-green-400 border-green-500/20">{site.status}</Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-600 uppercase font-bold tracking-tighter">Access Density</p>
                          <p className="text-sm font-bold text-slate-400">{site.traffic}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-all text-purple-400">
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'runtime' && (
              <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#080808]">
                {selectedObject?.type === 'runtime' ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                          <Activity className="w-8 h-8 text-red-400" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold text-white tracking-tighter">{selectedObject.id.toUpperCase()} Diagnostics</h2>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 uppercase text-[10px] tracking-widest font-bold">Healthy</Badge>
                            <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">Uptime: 99.9% | Last refined: 2h ago</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-widest h-9 px-6 shadow-lg shadow-red-500/20">
                          Execute Diagnostics
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="bg-white/5 border-white/5 p-6 space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <Zap className="w-4 h-4" /> Operational Actions
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <Button variant="outline" className="h-20 flex flex-col gap-2 border-white/5 bg-white/5 hover:bg-white/10 text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-white">
                            <RefreshCcw className="w-4 h-4" />
                            Restart
                          </Button>
                          <Button variant="outline" className="h-20 flex flex-col gap-2 border-white/5 bg-white/5 hover:bg-white/10 text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-white">
                            <Search className="w-4 h-4" />
                            Trace
                          </Button>
                          <Button variant="outline" className="h-20 flex flex-col gap-2 border-white/5 bg-white/5 hover:bg-white/10 text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-white">
                            <Code className="w-4 h-4" />
                            Refine
                          </Button>
                          <Button variant="outline" className="h-20 flex flex-col gap-2 border-white/5 bg-white/5 hover:bg-white/10 text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-white">
                            <Anchor className="w-4 h-4" />
                            Lock
                          </Button>
                        </div>
                      </Card>
                      
                      <Card className="bg-white/5 border-white/5 p-6 space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <Activity className="w-4 h-4" /> Live Performance
                        </h3>
                        <div className="h-32 flex items-end gap-1 px-2">
                          {[40, 60, 45, 80, 55, 70, 90, 65, 50, 75, 45, 60].map((h, i) => (
                            <div key={i} className="flex-1 bg-red-500/20 rounded-t-sm group relative">
                              <div className="absolute inset-x-0 bottom-0 bg-red-500 rounded-t-sm transition-all duration-500" style={{ height: `${h}%` }}></div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-center text-slate-600 uppercase font-bold tracking-widest">Real-time throughput metrics</p>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Living Ecosystem State</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-2">
                          <Activity className="w-3 h-3" /> System Health & Latency
                        </h3>
                        <div className="space-y-2">
                          {[
                            { id: 'database', name: 'Database (Neon PostgreSQL)', status: 'Healthy', value: 85, icon: <Database className="w-4 h-4" /> },
                            { id: 'wallet', name: 'Wallet services (TRON/Neon)', status: 'Active', value: 92, icon: <Wallet className="w-4 h-4" /> },
                            { id: 'gateway', name: 'API Gateway Status', status: 'Operational', value: 98, icon: <Terminal className="w-4 h-4" /> },
                            { id: 'workers', name: 'Background Services', status: 'Running', value: 76, icon: <RefreshCcw className="w-4 h-4" /> },
                            { id: 'link', name: 'Connected Systems Link', status: 'Stable', value: 100, icon: <Globe className="w-4 h-4" /> },
                          ].map(service => (
                            <div 
                              key={service.name} 
                              onClick={() => setSelectedObject({ id: service.id, type: 'runtime' })}
                              className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3 cursor-pointer hover:bg-white/[0.08] transition-all group"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-red-400 group-hover:text-red-300 transition-colors">{service.icon}</span>
                                  <span className="text-sm font-medium text-slate-300">{service.name}</span>
                                </div>
                                <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">{service.status}</Badge>
                              </div>
                              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-red-500 to-orange-500" style={{ width: `${service.value}%` }}></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-2">
                          <Activity className="w-3 h-3" /> Overall Ecosystem Health
                        </h3>
                        <Card className="bg-black/40 border-white/5 p-8 flex flex-col items-center justify-center space-y-6">
                          <div className="relative w-40 h-40">
                            <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-red-500 border-t-transparent animate-spin [animation-duration:3s]"></div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-4xl font-bold text-white tracking-tighter">98.4%</span>
                              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Optimized</span>
                            </div>
                          </div>
                          <div className="text-center space-y-1">
                            <p className="text-sm font-bold text-white">System Synchronized</p>
                            <p className="text-xs text-slate-500">All 3 bodies are in operational harmony.</p>
                          </div>
                          <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/5 text-[10px] uppercase tracking-widest font-bold h-8">
                            Refresh Diagnostics
                          </Button>
                        </Card>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'governance' && (
              <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#080808]">
                {selectedObject?.type === 'governance' ? (
                   <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                          <ShieldCheck className="w-8 h-8 text-cyan-400" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold text-white tracking-tighter">{selectedObject.id.replace('-', ' ').toUpperCase()} Control</h2>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 uppercase text-[10px] tracking-widest font-bold">Secure</Badge>
                            <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">Access Level: ROOT_ADMIN | Mode: SOVEREIGN</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-bold uppercase tracking-widest h-9 px-6 shadow-lg shadow-cyan-500/20">
                          Modify Authority
                        </Button>
                      </div>
                    </div>

                    <Card className="bg-black/40 border-white/5 p-8 font-mono text-xs text-slate-300 leading-relaxed space-y-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <span className="text-cyan-400 font-bold uppercase tracking-widest">Control Interface</span>
                        <Badge variant="outline" className="text-[9px] border-cyan-500/30 text-cyan-400 uppercase">Encrypted</Badge>
                      </div>
                      <div className="space-y-2">
                        <p className="text-slate-500 italic"># Ecosystem authority ruleset v1.2</p>
                        <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                          <pre>{JSON.stringify({
                            "governance": {
                              "mode": "sovereign",
                              "protected_workshop": true,
                              "divine_shield_active": true,
                              "authority_sync_rate": "100ms"
                            }
                          }, null, 2)}</pre>
                        </div>
                      </div>
                      <div className="pt-4 flex gap-4">
                        <Button size="sm" className="bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] uppercase font-bold tracking-widest h-10 px-6">
                          Update Ledger
                        </Button>
                        <Button size="sm" className="bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] uppercase font-bold tracking-widest h-10 px-6">
                          Sync Systems
                        </Button>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Authority Layer</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-2">
                          <ShieldCheck className="w-3 h-3" /> Origin Truth Ledger
                        </h3>
                        <Card 
                          onClick={() => setSelectedObject({ id: 'truth-ledger', type: 'governance' })}
                          className="bg-white/5 border-white/5 p-6 font-mono text-[11px] space-y-3 relative overflow-hidden group cursor-pointer hover:bg-white/[0.08] transition-all"
                        >
                          <div className="absolute top-0 right-0 p-2 bg-purple-500/10 border-b border-l border-white/5 text-purple-400">
                            <Key className="w-3 h-3" />
                          </div>
                          <div className="space-y-1 text-slate-400">
                            <p className="text-white font-bold mb-2"># ECOSYSTEM_ORIGIN_VERIFIED</p>
                            <p>LEDGER_ROOT: 0x8f2a...c31e</p>
                            <p>BLOCK_HEIGHT: 12,842,901</p>
                            <p>LAST_SYNC: {new Date().toLocaleTimeString()}</p>
                            <div className="pt-3 border-t border-white/5 mt-3 space-y-1 opacity-60 group-hover:opacity-100 transition-all">
                              <p className="text-green-400/80 tracking-tighter">{`> [AUTH] ADMIN_ECEZZ verified`}</p>
                              <p className="text-green-400/80 tracking-tighter">{`> [TRUTH] Registry integrity: 100%`}</p>
                              <p className="text-green-400/80 tracking-tighter">{`> [SEC] Divine Shield: REINFORCED`}</p>
                            </div>
                          </div>
                        </Card>
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-2">
                          <ShieldAlert className="w-3 h-3" /> Divine Shield Status
                        </h3>
                        <Card 
                          onClick={() => setSelectedObject({ id: 'divine-shield', type: 'governance' })}
                          className="bg-purple-900/10 border-purple-500/20 p-6 flex items-center gap-6 cursor-pointer hover:bg-purple-900/20 transition-all group"
                        >
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                              <ShieldCheck className="w-8 h-8 text-purple-400" />
                            </div>
                            <div className="absolute -inset-2 rounded-full border border-purple-500/30 animate-ping [animation-duration:3s]"></div>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-white tracking-tight uppercase">Shield Active</p>
                            <p className="text-xs text-purple-300/70">Ecosystem-wide protection layer is reinforced and monitoring all authority gateways.</p>
                          </div>
                        </Card>

                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { id: 'authority-state', label: 'Authority States', status: 'GRANTED', icon: <Key className="w-3 h-3" /> },
                            { id: 'protected-rules', label: 'Protected System Rules', status: 'ENFORCED', icon: <Shield className="w-3 h-3" /> },
                          ].map(auth => (
                            <div 
                              key={auth.label} 
                              onClick={() => setSelectedObject({ id: auth.id, type: 'governance' })}
                              className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/[0.08] transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-slate-500 group-hover:text-cyan-400 transition-colors">{auth.icon}</span>
                                <span className="text-sm font-bold text-white tracking-tight">{auth.label}</span>
                              </div>
                              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-bold tracking-tighter">{auth.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'deployments' && (
              <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#080808]">
                {selectedObject?.type === 'deployments' ? (
                   <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                          <Rocket className="w-8 h-8 text-orange-400" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold text-white tracking-tighter">{selectedObject.id.replace('-', ' ').toUpperCase()} Details</h2>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 uppercase text-[10px] tracking-widest font-bold">Execution Ready</Badge>
                            <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">Build #843 | Status: Queued for Sync</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold uppercase tracking-widest h-9 px-6 shadow-lg shadow-orange-500/20">
                          Execute Sync
                        </Button>
                      </div>
                    </div>

                    <Card className="bg-black/90 border-white/5 p-8 font-mono text-xs text-white leading-relaxed shadow-2xl relative">
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-orange-400 font-bold uppercase tracking-[0.2em]">Execution Artifacts</span>
                        <div className="flex gap-2">
                          <Badge className="bg-white/5 text-slate-400 border-white/10 uppercase text-[9px]">Build #843</Badge>
                          <Badge className="bg-white/5 text-slate-400 border-white/10 uppercase text-[9px]">v4.2.0</Badge>
                        </div>
                      </div>
                      <div className="space-y-6 text-green-400/90">
                        <div>
                          <p className="text-slate-500 mb-2"># Generated Sync Command</p>
                          <p className="text-white">gcloud run deploy ecosystem-authority-bridge \</p>
                          <p className="pl-8 text-white">--image gcr.io/authority/sync:latest \</p>
                          <p className="pl-8 text-white">--update-env-vars SYNC_MODE=SOVEREIGN</p>
                        </div>
                      </div>
                      <div className="mt-8 pt-6 border-t border-white/5 flex justify-end gap-3">
                        <Button size="sm" variant="ghost" className="text-slate-500 hover:text-white uppercase text-[10px] font-bold tracking-widest">
                          Download Artifacts
                        </Button>
                        <Button size="sm" variant="ghost" className="text-slate-500 hover:text-white uppercase text-[10px] font-bold tracking-widest">
                          View History
                        </Button>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                        <Rocket className="w-4 h-4" /> Execution Bridge
                      </h2>
                      <Button size="sm" className="bg-white text-black hover:bg-slate-200 text-xs font-bold uppercase tracking-[0.2em] px-6 h-10 shadow-lg shadow-white/10">
                        Apply All Refinements
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-2">
                          <RefreshCcw className="w-3 h-3" /> Pending Refinements
                        </h3>
                        <Card 
                          onClick={() => setSelectedObject({ id: 'pending', type: 'deployments' })}
                          className="bg-white/5 border-white/5 p-8 flex flex-col items-center justify-center h-52 border-dashed gap-3 cursor-pointer hover:bg-white/[0.08] transition-all group"
                        >
                          <CheckCircle2 className="w-10 h-10 text-slate-800 group-hover:text-orange-500 transition-colors" />
                          <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest group-hover:text-slate-400 transition-colors">Ecosystem is in sync</p>
                        </Card>
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-2">
                          <History className="w-3 h-3" /> Deployment History
                        </h3>
                        <div className="space-y-3">
                          {[
                            { id: 'history-1', name: 'Authority Workshop UI Refinement', date: '2h ago', status: 'Executed' },
                            { id: 'history-2', name: 'Expansion Hub Bridge Patch', date: '5h ago', status: 'Executed' },
                            { id: 'history-3', name: 'EIGHT Core Logic Update v4.2', date: '1d ago', status: 'Executed' },
                            { id: 'history-4', name: 'Origin Truth Ledger Sync', date: '2d ago', status: 'Executed' },
                          ].map((deploy, i) => (
                            <div 
                              key={i} 
                              onClick={() => setSelectedObject({ id: deploy.id, type: 'deployments' })}
                              className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
                            >
                              <div>
                                <p className="text-sm font-bold text-white tracking-tight group-hover:text-orange-400 transition-colors">{deploy.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">{deploy.date}</p>
                              </div>
                              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 font-bold uppercase text-[9px] tracking-widest">{deploy.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <aside className="w-80 flex flex-col bg-black/40 border-l border-white/5 p-6 space-y-8 overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center justify-between">
                <span>Approval Queue</span>
                <Badge variant="secondary" className="bg-white/5 text-slate-400 h-4 px-1">0</Badge>
              </h3>
              <div className="space-y-2">
                <div className="p-4 bg-white/5 rounded-xl border border-dashed border-white/10 flex items-center justify-center h-24">
                  <p className="text-[10px] text-slate-600 uppercase font-bold tracking-[0.1em] text-center">No pending refinements requiring approval</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center justify-between">
                <span>Execution Queue</span>
                <Badge variant="secondary" className="bg-white/5 text-slate-400 h-4 px-1">0</Badge>
              </h3>
              <div className="space-y-2">
                <div className="p-4 bg-white/5 rounded-xl border border-dashed border-white/10 flex items-center justify-center h-24">
                  <p className="text-[10px] text-slate-600 uppercase font-bold tracking-[0.1em] text-center">No active execution threads</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Activity Stream</h3>
              <div className="space-y-3">
                {[
                  { text: 'Authority Space Initialized', time: 'Just now' },
                  { text: 'Registry Link Established', time: '1m ago' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1"></div>
                    <div>
                      <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tight">{item.text}</p>
                      <p className="text-[9px] text-slate-600 uppercase font-bold">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4 pt-6 border-t border-white/10">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Deployment Requests</h3>
              <Card className="bg-purple-900/10 border border-purple-500/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Push to Production</p>
                  <Rocket className="w-3 h-3 text-purple-400" />
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">Refinements prepared in the Authority Workshop are ready for Expansion Hub sync.</p>
                <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase tracking-[0.1em] h-9">
                  Execute Push
                </Button>
              </Card>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}