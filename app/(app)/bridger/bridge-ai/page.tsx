'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Copy, QrCode, Eye, MessageSquare, UserPlus, Loader2, Code2, Sparkles, ShieldCheck, ExternalLink } from 'lucide-react'
import { RiverChat } from '@/components/river-chat'
import { WORLD_RULES } from '@/lib/world/constants'
import { ClientFileFolderAssistance } from '@/components/bridger/client-file-folder-assistance'

interface Template { id: string; name: string; welcome_message: string; description?: string }
interface Bridge {
  id: string; bridge_code: string; status: string; created_at: string
  template_name: string; custom_welcome_message: string | null
  views: number; conversations: number; registrations: number
  public_url: string
}

const BRIDGE_AI_TEMPLATE_PRICE = WORLD_RULES.BRIDGE_AI_TEMPLATE_OPEN_FLAME_COIN

const PALETTE = [
  { from: '#06b6d4', to: '#3b82f6', glow: 'rgba(6,182,212,0.25)' },
  { from: '#a855f7', to: '#ec4899', glow: 'rgba(168,85,247,0.25)' },
  { from: '#f59e0b', to: '#ef4444', glow: 'rgba(245,158,11,0.25)' },
  { from: '#10b981', to: '#06b6d4', glow: 'rgba(16,185,129,0.25)' },
  { from: '#8b5cf6', to: '#6366f1', glow: 'rgba(139,92,246,0.25)' },
  { from: '#ec4899', to: '#f59e0b', glow: 'rgba(236,72,153,0.25)' },
]

function colorFor(key: string) {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

function bridgeUrl(bridge: Bridge) {
  return bridge.public_url || `https://weavingsystem.online/bridge/${bridge.bridge_code}`
}

export default function BridgerWorkshopPage() {
  const [bridges, setBridges] = useState<Bridge[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [subError, setSubError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [customWelcome, setCustomWelcome] = useState('')
  const [qrBridge, setQrBridge] = useState<Bridge | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null
      const authHeaders = { Authorization: `Bearer ${token}` }
      const [bridgesRes, templatesRes] = await Promise.all([
        fetch('/api/bridger/bridge-ai', { headers: authHeaders }),
        fetch('/api/bridger/bridge-templates', { headers: authHeaders }),
      ])
      const bridgesData = await bridgesRes.json()
      const templatesData = await templatesRes.json()
      if (bridgesData.success) setBridges(bridgesData.bridges)
      if (templatesData.success) setTemplates(templatesData.templates)
    } catch (err) {
      console.error('Failed to load workshop data:', err)
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleCreate = async () => {
    if (!selectedTemplateId) return
    setCreating(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null
      const res = await fetch('/api/bridger/bridge-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          customWelcomeMessage: customWelcome || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSubError(null)
        setDialogOpen(false)
        setSelectedTemplateId('')
        setCustomWelcome('')
        await loadData()
      } else if (data.reason === 'insufficient_balance') {
        setSubError(`Opening a Bridge AI template costs ${data.requiredFlameCoin} Flame Coin; wallet has ${data.availableFlameCoin} Flame Coin.`)
        setDialogOpen(false)
      } else {
        setSubError(data.error || 'Bridge AI template could not be opened.')
      }
    } catch (err) {
      setSubError('Bridge AI template could not be opened.')
      console.error('Failed to create Bridge AI:', err)
    }
    setCreating(false)
  }

  const handleCopy = (bridge: Bridge) => {
    navigator.clipboard.writeText(bridgeUrl(bridge))
    setCopiedId(bridge.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const embedSnippet = (bridge: Bridge) =>
    `<a href="${bridgeUrl(bridge)}" target="_blank" rel="noopener">Chat with us</a>`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--secondary)' }} />
      </div>
    )
  }

  return (
    <main className="weave-operating-environment overflow-hidden border-y border-cyan-300/15 bg-[#040a10]/78 sm:rounded-[2rem] sm:border" data-bridge-ai-environment>
      <header className="flex items-center justify-between gap-4 border-b border-cyan-300/15 px-5 py-6 md:px-7">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--foreground)' }}>Bridge AI Paths</h1>
          <p className="weave-word-presence text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Open a Client crossing with Bridge AI. When the person becomes a Client, the same Bridge AI continues as their AI support inside the File Folder.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={templates.length === 0}>
              <Plus className="h-4 w-4 mr-2" /> New Bridge AI Path
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Open a Bridge AI Template · {BRIDGE_AI_TEMPLATE_PRICE} Flame Coin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Template</label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Custom welcome message <span className="font-normal" style={{ color: 'var(--muted-foreground)' }}>(optional)</span>
                </label>
                <Textarea
                  placeholder="Leave blank to use the template's default welcome message"
                  value={customWelcome}
                  onChange={(e) => setCustomWelcome(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!selectedTemplateId || creating}>
                {creating ? 'Opening...' : `Open Template · ${BRIDGE_AI_TEMPLATE_PRICE} Flame Coin`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <section className="border-b border-slate-800 bg-black/10 px-5 py-5 md:px-7" data-bridge-ai-station="per-template">
        <h2 className="text-lg font-bold text-white">Bridge AI · {BRIDGE_AI_TEMPLATE_PRICE} Flame Coin per template opening</h2>
        <p className="mt-2 text-sm text-slate-400">Each new Bridge AI path is purchased once when you open a template. Existing paths remain available with no monthly subscription. Your wallet is charged only when a new path is created.</p>
      </section>
      {subError && <div role="alert" className="border-b border-red-400/20 px-5 py-3 text-sm text-red-200">{subError}</div>}

      {templates.length === 0 && (
        <div className="border-b border-slate-800 px-5 py-6 text-sm md:px-7" style={{ color: 'var(--muted-foreground)' }}>
          No published templates yet. Ask an admin to publish one in the Admin Workshop before you can create a Bridge AI.
        </div>
      )}

      {bridges.length === 0 && templates.length > 0 && (
        <div className="border-b border-slate-800 px-5 py-6 text-sm md:px-7" style={{ color: 'var(--muted-foreground)' }}>
          You have not opened a Bridge AI path yet. Create one to begin a crossing that can continue as Client AI support after entry.
        </div>
      )}

      <section className="divide-y divide-white/[0.075]" data-bridge-ai-paths>
        {bridges.map((bridge,index) => {
          const tone = colorFor(bridge.template_name)
          return (
            <article
              key={bridge.id}
              className="group relative grid gap-4 px-5 py-5 transition hover:bg-cyan-300/[0.025] md:grid-cols-[42px_minmax(0,1fr)_auto] md:items-center md:px-7"
              data-bridge-ai-path={bridge.bridge_code}
            >
              <div className="relative flex h-10 w-10 items-center justify-center">
                <span className="absolute h-3 w-3 rounded-full" style={{ background: tone.from, boxShadow:`0 0 20px ${tone.glow}` }} />
                <Sparkles className="relative h-4 w-4 translate-x-5 text-white opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"/>
                <span className="absolute -bottom-4 text-[7px] font-black uppercase tracking-wider text-slate-700">{String(index+1).padStart(2,'0')}</span>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-black text-white">{bridge.template_name}</p>
                  <Badge variant={bridge.status === 'active' ? 'default' : 'secondary'}>{bridge.status}</Badge>
                </div>
                <p className="mt-1 truncate font-mono text-[10px] text-slate-500">{bridgeUrl(bridge)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {bridge.views} views</span>
                  <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {bridge.conversations} conversations</span>
                  <span className="flex items-center gap-1"><UserPlus className="h-3.5 w-3.5" /> {bridge.registrations} registrations</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:border-l md:border-white/10 md:pl-4">
                <Button size="sm" variant="outline" asChild>
                  <a href={bridgeUrl(bridge)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open client link
                  </a>
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleCopy(bridge)}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> {copiedId === bridge.id ? 'Copied' : 'Copy link'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setQrBridge(bridge)}>
                  <QrCode className="h-3.5 w-3.5" />
                </Button>
              </div>
            </article>
          )
        })}
      </section>

      <Dialog open={!!qrBridge} onOpenChange={(open) => !open && setQrBridge(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Share this Bridge AI crossing path</DialogTitle></DialogHeader>
          {qrBridge && (
            <div className="space-y-4">
              <div className="flex justify-center bg-white p-4 rounded-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(bridgeUrl(qrBridge))}`}
                  alt="QR code"
                  width={220}
                  height={220}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                  <Code2 className="h-3 w-3" /> Embed snippet
                </label>
                <Textarea readOnly rows={2} value={embedSnippet(qrBridge)} className="font-mono text-xs" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ClientFileFolderAssistance />
      <div className="border-t border-slate-800"><RiverChat /></div>
    </main>
  )
}
