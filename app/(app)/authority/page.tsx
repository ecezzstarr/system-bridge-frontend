'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Activity, Bot, Globe, Rocket, ScrollText, Send, ShieldCheck, Sparkles, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Message {
  role: 'admin' | 'eight'
  content: string
  timestamp: Date
}

const tabs = [
  { id: 'registry', label: 'Registry', icon: ScrollText },
  { id: 'eight-core', label: 'Eight Core', icon: Bot },
  { id: 'ai-foundry', label: 'AI Foundry', icon: Sparkles },
  { id: 'ecosystem', label: 'Ecosystem', icon: Globe },
  { id: 'positions', label: 'Positions', icon: Users },
  { id: 'runtime', label: 'Runtime', icon: Activity },
  { id: 'governance', label: 'Governance', icon: ShieldCheck },
  { id: 'deployments', label: 'Deployments', icon: Rocket },
] as const

const registry = [
  {
    title: 'AI Registry',
    tab: 'ai-foundry',
    icon: Bot,
    items: [
      ['EIGHT', 'Intelligence Core', 'Active', 'v4.2.0'],
      ['RIVER', 'Assistant Node', 'Active', 'v2.1.5'],
      ['ECHO', 'Observer System', 'Standby', 'v1.0.8'],
    ],
  },
  {
    title: 'Ecosystem Registry',
    tab: 'ecosystem',
    icon: Globe,
    items: [
      ['WEAVINGSYSTEM.ONLINE', 'Authority Space', 'Active', 'Production'],
      ['SSBNOW.SHOP', 'Expansion Hub', 'Active', 'Production'],
      ['SSBNOW.ONLINE', 'Service System', 'Active', 'Production'],
    ],
  },
  {
    title: 'Position Registry',
    tab: 'positions',
    icon: Users,
    items: [
      ['Admin', 'Root Authority', 'Active', 'v1.0'],
      ['Agents', 'Operational Node', 'Active', 'v2.4'],
      ['Bridgers', 'Connector Node', 'Active', 'v2.1'],
      ['Siblings', 'Autonomous Node', 'Active', 'v3.0'],
    ],
  },
  {
    title: 'Runtime Registry',
    tab: 'runtime',
    icon: Activity,
    items: [
      ['Database', 'Neon Persistence', 'Healthy', 'v15.x'],
      ['Wallet', 'Blockchain Link', 'Active', 'v3.2'],
      ['API Gateway', 'Edge Runtime', 'Optimal', 'v2.0'],
      ['Workers', 'Cloud Tasks', 'Running', 'v1.5'],
    ],
  },
  {
    title: 'Governance Registry',
    tab: 'governance',
    icon: ShieldCheck,
    items: [
      ['Origin Truth Ledger', 'Master Record', 'Locked', 'Immutable'],
      ['System Registry', 'Operational Map', 'Active', 'v4.2'],
      ['Authority State', 'Consensus', 'Active', 'v1.2'],
    ],
  },
  {
    title: 'Deployment Registry',
    tab: 'deployments',
    icon: Rocket,
    items: [
      ['Pending', 'System-Wide', 'Queued', 'Approval Needed'],
      ['Generated Code', 'Artifacts', 'Ready', 'v4.2.0'],
      ['Generated SQL', 'Migrations', 'Ready', 'v4.2.0'],
    ],
  },
] as const

export default function AuthorityPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('registry')
  const [selected, setSelected] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'eight', content: 'Authority Space Initialized. I am EIGHT, your ecosystem operator and refinement companion.', timestamp: new Date() },
  ])

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') router.replace('/dashboard')
  }, [user, router])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  if (!user || user.role !== 'admin') return null

  async function sendMessage() {
    const message = input.trim()
    if (!message || isTyping) return
    setInput('')
    setMessages(prev => [...prev, { role: 'admin', content: message, timestamp: new Date() }])
    setIsTyping(true)
    try {
      const response = await fetch('/api/eight/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message, context: { history: messages.slice(-5) } }),
      })
      const data = await response.json()
      setMessages(prev => [...prev, { role: 'eight', content: data.message || data.content || 'EIGHT has structured the request.', timestamp: new Date() }])
    } catch {
      setMessages(prev => [...prev, { role: 'eight', content: 'Authority link unavailable.', timestamp: new Date() }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="min-h-screen h-screen overflow-hidden bg-[#050505] text-slate-200">
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="relative h-full flex flex-col">
        <header className="shrink-0 border-b border-white/5 bg-black/60 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 shrink-0 rounded bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-bold text-white uppercase tracking-tight">Ecosystem Authority</h1>
                <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Authority Space · EIGHT · Live</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4 mr-2" /> Exit
            </Button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
              <TabsList className="bg-transparent p-0 gap-1 w-max">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <TabsTrigger key={id} value={id} className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500 data-[state=active]:bg-white/5 data-[state=active]:text-white">
                    <Icon className="w-3.5 h-3.5 mr-1.5" />{label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </header>

        <main className="min-h-0 flex-1 flex">
          <section className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6 bg-[#080808]">
            {activeTab === 'registry' ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white">Ecosystem Registry</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Live Operational Index & Mapping</p>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {registry.map(group => {
                    const Icon = group.icon
                    return <Card key={group.title} className="border-white/5 bg-white/[0.02] p-4">
                      <button onClick={() => setActiveTab(group.tab)} className="flex w-full items-center gap-2 text-left mb-3">
                        <Icon className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-semibold text-white">{group.title}</span>
                      </button>
                      <div className="space-y-2">
                        {group.items.map(([name, type, status, version]) => <button key={name} onClick={() => setSelected(name)} className="w-full rounded-md border border-white/5 bg-black/30 p-3 text-left hover:bg-white/5">
                          <div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-white">{name}</span><Badge variant="outline" className="text-[9px]">{status}</Badge></div>
                          <div className="mt-1 text-[10px] text-slate-500">{type} · {version}</div>
                        </button>)}
                      </div>
                    </Card>
                  })}
                </div>
                {selected && <Card className="border-purple-500/20 bg-purple-500/5 p-4 flex items-center justify-between"><div><p className="text-[9px] uppercase tracking-widest text-purple-400">Selected Object</p><p className="text-sm text-white mt-1">{selected}</p></div><Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Clear</Button></Card>}
              </div>
            ) : (
              <Card className="border-white/5 bg-white/[0.02] p-6 min-h-[300px]">
                <h2 className="text-xl font-bold text-white">{tabs.find(t => t.id === activeTab)?.label}</h2>
                <p className="mt-2 text-sm text-slate-500">Authority workspace connected to the live ecosystem.</p>
              </Card>
            )}
          </section>

          <aside className="hidden lg:flex w-[360px] xl:w-[420px] shrink-0 flex-col border-l border-white/5 bg-black/40">
            <div className="border-b border-white/5 p-4"><p className="text-xs font-semibold text-white">EIGHT</p><p className="text-[10px] text-slate-500 uppercase tracking-widest">Ecosystem Operator</p></div>
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => <div key={`${m.timestamp.getTime()}-${i}`} className={`rounded-lg p-3 text-sm ${m.role === 'admin' ? 'ml-8 bg-purple-500/10 border border-purple-500/10' : 'mr-4 bg-white/[0.03] border border-white/5'}`}><div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">{m.role === 'admin' ? 'Admin' : 'EIGHT'}</div>{m.content}</div>)}
              {isTyping && <div className="text-xs text-slate-500">EIGHT is processing…</div>}
            </div>
            <div className="border-t border-white/5 p-3 flex gap-2">
              <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendMessage() }} placeholder="Speak to EIGHT…" className="bg-white/[0.03] border-white/10" />
              <Button size="icon" onClick={sendMessage} disabled={!input.trim() || isTyping}><Send className="w-4 h-4" /></Button>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}
