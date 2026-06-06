'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BottomNav } from '@/components/bottom-nav'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function RiverPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'I am River. Truth untold I simple make known. How can I help you today?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
          messages: [...messages, { role: 'user', content: userMessage }]
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

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col bg-slate-950">
        {/* Header */}
        <header className="p-6 flex items-center gap-4 border-b border-slate-800/50 sticky top-0 bg-slate-950/80 backdrop-blur-md z-50">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full text-slate-400">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="text-sm font-bold text-white">R</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">River</h1>
              <p className="text-[10px] text-cyan-400 uppercase tracking-widest">Truth Untold</p>
            </div>
          </div>
        </header>

        {/* Chat Space */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-900 text-slate-200 border border-slate-800'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="fixed bottom-[88px] left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-md border-t border-slate-800/50">
          <div className="max-w-md mx-auto p-4">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Speak to River..."
                className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="h-10 w-10 rounded-2xl bg-cyan-600 hover:bg-cyan-700 shadow-lg shadow-cyan-600/20 flex-shrink-0 p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <BottomNav />
      </div>
    </div>
  )
}
