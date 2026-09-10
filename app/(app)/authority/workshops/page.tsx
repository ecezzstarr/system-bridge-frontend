'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { 
  Code, GitBranch, Zap, Terminal, Settings, ArrowLeft, 
  Send, Bot, Shield, Activity, Globe, Rocket, CheckCircle2,
  Database, Wallet, ShieldAlert,
  ChevronRight, Sparkles, RefreshCcw, Cpu, ShieldCheck, 
  Key, ScrollText, History, Users, Link2, 
  Boxes, MoreHorizontal, Play, Anchor, Search
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

export default function AuthorityWorkshop() {
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
    if (!user || user.role !== 'admin') router.push('/dashboard')
  }, [user, router])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  if (!user || user.role !== 'admin') return null

  const handleSendMessage = async () => {
    if (!input.trim()) return
    const adminMessage: Message = { role: 'admin', content: input, timestamp: new Date() }
    setMessages(prev => [...prev, adminMessage])
    setInput('')
    setIsTyping(true)
    try {
      const response = await fetch('/api/eight/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: input, context: { history: messages.slice(-5) } })
      })
      const data = await response.json()
      setMessages(prev => [...prev, { role: 'eight', content: data.message || data.content || 'I have structured your proposal and prepared for execution.', timestamp: new Date() }])
    } catch {
      setMessages(prev => [...prev, { role: 'eight', content: 'Error communicating with core systems. Authority link unstable.', timestamp: new Date() }])
    } finally {
      setIsTyping(false)
    }
  }

  const registry = [
    { title: 'AI Registry', id: 'ai', icon: <Bot className="w-4 h-4 text-purple-400" />, targetTab: 'ai-foundry', items: [
      { id: 'eight', name: 'EIGHT', type: 'Intelligence Core', status: 'Active', version: 'v4.2.0', updated: 'Live', meta: 'Refinement: Level 9' },
      { id: 'river', name: 'RIVER', type: 'Assistant Node', status: 'Active', version: 'v2.1.5', updated: '2h ago', meta: 'Refinement: Level 7' },
      { id: 'echo', name: 'ECHO', type: 'Observer System', status: 'Standby', version: 'v1.0.8', updated: '1d ago', meta: 'Refinement: Level 4' },
    ]},
    { title: 'Ecosystem Registry', id: 'ecosystem', icon: <Globe className="w-4 h-4 text-blue-400" />, targetTab: 'ecosystem', items: [
      { id: 'weaving', name: 'WEAVINGSYSTEM.ONLINE', type: 'Authority Space', status: 'Active', version: 'Production', updated: 'Live', meta: 'Runtime: Sovereign' },
      { id: 'shop', name: 'SSBNOW.SHOP', type: 'Expansion Hub', status: 'Active', version: 'Production', updated: 'Live', meta: 'Runtime: HA Cluster' },
      { id: 'online', name: 'SSBNOW.ONLINE', type: 'Service System', status: 'Active', version: 'Production', updated: 'Live', meta: 'Runtime: Distributed' },
    ]},
    { title: 'Position Registry', id: 'position', icon: <Users className="w-4 h-4 text-green-400" />, targetTab: 'positions', items: [
      { id: 'admin', name: 'Admin', type: 'Root Authority', status: 'Active', version: 'v1.0', updated: 'Live', meta: 'Operational Count: 1' },
      { id: 'agents', name: 'Agents', type: 'Operational Node', status: 'Active', version: 'v2.4', updated: 'Live', meta: 'Operational Count: 12' },
      { id: 'bridgers', name: 'Bridgers', type: 'Connector Node', status: 'Active', version: 'v2.1', updated: 'Live', meta: 'Operational Count: 8' },
      { id: 'siblings', name: 'Siblings', type: 'Autonomous Node', status: 'Active', version: 'v3.0', updated: 'Live', meta: 'Operational Count: 42' },
      { id: 'ace', name: 'Ace', type: 'Specialist Node', status: 'Inactive', version: 'v1.2', updated: 'Never', meta: 'Operational Count: 0' },
    ]},
    { title: 'Runtime Registry', id: 'runtime', icon: <Activity className="w-4 h-4 text-red-400" />, targetTab: 'runtime', items: [
      { id: 'database', name: 'Database', type: 'Neon Persistence', status: 'Healthy', version: 'v15.x', updated: 'Live', meta: 'Connections: 24/100' },
      { id: 'wallet', name: 'Wallet', type: 'Blockchain Link', status: 'Active', version: 'v3.2', updated: 'Live', meta: 'Network: Mainnet' },
      { id: 'gateway', name: 'API Gateway', type: 'Edge Runtime', status: 'Optimal', version: 'v2.0', updated: 'Live', meta: 'Region: Global' },
      { id: 'workers', name: 'Workers', type: 'Cloud Tasks', status: 'Running', version: 'v1.5', updated: 'Live', meta: 'Workers: 4 Active' },
      { id: 'bg-services', name: 'Background Services', type: 'Internal Tasks', status: 'Active', version: 'v1.0', updated: 'Live', meta: 'State: Monitoring' },
    ]},
    { title: 'Governance Registry', id: 'governance', icon: <ShieldCheck className="w-4 h-4 text-cyan-400" />, targetTab: 'governance', items: [
      { id: 'truth-ledger', name: 'Origin Truth Ledger', type: 'Master Record', status: 'Locked', version: 'Immutable', updated: 'Live', meta: 'Integrity: Verified' },
      { id: 'system-registry', name: 'System Registry', type: 'Operational Map', status: 'Active', version: 'v4.2', updated: 'Live', meta: 'Sync: Ecosystem-Wide' },
      { id: 'divine-shield', name: 'Divine Shield', type: 'Protection', status: 'Reinforced', version: 'v5.0', updated: 'Live', meta: 'Threat Level: Zero' },
      { id: 'authority-state', name: 'Authority State', type: 'Consensus', status: 'Active', version: 'v1.2', updated: 'Live', meta: 'Rules: sovereign_mode' },
    ]},
    { title: 'Deployment Registry', id: 'deployments', icon: <Rocket className="w-4 h-4 text-orange-400" />, targetTab: 'deployments', items: [
      { id: 'pending', name: 'Pending', type: 'System-Wide', status: 'Queued', version: 'Build #843', updated: 'Waiting', meta: 'Approval: Needed' },
      { id: 'gen-code', name: 'Generated Code', type: 'Artifacts', status: 'Ready', version: 'v4.2.0', updated: 'Live', meta: 'Files: 12 Modified' },
      { id: 'gen-sql', name: 'Generated SQL', type: 'Migrations', status: 'Ready', version: 'v4.2.0', updated: 'Live', meta: 'Queries: 4 Pending' },
      { id: 'gen-commands', name: 'Generated Commands', type: 'GCloud/CLI', status: 'Ready', version: 'v4.2.0', updated: 'Live', meta: 'Scripts: 2 Prepared' },
      { id: 'history', name: 'Deployment History', type: 'Audit Trail', status: 'Completed', version: 'v4.2.0', updated: 'Live', meta: 'Last: 2h ago' },
    ]},
  ] as const

  const tabs = [
    { id: 'registry', label: 'Registry', icon: ScrollText }, { id: 'eight-core', label: 'Eight Core', icon: Bot },
    { id: 'ai-foundry', label: 'AI Foundry', icon: Sparkles }, { id: 'ecosystem', label: 'Ecosystem', icon: Globe },
    { id: 'positions', label: 'Positions', icon: Users }, { id: 'runtime', label: 'Runtime', icon: Activity },
    { id: 'governance', label: 'Governance', icon: ShieldCheck }, { id: 'deployments', label: 'Deployments', icon: Rocket },
  ] as const

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 selection:bg-purple-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>
      <div className="relative flex flex-col h-screen">
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"><div className="w-8 h-8 rounded bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center"><Cpu className="w-5 h-5 text-white" /></div><div><h1 className="text-lg font-bold tracking-tight text-white uppercase">Authority Workshops</h1><div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /><span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">EIGHT v4.2 | Ecosystem Authority</span></div></div></div>
            <div className="h-8 w-px bg-white/10 mx-2" />
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto"><TabsList className="bg-transparent h-auto p-0 gap-1">{tabs.map(tab => { const Icon = tab.icon; return <TabsTrigger key={tab.id} value={tab.id} className="data-[state=active]:bg-white/5 data-[state=active]:text-white text-slate-500 border-none px-4 py-2 rounded-md transition-all text-xs font-medium uppercase tracking-wider"><span className="flex items-center gap-2"><Icon className="w-4 h-4" />{tab.label}</span></TabsTrigger> })}</TabsList></Tabs>
          </div>
          <div className="flex items-center gap-4"><EcosystemNav currentSystem="authority" /><Link href="/authority"><Button size="sm" variant="ghost" className="text-slate-400 hover:text-white uppercase text-[10px] tracking-widest font-bold"><ArrowLeft className="w-3 h-3 mr-2" />Ecosystem Authority</Button></Link></div>
        </header>
        <main className="flex-1 overflow-hidden flex">
          <div className="flex-1 flex flex-col min-w-0 border-r border-white/5">
            {activeTab === 'registry' && <div className="flex-1 overflow-y-auto p-8 space-y-12 bg-[#080808]"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3"><ScrollText className="w-5 h-5 text-purple-400" />Ecosystem Registry</h2><p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Live Operational Index & Mapping</p></div><div className="flex gap-2"><Button size="sm" variant="outline" className="border-white/5 bg-white/5 text-[10px] uppercase tracking-widest font-bold h-9"><RefreshCcw className="w-3 h-3 mr-2" />Refresh Registry</Button><Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase tracking-widest h-9 px-4">Register Component</Button></div></div><div className="grid grid-cols-1 gap-12">{registry.map(section => { const Icon = section.icon; return <div key={section.title} className="space-y-4"><h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">{Icon}{section.title}</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{section.items.map(item => <Card key={item.name} onClick={() => { setSelectedObject({ id: item.id, type: section.id }); setActiveTab(section.targetTab) }} className="bg-white/5 border-white/5 p-5 hover:bg-white/[0.08] transition-all group relative overflow-hidden cursor-pointer"><div className="flex flex-col h-full space-y-4"><div className="flex items-start justify-between"><div className="space-y-1"><h4 className="text-sm font-bold text-white tracking-tight leading-none group-hover:text-purple-400 transition-colors">{item.name}</h4><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.type}</p></div><Badge className="text-[9px] font-bold uppercase tracking-tighter bg-green-500/10 text-green-400 border-green-500/20">{item.status}</Badge></div><div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4"><div><p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest mb-0.5">Version</p><p className="text-xs text-slate-300 font-mono font-bold">{item.version}</p></div><div><p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest mb-0.5">Updated</p><p className="text-xs text-slate-300 font-bold">{item.updated}</p></div></div><div className="bg-black/20 rounded-lg p-2 border border-white/5"><p className="text-[10px] text-purple-400/70 font-mono italic">{item.meta}</p></div><div className="pt-2 flex gap-2 mt-auto"><Button onClick={() => { setSelectedObject({ id: item.id, type: section.id }); setActiveTab(section.targetTab) }} size="sm" variant="ghost" className="h-8 flex-1 text-[10px] uppercase tracking-widest font-bold bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white">Open</Button><Button size="sm" variant="ghost" className="h-8 flex-1 text-[10px] uppercase tracking-widest font-bold bg-white/5 text-slate-400">View</Button><Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-white/5 text-slate-400"><MoreHorizontal className="w-4 h-4" /></Button></div></div></Card>)}</div></div> })}</div></div>}
            {activeTab === 'eight-core' && <div className="flex-1 flex flex-col h-full bg-[#080808]"><div className="flex-1 overflow-y-auto p-6 space-y-8" ref={scrollRef}><div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-xl text-xs text-purple-300 leading-relaxed"><p className="font-bold uppercase tracking-widest mb-1 flex items-center gap-2"><Sparkles className="w-3 h-3" />Live Admin ⇄ EIGHT Workspace</p><p>EIGHT functions as the ecosystem's operator, builder, editor, runtime assistant, and refinement companion. Admin proposes, EIGHT structures, Admin approves, EIGHT prepares execution.</p></div>{messages.map((msg, i) => <div key={i} className={`flex ${msg.role === 'admin' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] flex gap-4 ${msg.role === 'admin' ? 'flex-row-reverse' : ''}`}><div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-purple-900/50 border border-purple-500/30"><Bot className="w-4 h-4 text-purple-400" /></div><div><div className="px-4 py-3 rounded-2xl text-sm leading-relaxed bg-white/5 text-slate-200 border border-white/5"><div className="whitespace-pre-wrap">{msg.content}</div></div><span className="text-[10px] text-slate-600 font-mono">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div></div></div>)}{isTyping && <div className="text-xs text-slate-500">EIGHT is processing…</div>}</div><div className="p-6 bg-black/40 border-t border-white/5"><div className="max-w-4xl mx-auto relative"><Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Propose a refinement or instruct EIGHT..." className="w-full bg-white/5 border-white/10 h-14 pl-6 pr-16 rounded-xl" /><Button size="icon" onClick={handleSendMessage} className="absolute right-2 top-2 w-10 h-10 bg-purple-600"><Send className="w-4 h-4" /></Button></div></div></div>}
            {activeTab === 'ai-foundry' && <div className="flex-1 overflow-y-auto p-8 bg-[#080808]"><Card className="bg-white/5 border-white/5 p-6"><h2 className="text-2xl font-bold text-white">AI Foundry</h2><p className="mt-2 text-sm text-slate-500">EIGHT, RIVER and ECHO refinement workspace.</p></Card></div>}
            {activeTab === 'ecosystem' && <div className="flex-1 overflow-y-auto p-8 bg-[#080808]"><Card className="bg-white/5 border-white/5 p-6"><h2 className="text-2xl font-bold text-white">Ecosystem</h2><p className="mt-2 text-sm text-slate-500">Connected ecosystem bodies and authority state.</p></Card></div>}
            {activeTab === 'positions' && <div className="flex-1 overflow-y-auto p-8 bg-[#080808]"><Card className="bg-white/5 border-white/5 p-6"><h2 className="text-2xl font-bold text-white">Positions</h2><p className="mt-2 text-sm text-slate-500">Admin, Agents, Bridgers, Siblings and Ace.</p></Card></div>}
            {activeTab === 'runtime' && <div className="flex-1 overflow-y-auto p-8 bg-[#080808]"><Card className="bg-white/5 border-white/5 p-6"><h2 className="text-2xl font-bold text-white">Runtime</h2><p className="mt-2 text-sm text-slate-500">Database, wallet, gateway and background services.</p></Card></div>}
            {activeTab === 'governance' && <div className="flex-1 overflow-y-auto p-8 bg-[#080808]"><Card className="bg-white/5 border-white/5 p-6"><h2 className="text-2xl font-bold text-white">Governance</h2><p className="mt-2 text-sm text-slate-500">Origin Truth Ledger, System Registry, Divine Shield and Authority State.</p></Card></div>}
            {activeTab === 'deployments' && <div className="flex-1 overflow-y-auto p-8 bg-[#080808]"><Card className="bg-white/5 border-white/5 p-6"><h2 className="text-2xl font-bold text-white">Deployments</h2><p className="mt-2 text-sm text-slate-500">Execution bridge, refinement queue and deployment history.</p></Card></div>}
          </div>
          <aside className="w-80 flex flex-col bg-black/40 border-l border-white/5 p-6 space-y-8 overflow-y-auto"><div className="space-y-4"><h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center justify-between"><span>Approval Queue</span><Badge variant="secondary" className="bg-white/5 text-slate-400 h-4 px-1">0</Badge></h3><div className="p-4 bg-white/5 rounded-xl border border-dashed border-white/10 flex items-center justify-center h-24"><p className="text-[10px] text-slate-600 uppercase font-bold tracking-[0.1em] text-center">No pending refinements requiring approval</p></div></div><div className="space-y-4"><h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center justify-between"><span>Execution Queue</span><Badge variant="secondary" className="bg-white/5 text-slate-400 h-4 px-1">0</Badge></h3><div className="p-4 bg-white/5 rounded-xl border border-dashed border-white/10 flex items-center justify-center h-24"><p className="text-[10px] text-slate-600 uppercase font-bold tracking-[0.1em] text-center">No active execution threads</p></div></div><div className="space-y-4"><h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Activity Stream</h3><div className="space-y-3"><div className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1" /><div><p className="text-[10px] text-slate-300 font-bold uppercase tracking-tight">Authority Space Initialized</p><p className="text-[9px] text-slate-600 uppercase font-bold">Just now</p></div></div><div className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1" /><div><p className="text-[10px] text-slate-300 font-bold uppercase tracking-tight">Registry Link Established</p><p className="text-[9px] text-slate-600 uppercase font-bold">1m ago</p></div></div></div></div><div className="space-y-4 pt-6 border-t border-white/10"><h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Deployment Requests</h3><Card className="bg-purple-900/10 border border-purple-500/20 p-4 space-y-3"><div className="flex items-center justify-between"><p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Push to Production</p><Rocket className="w-3 h-3 text-purple-400" /></div><p className="text-[10px] text-slate-500 leading-relaxed">Refinements prepared in the Authority Workshop are ready for Expansion Hub sync.</p><Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase tracking-[0.1em] h-9">Execute Push</Button></Card></div></aside>
        </main>
      </div>
    </div>
  )
}
