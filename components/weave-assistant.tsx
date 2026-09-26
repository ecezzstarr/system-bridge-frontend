'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Sparkles, X, Send, Loader2, ListChecks, MessageCircle, ChevronRight, BookOpen, CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ChecklistItem {
  id: string
  label: string
  detail?: string
  onAct?: () => void
  actLabel?: string
  done?: boolean
}

export interface AssistantTutorial {
  title: string
  intro?: string
  steps: ReadonlyArray<{
    title: string
    detail: string
  }>
}

interface WeaveAssistantProps {
  role: 'agent' | 'bridger' | 'admin' | 'client'
  checklist?: ChecklistItem[]
  tutorial?: AssistantTutorial
  openTutorial?: boolean
}

// Unified floating assistant: replaces the old standalone RiverChat button.
// Two tabs in one panel: Checklist (proactive, derived from live dashboard
// state — no chat round-trip needed) and Ask (River's existing Q&A chat).
export function WeaveAssistant({ role, checklist = [], tutorial, openTutorial = false }: WeaveAssistantProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState<'checklist' | 'guide' | 'ask'>(checklist.length > 0 ? 'checklist' : tutorial ? 'guide' : 'ask')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'I am River. I help make the part of WEAVE you are in understandable. What are you trying to do?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const pendingCount = useMemo(() => checklist.filter(c => !c.done).length, [checklist])

  useEffect(() => {
    if (tab === 'ask') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, tab])

  useEffect(() => {
    if (openTutorial && tutorial) {
      setTab('guide')
      setIsOpen(true)
    }
  }, [openTutorial, tutorial])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          pathname: typeof window !== 'undefined' ? window.location.pathname : undefined,
          role,
        })
      })
      const data = await response.json()
      if (data.success && data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'I could not process that. Please try again.' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    }
    setIsLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Positioned to clear a mobile bottom tab bar (bottom-24 on small screens,
  // bottom-6 from sm: up where there's no bottom nav).
  if (!isOpen) {
    return (
      <div className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2">
        {tutorial && (
          <button
            type="button"
            onClick={() => {
              setTab('guide')
              setIsOpen(true)
            }}
            className="hidden sm:flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur transition hover:brightness-110"
            style={{ background: 'var(--popover)', borderColor: 'var(--field-border)', color: 'var(--foreground)' }}
          >
            <CircleHelp className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            {tutorial.title}
          </button>
        )}
        <button
          onClick={() => setIsOpen(true)}
          className="relative w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
          style={{
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            boxShadow: 'var(--glow-shadow), 0 8px 24px rgba(0,0,0,0.5)',
          }}
          aria-label="Open Assistant"
        >
          <Sparkles className="h-6 w-6 text-black" />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="fixed z-50 inset-x-4 bottom-24 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96">
      <div
        className="rounded-2xl shadow-2xl overflow-hidden border"
        style={{ background: 'var(--popover)', borderColor: 'var(--field-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--field-border)', background: 'var(--field-active)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}
            >
              <Sparkles className="h-4 w-4 text-black" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>WEAVE Assistant</h3>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>River + your task list</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition">
            <X className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--field-border)' }}>
          <button
            onClick={() => setTab('checklist')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wide transition"
            style={{
              color: tab === 'checklist' ? 'var(--primary)' : 'var(--muted-foreground)',
              borderBottom: tab === 'checklist' ? '2px solid var(--primary)' : '2px solid transparent',
            }}
          >
            <ListChecks className="h-3.5 w-3.5" />
            To Do {pendingCount > 0 && `(${pendingCount})`}
          </button>
          {tutorial && (
            <button
              onClick={() => setTab('guide')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wide transition"
              style={{
                color: tab === 'guide' ? 'var(--primary)' : 'var(--muted-foreground)',
                borderBottom: tab === 'guide' ? '2px solid var(--primary)' : '2px solid transparent',
              }}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Guide
            </button>
          )}
          <button
            onClick={() => setTab('ask')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wide transition"
            style={{
              color: tab === 'ask' ? 'var(--primary)' : 'var(--muted-foreground)',
              borderBottom: tab === 'ask' ? '2px solid var(--primary)' : '2px solid transparent',
            }}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Ask River
          </button>
        </div>

        {tab === 'checklist' ? (
          <div className="max-h-96 overflow-y-auto p-3 space-y-2">
            {checklist.length === 0 ? (
              <div className="py-10 text-center">
                <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-40" style={{ color: 'var(--muted-foreground)' }} />
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>You're all caught up.</p>
              </div>
            ) : (
              checklist.map(item => (
                <button
                  key={item.id}
                  onClick={() => { item.onAct?.(); setIsOpen(false) }}
                  disabled={item.done}
                  className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-xl border transition hover:brightness-110 disabled:opacity-50 disabled:cursor-default"
                  style={{ background: 'var(--field-surface)', borderColor: 'var(--field-border)' }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{item.label}</p>
                    {item.detail && (
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>{item.detail}</p>
                    )}
                  </div>
                  {!item.done && item.onAct && (
                    <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--secondary)' }} />
                  )}
                </button>
              ))
            )}
          </div>
        ) : tab === 'guide' && tutorial ? (
          <div className="max-h-[28rem] overflow-y-auto p-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{tutorial.title}</p>
            {tutorial.intro && (
              <p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted-foreground)' }}>{tutorial.intro}</p>
            )}
            <div className="mt-4 space-y-3">
              {tutorial.steps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-xl border p-3"
                  style={{ background: 'var(--field-surface)', borderColor: 'var(--field-border)' }}
                >
                  <div className="flex gap-3">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black"
                      style={{ background: 'var(--field-active)', color: 'var(--primary)' }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{step.title}</p>
                      <p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted-foreground)' }}>{step.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full"
              onClick={() => {
                setInput('I am an Agent. Explain what I should do next in Agility.')
                setTab('ask')
              }}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Ask River what to do next
            </Button>
          </div>
        ) : (
          <>
            <div className="h-72 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--background)' }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[85%] px-3 py-2 rounded-xl text-sm"
                    style={
                      msg.role === 'user'
                        ? { background: 'var(--secondary)', color: 'var(--secondary-foreground)' }
                        : { background: 'var(--card)', color: 'var(--card-foreground)', border: '1px solid var(--border)' }
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--secondary)' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t" style={{ borderColor: 'var(--field-border)' }}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask River anything..."
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none border"
                  style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                />
                <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="sm" className="rounded-xl px-3">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
