'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Loader2, Archive, CheckCircle2, Pencil, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface Template {
  id: string; name: string; description: string | null
  welcome_message: string; system_prompt: string
  status: 'draft' | 'published' | 'archived'
  created_at: string
}

const emptyForm = { name: '', description: '', welcomeMessage: '', systemPrompt: '' }

const PALETTE = [
  { from: '#06b6d4', to: '#3b82f6', glow: 'rgba(6,182,212,0.25)' },   // cyan -> blue
  { from: '#a855f7', to: '#ec4899', glow: 'rgba(168,85,247,0.25)' },  // purple -> pink
  { from: '#f59e0b', to: '#ef4444', glow: 'rgba(245,158,11,0.25)' }, // amber -> red
  { from: '#10b981', to: '#06b6d4', glow: 'rgba(16,185,129,0.25)' }, // emerald -> cyan
  { from: '#8b5cf6', to: '#6366f1', glow: 'rgba(139,92,246,0.25)' }, // violet -> indigo
  { from: '#ec4899', to: '#f59e0b', glow: 'rgba(236,72,153,0.25)' }, // pink -> amber
]

function colorFor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

export default function AdminBridgeTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null
      const res = await fetch('/api/admin/bridge-ai/templates', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setTemplates(data.templates)
      else toast.error(data.error || "The templates didn't open")
    } catch (err) {
      console.error('Failed to load templates:', err)
      toast.error("The templates didn't open")
    }
    setLoading(false)
  }

  useEffect(() => { loadTemplates() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (t: Template) => {
    setEditing(t)
    setForm({
      name: t.name,
      description: t.description || '',
      welcomeMessage: t.welcome_message,
      systemPrompt: t.system_prompt,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.welcomeMessage || !form.systemPrompt) return
    setSaving(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null
      const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      const res = editing
        ? await fetch('/api/admin/bridge-ai/templates', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ id: editing.id, ...form }),
          })
        : await fetch('/api/admin/bridge-ai/templates', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(form),
          })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Save failed')
      }
      toast.success(editing ? 'Shaped' : 'Formed')
      setDialogOpen(false)
      await loadTemplates()
    } catch (err) {
      console.error('Failed to save template:', err)
      toast.error(err instanceof Error ? err.message : "That didn't hold")
    }
    setSaving(false)
  }

  const setStatus = async (t: Template, status: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null
      const res = await fetch('/api/admin/bridge-ai/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: t.id, status }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Update failed')
      }
      toast.success(`${status === 'published' ? 'Published' : status === 'archived' ? 'Set aside' : 'Held as draft'}`)
      await loadTemplates()
    } catch (err) {
      console.error('Failed to update template status:', err)
      toast.error(err instanceof Error ? err.message : "That didn't update")
    }
  }

  const statusColor = (status: string) =>
    status === 'published' ? 'default' : status === 'archived' ? 'secondary' : 'outline'

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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Bridge AI Templates</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Publish a template to make it available to Bridgers in their Workshop.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Template' : 'New Template'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Description <span className="font-normal" style={{ color: 'var(--muted-foreground)' }}>(internal only)</span>
                </label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Welcome message</label>
                <Textarea rows={2} value={form.welcomeMessage} onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">System prompt</label>
                <Textarea rows={6} className="font-mono text-xs" value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.welcomeMessage || !form.systemPrompt}>
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Create template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            No templates yet. Click "New Template" to create the first one.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map(t => {
          const c = colorFor(t.id)
          return (
            <Card
              key={t.id}
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
                    <CardTitle className="text-base truncate">{t.name}</CardTitle>
                  </div>
                  <Badge variant={statusColor(t.status)} className="shrink-0">{t.status}</Badge>
                </div>
                {t.description && <CardDescription className="pl-12">{t.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                  {t.status !== 'published' && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(t, 'published')}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Publish
                    </Button>
                  )}
                  {t.status !== 'archived' && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(t, 'archived')}>
                      <Archive className="h-3.5 w-3.5 mr-1.5" /> Archive
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
