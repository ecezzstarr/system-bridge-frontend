'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Copy, QrCode, Eye, MessageSquare, UserPlus, Loader2, Code2, Sparkles, ShieldCheck } from 'lucide-react'
import { RiverChat } from '@/components/river-chat'

interface Template { id: string; name: string; welcome_message: string; description?: string }
interface Bridge {
  id: string; bridge_code: string; status: string; created_at: string
  template_name: string; custom_welcome_message: string | null
  views: number; conversations: number; registrations: number
}

const BRIDGE_AI_SUBSCRIPTION_FEE_FLAME_COIN = 15

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

function bridgeUrl(code: string) {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/bridge/${code}`
}

export default function BridgerWorkshopPage() {
  const [bridges, setBridges] = useState<Bridge[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [subscription, setContinuance] = useState<any>(null)
  const [subscribing, setSubscribing] = useState(false)
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
      const [bridgesRes, templatesRes, subRes] = await Promise.all([
        fetch('/api/bridger/bridge-ai', { headers: authHeaders }),
        fetch('/api/bridger/bridge-templates', { headers: authHeaders }),
        fetch('/api/bridger/bridge-ai/subscribe', { headers: authHeaders }),
      ])
      const bridgesData = await bridgesRes.json()
      const templatesData = await templatesRes.json()
      const subData = await subRes.json()
      if (bridgesData.success) setBridges(bridgesData.bridges)
      if (templatesData.success) setTemplates(templatesData.templates)
      setContinuance(subData.subscription)
    } catch (err) {
      console.error('Failed to load workshop data:', err)
    }
    setLoading(false)
  }

  const isSubscribed = !!(subscription?.status === 'active' && subscription.expiry && new Date(subscription.expiry) > new Date())

  const handleSubscribe = async () => {
    setSubscribing(true)
    setSubError(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null
      const res = await fetch('/api/bridger/bridge-ai/subscribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        if (data.reason === 'insufficient_balance') {
          setSubError(`Insufficient balance. Need ${data.requiredFlameCoin} Flame Coin, wallet has ${data.availableFlameCoin} Flame Coin.`)
        } else {
          setSubError('Continuance failed. Try again.')
        }
      } else {
        await loadData()
      }
    } catch (err) {
      console.error('Failed to subscribe:', err)
      setSubError('Continuance failed. Try again.')
    }
    setSubscribing(false)
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
        setDialogOpen(false)
        setSelectedTemplateId('')
        setCustomWelcome('')
        await loadData()
      }
    } catch (err) {
      console.error('Failed to create Bridge AI:', err)
    }
    setCreating(false)
  }

  const handleCopy = (bridge: Bridge) => {
    navigator.clipboard.writeText(bridgeUrl(bridge.bridge_code))
    setCopiedId(bridge.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const embedSnippet = (code: string) =>
    `<a href="${bridgeUrl(code)}" target="_blank" rel="noopener">Chat with us</a>`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--secondary)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Bridge</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Create shareable AI conversation links that convert visitors into clients.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={templates.length === 0 || !isSubscribed}>
              <Plus className="h-4 w-4 mr-2" /> New Bridge AI
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a Bridge AI</DialogTitle>
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
                {creating ? 'Creating...' : 'Create Bridge AI'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Bridge AI subscription</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isSubscribed ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {isSubscribed ? 'Active' : 'Inactive'}
            </span>
          </div>
          {subscription?.expiry && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--muted-foreground)' }}>Renews</span>
              <span style={{ color: 'var(--foreground)' }}>{new Date(subscription.expiry).toLocaleDateString()}</span>
            </div>
          )}
          {subscription?.last_paid_at && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--muted-foreground)' }}>Last paid</span>
              <span style={{ color: 'var(--foreground)' }}>{new Date(subscription.last_paid_at).toLocaleDateString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {subError && <div className="text-sm text-red-400">{subError}</div>}

      {!isSubscribed && (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>
              Subscribe — {BRIDGE_AI_SUBSCRIPTION_FEE_FLAME_COIN} Flame Coin / month
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Deducted from your primary wallet. Required to create and run Bridge AI links. Cancel anytime by letting it lapse.
            </p>
            <Button onClick={handleSubscribe} disabled={subscribing} className="w-full">
              {subscribing ? 'Activating...' : `Subscribe for ${BRIDGE_AI_SUBSCRIPTION_FEE_FLAME_COIN} Flame Coin`}
            </Button>
          </CardContent>
        </Card>
      )}

      {isSubscribed && templates.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            No published templates yet. Ask an admin to publish one in the Admin Workshop before you can create a Bridge AI.
          </CardContent>
        </Card>
      )}

      {isSubscribed && bridges.length === 0 && templates.length > 0 && (
        <Card>
          <CardContent className="py-6 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            You haven't created a Bridge AI yet. Click "New Bridge AI" to get your first shareable link.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bridges.map(bridge => {
          const c = colorFor(bridge.template_name)
          return (
            <Card
              key={bridge.id}
              className="overflow-hidden border-slate-700 bg-slate-800/40 transition-shadow hover:shadow-lg"
              style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 8px 24px -12px ${c.glow}` }}
            >
              <div className="h-1" style={{ background: `linear-gradient(90deg, ${c.from}, ${c.to})` }} />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                    >
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <CardTitle className="text-base truncate">{bridge.template_name}</CardTitle>
                  </div>
                  <Badge variant={bridge.status === 'active' ? 'default' : 'secondary'} className="shrink-0">{bridge.status}</Badge>
                </div>
                <CardDescription className="truncate font-mono text-xs pl-12">
                  /bridge/{bridge.bridge_code}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {bridge.views}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {bridge.conversations}</span>
                  <span className="flex items-center gap-1"><UserPlus className="h-3.5 w-3.5" /> {bridge.registrations}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleCopy(bridge)}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> {copiedId === bridge.id ? 'Copied' : 'Copy link'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setQrBridge(bridge)}>
                    <QrCode className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!qrBridge} onOpenChange={(open) => !open && setQrBridge(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Share this Bridge AI</DialogTitle></DialogHeader>
          {qrBridge && (
            <div className="space-y-4">
              <div className="flex justify-center bg-white p-4 rounded-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(bridgeUrl(qrBridge.bridge_code))}`}
                  alt="QR code"
                  width={220}
                  height={220}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                  <Code2 className="h-3 w-3" /> Embed snippet
                </label>
                <Textarea readOnly rows={2} value={embedSnippet(qrBridge.bridge_code)} className="font-mono text-xs" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RiverChat />
    </div>
  )
}
